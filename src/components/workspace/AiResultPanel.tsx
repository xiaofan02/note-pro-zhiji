import { useState } from "react";
import { Sparkles, Plus, Replace, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AiResultPanelProps {
  result: string;
  type: "organize" | "summarize" | "rewrite" | "continue" | "polish" | "expand";
  onAppend: () => void;
  onReplace: () => void;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  organize: "智能整理结果",
  summarize: "AI 摘要",
  rewrite: "AI 改写结果",
  continue: "AI 续写结果",
  polish: "AI 润色结果",
  expand: "AI 扩写结果",
};

const AiResultPanel = ({ result, type, onAppend, onReplace, onClose }: AiResultPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mx-6 mt-3 rounded-lg border border-primary/30 bg-accent/40 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-primary/20">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {typeLabels[type] || "AI 结果"}
          <ChevronDown className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <div className="flex items-center gap-1.5">
          {/* Action buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="w-3 h-3" /> 应用到笔记
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem onClick={onAppend} className="text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5 mr-2" /> 追加到笔记末尾
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReplace} className="text-xs cursor-pointer">
                <Replace className="w-3.5 h-3.5 mr-2" /> 覆盖当前内容
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content preview */}
      {!collapsed && (
        <div
          className="p-4 max-h-[300px] overflow-y-auto text-sm leading-relaxed prose prose-sm max-w-none
            prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1.5
            prose-p:text-foreground/80 prose-p:my-1.5
            prose-strong:text-foreground
            prose-ul:my-1.5 prose-li:text-foreground/80
            prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground prose-blockquote:my-2"
          dangerouslySetInnerHTML={{ __html: result }}
        />
      )}
    </div>
  );
};

export default AiResultPanel;
