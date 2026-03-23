import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Tag } from "@/hooks/useTags";
import { Save, Sparkles, FileText, Loader2, Mic, Download, Upload, Share2, Link2, Pin, PinOff, Check, Copy, X } from "lucide-react";
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
import { FontSize } from "@/lib/fontSizeExtension";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import EditorToolbar from "./EditorToolbar";
import CodeBlockComponent from "./CodeBlockComponent";
import { getAiProviderSettings, buildDirectChatRequest } from "@/lib/aiProviderSettings";
import { useAiConfig, buildAiRequest } from "@/hooks/useAiConfig";
import { NoteLinkExtension } from "@/lib/noteLinkExtension";
import { noteVersions } from "@/lib/noteVersions";
import NoteVersionHistory from "./NoteVersionHistory";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const lowlight = createLowlight(common);

type AiActionType = "organize" | "summarize" | "rewrite" | "continue" | "polish" | "expand";

const AI_NOTES_PROMPTS: Record<AiActionType, string> = {
  organize: `你是一个笔记整理助手。请将用户提供的笔记内容整理成结构化的 HTML 格式。使用 <h2>/<h3> 标题、<p> 段落、<ul><li> 列表、<strong> 关键词。直接输出 HTML，不要 Markdown 或代码块标记。`,
  summarize: `你是一个笔记总结助手。请为用户的笔记生成结构化摘要，使用 HTML 格式。用 <h3> 写标题，<p> 写概述，<ul><li> 列关键要点。直接输出 HTML，不要 Markdown 或代码块标记。`,
  rewrite: `你是一个文字改写助手。请将用户提供的文本进行智能改写，保持含义不变，使用 <p> 和 <strong> 标签。直接输出 HTML，不要 Markdown 或代码块标记。`,
  polish: `你是一个文字润色助手。请对用户提供的文本进行润色优化，使其更专业流畅，使用 <p> 和 <strong> 标签。直接输出 HTML，不要 Markdown 或代码块标记。`,
  expand: `你是一个文字扩写助手。请对用户提供的文本进行扩展，补充细节和论据，扩写约 2-3 倍，使用 <p>、<ul><li>、<strong> 标签。直接输出 HTML，不要 Markdown 或代码块标记。`,
  continue: `你是一个文字续写助手。请根据用户提供的文本进行自然续写，延续风格和主题，续写 2-4 段，使用 <p> 和 <strong> 标签。直接输出续写的 HTML 内容（不含原文），不要 Markdown 或代码块标记。`,
};

function getAiNotesMessages(action: AiActionType, content: string) {
  return [
    { role: "system", content: AI_NOTES_PROMPTS[action] },
    { role: "user", content },
  ];
}

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
  allNotes?: Note[];
  onSelectNote?: (id: string, folderId: string | null) => void;
}

