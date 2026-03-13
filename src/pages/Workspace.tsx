import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, FileText, LogOut, Plus, Search, Trash2, Moon, Sun, User
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useTags } from "@/hooks/useTags";
import NoteEditor from "@/components/workspace/NoteEditor";
import TagFilter from "@/components/workspace/TagFilter";
import SettingsDialog from "@/components/workspace/SettingsDialog";
import { cn } from "@/lib/utils";

const Workspace = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { notes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote } = useNotes();
  const { tags, noteTagsMap, createTag, addTagToNote, removeTagFromNote, getTagsForNote } = useTags();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [pageFontSize, setPageFontSize] = useState(() => {
    const saved = localStorage.getItem("noteFontSize");
    return saved ? parseInt(saved, 10) : 15;
  });

  const handlePageFontSizeChange = (size: number) => {
    setPageFontSize(size);
    localStorage.setItem("noteFontSize", String(size));
  };

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedTagId) {
      result = result.filter((n) => (noteTagsMap[n.id] || []).includes(selectedTagId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notes, searchQuery, selectedTagId, noteTagsMap]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background" style={{ fontSize: `${pageFontSize}px` }}>
      <TooltipProvider delayDuration={300}>
        {/* Left sidebar */}
        <aside className="w-72 border-r border-border bg-card flex flex-col h-full shrink-0">
          {/* Logo */}
          <div className="h-13 border-b border-border flex items-center px-5 shrink-0">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">智记 AI</span>
            </Link>
          </div>

          {/* Search */}
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索笔记..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-muted/60 rounded-lg border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30 transition-shadow"
              />
            </div>
          </div>

          {/* Tags */}
          <TagFilter tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} />

          {/* New note button */}
          <div className="px-3 pb-2">
            <button
              onClick={createNote}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建笔记
            </button>
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-8">加载中...</p>
            )}
            {!loading && filteredNotes.length === 0 && (
              <div className="text-center py-12 px-4">
                <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery || selectedTagId ? "未找到匹配的笔记" : "还没有笔记，点击上方按钮创建"}
                </p>
              </div>
            )}
            {filteredNotes.map((note) => {
              const noteTags = getTagsForNote(note.id);
              const isActive = activeNoteId === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={cn(
                    "group flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-all",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-1 h-8 rounded-full shrink-0 mt-0.5 transition-colors",
                    isActive ? "bg-primary" : "bg-transparent"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {note.title || "无标题笔记"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
                      {note.content?.slice(0, 60) || "空笔记"}
                    </p>
                    {noteTags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {noteTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-1.5 py-0 rounded text-[10px] text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground/50 mt-1">
                      {new Date(note.updated_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom: user info + actions */}
          <div className="border-t border-border p-3 space-y-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-foreground truncate flex-1">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {isDark ? "切换到浅色模式" : "切换到深色模式"}
                </TooltipContent>
              </Tooltip>

              <SettingsDialog
                pageFontSize={pageFontSize}
                onPageFontSizeChange={handlePageFontSizeChange}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">退出登录</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Right - editor area */}
        <main className="flex-1 flex bg-section-alt">
          {activeNote ? (
            <NoteEditor
              note={activeNote}
              onUpdate={updateNote}
              tags={tags}
              noteTags={getTagsForNote(activeNote.id)}
              onCreateTag={createTag}
              onAddTag={addTagToNote}
              onRemoveTag={removeTagFromNote}
              pageFontSize={pageFontSize}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-5">
              <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary/60" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="font-semibold text-foreground text-lg">选择或创建一条笔记</p>
                <p className="text-sm">从左侧列表选择笔记，或点击「新建笔记」开始记录</p>
              </div>
            </div>
          )}
        </main>
      </TooltipProvider>
    </div>
  );
};

export default Workspace;
