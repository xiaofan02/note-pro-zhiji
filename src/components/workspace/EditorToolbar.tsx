import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Link, Quote, Code, Minus,
  Palette, Highlighter, Image as ImageIcon, Undo2, Redo2,
  CodeSquare, Type, AArrowUp, AArrowDown, Table as TableIcon,
  Paintbrush, SlidersHorizontal,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditorToolbarProps {
  editor: Editor | null;
  onInsertImage?: () => void;
  formatPainterActive?: boolean;
  onToggleFormatPainter?: () => void;
  onSetOrderedListStyle?: (
    listType: "1" | "a" | "A" | "i" | "I",
    start: number,
    numberingStyle?: "default" | "cjk" | "outline-decimal"
  ) => void;
}

const FONT_COLORS = [
  { label: "默认", value: "", class: "bg-foreground" },
  { label: "红色", value: "#ef4444", class: "bg-red-500" },
  { label: "橙色", value: "#f97316", class: "bg-orange-500" },
  { label: "黄色", value: "#eab308", class: "bg-yellow-500" },
  { label: "绿色", value: "#22c55e", class: "bg-green-500" },
  { label: "蓝色", value: "#3b82f6", class: "bg-blue-500" },
  { label: "紫色", value: "#a855f7", class: "bg-purple-500" },
  { label: "粉色", value: "#ec4899", class: "bg-pink-500" },
];