const NoteEditor = ({ note, onUpdate, tags, noteTags, onCreateTag, onAddTag, onRemoveTag, pageFontSize, onTogglePin, onToggleShare, onImportFile, allNotes = [], onSelectNote }: NoteEditorProps) => {
  const { user } = useAuth();
  const { isPro, loading: roleLoading } = useUserRole();
  const { config: aiConfig, usageAllowed, recordUsage } = useAiConfig();
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isReadMode, setIsReadMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const skipNextUpdate = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ─── Note link picker ──────────────────────────────────────────
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkPickerQuery, setLinkPickerQuery] = useState("");
  const [linkInsertPos, setLinkInsertPos] = useState(0);

  const debouncedSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        noteVersions.save(note.id, newTitle, newContent);
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
      TextStyle, Color, FontSize,
      TaskList, TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "开始写点什么吧..." }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      NoteLinkExtension.configure({
        onTrigger: (query, pos) => {
          setLinkPickerQuery(query);
          setLinkInsertPos(pos);
          setLinkPickerOpen(true);
        },
        onClose: () => setLinkPickerOpen(false),
      }),
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

  // ─── In-note search ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        setSearchOpen((v) => {
          if (!v) setTimeout(() => searchInputRef.current?.focus(), 50);
          return !v;
        });
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchMatches([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  useEffect(() => {
    if (!editor || !searchQuery.trim()) {
      setSearchMatches([]);
      setSearchMatchIndex(0);
      return;
    }
    const text = editor.getText();
    const q = searchQuery.toLowerCase();
    const matches: number[] = [];
    let idx = 0;
    while ((idx = text.toLowerCase().indexOf(q, idx)) !== -1) {
      matches.push(idx);
      idx += q.length;
    }
    setSearchMatches(matches);
    setSearchMatchIndex(0);
    if (matches.length > 0) {
      editor.commands.setTextSelection({ from: matches[0] + 1, to: matches[0] + q.length + 1 });
    }
  }, [searchQuery, editor]);

  const jumpToMatch = (dir: 1 | -1) => {
    if (!editor || searchMatches.length === 0) return;
    const next = (searchMatchIndex + dir + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(next);
    const pos = searchMatches[next];
    editor.commands.setTextSelection({ from: pos + 1, to: pos + searchQuery.length + 1 });
    editor.commands.scrollIntoView();
  };

  const handleVoiceToggle = () => {
    if (!roleLoading && !isPro) { setShowUpgrade(true); return; }
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
  const handleImageInsertRef = useRef(handleImageInsert);
  useEffect(() => { handleImageInsertRef.current = handleImageInsert; });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleImageInsert(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          event.stopPropagation();
          const file = item.getAsFile();
          if (file) handleImageInsertRef.current(file);
          return;
        }
      }
    };
    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          event.preventDefault();
          event.stopPropagation();
          handleImageInsertRef.current(file);
          return;
        }
      }
    };
    editorDom.addEventListener("paste", handlePaste);
    editorDom.addEventListener("drop", handleDrop);
    return () => {
      editorDom.removeEventListener("paste", handlePaste);
      editorDom.removeEventListener("drop", handleDrop);
    };
  }, [editor]);

  // Core AI action handler
  const handleAiAction = async (action: AiActionType, selectedText?: string) => {
    if (!roleLoading && !isPro) { setShowUpgrade(true); return; }
    if (usageAllowed === false) {
      toast({ title: "今日 AI 使用次数已达上限", description: "请升级 Pro 获取无限使用", variant: "destructive" });
      return;
    }
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
      let result = "";
      const directReq = aiConfig ? buildAiRequest(aiConfig, getAiNotesMessages(action, content), false) : null;

      if (directReq) {
        const resp = await fetch(directReq.url, { method: "POST", headers: directReq.headers, body: directReq.body });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.error || `请求失败 (${resp.status})`);
        }
        const data = await resp.json();
        result = data.choices?.[0]?.message?.content || "";
      } else {
        const { data, error } = await supabase.functions.invoke("ai-notes", { body: { content, action } });
        if (error) throw error;
        if (data?.error) { toast({ title: "AI 错误", description: data.error, variant: "destructive" }); return; }
        result = data.result;
      }
      await recordUsage(action);

      // Show result in preview panel instead of directly applying
      setAiResult({
        content: result,
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

  type ExportFormat = "pdf" | "markdown" | "html" | "txt" | "csv" | "json" | "xml" | "rtf" | "docx" | "log" | "js" | "ts" | "py" | "java" | "go" | "rs" | "cpp" | "sql" | "sh" | "css" | "yaml" | "php" | "rb" | "swift" | "kt";

  const exportAs = async (format: ExportFormat) => {
    if (!editor) return;
    const html = editor.getHTML();
    const plainText = editor.getText();
    let content: string;
    let ext: string;
    let mime: string;
    let blob: Blob;

    switch (format) {
      case "pdf": {
        try {
          const { default: jsPDF } = await import("jspdf");
          const { default: html2canvas } = await import("html2canvas");
          const editorEl = document.querySelector(".ProseMirror") as HTMLElement;
          if (!editorEl) { toast({ title: "导出失败", description: "找不到编辑器内容", variant: "destructive" }); return; }
          const canvas = await html2canvas(editorEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          const margin = 15;
          const contentW = pageW - margin * 2;
          const imgH = (canvas.height * contentW) / canvas.width;
          let y = margin;
          let remaining = imgH;
          let srcY = 0;
          while (remaining > 0) {
            const sliceH = Math.min(remaining, pageH - margin * 2);
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = (sliceH / contentW) * canvas.width;
            const ctx = sliceCanvas.getContext("2d")!;
            ctx.drawImage(canvas, 0, srcY * (canvas.width / contentW), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, y, contentW, sliceH);
            remaining -= sliceH;
            srcY += sliceH;
            if (remaining > 0) { pdf.addPage(); y = margin; }
          }
          pdf.save(`${title || "笔记"}.pdf`);
          toast({ title: "导出成功", description: "已导出为 PDF" });
        } catch (e: any) {
          toast({ title: "PDF 导出失败", description: e.message, variant: "destructive" });
        }
        return;
      }
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

  // ─── Note link insertion ───────────────────────────────────────
  const linkPickerNotes = allNotes.filter(
    (n) => n.id !== note.id && n.title.toLowerCase().includes(linkPickerQuery.toLowerCase())
  ).slice(0, 8);

  const insertNoteLink = (targetNote: Note) => {
    if (!editor) return;
    // Delete the [[ + query text, then insert a link
    const from = linkInsertPos;
    const to = editor.state.selection.from;
    const linkHtml = `<a href="#note-${targetNote.id}" data-note-id="${targetNote.id}" class="note-internal-link">[[${targetNote.title}]]</a>`;
    editor.chain().focus()
      .deleteRange({ from, to })
      .insertContent(linkHtml)
      .run();
    setLinkPickerOpen(false);
    setLinkPickerQuery("");
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
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => exportAs("pdf")}>PDF (.pdf)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("markdown")}>Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("html")}>HTML (.html)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("txt")}>纯文本 (.txt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("docx")}>Word (.docx)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>更多文档格式</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => exportAs("csv")}>CSV (.csv)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("json")}>JSON (.json)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("xml")}>XML (.xml)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("rtf")}>RTF (.rtf)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("log")}>Log (.log)</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>代码文件</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => exportAs("js")}>JavaScript (.js)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("ts")}>TypeScript (.ts)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("py")}>Python (.py)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("java")}>Java (.java)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("cpp")}>C/C++ (.cpp)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("go")}>Go (.go)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("rs")}>Rust (.rs)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("sql")}>SQL (.sql)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("sh")}>Shell (.sh)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("css")}>CSS (.css)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("yaml")}>YAML (.yaml)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("php")}>PHP (.php)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("rb")}>Ruby (.rb)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("swift")}>Swift (.swift)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAs("kt")}>Kotlin (.kt)</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
          <NoteVersionHistory
            noteId={note.id}
            onRestore={(title, content) => {
              setTitle(title);
              editor?.commands.setContent(content);
              debouncedSave(title, content);
            }}
          />
        </div>
      </div>

      {uploadingImage && (
        <div className="mx-6 mt-2 px-3 py-2 bg-accent rounded-lg text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> 正在上传图片...
        </div>
      )}

      {/* Note link picker */}
      {linkPickerOpen && linkPickerNotes.length > 0 && (
        <div className="mx-6 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <p className="text-[11px] text-muted-foreground px-3 pt-2 pb-1">选择要链接的笔记</p>
          {linkPickerNotes.map((n) => (
            <button key={n.id} onClick={() => insertNoteLink(n)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2">
              <span className="text-muted-foreground">[[</span>
              <span className="truncate">{n.title || "无标题笔记"}</span>
              <span className="text-muted-foreground">]]</span>
            </button>
          ))}
        </div>
      )}

      {/* In-note search bar */}
      {searchOpen && (        <div className="mx-6 mt-2 flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-lg border border-border">
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); jumpToMatch(e.shiftKey ? -1 : 1); }
              if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSearchMatches([]); }
            }}
            placeholder="在笔记中搜索..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/50"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {searchMatches.length > 0 ? `${searchMatchIndex + 1}/${searchMatches.length}` : searchQuery ? "无结果" : ""}
          </span>
          <button onClick={() => jumpToMatch(-1)} disabled={searchMatches.length === 0} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors text-xs">↑</button>
          <button onClick={() => jumpToMatch(1)} disabled={searchMatches.length === 0} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors text-xs">↓</button>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchMatches([]); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
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

      <EditorToolbar editor={isReadMode ? null : editor} onInsertImage={() => fileInputRef.current?.click()} />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative" style={{ fontSize: `${pageFontSize}px` }}>
        <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); } }}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
          readOnly={isReadMode}
        />
        <EditorContent editor={editor} className={isReadMode ? "tiptap-editor pointer-events-none select-text" : "tiptap-editor"}
          onClick={(e) => {
            const target = (e.target as HTMLElement).closest('[data-note-id]') as HTMLElement | null;
            if (target && onSelectNote) {
              const noteId = target.getAttribute('data-note-id');
              const linked = allNotes.find(n => n.id === noteId);
              if (linked) onSelectNote(linked.id, linked.folder_id);
            }
          }}
        />
        {!isReadMode && (
          <AiSelectionToolbar
            editor={editor}
            onAiAction={handleSelectionAiAction}
            isLoading={!!aiLoading}
          />
        )}
      </div>

      {/* Word count bar */}
      {editor && (
        <div className="border-t border-border px-6 py-1.5 flex items-center justify-between bg-background shrink-0">
          <span className="text-[11px] text-muted-foreground/60">
            {editor.storage.characterCount?.characters?.() ?? editor.getText().length} 字符 · {editor.getText().trim().split(/\s+/).filter(Boolean).length} 词
          </span>
          <button
            onClick={() => setIsReadMode((v) => !v)}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            {isReadMode ? "退出阅读模式" : "阅读模式"}
          </button>
        </div>
      )}
      <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} feature="AI 功能" />
    </div>
  );
};

export default NoteEditor;
