import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Tag } from "@/hooks/useTags";
import { Save, Sparkles, FileText, Loader2, Mic, MicOff, Image as ImageIcon, Eye, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import TagManager from "./TagManager";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  tags: Tag[];
  noteTags: Tag[];
  onCreateTag: (name: string) => Promise<any>;
  onAddTag: (noteId: string, tagId: string) => void;
  onRemoveTag: (noteId: string, tagId: string) => void;
}

const NoteEditor = ({ note, onUpdate, tags, noteTags, onCreateTag, onAddTag, onRemoveTag }: NoteEditorProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview" | "split">("edit");
  const voiceTextRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { isListening, isSupported: voiceSupported, start: startListening, stop: stopListening } = useSpeechRecognition({
    onResult: (text) => {
      const baseContent = voiceTextRef.current;
      const newContent = baseContent ? baseContent + "\n" + text : text;
      setContent(newContent);
      debouncedSave(title, newContent);
    },
  });

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      voiceTextRef.current = content;
      startListening();
    }
  };

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSummary(null);
  }, [note.id, note.title, note.content]);

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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    debouncedSave(val, content);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    debouncedSave(title, val);
  };

  // Image upload helper
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("note-images").upload(path, file);
    if (error) {
      toast({ title: "图片上传失败", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("note-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const insertImageAtCursor = (url: string) => {
    const textarea = textareaRef.current;
    const imageMarkdown = `\n![图片](${url})\n`;
    if (textarea) {
      const start = textarea.selectionStart;
      const newContent = content.slice(0, start) + imageMarkdown + content.slice(start);
      setContent(newContent);
      debouncedSave(title, newContent);
    } else {
      const newContent = content + imageMarkdown;
      setContent(newContent);
      debouncedSave(title, newContent);
    }
  };

  // Handle paste event for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        setUploadingImage(true);
        const url = await uploadImage(file);
        if (url) insertImageAtCursor(url);
        setUploadingImage(false);
        return;
      }
    }
  };

  // Handle file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const url = await uploadImage(file);
    if (url) insertImageAtCursor(url);
    setUploadingImage(false);
    e.target.value = "";
  };

  const handleAiAction = async (action: "organize" | "summarize") => {
    if (!content.trim()) {
      toast({ title: "内容为空", description: "请先写点内容再使用 AI 功能", variant: "destructive" });
      return;
    }
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-notes", {
        body: { content, action },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI 错误", description: data.error, variant: "destructive" });
        return;
      }
      if (action === "organize") {
        setContent(data.result);
        await onUpdate(note.id, { content: data.result });
        toast({ title: "整理完成", description: "笔记已被 AI 重新整理" });
      } else {
        setSummary(data.result);
        toast({ title: "总结完成" });
      }
    } catch (e: any) {
      toast({ title: "AI 请求失败", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileSelect}
      />

      <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-2 bg-background">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(note.updated_at).toLocaleString("zh-CN")}
          </span>
          <TagManager
            tags={tags}
            noteTags={noteTags}
            onCreateTag={onCreateTag}
            onAddTag={(tagId) => onAddTag(note.id, tagId)}
            onRemoveTag={(tagId) => onRemoveTag(note.id, tagId)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
            插入图片
          </button>
          {voiceSupported && (
            <button
              onClick={handleVoiceToggle}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              {isListening ? "停止录音" : "语音速记"}
            </button>
          )}
          <button
            onClick={() => handleAiAction("organize")}
            disabled={!!aiLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {aiLoading === "organize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            智能整理
          </button>
          <button
            onClick={() => handleAiAction("summarize")}
            disabled={!!aiLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {aiLoading === "summarize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            AI 总结
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

      {summary && (
        <div className="mx-6 mt-4 p-4 rounded-lg bg-accent/50 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI 摘要
            </span>
            <button onClick={() => setSummary(null)} className="text-xs text-muted-foreground hover:text-foreground">
              关闭
            </button>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onPaste={handlePaste}
          placeholder="开始写点什么吧...（支持粘贴图片）"
          className="w-full flex-1 min-h-[60vh] bg-transparent border-none outline-none text-foreground text-base leading-relaxed resize-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
};

export default NoteEditor;
