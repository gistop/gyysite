import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import "dotenv/config";

const app = express();
const port = Number(process.env.PORT || 3001);
const publishRoot = path.resolve(process.env.PUBLISH_ROOT || "published-sites");
const maxFileCount = Number(process.env.MAX_FILE_COUNT || 80);
const maxTotalBytes = Number(process.env.MAX_TOTAL_BYTES || 2 * 1024 * 1024);
const allowedExtensions = new Set([".html", ".css", ".js", ".json", ".txt", ".svg", ".png", ".jpg", ".jpeg", ".webp"]);
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);
const deepseek = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "missing-key"
});

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: process.env.JSON_LIMIT || "4mb" }));
app.use("/sites", express.static(publishRoot));

function makeSiteId(input) {
  const slug = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || `site-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeProjectPath(filePath) {
  const normalized = path.posix.normalize(String(filePath || "").replaceAll("\\", "/"));

  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  const ext = path.posix.extname(normalized).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    throw new Error(`Unsupported file type: ${filePath}`);
  }

  return normalized;
}

function validateHtmlFiles(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("files must be an object");
  }

  const entries = Object.entries(files);
  if (!entries.length) throw new Error("files cannot be empty");
  if (entries.length > maxFileCount) throw new Error(`Too many files. Max: ${maxFileCount}`);

  let totalBytes = 0;
  const normalizedFiles = new Map();

  for (const [filePath, content] of entries) {
    if (typeof content !== "string") {
      throw new Error(`File content must be text: ${filePath}`);
    }

    const normalizedPath = normalizeProjectPath(filePath);
    totalBytes += Buffer.byteLength(content, "utf8");
    if (totalBytes > maxTotalBytes) throw new Error(`Project is too large. Max bytes: ${maxTotalBytes}`);

    normalizedFiles.set(normalizedPath, content);
  }

  if (!normalizedFiles.has("index.html")) {
    throw new Error("HTML project must include index.html");
  }

  return normalizedFiles;
}

function validateReturnedHtmlFiles(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("AI response files must be an object");
  }

  const normalizedFiles = {};
  let totalBytes = 0;

  for (const [filePath, content] of Object.entries(files)) {
    if (typeof content !== "string") {
      throw new Error(`AI response file content must be text: ${filePath}`);
    }

    const normalizedPath = normalizeProjectPath(filePath);
    totalBytes += Buffer.byteLength(content, "utf8");
    if (totalBytes > maxTotalBytes) throw new Error(`AI response is too large. Max bytes: ${maxTotalBytes}`);

    normalizedFiles[normalizedPath] = content;
  }

  if (!Object.keys(normalizedFiles).length) {
    throw new Error("AI response did not include any files");
  }

  return normalizedFiles;
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI response was not valid JSON");
    }

    return JSON.parse(content.slice(start, end + 1));
  }
}

function buildHtmlEditMessages({ instruction, activeFile, files }) {
  const serializedFiles = JSON.stringify(Object.fromEntries(files), null, 2);

  return [
    {
      role: "system",
      content: [
        "You are a frontend code editing assistant for a browser-only HTML project.",
        "Return JSON only. Do not return Markdown, code fences, or explanations outside JSON.",
        "The JSON shape must be: {\"summary\":\"short Chinese summary\",\"files\":{\"path\":\"full updated file content\"}}.",
        "Only edit files that belong to the given HTML project.",
        "Use complete file contents for every changed file.",
        "Keep the project directly runnable in a browser.",
        "Do not add backend code or require a build step.",
        "Avoid external scripts and remote dependencies unless the user explicitly asks for them."
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `Active file: ${activeFile}`,
        `User instruction: ${instruction}`,
        "Current project files JSON:",
        serializedFiles
      ].join("\n\n")
    }
  ];
}

async function writeLocalSite(siteId, files) {
  const siteDir = path.join(publishRoot, siteId);
  await fs.mkdir(siteDir, { recursive: true });

  for (const [filePath, content] of files) {
    const targetPath = path.join(siteDir, filePath);
    const resolved = path.resolve(targetPath);

    if (!resolved.startsWith(siteDir)) {
      throw new Error(`Invalid resolved path: ${filePath}`);
    }

    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf8");
  }
}

function getOssClient() {
  const { OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET } = process.env;
  if (!OSS_REGION || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) return null;

  return new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    secure: true
  });
}

async function uploadOssSite(siteId, files) {
  const client = getOssClient();
  if (!client) return null;

  const prefix = (process.env.OSS_PREFIX || "sites").replace(/^\/+|\/+$/g, "");

  for (const [filePath, content] of files) {
    const objectKey = `${prefix}/${siteId}/${filePath}`;
    const contentType = contentTypes.get(path.posix.extname(filePath).toLowerCase()) || "application/octet-stream";

    await client.put(objectKey, Buffer.from(content, "utf8"), {
      headers: {
        "Content-Type": contentType
      }
    });
  }

  const publicBaseUrl = process.env.OSS_PUBLIC_BASE_URL?.replace(/\/+$/g, "");
  return publicBaseUrl ? `${publicBaseUrl}/${prefix}/${siteId}/index.html` : null;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/deploy/html", async (req, res) => {
  try {
    const siteId = makeSiteId(req.body?.siteId);
    const files = validateHtmlFiles(req.body?.files);

    await writeLocalSite(siteId, files);
    const ossUrl = await uploadOssSite(siteId, files);

    res.json({
      ok: true,
      siteId,
      localUrl: `/sites/${siteId}/index.html`,
      ossUrl
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || String(error)
    });
  }
});

app.post("/api/ai/edit-html", async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "缺少环境变量 DEEPSEEK_API_KEY"
      });
    }

    const instruction = String(req.body?.instruction || "").trim();
    if (!instruction) {
      return res.status(400).json({
        ok: false,
        error: "请先输入修改需求"
      });
    }

    const files = validateHtmlFiles(req.body?.files);
    const activeFile = normalizeProjectPath(req.body?.activeFile || "index.html");
    if (!files.has(activeFile)) {
      throw new Error(`Active file not found: ${activeFile}`);
    }

    const completion = await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
      messages: buildHtmlEditMessages({ instruction, activeFile, files }),
      response_format: { type: "json_object" },
      stream: false
    });

    const content = completion.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObject(content);
    const changedFiles = validateReturnedHtmlFiles(parsed.files);

    res.json({
      ok: true,
      summary: typeof parsed.summary === "string" ? parsed.summary : "AI 已完成修改",
      files: changedFiles
    });
  } catch (error) {
    const status = error.status || 400;
    const message = error.response?.data?.error?.message || error.message || "DeepSeek API 调用失败";

    res.status(status).json({
      ok: false,
      error: message
    });
  }
});

app.listen(port, () => {
  console.log(`API server listening on ${port}`);
});
