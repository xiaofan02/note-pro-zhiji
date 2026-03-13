import { NodeViewContent, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Copy, Check, Play, Loader2, X, RotateCcw } from "lucide-react";
import { useState, useRef } from "react";
import { runCode, isRunnable, type RunResult } from "@/lib/codeRunner";

const CodeBlockComponent = ({ node, updateAttributes, extension }: NodeViewProps) => {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const language = node.attrs.language || "";

  const handleCopy = () => {
    const text = node.textContent;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRun = async () => {
    const code = node.textContent;
    if (!code.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await runCode(language, code);
      setResult(res);
    } catch (e: any) {
      setResult({ output: "", error: e.message });
    }
    setRunning(false);
  };

  const canRun = isRunnable(language);

  return (
    <NodeViewWrapper className="relative group my-2">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/80 rounded-t-lg border-b border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <select
            contentEditable={false}
            value={language}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            className="bg-transparent outline-none cursor-pointer text-xs text-muted-foreground"
          >
            <option value="">自动检测</option>
            {["javascript", "typescript", "python", "java", "c", "cpp", "csharp", "go", "rust", "ruby", "php", "swift", "kotlin", "html", "css", "sql", "bash", "json", "yaml", "xml", "markdown"].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          {canRun && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              可运行
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canRun && (
            <button
              contentEditable={false}
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 font-medium"
            >
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {running ? "运行中..." : "运行"}
            </button>
          )}
          <button
            contentEditable={false}
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-accent transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>

      {/* Code content */}
      <pre className={`!rounded-t-none !mt-0 ${result ? "!rounded-b-none !mb-0" : ""}`}>
        <NodeViewContent as={"code" as any} />
      </pre>

      {/* Run result */}
      {result && (
        <div
          contentEditable={false}
          className="border border-t-0 border-border rounded-b-lg bg-background overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-1 bg-muted/50 border-b border-border text-[10px] text-muted-foreground">
            <span className="font-medium">
              {result.error ? "⚠️ 输出" : "✅ 输出"}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRun}
                className="p-0.5 rounded hover:bg-accent transition-colors"
                title="重新运行"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setResult(null)}
                className="p-0.5 rounded hover:bg-accent transition-colors"
                title="关闭"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* HTML preview */}
          {result.html ? (
            <iframe
              ref={iframeRef}
              srcDoc={result.html}
              sandbox="allow-scripts"
              className="w-full min-h-[100px] max-h-[300px] bg-white border-0"
              style={{ resize: "vertical" }}
            />
          ) : (
            <div className="px-3 py-2 max-h-[200px] overflow-auto">
              {result.output && (
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono !bg-transparent !p-0 !m-0 !border-0">
                  {result.output}
                </pre>
              )}
              {result.error && (
                <pre className="text-xs text-destructive whitespace-pre-wrap font-mono !bg-transparent !p-0 !m-0 !border-0 mt-1">
                  {result.error}
                </pre>
              )}
              {!result.output && !result.error && (
                <span className="text-xs text-muted-foreground italic">（无输出）</span>
              )}
            </div>
          )}

          {/* Python loading hint */}
          {running && language === "python" && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/30">
              ⏳ 首次运行 Python 需加载运行环境（约 5-10 秒）...
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
