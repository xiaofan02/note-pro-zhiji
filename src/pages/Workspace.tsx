import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, FileText, LogOut, Plus, Search, Trash2, Moon, Sun, User,
  FolderOpen, Folder, ChevronRight, ChevronDown, MoreHorizontal, FolderPlus, Edit2, Upload
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNotes } from "@/hooks/useNotes";
import { useTags } from "@/hooks/useTags";
import { useFolders, Folder as FolderType } from "@/hooks/useFolders";
import NoteEditor from "@/components/workspace/NoteEditor";
import AiChatPanel from "@/components/workspace/AiChatPanel";
import TagFilter from "@/components/workspace/TagFilter";
import SettingsDialog from "@/components/workspace/SettingsDialog";
import { useDocumentImport } from "@/hooks/useDocumentImport";
import { cn } from "@/lib/utils";

const Workspace = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { notes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote, refreshNotes } = useNotes();
  const { tags, noteTagsMap, createTag, addTagToNote, removeTagFromNote, getTagsForNote } = useTags();
  const { folders, createFolder, renameFolder, deleteFolder, moveNoteToFolder, getChildFolders } = useFolders();
  const { importFile, acceptString } = useDocumentImport();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [pageFontSize, setPageFontSize] = useState(() => {
    const saved = localStorage.getItem("noteFontSize");
    return saved ? parseInt(saved, 10) : 15;
  });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverUnfoldered, setDragOverUnfoldered] = useState(false);
  const [showAiChat, setShowAiChat] = useState(true);
  const dragCounterRef = useRef<Record<string, number>>({});

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

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCreateFolder = async (parentId?: string) => {
    const folder = await createFolder(undefined, parentId);
    if (folder) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(folder.id);
        if (parentId) next.add(parentId);
        return next;
      });
      setRenamingFolderId(folder.id);
      setRenameValue(folder.name);
    }
  };

  const handleRenameSubmit = async (folderId: string) => {
    if (renameValue.trim()) {
      await renameFolder(folderId, renameValue.trim());
    }
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    await refreshNotes();
  };

  const handleCreateNoteInFolder = async (folderId: string) => {
    await createNote(folderId);
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  };

  const handleMoveNote = async (noteId: string, folderId: string | null) => {
    const ok = await moveNoteToFolder(noteId, folderId);
    if (ok) await refreshNotes();
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("text/plain", noteId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[folderId] = 0;
    setDragOverFolderId(null);
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId) {
      await handleMoveNote(noteId, folderId);
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[folderId] = (dragCounterRef.current[folderId] || 0) + 1;
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[folderId] = (dragCounterRef.current[folderId] || 0) - 1;
    if (dragCounterRef.current[folderId] <= 0) {
      dragCounterRef.current[folderId] = 0;
      setDragOverFolderId(null);
    }
  };

  const handleDropOnUnfoldered = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current["__unfoldered"] = 0;
    setDragOverUnfoldered(false);
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId) {
      await handleMoveNote(noteId, null);
    }
  };

  const handleUnfolderedDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current["__unfoldered"] = (dragCounterRef.current["__unfoldered"] || 0) + 1;
    setDragOverUnfoldered(true);
  };

  const handleUnfolderedDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current["__unfoldered"] = (dragCounterRef.current["__unfoldered"] || 0) - 1;
    if (dragCounterRef.current["__unfoldered"] <= 0) {
      dragCounterRef.current["__unfoldered"] = 0;
      setDragOverUnfoldered(false);
    }
  };

  const handleNewNote = () => {
    createNote(activeFolderId || undefined);
    if (activeFolderId) {
      setExpandedFolders((prev) => new Set(prev).add(activeFolderId));
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const result = await importFile(file);
    if (result) {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: result.title,
          content: result.content,
          folder_id: activeFolderId || null,
        })
        .select("id, title, content, folder_id, created_at, updated_at")
        .single();
      if (!error && data) {
        await refreshNotes();
        setActiveNoteId(data.id);
        if (activeFolderId) {
          setExpandedFolders((prev) => new Set(prev).add(activeFolderId));
        }
      }
    }
    e.target.value = "";
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

  // Group notes by folder
  const unfolderedNotes = filteredNotes.filter((n) => !n.folder_id);
  const notesByFolder = useMemo(() => {
    const map: Record<string, typeof filteredNotes> = {};
    for (const note of filteredNotes) {
      if (note.folder_id) {
        if (!map[note.folder_id]) map[note.folder_id] = [];
        map[note.folder_id].push(note);
      }
    }
    return map;
  }, [filteredNotes]);

  const isSearching = !!(searchQuery || selectedTagId);

  const renderNoteItem = (note: typeof notes[0]) => {
    const noteTags = getTagsForNote(note.id);
    const isActive = activeNoteId === note.id;
    return (
      <div
        key={note.id}
        draggable
        onDragStart={(e) => handleDragStart(e, note.id)}
        onClick={() => { setActiveNoteId(note.id); setActiveFolderId(note.folder_id); }}
        className={cn(
          "group flex items-start gap-2.5 p-3 rounded-lg cursor-grab transition-all active:cursor-grabbing",
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
            {note.content?.replace(/<[^>]*>/g, "").slice(0, 60) || "空笔记"}
          </p>
          {/* Tags on notes - commented out for now
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
          */}
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            {new Date(note.updated_at).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {folders.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  title="移动到目录"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                {note.folder_id && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMoveNote(note.id, null); }}>
                    <FileText className="w-3.5 h-3.5 mr-2" />
                    移出目录
                  </DropdownMenuItem>
                )}
                {folders.filter(f => f.id !== note.folder_id).map((folder) => (
                  <DropdownMenuItem key={folder.id} onClick={(e) => { e.stopPropagation(); handleMoveNote(note.id, folder.id); }}>
                    <Folder className="w-3.5 h-3.5 mr-2" />
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
      </div>
    );
  };

  // Recursive folder renderer
  const renderFolder = (folder: FolderType, depth: number = 0) => {
    const folderNotes = notesByFolder[folder.id] || [];
    const childFolders = getChildFolders(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const totalNotes = folderNotes.length;

    return (
      <div
        key={folder.id}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragEnter={(e) => handleFolderDragEnter(e, folder.id)}
        onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
        onDrop={(e) => handleDropOnFolder(e, folder.id)}
        className={cn(
          "mb-0.5 rounded-lg transition-colors",
          dragOverFolderId === folder.id && "bg-primary/10 ring-2 ring-primary/30"
        )}
      >
        {/* Folder header */}
        <div
          onClick={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)}
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
            dragOverFolderId !== folder.id && "hover:bg-muted/60",
            activeFolderId === folder.id && dragOverFolderId !== folder.id && "bg-accent"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <button onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }} className="flex items-center gap-1.5 flex-1 min-w-0">
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            }
            <FolderOpen className={cn("w-4 h-4 shrink-0", isExpanded ? "text-primary" : "text-muted-foreground")} />
            {renamingFolderId === folder.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(folder.id);
                  if (e.key === "Escape") setRenamingFolderId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 text-sm bg-transparent border-b border-primary outline-none text-foreground"
              />
            ) : (
              <span className="text-sm font-medium text-foreground truncate">{folder.name}</span>
            )}
            <span className="text-[11px] text-muted-foreground/50 ml-1">{totalNotes}</span>
          </button>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCreateNoteInFolder(folder.id); }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">在此目录新建笔记</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem onClick={() => handleCreateFolder(folder.id)}>
                  <FolderPlus className="w-3.5 h-3.5 mr-2" /> 新建子目录
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); }}>
                  <Edit2 className="w-3.5 h-3.5 mr-2" /> 重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除目录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Folder contents */}
        {isExpanded && (
          <div className="ml-3 mt-0.5 space-y-0.5 min-h-[32px]">
            {/* Child folders */}
            {childFolders.map((child) => renderFolder(child, depth + 1))}
            {/* Notes in this folder */}
            {folderNotes.map(renderNoteItem)}
            {folderNotes.length === 0 && childFolders.length === 0 && (
              <p className="text-xs text-muted-foreground/50 py-2 pl-4">目录为空</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Get root-level folders (no parent)
  const rootFolders = useMemo(() => getChildFolders(null), [getChildFolders]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background" style={{ '--page-font-scale': pageFontSize / 15 } as React.CSSProperties}>
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

          {/* Tags - commented out for now
          <TagFilter tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} />
          */}

          {/* Action buttons */}
          <div className="px-3 pb-2 flex gap-2">
            <button
              onClick={handleNewNote}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建笔记{activeFolderId ? ` (${folders.find(f => f.id === activeFolderId)?.name})` : ""}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleCreateFolder()}
                  className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">新建目录</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">导入文档</TooltipContent>
            </Tooltip>
          </div>
          <input
            type="file"
            ref={importInputRef}
            className="hidden"
            accept={acceptString}
            onChange={handleImportFile}
          />

          {/* Note list with folders */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-8">加载中...</p>
            )}
            {!loading && filteredNotes.length === 0 && (
              <div className="text-center py-12 px-4">
                <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isSearching ? "未找到匹配的笔记" : "还没有笔记，点击上方按钮创建"}
                </p>
              </div>
            )}

            {!loading && !isSearching && (
              <>
                {/* Folders - only root level, children rendered recursively */}
                {rootFolders.map((folder) => renderFolder(folder))}

                {/* Unfoldered notes - drop target */}
                {(unfolderedNotes.length > 0 || folders.length > 0) && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDragEnter={handleUnfolderedDragEnter}
                    onDragLeave={handleUnfolderedDragLeave}
                    onDrop={handleDropOnUnfoldered}
                    className={cn(
                      "mt-2 pt-2 border-t border-border/50 rounded-lg transition-colors",
                      dragOverUnfoldered && "bg-primary/10 ring-2 ring-primary/30"
                    )}
                  >
                    <p
                      className={cn("text-[11px] text-muted-foreground/50 px-3 pb-1 font-medium cursor-pointer hover:text-muted-foreground", activeFolderId === null && folders.length > 0 && "text-primary")}
                      onClick={() => setActiveFolderId(null)}
                    >
                      未分类
                    </p>
                    {unfolderedNotes.map(renderNoteItem)}
                    {unfolderedNotes.length === 0 && (
                      <p className="text-xs text-muted-foreground/50 py-2 pl-4">无未分类笔记</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* When searching, show flat list */}
            {!loading && isSearching && filteredNotes.map(renderNoteItem)}
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
          <div className="flex-1 flex">
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
          </div>

          {/* AI Chat Panel */}
          <AiChatPanel
            onSaveNote={async (title, content) => {
              if (!user) return;
              const { data, error } = await supabase
                .from("notes")
                .insert({ user_id: user.id, title, content })
                .select("id, title, content, folder_id, created_at, updated_at")
                .single();
              if (error) throw error;
              refreshNotes();
              if (data) setActiveNoteId(data.id);
            }}
          />
        </main>
      </TooltipProvider>
    </div>
  );
};

export default Workspace;
