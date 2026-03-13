import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Tag } from "@/hooks/useTags";
import { Save, Sparkles, FileText, Loader2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAuth } from "@/hooks/useAuth";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import TagManager from "./TagManager";
import EditorToolbar from "./EditorToolbar";
import CodeBlockComponent from "./CodeBlockComponent";

const lowlight = createLowlight(common);

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
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
      }).configure({ lowlight }),
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage.configure({ inline: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontSize,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "开始写点什么吧..." }),
    ],
    content: note.content || "",
  });

  useEffect(() => {
    setTitle(note.title);
    setSummary(null);
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
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        return;
      }
      const html = editor.getHTML();
      debouncedSave(titleRef.current, html);
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor, debouncedSave]);

  const { isListening, isSupported: voiceSupported, start: startListening, stop: stopListening } = useSpeechRecognition({
    onResult: (text) => {
      if (editor) {
        editor.chain().focus().insertContent(text).run();
      }
    },
  });

  const handleVoiceToggle = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (editor) {
      debouncedSave(val, editor.getHTML());
    }
  };

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

  const handleImageInsert = async (file: File) => {
    setUploadingImage(true);
    const url = await uploadImage(file);
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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

  const handleAiAction = async (action: "organize" | "summarize") => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content.trim() || content === "<p></p>") {
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
        editor.commands.setContent(data.result);
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

      {/* Top bar */}
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
          {voiceSupported && (
            <button
              onClick={handleVoiceToggle}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              <Mic className="w-3 h-3" />
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

      {/* Formatting toolbar */}
      <EditorToolbar editor={editor} onInsertImage={() => fileInputRef.current?.click()} />

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ fontSize: `${pageFontSize}px` }}>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  );
};

export default NoteEditor;
