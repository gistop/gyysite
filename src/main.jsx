import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Editor from "@monaco-editor/react";
import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import { compileScript, compileStyle, compileTemplate, parse } from "@vue/compiler-sfc";
import {
  AlertTriangle,
  Bot,
  Code2,
  FileCode2,
  Folder,
  Loader2,
  Play,
  RotateCcw,
  UploadCloud
} from "lucide-react";
import "./styles.css";

const templates = {
  html: {
    label: "HTML",
    entry: "index.html",
    files: {
      "index.html": `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>首页 - 星河科技</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="logo" href="./index.html">星河科技</a>
      <nav>
        <a class="active" href="./index.html">首页</a>
        <a href="./products.html">产品介绍</a>
        <a href="./contact.html">联系我们</a>
      </nav>
    </header>

    <main class="hero">
      <section>
        <p class="eyebrow">Digital operations platform</p>
        <h1>让业务系统更清晰、更高效地运转</h1>
        <p class="lead">星河科技为企业提供数据看板、自动化流程和客户协作工具，帮助团队把复杂工作整理成可执行的日常。</p>
        <a class="button" href="./products.html">查看产品</a>
      </section>
      <section class="hero-panel">
        <h2>今日概览</h2>
        <div class="metric">
          <span>项目交付率</span>
          <strong>96%</strong>
        </div>
        <div class="metric">
          <span>客户响应时间</span>
          <strong>12m</strong>
        </div>
      </section>
    </main>
    <script src="./script.js"></script>
  </body>
</html>`,
      "products.html": `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>产品介绍 - 星河科技</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="logo" href="./index.html">星河科技</a>
      <nav>
        <a href="./index.html">首页</a>
        <a class="active" href="./products.html">产品介绍</a>
        <a href="./contact.html">联系我们</a>
      </nav>
    </header>

    <main class="page">
      <p class="eyebrow">Products</p>
      <h1>三套工具，覆盖企业核心协作场景</h1>
      <section class="product-grid">
        <article>
          <h2>数据驾驶舱</h2>
          <p>统一展示销售、运营和项目指标，让管理层快速判断业务状态。</p>
        </article>
        <article>
          <h2>流程自动化</h2>
          <p>把审批、提醒、分派和归档串联起来，减少重复录入和手工跟进。</p>
        </article>
        <article>
          <h2>客户协作门户</h2>
          <p>为客户提供项目进度、文件交付和在线反馈入口，沟通更透明。</p>
        </article>
      </section>
    </main>
    <script src="./script.js"></script>
  </body>
</html>`,
      "contact.html": `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>联系我们 - 星河科技</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="logo" href="./index.html">星河科技</a>
      <nav>
        <a href="./index.html">首页</a>
        <a href="./products.html">产品介绍</a>
        <a class="active" href="./contact.html">联系我们</a>
      </nav>
    </header>

    <main class="page contact-layout">
      <section>
        <p class="eyebrow">Contact</p>
        <h1>告诉我们你的业务目标</h1>
        <p class="lead">我们会在一个工作日内回复，并给出适合当前阶段的产品方案。</p>
        <ul class="contact-list">
          <li>电话：400-800-2026</li>
          <li>邮箱：hello@example.com</li>
          <li>地址：上海市浦东新区创新大道 88 号</li>
        </ul>
      </section>
      <form class="contact-form">
        <label>
          姓名
          <input type="text" placeholder="请输入姓名" />
        </label>
        <label>
          联系方式
          <input type="email" placeholder="name@example.com" />
        </label>
        <label>
          需求
          <textarea rows="4" placeholder="简单描述你的需求"></textarea>
        </label>
        <button type="submit">提交咨询</button>
      </form>
    </main>
    <script src="./script.js"></script>
  </body>
</html>`,
      "style.css": `body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, system-ui, sans-serif;
  background: #f4f7fb;
  color: #172033;
}

a {
  color: inherit;
  text-decoration: none;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px min(5vw, 56px);
  border-bottom: 1px solid #dbe4ef;
  background: #ffffff;
}

.logo {
  font-size: 20px;
  font-weight: 800;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

nav a {
  border-radius: 8px;
  padding: 9px 12px;
  color: #516173;
  font-weight: 700;
}

nav a.active,
nav a:hover {
  background: #172033;
  color: #ffffff;
}

.hero,
.page {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 64px 0;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  align-items: center;
  gap: 48px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #1769e0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 760px;
  font-size: 42px;
  line-height: 1.15;
}

.lead {
  max-width: 680px;
  margin: 18px 0 0;
  color: #526170;
  font-size: 18px;
  line-height: 1.7;
}

.button,
.contact-form button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  margin-top: 26px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  background: #1769e0;
  color: white;
  cursor: pointer;
  font-weight: 800;
}

.hero-panel,
.product-grid article,
.contact-form {
  border: 1px solid #d9e3ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.08);
}

.hero-panel {
  padding: 28px;
}

.hero-panel h2,
.product-grid h2 {
  margin: 0 0 16px;
}

.metric {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 0;
  border-top: 1px solid #e5edf5;
}

.metric strong {
  color: #1769e0;
  font-size: 28px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;
}

.product-grid article {
  padding: 24px;
}

.product-grid p,
.contact-list {
  color: #526170;
  line-height: 1.7;
}

.contact-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 42px;
}

.contact-list {
  padding-left: 18px;
}

.contact-form {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.contact-form label {
  display: grid;
  gap: 7px;
  color: #334155;
  font-weight: 800;
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  border: 1px solid #cfd8e3;
  border-radius: 8px;
  padding: 11px 12px;
  font: inherit;
  resize: vertical;
}

@media (max-width: 760px) {
  .site-header,
  .hero,
  .contact-layout {
    grid-template-columns: 1fr;
  }

  .site-header {
    display: grid;
  }

  .product-grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 32px;
  }
}`,
      "script.js": `const form = document.querySelector(".contact-form");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("咨询已提交，我们会尽快联系你。");
  });
}`
    }
  },
  react: {
    label: "React",
    entry: "src/App.jsx",
    files: {
      "src/App.jsx": `import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>Hello React</h1>
      <p>This JSX is bundled in your browser with esbuild-wasm.</p>
      <button onClick={() => setCount(count + 1)}>
        Clicked {count} times
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);`,
      "src/style.css": `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  background: #fbfaf7;
  color: #172033;
}

main {
  width: min(520px, calc(100vw - 32px));
}

button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #0f766e;
  color: white;
  cursor: pointer;
}`
    }
  },
  vue: {
    label: "Vue",
    entry: "src/main.js",
    files: {
      "src/main.js": `import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#root");`,
      "src/App.vue": `<template>
  <main class="page">
    <section class="panel">
      <div class="eyebrow">Vue SFC</div>
      <h1>Hello Vue</h1>
      <p>This component is compiled in the browser, then bundled with esbuild-wasm.</p>
      <button @click="count++">Clicked {{ count }} times</button>
    </section>
  </main>
</template>

<script setup>
import { ref } from "vue";

const count = ref(0);
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-content: center;
  padding: 24px;
  font-family: Inter, system-ui, sans-serif;
  background: #f7fbf8;
  color: #172033;
}

.panel {
  width: min(520px, calc(100vw - 48px));
  border: 1px solid #c9d8d0;
  border-radius: 8px;
  padding: 28px;
  background: white;
  box-shadow: 0 20px 50px rgba(23, 32, 51, 0.12);
}

.eyebrow {
  margin-bottom: 10px;
  color: #16704a;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 10px;
  font-size: 34px;
}

p {
  margin: 0 0 18px;
  color: #4b5b68;
  line-height: 1.6;
}

button {
  border: 0;
  border-radius: 8px;
  padding: 11px 15px;
  background: #16704a;
  color: white;
  font-weight: 700;
  cursor: pointer;
}
</style>`
    }
  }
};

