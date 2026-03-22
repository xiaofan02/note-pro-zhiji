import { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Sparkles, PenLine, BookOpen, Loader2 } from "lucide-react";

interface AiSelectionToolbarProps {
  editor: Editor | null;
  onAiAction: (action: "rewrite" | "continue" | "polish" | "expand", selectedText: string) => void;
  isLoading: boolean;
}

const AiSelectionToolbar = ({ editor, onAiAction, isLoading }: AiSelectionToolbarProps) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (to - from < 5) {
        setShow(false);
        return;
      }

      const coords = editor.view.coordsAtPos(to);
      const editorRect = editor.view.dom.closest(".flex-1.overflow-y-auto")?.getBoundingClientRect();
      if (!editorRect) return;

      setPosition({
        top: coords.bottom - editorRect.top + 8,
        left: Math.min(Math.max(coords.left - editorRect.left, 0), editorRect.width - 200),
      });
      setShow(true);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor]);

  // Hide toolbar when clicking outside
  useEffect(() => {
    if (!show) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Delay hide to allow button clicks to register
        hideTimer.current = setTimeout(() => setShow(false), 150);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      clearHideTimer();
    };
  }, [show, clearHideTimer]);

  const handleAction = (action: "rewrite" | "continue" | "polish" | "expand") => {
    if (!editor) return;
    clearHideTimer();
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " "
    );
    setShow(false);
    onAiAction(action, selectedText);
  };

  if (!show || !editor || isLoading) return null;

  const { from, to } = editor.state.selection;
  if (to - from < 5) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        clearHideTimer();
      }}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-popover border border-border shadow-lg">
        <button
          onClick={() => handleAction("rewrite")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <PenLine className="w-3 h-3" /> 改写
        </button>
        <button
          onClick={() => handleAction("polish")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Sparkles className="w-3 h-3" /> 润色
        </button>
        <button
          onClick={() => handleAction("expand")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <BookOpen className="w-3 h-3" /> 扩写
        </button>
        <button
          onClick={() => handleAction("continue")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <PenLine className="w-3 h-3" /> 续写
        </button>
      </div>
    </div>
  );
};

export default AiSelectionToolbar;
