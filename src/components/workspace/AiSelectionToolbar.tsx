import { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Sparkles, PenLine, BookOpen, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AiSelectionToolbarProps {
  editor: Editor | null;
  onAiAction: (action: "rewrite" | "continue" | "polish" | "expand", selectedText: string) => void;
  isLoading: boolean;
}

const AiSelectionToolbar = ({ editor, onAiAction, isLoading }: AiSelectionToolbarProps) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (to - from < 5) {
        setShow(false);
        return;
      }

      // Get coordinates of selection end
      const coords = editor.view.coordsAtPos(to);
      const editorRect = editor.view.dom.closest(".flex-1.overflow-y-auto")?.getBoundingClientRect();
      if (!editorRect) return;

      setPosition({
        top: coords.bottom - editorRect.top + 8,
        left: Math.min(coords.left - editorRect.left, editorRect.width - 200),
      });
      setShow(true);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    // Hide on blur or click outside
    const handleBlur = () => setTimeout(() => setShow(false), 200);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  if (!show || !editor || isLoading) return null;

  const selectedText = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    " "
  );

  if (selectedText.trim().length < 5) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50"
      style={{ top: position.top, left: position.left }}
    >
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
            <Sparkles className="w-3 h-3" /> AI 处理
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[150px]">
          <DropdownMenuItem onClick={() => onAiAction("rewrite", selectedText)} className="text-xs cursor-pointer">
            <PenLine className="w-3.5 h-3.5 mr-2" /> 智能改写
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAiAction("polish", selectedText)} className="text-xs cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 mr-2" /> 润色优化
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAiAction("expand", selectedText)} className="text-xs cursor-pointer">
            <BookOpen className="w-3.5 h-3.5 mr-2" /> 扩写展开
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAiAction("continue", selectedText)} className="text-xs cursor-pointer">
            <PenLine className="w-3.5 h-3.5 mr-2" /> 续写内容
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AiSelectionToolbar;