let esbuildReady;

function normalizePath(path, base = "") {
  if (path.startsWith("/")) return path.slice(1);
  const stack = base ? base.split("/").filter(Boolean) : [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function getLoader(path) {
  const cleanPath = path.split("?")[0];
  if (cleanPath.endsWith(".tsx")) return "tsx";
  if (cleanPath.endsWith(".ts")) return "ts";
  if (cleanPath.endsWith(".jsx")) return "jsx";
  if (cleanPath.endsWith(".css")) return "css";
  if (cleanPath.endsWith(".json")) return "json";
  return "js";
}

function getLanguage(path) {
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".vue")) return "vue";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  return "javascript";
}

async function ensureEsbuild() {
  if (!esbuildReady) {
    esbuildReady = esbuild.initialize({ wasmURL, worker: true });
  }
  return esbuildReady;
}

function makeHtmlPreview(files, entry) {
  let html = files[entry] ?? files["index.html"] ?? "";
  html = html.replace(
    /<link\s+[^>]*href=["']\.\/style\.css["'][^>]*>/i,
    `<style>${files["style.css"] ?? ""}</style>`
  );
  html = html.replace(
    /<script\s+[^>]*src=["']\.\/script\.js["'][^>]*><\/script>/i,
    `<script>${files["script.js"] ?? ""}<\/script>`
  );
  const navigationScript = `<script>
document.addEventListener("click", function (event) {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || /^[a-zA-Z][a-zA-Z\\d+.-]*:/.test(href)) return;

  const path = href.replace(/^\\.\\//, "").split("#")[0].split("?")[0];
  if (!path.endsWith(".html")) return;

  event.preventDefault();
  window.parent.postMessage({ type: "preview:navigate", path }, "*");
});
<\/script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${navigationScript}</body>`);
  }

  return `${html}${navigationScript}`;
}

