import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Editor from "@monaco-editor/react";
import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import { compileScript, compileStyle, compileTemplate, parse } from "@vue/compiler-sfc";
import {
  AlertTriangle,
  Code2,
  FileCode2,
  Folder,
  Loader2,
  Play,
  RotateCcw
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
    <title>Hello HTML</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main>
      <h1>Hello HTML</h1>
      <p>Edit the files and press Run.</p>
      <button id="counter">Clicked 0 times</button>
    </main>
    <script src="./script.js"></script>
  </body>
</html>`,
      "style.css": `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  background: #f3f7fb;
  color: #172033;
}

main {
  width: min(520px, calc(100vw - 32px));
}

button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #1769e0;
  color: white;
  cursor: pointer;
}`,
      "script.js": `let count = 0;
const button = document.querySelector("#counter");

button.addEventListener("click", () => {
  count += 1;
  button.textContent = \`Clicked \${count} times\`;
});`
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

function makeHtmlPreview(files) {
  let html = files["index.html"] ?? "";
  html = html.replace(
    /<link\s+[^>]*href=["']\.\/style\.css["'][^>]*>/i,
    `<style>${files["style.css"] ?? ""}</style>`
  );
  html = html.replace(
    /<script\s+[^>]*src=["']\.\/script\.js["'][^>]*><\/script>/i,
    `<script>${files["script.js"] ?? ""}<\/script>`
  );
  return html;
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
  if (mode === "html") return makeHtmlPreview(files);

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
  const [isEditorReady, setIsEditorReady] = useState(false);
  const frameRef = useRef(null);

  const fileNames = useMemo(() => Object.keys(files), [files]);

  async function runProject() {
    setIsRunning(true);
    setError("");
    try {
      const html = await bundleProject(mode, files, templates[mode].entry);
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
  }

  useEffect(() => {
    runProject();
  }, []);

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
          <button type="button" className="run-button" onClick={runProject} disabled={isRunning}>
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
        </section>

        <section className="preview-panel">
          <div className="panel-title">Preview</div>
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
