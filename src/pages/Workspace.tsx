import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useTags } from "@/hooks/useTags";
import NoteList from "@/components/workspace/NoteList";
import NoteEditor from "@/components/workspace/NoteEditor";

const Workspace = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { notes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote } = useNotes();
  const { tags, noteTagsMap, createTag, addTagToNote, removeTagFromNote, getTagsForNote } = useTags();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">智记 AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <NoteList
          notes={notes}
          activeNoteId={activeNoteId}
          onSelect={setActiveNoteId}
          onCreate={createNote}
          onDelete={deleteNote}
          tags={tags}
          noteTagsMap={noteTagsMap}
          getTagsForNote={getTagsForNote}
        />
        <main className="flex-1 flex">
          {activeNote ? (
            <NoteEditor
              note={activeNote}
              onUpdate={updateNote}
              tags={tags}
              noteTags={getTagsForNote(activeNote.id)}
              onCreateTag={createTag}
              onAddTag={addTagToNote}
              onRemoveTag={removeTagFromNote}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">选择或创建一条笔记</p>
                <p className="text-sm">从左侧列表选择笔记，或点击 + 新建</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Workspace;