function compileVueFile(path, source) {
  const parsed = parse(source, { filename: path });
  const { descriptor } = parsed;
  if (parsed.errors.length) throw parsed.errors[0];

  const id = path.replace(/[^a-z0-9]/gi, "-");
  const script = compileScript(descriptor, { id });
  const template = compileTemplate({
    id,
    source: descriptor.template?.content ?? "",
    filename: path,
    scoped: descriptor.styles.some((style) => style.scoped),
    compilerOptions: {
      bindingMetadata: script.bindings
    }
  });

  if (template.errors.length) throw template.errors[0];

  const styles = descriptor.styles
    .map((style) => compileStyle({ id, source: style.content, filename: path, scoped: style.scoped }).code)
    .join("\n");

  const scriptContent = script.content.replace("export default", "const __sfc__ =");
  return `${scriptContent}
${template.code.replace("export function render", "function render")}
__sfc__.render = render;
${descriptor.styles.some((style) => style.scoped) ? `__sfc__.__scopeId = "data-v-${id}";` : ""}
const style = document.createElement("style");
style.textContent = ${JSON.stringify(styles)};
document.head.appendChild(style);
export default __sfc__;`;
}

function sandboxPlugin(files) {
  return {
    name: "sandbox-files",
    setup(build) {
      build.onResolve({ filter: /^https?:\/\// }, (args) => ({
        path: args.path,
        namespace: "http-url"
      }));

      build.onResolve({ filter: /^[^./].*/ }, (args) => {
        const localPath = normalizePath(args.path);
        if (files[localPath] != null) {
          return { path: localPath, namespace: "sandbox" };
        }
        return {
          path: `https://esm.sh/${args.path}?dev`,
          namespace: "http-url"
        };
      });

      build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => ({
        path: new URL(args.path, args.importer).toString(),
        namespace: "http-url"
      }));

      build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
        const response = await fetch(args.path);
        if (!response.ok) throw new Error(`Failed to fetch ${args.path}`);
        return {
          contents: await response.text(),
          loader: getLoader(args.path),
          resolveDir: args.path
        };
      });

      build.onResolve({ filter: /^\.{1,2}\// }, (args) => {
        const base = args.importer.includes("/") ? args.importer.split("/").slice(0, -1).join("/") : "";
        return { path: normalizePath(args.path, base), namespace: "sandbox" };
      });

      build.onResolve({ filter: /.*/ }, (args) => ({
        path: normalizePath(args.path),
        namespace: "sandbox"
      }));

      build.onLoad({ filter: /.*/, namespace: "sandbox" }, (args) => {
        const source = files[args.path];
        if (source == null) throw new Error(`File not found: ${args.path}`);
        if (args.path.endsWith(".vue")) {
          return {
            contents: compileVueFile(args.path, source),
            loader: "js",
            resolveDir: args.path.split("/").slice(0, -1).join("/")
          };
        }
        return {
          contents: source,
          loader: getLoader(args.path),
          resolveDir: args.path.split("/").slice(0, -1).join("/")
        };
      });
    }
  };
}

