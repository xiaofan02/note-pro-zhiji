import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Tag } from "@/hooks/useTags";
import { Save, Sparkles, FileText, Loader2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import UpgradePrompt from "./UpgradePrompt";
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
import TagManager from "./TagManager";
import EditorToolbar from "./EditorToolbar";
import CodeBlockComponent from "./CodeBlockComponent";

const lowlight = createLowlight(common);

interface TagManagerProps {
  tags: Tag[];
  noteTags: Tag[];
  onCreateTag: (name: string) => Promise<any>;
  onAddTag: (noteId: string, tagId: string) => void;
  onRemoveTag: (noteId: string, tagId: string) => void;
  onClose: () => void;
}

const TagManagerModal = ({ tags, noteTags, onCreateTag, onAddTag, onRemoveTag, onClose }: TagManagerProps) => {
  const [newTagName, setNewTagName] = useState("");

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName);
    setNewTagName("");
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">管理标签</h2>

        <div className="flex items-center mb-3">
          <input
            type="text"
            placeholder="新标签名称"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="flex-1 border border-input bg-background rounded-md px-3 py-2 mr-2"
          />
          <button onClick={handleCreateTag} className="bg-primary text-primary-foreground rounded-md px-4 py-2">
            创建
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto">
          {tags.map((tag) => {
            const isSelected = noteTags.some((t) => t.id === tag.id);
            return (
              <div key={tag.id} className="flex items-center justify-between py-2">
                <span>{tag.name}</span>
                <button
                  onClick={() => {
                    if (isSelected) onRemoveTag(tag.note_id, tag.id);
                    else onAddTag(tag.note_id, tag.id);
                  }}
                  className={`px-3 py-1 rounded-md text-sm ${
                    isSelected ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
                  }`}
                >
                  {isSelected ? "移除" : "添加"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-muted text-foreground rounded-md px-4 py-2">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [summary, setSummary] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const skipNextUpdate = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [showTagManager, setShowTagManager] = useState(false);

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

  const handleAiAction = async (action: "organize" | "summarize") => {
    if (!isPro) { setShowUpgrade(true); return; }
    if (!editor) return;
    const content = editor.getHTML();
    if (!content.trim() || content === "<p></p>") {
      toast({ title: "内容为空", description: "请先写点内容再使用 AI 功能", variant: "destructive" });
      return;
    }
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-notes", { body: { content, action } });
      if (error) throw error;
      if (data?.error) { toast({ title: "AI 错误", description: data.error, variant: "destructive" }); return; }
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
      <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFileSelect} />

      <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-2 bg-background">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(note.updated_at).toLocaleString("zh-CN")}
          </span>
          <button onClick={() => setShowTagManager(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
            标签
          </button>
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

      {summary && (
        <div className="mx-6 mt-4 p-4 rounded-lg bg-accent/50 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI 摘要</span>
            <button onClick={() => setSummary(null)} className="text-xs text-muted-foreground hover:text-foreground">关闭</button>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      <EditorToolbar editor={editor} onInsertImage={() => fileInputRef.current?.click()} />

      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ fontSize: `${pageFontSize}px` }}>
        <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); } }}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
      <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} feature="AI 功能" />

      {showTagManager && (
        <TagManagerModal
          tags={tags}
          noteTags={noteTags}
          onCreateTag={onCreateTag}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
};

export default NoteEditor;
