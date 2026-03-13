import { NodeViewContent, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const CodeBlockComponent = ({ node, updateAttributes, extension }: NodeViewProps) => {
  const [copied, setCopied] = useState(false);
  const language = node.attrs.language || "";

  const handleCopy = () => {
    const text = node.textContent;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <NodeViewWrapper className="relative group my-2">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/80 rounded-t-lg border-b border-border text-xs text-muted-foreground">
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
        <button
          contentEditable={false}
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-accent transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="!rounded-t-none !mt-0">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
