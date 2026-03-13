import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Link, Quote, Code, Minus,
  Palette, Highlighter, Image as ImageIcon, Undo2, Redo2,
  CodeSquare
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

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

const EditorToolbar = ({ editor, onInsertImage }: EditorToolbarProps) => {
  if (!editor) return null;

  const btnClass = (active: boolean = false) =>
    `inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
    }`;

  const setLink = () => {
    const url = window.prompt("输入链接地址", "https://");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-border bg-muted/30 flex-wrap">
      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass()} title="撤销">
        <Undo2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass()} title="重做">
        <Redo2 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))} title="粗体">
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))} title="斜体">
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))} title="删除线">
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))} title="一级标题">
        <Heading1 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))} title="二级标题">
        <Heading2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive("heading", { level: 3 }))} title="三级标题">
        <Heading3 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))} title="无序列表">
        <List className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))} title="有序列表">
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive("taskList"))} title="待办事项">
        <CheckSquare className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive("blockquote"))} title="引用">
        <Quote className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive("code"))} title="行内代码">
        <Code className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btnClass(editor.isActive("codeBlock"))} title="代码块">
        <CodeSquare className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass()} title="分割线">
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button onClick={setLink} className={btnClass(editor.isActive("link"))} title="链接">
        <Link className="w-3.5 h-3.5" />
      </button>

      {onInsertImage && (
        <button onClick={onInsertImage} className={btnClass()} title="插入图片">
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="w-px h-4 bg-border mx-1" />

      {/* Font color */}
      <Popover>
        <PopoverTrigger asChild>
          <button className={btnClass()} title="字体颜色">
            <Palette className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
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
        <PopoverTrigger asChild>
          <button className={btnClass()} title="背景颜色">
            <Highlighter className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
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
  );
};

export default EditorToolbar;
