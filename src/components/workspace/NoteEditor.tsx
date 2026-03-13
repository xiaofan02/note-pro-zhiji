import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Save } from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
}

const NoteEditor = ({ note, onUpdate }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
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

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {new Date(note.updated_at).toLocaleString("zh-CN")}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {saving ? (
            <>保存中...</>
          ) : (
            <>
              <Save className="w-3 h-3" /> 已保存
            </>
          )}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="开始写点什么吧..."
          className="w-full flex-1 min-h-[60vh] bg-transparent border-none outline-none text-foreground text-base leading-relaxed resize-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
};

export default NoteEditor;
