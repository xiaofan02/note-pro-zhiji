/**
 * Multi-language code runner
 * Supports: JavaScript, Python (Pyodide), HTML/CSS preview
 */

export interface RunResult {
  output: string;
  error?: string;
  html?: string; // for HTML preview
}

// ── JavaScript Runner (sandboxed iframe) ──
function runJavaScript(code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox.add("allow-scripts");
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      document.body.removeChild(iframe);
      resolve({ output: "", error: "执行超时（5秒）" });
    }, 5000);

    const handler = (e: MessageEvent) => {
      if (e.source === iframe.contentWindow) {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        document.body.removeChild(iframe);
        const data = e.data;
        if (data.error) {
          resolve({ output: data.output || "", error: data.error });
        } else {
          resolve({ output: data.output || "" });
        }
      }
    };
    window.addEventListener("message", handler);

    const script = `
      <script>
        const __logs = [];
        const __origConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
        ['log','warn','error','info'].forEach(m => {
          console[m] = (...args) => {
            __logs.push(args.map(a => {
              try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
              catch { return String(a); }
            }).join(' '));
          };
        });
        try {
          const __result = eval(${JSON.stringify(code)});
          if (__result !== undefined && !__logs.length) __logs.push(String(__result));
          parent.postMessage({ output: __logs.join('\\n') }, '*');
        } catch(e) {
          parent.postMessage({ output: __logs.join('\\n'), error: e.message }, '*');
        }
      <\/script>
    `;
    iframe.srcdoc = script;
  });
}

// ── Python Runner (Pyodide) ──
let pyodidePromise: Promise<any> | null = null;

function loadPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
    script.onload = async () => {
      try {
        const pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
        });
        resolve(pyodide);
      } catch (e) {
        pyodidePromise = null;
        reject(e);
      }
    };
    script.onerror = () => {
      pyodidePromise = null;
      reject(new Error("Pyodide 加载失败，请检查网络连接"));
    };
    document.head.appendChild(script);
  });
  return pyodidePromise;
}

async function runPython(code: string): Promise<RunResult> {
  try {
    const pyodide = await loadPyodide();
    // Capture stdout
    pyodide.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
    `);
    try {
      const result = await pyodide.runPythonAsync(code);
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      let output = stdout || "";
      if (result !== undefined && result !== null && !stdout) {
        output = String(result);
      }
      if (stderr) {
        return { output, error: stderr };
      }
      return { output };
    } catch (e: any) {
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      return { output: stdout || "", error: e.message };
    }
  } catch (e: any) {
    return { output: "", error: e.message };
  }
}

// ── HTML Runner ──
function runHTML(code: string): Promise<RunResult> {
  return Promise.resolve({ output: "", html: code });
}

// ── TypeScript (run as JS) ──
function runTypeScript(code: string): Promise<RunResult> {
  // Strip type annotations simplistically for basic TS
  const jsCode = code
    .replace(/:\s*(string|number|boolean|any|void|never|object|unknown|undefined|null)(\[\])?\s*/g, " ")
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, "")
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, "")
    .replace(/<\w+>/g, "");
  return runJavaScript(jsCode);
}

// ── Main Runner ──
const RUNNABLE_LANGUAGES = ["javascript", "typescript", "python", "html", "css"] as const;
export type RunnableLanguage = typeof RUNNABLE_LANGUAGES[number];

export function isRunnable(language: string): boolean {
  return RUNNABLE_LANGUAGES.includes(language.toLowerCase() as any);
}

export async function runCode(language: string, code: string): Promise<RunResult> {
  const lang = language.toLowerCase();
  switch (lang) {
    case "javascript":
    case "js":
      return runJavaScript(code);
    case "typescript":
    case "ts":
      return runTypeScript(code);
    case "python":
      return runPython(code);
    case "html":
      return runHTML(code);
    case "css":
      return runHTML(`<style>${code}</style><p>CSS 已应用（预览文本）</p>`);
    default:
      return { output: "", error: `不支持运行 ${language}` };
  }
}
