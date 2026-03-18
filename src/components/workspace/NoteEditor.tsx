import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Tag } from "@/hooks/useTags";
import { Save, Sparkles, FileText, Loader2, Mic, Download, Share2, Link2, Pin, PinOff, Check, Copy } from "lucide-react";
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
}

const NoteEditor = ({ note, onUpdate, tags, noteTags, onCreateTag, onAddTag, onRemoveTag, pageFontSize }: NoteEditorProps) => {
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

  return (
    <div className="flex-1 flex flex-col h-full">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFileSelect} />

      <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-2 bg-background">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(note.updated_at).toLocaleString("zh-CN")}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {voiceSupported && (
            <button onClick={handleVoiceToggle} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${isListening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-accent text-accent-foreground hover:bg-accent/80"}`}>
              <Mic className="w-3 h-3" /> {isListening ? "停止录音" : "语音速记"}
            </button>
          )}
          <button onClick={() => handleAiAction("organize")} disabled={!!aiLoading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50">
            {aiLoading === "organize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} 智能整理
          </button>
          <button onClick={() => handleAiAction("summarize")} disabled={!!aiLoading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50">
            {aiLoading === "summarize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} AI 总结
          </button>
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
