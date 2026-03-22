import { useState } from "react";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Link, Quote, Code, Minus,
  Palette, Highlighter
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (val: string) => void;
}

const FONT_COLORS = [
  { label: "红色", value: "red", class: "bg-red-500" },
  { label: "橙色", value: "orange", class: "bg-orange-500" },
  { label: "黄色", value: "yellow", class: "bg-yellow-500" },
  { label: "绿色", value: "green", class: "bg-green-500" },
  { label: "蓝色", value: "blue", class: "bg-blue-500" },
  { label: "紫色", value: "purple", class: "bg-purple-500" },
  { label: "粉色", value: "pink", class: "bg-pink-500" },
  { label: "灰色", value: "gray", class: "bg-gray-500" },
];

const BG_COLORS = [
  { label: "红色", value: "#fee2e2", class: "bg-red-100" },
  { label: "黄色", value: "#fef9c3", class: "bg-yellow-100" },
  { label: "绿色", value: "#dcfce7", class: "bg-green-100" },
  { label: "蓝色", value: "#dbeafe", class: "bg-blue-100" },
  { label: "紫色", value: "#f3e8ff", class: "bg-purple-100" },
  { label: "粉色", value: "#fce7f3", class: "bg-pink-100" },
  { label: "橙色", value: "#ffedd5", class: "bg-orange-100" },
  { label: "灰色", value: "#f3f4f6", class: "bg-gray-100" },
];

const MarkdownToolbar = ({ textareaRef, content, onContentChange }: MarkdownToolbarProps) => {
  const getSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { start: 0, end: 0, selected: "" };
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    return { start, end, selected: content.slice(start, end) };
  };

  const replaceSelection = (before: string, after: string, placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { start, end, selected } = getSelection();
    const text = selected || placeholder;
    const newContent = content.slice(0, start) + before + text + after + content.slice(end);
    onContentChange(newContent);
    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + text.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { start } = getSelection();
    // Find the start of the current line
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const newContent = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    onContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const insertHorizontalRule = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { start } = getSelection();
    const newContent = content.slice(0, start) + "\n---\n" + content.slice(start);
    onContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      const pos = start + 5;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertColoredText = (color: string) => {
    const { selected } = getSelection();
    const text = selected || "文字";
    replaceSelection(`<span style="color:${color}">`, "</span>", text);
  };

  const insertHighlight = (bgColor: string) => {
    const { selected } = getSelection();
    const text = selected || "文字";
    replaceSelection(`<mark style="background-color:${bgColor}">`, "</mark>", text);
  };

  const btnClass =
    "inline-flex items-center justify-center w-7 h-7 rounded hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors";

  return (
    <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-border bg-muted/30 flex-wrap">
      {/* Text formatting */}
      <button onClick={() => replaceSelection("**", "**", "粗体")} className={btnClass} title="粗体">
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => replaceSelection("*", "*", "斜体")} className={btnClass} title="斜体">
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => replaceSelection("~~", "~~", "删除线")} className={btnClass} title="删除线">
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Headings */}
      <button onClick={() => insertAtLineStart("# ")} className={btnClass} title="一级标题">
        <Heading1 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => insertAtLineStart("## ")} className={btnClass} title="二级标题">
        <Heading2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => insertAtLineStart("### ")} className={btnClass} title="三级标题">
        <Heading3 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Lists */}
      <button onClick={() => insertAtLineStart("- ")} className={btnClass} title="无序列表">
        <List className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => insertAtLineStart("1. ")} className={btnClass} title="有序列表">
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => insertAtLineStart("- [ ] ")} className={btnClass} title="待办事项">
        <CheckSquare className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Block elements */}
      <button onClick={() => insertAtLineStart("> ")} className={btnClass} title="引用">
        <Quote className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => replaceSelection("`", "`", "代码")} className={btnClass} title="行内代码">
        <Code className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => insertHorizontalRule()} className={btnClass} title="分割线">
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Link */}
      <button onClick={() => replaceSelection("[", "](url)", "链接文字")} className={btnClass} title="链接">
        <Link className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Font color */}
      <Popover>
        <PopoverTrigger asChild>
          <button className={btnClass} title="字体颜色">
            <Palette className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">字体颜色</p>
          <div className="flex gap-1.5 flex-wrap">
            {FONT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => insertColoredText(c.value)}
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
          <button className={btnClass} title="背景颜色">
            <Highlighter className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">高亮背景</p>
          <div className="flex gap-1.5 flex-wrap">
            {BG_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => insertHighlight(c.value)}
                className={`w-6 h-6 rounded-full ${c.class} border border-border hover:ring-2 ring-ring ring-offset-1 ring-offset-background transition-all`}
                title={c.label}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MarkdownToolbar;
