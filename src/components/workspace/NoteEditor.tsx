import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Tag } from "@/hooks/useTags";
import { Save, Sparkles, FileText, Loader2, Mic, Download, Upload, Share2, Link2, Pin, PinOff, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import UpgradePrompt from "./UpgradePrompt";
import AiResultPanel from "./AiResultPanel";
import AiSelectionToolbar from "./AiSelectionToolbar";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import EditorToolbar from "./EditorToolbar";
import CodeBlockComponent from "./CodeBlockComponent";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const lowlight = createLowlight(common);

type AiActionType = "organize" | "summarize" | "rewrite" | "continue" | "polish" | "expand";

interface AiResult {
  content: string;
  type: AiActionType;
  selectionFrom?: number;
  selectionTo?: number;
}

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  tags: Tag[];
  noteTags: Tag[];
  onCreateTag: (name: string) => Promise<any>;
  onAddTag: (noteId: string, tagId: string) => void;
  onRemoveTag: (noteId: string, tagId: string) => void;
  pageFontSize: number;
  onTogglePin?: (id: string) => void;
  onToggleShare?: (id: string) => Promise<string | null>;
  onImportFile?: () => void;
}

const NoteEditor = ({ note, onUpdate, tags, noteTags, onCreateTag, onAddTag, onRemoveTag, pageFontSize, onTogglePin, onToggleShare, onImportFile }: NoteEditorProps) => {
  const { user } = useAuth();
  const { isPro } = useUserRole();
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const skipNextUpdate = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const debouncedSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await onUpdate(note.id, { title: newTitle, content: newContent });
        setSaving(false);
      }, 800);
    },
    [note.id, onUpdate]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      CodeBlockLowlight.extend({
        addNodeView() { return ReactNodeViewRenderer(CodeBlockComponent); },
      }).configure({ lowlight }),
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage.configure({ inline: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle, Color,
      TaskList, TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "开始写点什么吧..." }),
    ],
    content: note.content || "",
  });

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setTitle(note.title);
    setAiResult(null);
    if (editor && editor.getHTML() !== note.content) {
      skipNextUpdate.current = true;
      editor.commands.setContent(note.content || "");
    }
  }, [note.id]);

  const titleRef = useRef(title);
  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (skipNextUpdate.current) { skipNextUpdate.current = false; return; }
      debouncedSave(titleRef.current, editor.getHTML());
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor, debouncedSave]);

  const { isListening, isSupported: voiceSupported, start: startListening, stop: stopListening } = useSpeechRecognition({
    onResult: (text) => { if (editor) editor.chain().focus().insertContent(text).run(); },
  });

  const handleVoiceToggle = () => {
    if (!isPro) { setShowUpgrade(true); return; }
    if (isListening) stopListening(); else startListening();
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (editor) debouncedSave(val, editor.getHTML());
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("note-images").upload(path, file);
    if (error) { toast({ title: "图片上传失败", description: error.message, variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("note-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleImageInsert = async (file: File) => {
    setUploadingImage(true);
    const url = await uploadImage(file);
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
    setUploadingImage(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleImageInsert(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (!editor) return;
    const handlePaste = (view: any, event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return false;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageInsert(file);
          return true;
        }
      }
      return false;
    };
    editor.view.props.handlePaste = handlePaste;
  }, [editor, user]);

  // Core AI action handler
  const handleAiAction = async (action: AiActionType, selectedText?: string) => {
    if (!isPro) { setShowUpgrade(true); return; }
    if (!editor) return;

    const content = selectedText || editor.getHTML();
    if (!content.trim() || content === "<p></p>") {
      toast({ title: "内容为空", description: "请先写点内容再使用 AI 功能", variant: "destructive" });
      return;
    }

    // Store selection range for replacement actions
    const selectionFrom = selectedText ? editor.state.selection.from : undefined;
    const selectionTo = selectedText ? editor.state.selection.to : undefined;

    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-notes", { body: { content, action } });
      if (error) throw error;
      if (data?.error) { toast({ title: "AI 错误", description: data.error, variant: "destructive" }); return; }

      // Show result in preview panel instead of directly applying
      setAiResult({
        content: data.result,
        type: action,
        selectionFrom,
        selectionTo,
      });
      toast({ title: "AI 处理完成", description: "请预览结果并选择操作" });
    } catch (e: any) {
      toast({ title: "AI 请求失败", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  // Handle appending AI result to note
  const handleAppendResult = async () => {
    if (!aiResult || !editor) return;
    const separator = '<hr><p></p>';
    editor.chain().focus("end").insertContent(separator + aiResult.content).run();
    await onUpdate(note.id, { content: editor.getHTML() });
    setAiResult(null);
    toast({ title: "已追加到笔记末尾" });
  };

  // Handle replacing note content with AI result
  const handleReplaceResult = async () => {
    if (!aiResult || !editor) return;

    if (aiResult.selectionFrom !== undefined && aiResult.selectionTo !== undefined) {
      // Replace only the selected range
      editor
        .chain()
        .focus()
        .setTextSelection({ from: aiResult.selectionFrom, to: aiResult.selectionTo })
        .deleteSelection()
        .insertContent(aiResult.content)
        .run();
    } else {
      // Replace entire content
      editor.commands.setContent(aiResult.content);
    }
    await onUpdate(note.id, { content: editor.getHTML() });
    setAiResult(null);
    toast({ title: aiResult.selectionFrom !== undefined ? "已替换选中内容" : "已覆盖笔记内容" });
  };

  // Handle selection-based AI action
  const handleSelectionAiAction = (action: "rewrite" | "continue" | "polish" | "expand", selectedText: string) => {
    handleAiAction(action, selectedText);
  };

  // Export functions
  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<em>(.*?)<\/em>/gi, "*$1*")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<blockquote[^>]*><p>(.*?)<\/p><\/blockquote>/gi, "> $1\n\n")
      .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  type ExportFormat = "markdown" | "html" | "txt" | "csv" | "json" | "xml" | "rtf" | "docx" | "log" | "js" | "ts" | "py" | "java" | "go" | "rs" | "cpp" | "sql" | "sh" | "css" | "yaml" | "php" | "rb" | "swift" | "kt";

  const exportAs = async (format: ExportFormat) => {
    if (!editor) return;
    const html = editor.getHTML();
    const plainText = editor.getText();
    let content: string;
    let ext: string;
    let mime: string;
    let blob: Blob;

    switch (format) {
      case "html":
        content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`;
        ext = "html"; mime = "text/html";
        blob = new Blob([content], { type: mime });
        break;
      case "txt":
      case "log":
        content = plainText;
        ext = format; mime = "text/plain";
        blob = new Blob([content], { type: mime });
        break;
      case "markdown":
        content = htmlToMarkdown(html);
        ext = "md"; mime = "text/markdown";
        blob = new Blob([content], { type: mime });
        break;
      case "csv": {
        // Convert text lines to CSV rows
        const lines = plainText.split("\n").filter(l => l.trim());
        content = lines.map(line => `"${line.replace(/"/g, '""')}"`).join("\n");
        ext = "csv"; mime = "text/csv";
        blob = new Blob([content], { type: mime });
        break;
      }
      case "json": {
        const jsonData = { title, content: html, text: plainText, exportedAt: new Date().toISOString() };
        content = JSON.stringify(jsonData, null, 2);
        ext = "json"; mime = "application/json";
        blob = new Blob([content], { type: mime });
        break;
      }
      case "xml": {
        content = `<?xml version="1.0" encoding="UTF-8"?>\n<note>\n  <title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>\n  <content><![CDATA[${html}]]></content>\n  <exportedAt>${new Date().toISOString()}</exportedAt>\n</note>`;
        ext = "xml"; mime = "application/xml";
        blob = new Blob([content], { type: mime });
        break;
      }
      case "rtf": {
        content = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 ${plainText.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\par ")}}`;
        ext = "rtf"; mime = "application/rtf";
        blob = new Blob([content], { type: mime });
        break;
      }
      case "docx": {
        try {
          const { Document, Packer, Paragraph, TextRun } = await import("docx");
          const paragraphs = plainText.split("\n").map(line => new Paragraph({ children: [new TextRun(line)] }));
          const doc = new Document({ sections: [{ children: paragraphs }] });
          blob = await Packer.toBlob(doc);
          ext = "docx"; mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } catch {
          toast({ title: "导出失败", description: "DOCX 导出出错", variant: "destructive" });
          return;
        }
        break;
      }
      default: {
        // Code file exports - extract plain text
        const codeExtMap: Record<string, string> = {
          js: "js", ts: "ts", py: "py", java: "java", go: "go", rs: "rs",
          cpp: "cpp", sql: "sql", sh: "sh", css: "css", yaml: "yaml",
          php: "php", rb: "rb", swift: "swift", kt: "kt",
        };
        const codeExt = codeExtMap[format];
        if (codeExt) {
          content = plainText;
          ext = codeExt; mime = "text/plain";
          blob = new Blob([content], { type: mime });
          break;
        }
        return;
      }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "笔记"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "导出成功", description: `已导出为 .${ext} 格式` });
  };

  // Share
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (note.share_token) {
      setShareUrl(`${window.location.origin}/s/${note.share_token}`);
    } else {
      setShareUrl(null);
    }
  }, [note.share_token, note.id]);

  const handleShare = async () => {
    if (!onToggleShare) return;
    const token = await onToggleShare(note.id);
    if (token) {
      const url = `${window.location.origin}/s/${token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setShareUrl(null);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "已复制分享链接" });
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFileSelect} />

      <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-2 bg-background">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(note.updated_at).toLocaleString("zh-CN")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {onTogglePin && (
            <button onClick={() => onTogglePin(note.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
              {note.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              {note.is_pinned ? "取消置顶" : "置顶"}
            </button>
          )}
          {voiceSupported && (
            <button onClick={handleVoiceToggle} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isListening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-accent text-accent-foreground hover:bg-accent/80"}`}>
              <Mic className="w-3 h-3" /> {isListening ? "停止" : "语音"}
            </button>
          )}
          <button onClick={() => handleAiAction("organize")} disabled={!!aiLoading} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50">
            {aiLoading === "organize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} 整理
          </button>
          <button onClick={() => handleAiAction("summarize")} disabled={!!aiLoading} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50">
            {aiLoading === "summarize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} 总结
          </button>

          {/* Import */}
          {onImportFile && (
            <button onClick={onImportFile} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
              <Upload className="w-3 h-3" /> 导入
            </button>
          )}

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
                <Download className="w-3 h-3" /> 导出
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportAs("markdown")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("html")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> HTML (.html)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("txt")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> 纯文本 (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("docx")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("csv")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("json")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> JSON (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("xml")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> XML (.xml)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("rtf")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> RTF (.rtf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("log")}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Log (.log)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share */}
          {onToggleShare && (
            <div className="inline-flex items-center gap-1">
              <button onClick={handleShare} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${shareUrl ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-accent/80"}`}>
                {shareUrl ? <Link2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {shareUrl ? "取消分享" : "分享"}
              </button>
              {shareUrl && (
                <button onClick={copyShareUrl} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "已复制" : "复制链接"}
                </button>
              )}
            </div>
          )}

          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saving ? <>保存中...</> : <><Save className="w-3 h-3" /> 已保存</>}
          </span>
        </div>
      </div>

      {uploadingImage && (
        <div className="mx-6 mt-2 px-3 py-2 bg-accent rounded-lg text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> 正在上传图片...
        </div>
      )}

      {/* AI loading indicator */}
      {aiLoading && (
        <div className="mx-6 mt-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-foreground/70">
            AI 正在{aiLoading === "organize" ? "整理" : aiLoading === "summarize" ? "总结" : aiLoading === "rewrite" ? "改写" : aiLoading === "polish" ? "润色" : aiLoading === "expand" ? "扩写" : "续写"}中，请稍候...
          </span>
        </div>
      )}

      {/* AI Result Panel */}
      {aiResult && (
        <AiResultPanel
          result={aiResult.content}
          type={aiResult.type}
          onAppend={handleAppendResult}
          onReplace={handleReplaceResult}
          onClose={() => setAiResult(null)}
        />
      )}

      <EditorToolbar editor={editor} onInsertImage={() => fileInputRef.current?.click()} />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative" style={{ fontSize: `${pageFontSize}px` }}>
        <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); } }}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <EditorContent editor={editor} className="tiptap-editor" />
        <AiSelectionToolbar
          editor={editor}
          onAiAction={handleSelectionAiAction}
          isLoading={!!aiLoading}
        />
      </div>
      <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} feature="AI 功能" />
    </div>
  );
};

export default NoteEditor;
