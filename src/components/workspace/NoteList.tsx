import { useState, useMemo } from "react";
import { Plus, FileText, Trash2, Search } from "lucide-react";
import { Note } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const NoteList = ({ notes, activeNoteId, onSelect, onCreate, onDelete }: NoteListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  return (
    <aside className="w-72 border-r border-border bg-sidebar-background flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-sidebar-foreground">我的笔记</h2>
        <button
          onClick={onCreate}
          className="w-8 h-8 rounded-lg bg-foreground text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
          title="新建笔记"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-8">
            未找到匹配的笔记
          </p>
        )}
        {filteredNotes.length === 0 && !searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-8">
            还没有笔记，点击 + 创建第一条
          </p>
        )}
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            onClick={() => onSelect(note.id)}
            className={cn(
              "group flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-colors",
              activeNoteId === note.id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {note.title || "无标题笔记"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {note.content?.slice(0, 50) || "空笔记"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {new Date(note.updated_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default NoteList;
