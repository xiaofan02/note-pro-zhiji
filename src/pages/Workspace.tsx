import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, FileText, LogOut, Home, MessageSquare, BookOpen, Tags,
  Plus, Search, Image, LinkIcon, Video, MoreHorizontal, RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useTags } from "@/hooks/useTags";
import NoteEditor from "@/components/workspace/NoteEditor";
import TagFilter from "@/components/workspace/TagFilter";

const Workspace = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { notes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote } = useNotes();
  const { tags, noteTagsMap, createTag, addTagToNote, removeTagFromNote, getTagsForNote } = useTags();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"home" | "tags">("home");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleQuickCreate = async () => {
    if (!quickInput.trim()) {
      await createNote();
      return;
    }
    // Create note with the quick input content
    if (!user) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: quickInput.slice(0, 50), content: quickInput })
      .select("id, title, content, created_at, updated_at")
      .single();
    if (!error && data) {
      setQuickInput("");
      // Refresh notes
      window.location.reload();
    }
  };

  const filteredNotes = (() => {
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
  })();

  // Group notes by date
  const groupedNotes = (() => {
    const groups: Record<string, typeof filteredNotes> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filteredNotes.forEach((note) => {
      const noteDate = new Date(note.updated_at);
      let label: string;
      if (noteDate.toDateString() === today.toDateString()) {
        label = "今天";
      } else if (noteDate.toDateString() === yesterday.toDateString()) {
        label = "昨天";
      } else {
        label = noteDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(note);
    });
    return groups;
  })();

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // If editing a note, show the editor
  if (activeNote) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setActiveNoteId(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← 返回
          </button>
          <span className="text-sm font-medium text-foreground truncate flex-1">{activeNote.title}</span>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <NoteEditor
            note={activeNote}
            onUpdate={updateNote}
            tags={tags}
            noteTags={getTagsForNote(activeNote.id)}
            onCreateTag={createTag}
            onAddTag={addTagToNote}
            onRemoveTag={removeTagFromNote}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[hsl(var(--section-alt))]">
      {/* Left icon sidebar */}
      <aside className="w-[72px] bg-background border-r border-border flex flex-col items-center py-6 shrink-0">
        <Link to="/" className="mb-8">
          <div className="w-9 h-9 bg-foreground rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
        </Link>

        <nav className="flex flex-col items-center gap-1 flex-1">
          <SidebarIcon
            icon={<Home className="w-[18px] h-[18px]" />}
            label="首页"
            active={sidebarTab === "home"}
            onClick={() => setSidebarTab("home")}
          />
          <SidebarIcon
            icon={<MessageSquare className="w-[18px] h-[18px]" />}
            label="AI助手"
            onClick={() => {}}
          />
          <SidebarIcon
            icon={<BookOpen className="w-[18px] h-[18px]" />}
            label="知识库"
            onClick={() => {}}
          />
          <SidebarIcon
            icon={<Tags className="w-[18px] h-[18px]" />}
            label="标签"
            active={sidebarTab === "tags"}
            onClick={() => setSidebarTab("tags")}
          />
        </nav>

        <div className="flex flex-col items-center gap-2 mt-auto">
          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
            {user?.email?.split("@")[0]}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--section-alt))] border-b border-border px-8 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">笔记筛选</span>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记 (Ctrl+K)"
              className="w-full pl-9 pr-3 py-2 text-sm bg-background rounded-lg border border-border outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
          {/* Quick input */}
          <div className="bg-background rounded-xl border border-border p-5 space-y-4">
            <textarea
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="记录现在的想法..."
              rows={3}
              className="w-full bg-transparent border-none outline-none text-foreground text-sm leading-relaxed resize-none placeholder:text-muted-foreground/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleQuickCreate();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <button className="p-1.5 hover:bg-muted rounded transition-colors"><Image className="w-4 h-4" /></button>
                <span className="w-px h-4 bg-border" />
                <button className="p-1.5 hover:bg-muted rounded transition-colors font-bold text-sm">B</button>
                <button className="p-1.5 hover:bg-muted rounded transition-colors font-bold text-sm">A</button>
                <button className="p-1.5 hover:bg-muted rounded transition-colors italic text-sm">I</button>
              </div>
              <button
                onClick={handleQuickCreate}
                className="px-4 py-1.5 bg-foreground text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                创建笔记
              </button>
            </div>
          </div>

          {/* Action cards */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">你还可以</p>
            <div className="grid grid-cols-3 gap-3">
              <ActionCard
                icon={<Image className="w-5 h-5 text-primary" />}
                title="添加图片"
                desc="AI智能识别"
                onClick={() => createNote()}
              />
              <ActionCard
                icon={<LinkIcon className="w-5 h-5 text-primary" />}
                title="添加链接"
                desc="AI智能分析"
                onClick={() => createNote()}
              />
              <ActionCard
                icon={<Video className="w-5 h-5 text-primary" />}
                title="导入音视频"
                desc="转文字稿，AI智能总结"
                onClick={() => createNote()}
              />
            </div>
          </div>

          {/* Tag filter */}
          {sidebarTab === "tags" && (
            <TagFilter tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} />
          )}

          {/* Note list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-foreground">笔记列表（{filteredNotes.length}条）</p>
              <span className="text-xs text-muted-foreground">排序：创建时间（由近到远）</span>
            </div>

            {loading && (
              <div className="text-center text-muted-foreground py-12">加载中...</div>
            )}

            {!loading && filteredNotes.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>还没有笔记，试试在上方快速记录</p>
              </div>
            )}

            <div className="space-y-6">
              {Object.entries(groupedNotes).map(([dateLabel, dateNotes]) => (
                <div key={dateLabel}>
                  <p className="text-sm font-semibold text-foreground mb-3">{dateLabel}</p>
                  <div className="space-y-3">
                    {dateNotes.map((note) => {
                      const noteTags = getTagsForNote(note.id);
                      return (
                        <div
                          key={note.id}
                          onClick={() => setActiveNoteId(note.id)}
                          className="bg-background rounded-xl border border-border p-5 cursor-pointer hover:shadow-sm transition-shadow group"
                        >
                          <h3 className="font-semibold text-foreground mb-2">{note.title || "无标题笔记"}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                            {note.content?.slice(0, 200) || "空笔记"}
                          </p>
                          {noteTags.length > 0 && (
                            <div className="flex gap-1.5 mt-3 flex-wrap">
                              {noteTags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 rounded-full text-[11px] text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-border">
                            <span className="text-xs text-muted-foreground">
                              创建于 {new Date(note.created_at).toLocaleString("zh-CN")}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(note.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                              title="更多"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarIcon = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl w-14 transition-colors ${
      active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    {icon}
    <span className="text-[10px]">{label}</span>
  </button>
);

const ActionCard = ({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 bg-background rounded-xl border border-border p-4 hover:shadow-sm transition-shadow text-left relative"
  >
    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
    <span className="absolute top-2 right-3 text-[10px] font-semibold text-primary opacity-60">AI</span>
  </button>
);

export default Workspace;