async function bundleProject(mode, files, entry) {
  if (mode === "html") return makeHtmlPreview(files, entry);

  await ensureEsbuild();
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    outdir: "/sandbox-dist",
    format: "iife",
    target: "es2020",
    define: {
      __VUE_OPTIONS_API__: "true",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false"
    },
    plugins: [sandboxPlugin(files)]
  });

  const js = result.outputFiles.find((file) => file.path.endsWith(".js"))?.text ?? "";
  const css = result.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}<\/script>
  </body>
</html>`;
}

function App() {
  const [mode, setMode] = useState("react");
  const [files, setFiles] = useState(templates.react.files);
  const [activeFile, setActiveFile] = useState(templates.react.entry);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState(null);
  const frameRef = useRef(null);

  const fileNames = useMemo(() => Object.keys(files), [files]);

  async function runProject(entryOverride) {
    setIsRunning(true);
    setError("");
    try {
      const entry =
        entryOverride ?? (mode === "html" && activeFile.endsWith(".html") ? activeFile : templates[mode].entry);
      const html = await bundleProject(mode, files, entry);
      setPreview(html);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsRunning(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setFiles(templates[nextMode].files);
    setActiveFile(templates[nextMode].entry);
    setPreview("");
    setError("");
    setDeployResult(null);
  }

  async function deployHtmlProject() {
    if (mode !== "html") return;

    setIsDeploying(true);
    setError("");

    try {
      const response = await fetch("/api/deploy/html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          siteId: "demo-html-site",
          files
        })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Deploy failed");
      }

      setDeployResult(result);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsDeploying(false);
    }
  }

  async function editHtmlWithAi() {
    if (mode !== "html" || isAiEditing) return;

    const instruction = aiInstruction.trim();
    if (!instruction) {
      setError("请先输入要让 AI 修改的需求");
      return;
    }

    setIsAiEditing(true);
    setError("");
    setAiSummary("");
    setAiSnapshot({ files, activeFile, preview });

    try {
      const response = await fetch("/api/ai/edit-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          instruction,
          activeFile,
          files
        })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "AI 修改失败");
      }

      const nextFiles = {
        ...files,
        ...result.files
      };
      const nextActiveFile = result.files[activeFile] != null ? activeFile : Object.keys(result.files)[0] || activeFile;
      const entry = nextActiveFile.endsWith(".html") ? nextActiveFile : templates.html.entry;
      const html = await bundleProject("html", nextFiles, entry);

      setFiles(nextFiles);
      setActiveFile(nextActiveFile);
      setPreview(html);
      setAiSummary(result.summary || "AI 已完成修改");
      setAiInstruction("");
      setDeployResult(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsAiEditing(false);
    }
  }

  function undoAiEdit() {
    if (!aiSnapshot) return;

    setFiles(aiSnapshot.files);
    setActiveFile(aiSnapshot.activeFile);
    setPreview(aiSnapshot.preview);
    setAiSummary("已撤销上次 AI 修改");
    setAiSnapshot(null);
  }

  useEffect(() => {
    runProject();
  }, []);

  useEffect(() => {
    function handlePreviewMessage(event) {
      if (mode !== "html" || event.data?.type !== "preview:navigate") return;

      const path = normalizePath(event.data.path);
      if (!path.endsWith(".html") || files[path] == null) return;

      setActiveFile(path);
      runProject(path);
    }

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [mode, files]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Code2 size={22} />
          <span>Online Code Preview</span>
        </div>
        <div className="mode-tabs" role="tablist" aria-label="Project template">
          {Object.entries(templates).map(([key, template]) => (
            <button
              className={key === mode ? "active" : ""}
              key={key}
              onClick={() => switchMode(key)}
              type="button"
            >
              {template.label}
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="icon-button" title="Reset template" onClick={() => switchMode(mode)}>
            <RotateCcw size={18} />
          </button>
          {mode === "html" && (
            <button type="button" className="deploy-button" onClick={deployHtmlProject} disabled={isDeploying}>
              {isDeploying ? <Loader2 size={17} className="spin" /> : <UploadCloud size={17} />}
              {isDeploying ? "Publishing" : "Publish"}
            </button>
          )}
          <button type="button" className="run-button" onClick={() => runProject()} disabled={isRunning}>
            {isRunning ? <Loader2 size={17} className="spin" /> : <Play size={17} />}
            {isRunning ? "Running" : "Run"}
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="file-panel">
          <div className="panel-title">
            <Folder size={16} />
            Files
          </div>
          <div className="file-list">
            {fileNames.map((name) => (
              <button
                className={name === activeFile ? "file active" : "file"}
                key={name}
                onClick={() => setActiveFile(name)}
                type="button"
              >
                <FileCode2 size={15} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-panel">
          <div className="panel-title">
            <span>{activeFile}</span>
            {!isEditorReady && <span className="muted">Loading editor</span>}
          </div>
          <Editor
            height="100%"
            language={getLanguage(activeFile)}
            path={activeFile}
            theme="vs-dark"
            value={files[activeFile]}
            onMount={() => setIsEditorReady(true)}
            onChange={(value) => setFiles({ ...files, [activeFile]: value ?? "" })}
            options={{
              automaticLayout: true,
              fontFamily: "Cascadia Code, Consolas, monospace",
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 14, bottom: 14 },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on"
            }}
          />
          {mode === "html" && (
            <div className="ai-panel">
              <div className="ai-title">
                <span>
                  <Bot size={16} />
                  AI 修改 HTML
                </span>
                {aiSummary && <span className="ai-summary">{aiSummary}</span>}
              </div>
              <div className="ai-controls">
                <textarea
                  value={aiInstruction}
                  onChange={(event) => setAiInstruction(event.target.value)}
                  placeholder="例如：把首页改成一家咖啡店官网，增加菜单区域和预约按钮"
                  rows={3}
                  disabled={isAiEditing}
                />
                <div className="ai-actions">
                  <button type="button" className="ai-undo-button" onClick={undoAiEdit} disabled={!aiSnapshot || isAiEditing}>
                    <RotateCcw size={16} />
                    撤销
                  </button>
                  <button type="button" className="ai-edit-button" onClick={editHtmlWithAi} disabled={isAiEditing}>
                    {isAiEditing ? <Loader2 size={16} className="spin" /> : <Bot size={16} />}
                    {isAiEditing ? "修改中" : "让 AI 修改"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="preview-panel">
          <div className="panel-title">
            <span>Preview</span>
            {deployResult && (
              <a
                className="deploy-link"
                href={deployResult.ossUrl || deployResult.localUrl}
                target="_blank"
                rel="noreferrer"
              >
                Published
              </a>
            )}
          </div>
          {error ? (
            <div className="error-box">
              <AlertTriangle size={18} />
              <pre>{error}</pre>
            </div>
          ) : (
            <iframe ref={frameRef} title="preview" sandbox="allow-scripts" srcDoc={preview} />
          )}
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