const BG_COLORS = [
  { label: "无", value: "", class: "bg-background border border-border" },
  { label: "红色", value: "#fee2e2", class: "bg-red-100" },
  { label: "黄色", value: "#fef9c3", class: "bg-yellow-100" },
  { label: "绿色", value: "#dcfce7", class: "bg-green-100" },
  { label: "蓝色", value: "#dbeafe", class: "bg-blue-100" },
  { label: "紫色", value: "#f3e8ff", class: "bg-purple-100" },
  { label: "粉色", value: "#fce7f3", class: "bg-pink-100" },
  { label: "橙色", value: "#ffedd5", class: "bg-orange-100" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
const DEFAULT_SIZE = 16;

interface ToolbarBtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

const ToolbarBtn = ({ onClick, active = false, disabled, tooltip, children }: ToolbarBtnProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
          active
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        } disabled:opacity-40`}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
  </Tooltip>
);

function getCurrentFontSize(editor: Editor): number {
  const attrs = editor.getAttributes("textStyle");
  if (attrs?.fontSize) {
    return parseInt(attrs.fontSize, 10);
  }
  return DEFAULT_SIZE;
}

function applyFontSize(editor: Editor, fontSize: number | null) {
  const chain = editor.chain().focus() as any;
  if (fontSize === null) {
    chain.unsetFontSize();
  } else {
    chain.setFontSize(`${fontSize}px`);
  }
  // Persist list marker size with listItem attributes so reload keeps consistency.
  if (editor.isActive("orderedList")) {
    chain.updateAttributes("listItem", { fontSize: fontSize ? `${fontSize}px` : null });
  }
  chain.run();
}

function stepFontSize(editor: Editor, direction: "up" | "down") {
  const current = getCurrentFontSize(editor);
  let targetIndex: number;
  if (direction === "up") {
    targetIndex = FONT_SIZES.findIndex((s) => s > current);
    if (targetIndex === -1) return;
  } else {
    const reverseIdx = [...FONT_SIZES].reverse().findIndex((s) => s < current);
    if (reverseIdx === -1) return;
    targetIndex = FONT_SIZES.length - 1 - reverseIdx;
  }
  const newSize = FONT_SIZES[targetIndex];
  if (newSize === DEFAULT_SIZE) {
    applyFontSize(editor, null);
  } else {
    applyFontSize(editor, newSize);
  }
}

const EditorToolbar = ({ editor, onInsertImage, formatPainterActive = false, onToggleFormatPainter, onSetOrderedListStyle }: EditorToolbarProps) => {
  const [currentSize, setCurrentSize] = useState(DEFAULT_SIZE);
  const [numberingDialogOpen, setNumberingDialogOpen] = useState(false);
  const [numberingType, setNumberingType] = useState<"1" | "a" | "A" | "i" | "I">("1");
  const [numberingStyle, setNumberingStyle] = useState<"default" | "cjk" | "outline-decimal">("default");
  const [numberingStart, setNumberingStart] = useState(1);

  // Update current font size on selection/transaction change
  useEffect(() => {
    if (!editor) return;
    const update = () => setCurrentSize(getCurrentFontSize(editor));
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // Keyboard shortcuts for font size
  useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === ">" || e.key === ".") {
          e.preventDefault();
          stepFontSize(editor, "up");
        } else if (e.key === "<" || e.key === ",") {
          e.preventDefault();
          stepFontSize(editor, "down");
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("输入链接地址", "https://");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const openNumberingDialog = () => {
    const attrs = (editor.getAttributes("orderedList") || {}) as any;
    setNumberingType((attrs.type as "1" | "a" | "A" | "i" | "I") || "1");
    setNumberingStyle((attrs.numberingStyle as "default" | "cjk" | "outline-decimal") || "default");
    setNumberingStart(Math.max(1, parseInt(String(attrs.start ?? 1), 10) || 1));
    setNumberingDialogOpen(true);
  };

  const applyNumbering = () => {
    onSetOrderedListStyle?.(numberingType, numberingStart, numberingStyle);
    setNumberingDialogOpen(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-border bg-muted/30 flex-wrap">
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="撤销 (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="重做 (Ctrl+Y)">
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Font size: decrease, display, increase */}
        <ToolbarBtn onClick={() => stepFontSize(editor, "down")} tooltip="减小字号 (Ctrl+Shift+,)">
          <AArrowDown className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Tooltip>
          <TooltipTrigger asChild>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-1.5 h-7 rounded transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground text-xs min-w-[40px] justify-center">
                  <Type className="w-3 h-3" />
                  <span>{currentSize}px</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">文字大小</p>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => { applyFontSize(editor, null); }}
                    className={`px-3 py-1 text-xs rounded hover:bg-accent text-left ${currentSize === DEFAULT_SIZE ? "bg-accent font-medium" : ""}`}
                  >
                    默认 (16px)
                  </button>
                  {FONT_SIZES.filter(s => s !== DEFAULT_SIZE).map((s) => (
                    <button
                      key={s}
                      onClick={() => applyFontSize(editor, s)}
                      className={`px-3 py-1 text-xs rounded hover:bg-accent text-left ${currentSize === s ? "bg-accent font-medium" : ""}`}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">文字大小</TooltipContent>
        </Tooltip>

        <ToolbarBtn onClick={() => stepFontSize(editor, "up")} tooltip="增大字号 (Ctrl+Shift+.)">
          <AArrowUp className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="粗体 (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="斜体 (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="删除线 (Ctrl+Shift+S)">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} tooltip="一级标题">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} tooltip="二级标题">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} tooltip="三级标题">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tooltip="无序列表">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tooltip="有序列表">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={openNumberingDialog} tooltip="编号设置">
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} tooltip="待办事项">
          <CheckSquare className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} tooltip="引用">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} tooltip="行内代码">
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} tooltip="代码块">
          <CodeSquare className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} tooltip="分割线">
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={setLink} active={editor.isActive("link")} tooltip="链接">
          <Link className="w-3.5 h-3.5" />
        </ToolbarBtn>
        {onToggleFormatPainter && (
          <ToolbarBtn onClick={onToggleFormatPainter} active={formatPainterActive} tooltip="格式刷（先复制再涂抹）">
            <Paintbrush className="w-3.5 h-3.5" />
          </ToolbarBtn>
        )}

        {onInsertImage && (
          <ToolbarBtn onClick={onInsertImage} tooltip="插入图片">
            <ImageIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        {/* Font color */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                  <Palette className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">字体颜色</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">字体颜色</p>
            <div className="flex gap-1.5 flex-wrap">
              {FONT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    if (c.value) {
                      editor.chain().focus().setColor(c.value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                  }}
                  className={`w-6 h-6 rounded-full ${c.class} hover:ring-2 ring-ring ring-offset-1 ring-offset-background transition-all`}
                  title={c.label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Background color */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                  <Highlighter className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">背景颜色</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">高亮背景</p>
            <div className="flex gap-1.5 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={c.value || "none"}
                  onClick={() => {
                    if (c.value) {
                      editor.chain().focus().toggleHighlight({ color: c.value }).run();
                    } else {
                      editor.chain().focus().unsetHighlight().run();
                    }
                  }}
                  className={`w-6 h-6 rounded-full ${c.class} hover:ring-2 ring-ring ring-offset-1 ring-offset-background transition-all`}
                  title={c.label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Table */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">表格</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">表格操作</p>
            <div className="flex flex-col gap-0.5 min-w-[140px]">
              <button onClick={() => (editor.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">插入 3×3 表格</button>
              <button onClick={() => (editor.chain().focus() as any).addColumnBefore().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">在左侧插入列</button>
              <button onClick={() => (editor.chain().focus() as any).addColumnAfter().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">在右侧插入列</button>
              <button onClick={() => (editor.chain().focus() as any).addRowBefore().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">在上方插入行</button>
              <button onClick={() => (editor.chain().focus() as any).addRowAfter().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">在下方插入行</button>
              <div className="h-px bg-border my-0.5" />
              <button onClick={() => (editor.chain().focus() as any).deleteColumn().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-destructive/10 hover:text-destructive text-left">删除当前列</button>
              <button onClick={() => (editor.chain().focus() as any).deleteRow().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-destructive/10 hover:text-destructive text-left">删除当前行</button>
              <button onClick={() => (editor.chain().focus() as any).deleteTable().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-destructive/10 hover:text-destructive text-left">删除整个表格</button>
              <div className="h-px bg-border my-0.5" />
              <button onClick={() => (editor.chain().focus() as any).mergeCells().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">合并选中单元格</button>
              <button onClick={() => (editor.chain().focus() as any).splitCell().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">拆分单元格</button>
              <button onClick={() => (editor.chain().focus() as any).toggleHeaderCell().run()}
                className="px-3 py-1.5 text-xs rounded hover:bg-accent text-left">切换表头单元格</button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Dialog open={numberingDialogOpen} onOpenChange={setNumberingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编号设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">编号样式</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "1, 2, 3", type: "1" as const, style: "default" as const },
                  { label: "一, 二, 三", type: "1" as const, style: "cjk" as const },
                  { label: "A, B, C", type: "A" as const, style: "default" as const },
                  { label: "a, b, c", type: "a" as const, style: "default" as const },
                  { label: "I, II, III", type: "I" as const, style: "default" as const },
                  { label: "i, ii, iii", type: "i" as const, style: "default" as const },
                  { label: "1.1 / 1.1.1", type: "1" as const, style: "outline-decimal" as const },
                ].map((item) => {
                  const active = numberingType === item.type && numberingStyle === item.style;
                  return (
                    <button
                      key={`${item.type}-${item.style}-${item.label}`}
                      onClick={() => {
                        setNumberingType(item.type);
                        setNumberingStyle(item.style);
                      }}
                      className={`px-3 py-2 text-xs rounded-md border text-left transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">起始编号</p>
              <input
                type="number"
                min={1}
                value={numberingStart}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  setNumberingStart(Number.isNaN(next) ? 1 : Math.max(1, next));
                }}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
              <p className="text-[11px] text-muted-foreground">多级编号模式支持到三级：`1` / `1.1` / `1.1.1`</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNumberingDialogOpen(false)}
                className="px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={applyNumbering}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                应用
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default EditorToolbar;
