import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Link, Quote, Code, Minus,
  Palette, Highlighter, Image as ImageIcon, Undo2, Redo2,
  CodeSquare, Type
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface EditorToolbarProps {
  editor: Editor | null;
  onInsertImage?: () => void;
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

const FONT_SIZES = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
];

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

const EditorToolbar = ({ editor, onInsertImage }: EditorToolbarProps) => {
  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("输入链接地址", "https://");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const currentFontSize = editor.getAttributes("textStyle")?.fontSize || "";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-border bg-muted/30 flex-wrap">
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="撤销">
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="重做">
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Font size selector */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-1.5 h-7 rounded transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground text-xs">
                  <Type className="w-3.5 h-3.5" />
                  <span className="min-w-[28px] text-center">{currentFontSize || "默认"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">文字大小</p>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => editor.chain().focus().unsetFontSize().run()}
                    className="px-3 py-1 text-xs rounded hover:bg-accent text-left"
                  >
                    默认
                  </button>
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => editor.chain().focus().setFontSize(s.value).run()}
                      className={`px-3 py-1 text-xs rounded hover:bg-accent text-left ${currentFontSize === s.value ? "bg-accent font-medium" : ""}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">文字大小</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="粗体">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="斜体">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="删除线">
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
      </div>
    </TooltipProvider>
  );
};

export default EditorToolbar;
