import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, FileText, LogOut, Plus, Search, Moon, Sun, Crown,
  FolderPlus, Upload, ArrowLeftRight, PanelLeftClose, PanelLeftOpen, Menu, X,
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import DataMigration from "@/components/workspace/DataMigration";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useNotes } from "@/hooks/useNotes";
import { useTags } from "@/hooks/useTags";
import { useFolders } from "@/hooks/useFolders";
import NoteEditor from "@/components/workspace/NoteEditor";
import AiChatPanel from "@/components/workspace/AiChatPanel";
import SettingsDialog from "@/components/workspace/SettingsDialog";
import SidebarNoteItem from "@/components/workspace/SidebarNoteItem";
import SidebarFolderTree from "@/components/workspace/SidebarFolderTree";
import WorkspaceEmptyState from "@/components/workspace/WorkspaceEmptyState";
import UserAvatar from "@/components/workspace/UserAvatar";
import TrashBin from "@/components/workspace/TrashBin";
import NoteTemplates from "@/components/workspace/NoteTemplates";
import { useDocumentImport } from "@/hooks/useDocumentImport";
import { getStorageSettings, setStorageSettings, StorageSettings, localNotesStorage } from "@/lib/localNotesStorage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Workspace = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isPro, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [storageSettings, setStorageSettingsState] = useState<StorageSettings>(getStorageSettings);
  const { notes, trashedNotes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote, restoreNote, permanentDeleteNote, emptyTrash, refreshNotes } = useNotes(storageSettings);
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
  const dragCounterRef = useRef<Record<string, number>>({});

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile sidebar open state (sheet-based)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────

  const handlePageFontSizeChange = useCallback((size: number) => {
    setPageFontSize(size);
    localStorage.setItem("noteFontSize", String(size));
  }, []);

  const handleStorageSettingsChange = useCallback((settings: StorageSettings) => {
    setStorageSettingsState(settings);
    setStorageSettings(settings);
  }, []);

  const toggleDarkMode = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [isDark]);

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

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  }, []);

  const handleCreateFolder = useCallback(async (parentId?: string) => {
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
  }, [createFolder]);

  const handleRenameSubmit = useCallback(async (folderId: string) => {
    if (renameValue.trim()) await renameFolder(folderId, renameValue.trim());
    setRenamingFolderId(null);
  }, [renameValue, renameFolder]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    await deleteFolder(folderId);
    await refreshNotes();
    toast({ title: "已删除目录" });
  }, [deleteFolder, refreshNotes, toast]);

  const handleCreateNoteInFolder = useCallback(async (folderId: string) => {
    await createNote(folderId);
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  }, [createNote]);

  const handleMoveNote = useCallback(async (noteId: string, folderId: string | null) => {
    if (storageSettings.mode === "local") {
      const target = notes.find((n) => n.id === noteId);
      if (!target) return;
      const updated = { ...target, folder_id: folderId, updated_at: new Date().toISOString() };
      await localNotesStorage.save(updated, storageSettings.localPath);
      await refreshNotes();
    } else {
      const ok = await moveNoteToFolder(noteId, folderId);
      if (ok) await refreshNotes();
    }
    const folderName = folderId ? folders.find(f => f.id === folderId)?.name : "未分类";
    toast({ title: "已移动", description: `笔记已移至「${folderName}」` });
  }, [storageSettings, notes, refreshNotes, moveNoteToFolder, folders, toast]);

  // Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("text/plain", noteId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDropOnFolder = useCallback(async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[folderId] = 0;
    setDragOverFolderId(null);
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId) {
      await handleMoveNote(noteId, folderId);
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
  }, [handleMoveNote]);

  const handleFolderDragEnter = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[folderId] = (dragCounterRef.current[folderId] || 0) + 1;
    setDragOverFolderId(folderId);
  }, []);

  const handleFolderDragLeave = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[folderId] = (dragCounterRef.current[folderId] || 0) - 1;
    if (dragCounterRef.current[folderId] <= 0) {
      dragCounterRef.current[folderId] = 0;
      setDragOverFolderId(null);
    }
  }, []);

  const handleDropOnUnfoldered = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current["__unfoldered"] = 0;
    setDragOverUnfoldered(false);
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId) await handleMoveNote(noteId, null);
  }, [handleMoveNote]);

  const handleUnfolderedDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current["__unfoldered"] = (dragCounterRef.current["__unfoldered"] || 0) + 1;
    setDragOverUnfoldered(true);
  }, []);

  const handleUnfolderedDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current["__unfoldered"] = (dragCounterRef.current["__unfoldered"] || 0) - 1;
    if (dragCounterRef.current["__unfoldered"] <= 0) {
      dragCounterRef.current["__unfoldered"] = 0;
      setDragOverUnfoldered(false);
    }
  }, []);

  const handleNewNote = useCallback(() => {
    createNote(activeFolderId || undefined);
    if (activeFolderId) setExpandedFolders((prev) => new Set(prev).add(activeFolderId));
    if (isMobile) setMobileSidebarOpen(false);
  }, [createNote, activeFolderId, isMobile]);

  const handleCreateFromTemplate = useCallback(async (title: string, content: string) => {
    if (!user) return;
    if (storageSettings.mode === "local") {
      const now = new Date().toISOString();
      const note = {
        id: crypto.randomUUID(), title, content,
        folder_id: activeFolderId || null, created_at: now, updated_at: now,
      };
      await localNotesStorage.save(note, storageSettings.localPath);
      await refreshNotes();
      setActiveNoteId(note.id);
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title, content, folder_id: activeFolderId || null })
        .select("id, title, content, folder_id, created_at, updated_at")
        .single();
      if (!error && data) { await refreshNotes(); setActiveNoteId(data.id); }
    }
    if (activeFolderId) setExpandedFolders((prev) => new Set(prev).add(activeFolderId));
    toast({ title: "已创建", description: `从模板创建「${title}」` });
    if (isMobile) setMobileSidebarOpen(false);
  }, [user, storageSettings, activeFolderId, refreshNotes, setActiveNoteId, toast, isMobile]);

  const handleSelectNote = useCallback((id: string, folderId: string | null) => {
    setActiveNoteId(id);
    setActiveFolderId(folderId);
    if (isMobile) setMobileSidebarOpen(false);
  }, [setActiveNoteId, isMobile]);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const result = await importFile(file);
    if (result) {
      if (storageSettings.mode === "local") {
        const now = new Date().toISOString();
        const note = {
          id: crypto.randomUUID(), title: result.title, content: result.content,
          folder_id: activeFolderId || null, created_at: now, updated_at: now,
        };
        await localNotesStorage.save(note, storageSettings.localPath);
        await refreshNotes();
        setActiveNoteId(note.id);
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert({ user_id: user.id, title: result.title, content: result.content, folder_id: activeFolderId || null })
          .select("id, title, content, folder_id, created_at, updated_at")
          .single();
        if (!error && data) { await refreshNotes(); setActiveNoteId(data.id); }
      }
      if (activeFolderId) setExpandedFolders((prev) => new Set(prev).add(activeFolderId));
      toast({ title: "导入成功", description: `已导入「${result.title}」` });
    }
    e.target.value = "";
  }, [user, importFile, storageSettings, activeFolderId, refreshNotes, setActiveNoteId, toast]);

  // ─── Computed ──────────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedTagId) result = result.filter((n) => (noteTagsMap[n.id] || []).includes(selectedTagId));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    return result;
  }, [notes, searchQuery, selectedTagId, noteTagsMap]);

  const unfolderedNotes = useMemo(() => filteredNotes.filter((n) => !n.folder_id), [filteredNotes]);

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
  const rootFolders = useMemo(() => getChildFolders(null), [getChildFolders]);

  // ─── Loading state ─────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center animate-pulse shadow-sm">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">加载中...</p>
        </div>
      </div>
    );
  }

  // ─── Sidebar Content (shared between desktop & mobile) ─────────
  const sidebarContent = (
    <>
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

      {/* Action buttons */}
      <div className="px-3 pb-2 flex gap-1.5">
        <button
          onClick={handleNewNote}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap overflow-hidden"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="truncate">新建笔记</span>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => handleCreateFolder()} className="px-2 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors shrink-0">
              <FolderPlus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">新建目录</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => importInputRef.current?.click()} className="px-2 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors shrink-0">
              <Upload className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">导入文档</TooltipContent>
        </Tooltip>
        <NoteTemplates onCreateFromTemplate={handleCreateFromTemplate} />
        <Sheet>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <button className="px-2 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors shrink-0">
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">导入导出 / 数据迁移</TooltipContent>
          </Tooltip>
          <SheetContent side="left" className="w-[380px] sm:w-[420px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>导入导出 / 数据迁移</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <DataMigration storageSettings={storageSettings} onMigrationComplete={refreshNotes} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <input type="file" ref={importInputRef} className="hidden" accept={acceptString} onChange={handleImportFile} />

      {/* Note list with folders */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {loading && (
          <div className="flex flex-col gap-2 py-4 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && filteredNotes.length === 0 && (
          <div className="text-center py-12 px-4 animate-in fade-in-50 duration-300">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {isSearching ? "未找到匹配的笔记" : "还没有笔记，点击上方按钮创建"}
            </p>
          </div>
        )}

        {!loading && !isSearching && (
          <>
            {rootFolders.map((folder) => (
              <SidebarFolderTree
                key={folder.id}
                folder={folder}
                notesByFolder={notesByFolder}
                getChildFolders={getChildFolders}
                expandedFolders={expandedFolders}
                activeFolderId={activeFolderId}
                activeNoteId={activeNoteId}
                dragOverFolderId={dragOverFolderId}
                renamingFolderId={renamingFolderId}
                renameValue={renameValue}
                folders={folders}
                onToggleFolder={toggleFolder}
                onSetActiveFolder={setActiveFolderId}
                onRenameValueChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onStartRename={(id, name) => { setRenamingFolderId(id); setRenameValue(name); }}
                onCancelRename={() => setRenamingFolderId(null)}
                onCreateNoteInFolder={handleCreateNoteInFolder}
                onCreateSubfolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onSelectNote={handleSelectNote}
                onDeleteNote={deleteNote}
                onMoveNote={handleMoveNote}
                onDragStart={handleDragStart}
                onFolderDragEnter={handleFolderDragEnter}
                onFolderDragLeave={handleFolderDragLeave}
                onDropOnFolder={handleDropOnFolder}
              />
            ))}

            {(unfolderedNotes.length > 0 || folders.length > 0) && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={handleUnfolderedDragEnter}
                onDragLeave={handleUnfolderedDragLeave}
                onDrop={handleDropOnUnfoldered}
                className={cn(
                  "mt-2 pt-2 border-t border-border/50 rounded-lg transition-colors duration-200",
                  dragOverUnfoldered && "bg-primary/10 ring-2 ring-primary/30"
                )}
              >
                <p
                  className={cn(
                    "text-[11px] text-muted-foreground/50 px-3 pb-1 font-medium cursor-pointer hover:text-muted-foreground transition-colors",
                    activeFolderId === null && folders.length > 0 && "text-primary"
                  )}
                  onClick={() => setActiveFolderId(null)}
                >
                  未分类
                </p>
                {unfolderedNotes.map((note) => (
                  <SidebarNoteItem
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    folders={folders}
                    onSelect={handleSelectNote}
                    onDelete={deleteNote}
                    onMove={handleMoveNote}
                    onDragStart={handleDragStart}
                  />
                ))}
                {unfolderedNotes.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 py-2 pl-4">无未分类笔记</p>
                )}
              </div>
            )}
          </>
        )}

        {!loading && isSearching && filteredNotes.map((note) => (
          <SidebarNoteItem
            key={note.id}
            note={note}
            isActive={activeNoteId === note.id}
            folders={folders}
            onSelect={handleSelectNote}
            onDelete={deleteNote}
            onMove={handleMoveNote}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      {/* Bottom: user info + actions */}
      <div className="border-t border-border p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            displayName={user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            avatarUrl={user?.user_metadata?.avatar_url}
            isPro={isPro}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-foreground truncate block">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            </span>
            {isPro ? (
              <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                <Crown className="w-2.5 h-2.5" /> Pro
              </span>
            ) : (
              <button
                onClick={() => navigate("/upgrade")}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                升级 Pro →
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleDarkMode} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{isDark ? "切换到浅色模式" : "切换到深色模式"}</TooltipContent>
          </Tooltip>
          <TrashBin
            trashedNotes={trashedNotes}
            onRestore={restoreNote}
            onPermanentDelete={permanentDeleteNote}
            onEmptyTrash={emptyTrash}
          />
          <SettingsDialog
            pageFontSize={pageFontSize}
            onPageFontSizeChange={handlePageFontSizeChange}
            storageSettings={storageSettings}
            onStorageSettingsChange={handleStorageSettingsChange}
            onMigrationComplete={refreshNotes}
          />
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => navigate("/admin")} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Sparkles className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">管理后台</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleSignOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">退出登录</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-background" style={{ '--page-font-scale': pageFontSize / 15 } as React.CSSProperties}>
      <TooltipProvider delayDuration={300}>

        {/* ── Mobile: hamburger + sheet sidebar ── */}
        {isMobile ? (
          <>
            {/* Mobile top bar */}
            {!activeNote && (
              <div className="fixed top-0 left-0 right-0 z-40 h-12 bg-background border-b border-border flex items-center px-3 gap-2">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-bold text-foreground">智记 AI</span>
                </div>
              </div>
            )}

            {/* Mobile sidebar as sheet */}
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                <div className="h-13 border-b border-border flex items-center justify-between px-4 shrink-0">
                  <Link to="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-bold text-foreground">智记 AI</span>
                  </Link>
                </div>
                {sidebarContent}
              </SheetContent>
            </Sheet>

            {/* Mobile main content */}
            <main className="flex-1 flex flex-col bg-section-alt w-full">
              {activeNote ? (
                <div className="flex-1 flex flex-col h-screen">
                  {/* Mobile editor top bar */}
                  <div className="h-12 border-b border-border flex items-center px-3 gap-2 bg-background shrink-0">
                    <button
                      onClick={() => setActiveNoteId(null)}
                      className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                    >
                      <PanelLeftOpen className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-foreground truncate flex-1">{activeNote.title || "无标题笔记"}</span>
                    <button
                      onClick={() => setMobileSidebarOpen(true)}
                      className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </div>
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
                </div>
              ) : (
                <div className="flex-1 flex flex-col pt-12">
                  <WorkspaceEmptyState onCreateNote={handleNewNote} />
                </div>
              )}
            </main>
          </>
        ) : (
          /* ── Desktop layout ── */
          <>
            {/* Desktop sidebar */}
            <aside
              className={cn(
                "border-r border-border bg-card flex flex-col h-full shrink-0 transition-all duration-300 overflow-hidden",
                sidebarCollapsed ? "w-14" : "w-72"
              )}
            >
              {/* Logo + collapse/expand button */}
              <div className={cn(
                "h-13 border-b border-border flex items-center shrink-0 transition-all duration-300",
                sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"
              )}>
                {sidebarCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                      >
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">展开侧边栏</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Link to="/" className="flex items-center gap-2.5 group">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-bold text-foreground tracking-tight">智记 AI</span>
                    </Link>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSidebarCollapsed(true)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">收起侧边栏</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>

              {/* Collapsed icon buttons */}
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleNewNote}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">新建笔记</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleCreateFolder()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">新建目录</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => importInputRef.current?.click()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">导入文档</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">搜索笔记</TooltipContent>
                  </Tooltip>

                  <div className="w-8 border-t border-border my-1" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <PanelLeftOpen className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">展开侧边栏</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                sidebarContent
              )}
            </aside>

            {/* Desktop editor area */}
            <main className="flex-1 flex bg-section-alt min-w-0">
              <div className="flex-1 flex min-w-0">
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
                  <WorkspaceEmptyState onCreateNote={handleNewNote} />
                )}
              </div>
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
          </>
        )}
      </TooltipProvider>
    </div>
  );
};

export default Workspace;
