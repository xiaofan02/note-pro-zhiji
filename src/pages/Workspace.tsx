import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, FileText, LogOut, Plus, Search, Moon, Sun, Crown,
  FolderPlus, PanelLeftClose, PanelLeftOpen, Menu, X, RefreshCw, ArrowUpDown,
  Star, Trash2, Tag, FolderInput, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import SortableNoteItem from "@/components/workspace/SortableNoteItem";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { getStorageSettings, setStorageSettings, StorageSettings, localNotesStorage, isTauri } from "@/lib/localNotesStorage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { useTauriUpdate } from "@/hooks/useTauriUpdate";
import UpdateBanner from "@/components/workspace/UpdateBanner";
import { useAiConfig } from "@/hooks/useAiConfig";
import { useRecentNotes } from "@/hooks/useRecentNotes";
import { Clock, PackageOpen, Zap } from "lucide-react";
import { useWorkflow } from "@/hooks/useWorkflow";
import WorkflowPanel from "@/components/workspace/WorkflowPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Workspace = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isPro, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { hasUpdate, updating, update: pwaUpdate } = usePwaUpdate();
  const [pwaBannerDismissed, setPwaBannerDismissed] = useState(false);
  const tauriUpdate = useTauriUpdate();
  const isTauriEnv = isTauri();
  const updateAvailable = isTauriEnv ? tauriUpdate.hasUpdate : hasUpdate;
  const updateBusy = isTauriEnv ? tauriUpdate.updating : updating;
  const [storageSettings, setStorageSettingsState] = useState<StorageSettings>(getStorageSettings);
  const { notes, trashedNotes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote, restoreNote, permanentDeleteNote, emptyTrash, refreshNotes, fetchNoteContent, togglePin, toggleShare, toggleFavorite } = useNotes(storageSettings);
  const [contentLoading, setContentLoading] = useState(false);
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
  // Sort order
  type SortOrder = "updated_desc" | "created_desc" | "title_asc" | "title_desc";
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    return (localStorage.getItem("noteSortOrder") as SortOrder) || "updated_desc";
  });
  const sortLabels: Record<SortOrder, string> = {
    updated_desc: "最近更新",
    created_desc: "最近创建",
    title_asc: "标题 A→Z",
    title_desc: "标题 Z→A",
  };

  // Batch selection
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // Favorites filter
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Full-text search dialog
  const [fullSearchOpen, setFullSearchOpen] = useState(false);
  const [fullSearchQuery, setFullSearchQuery] = useState("");
  const fullSearchInputRef = useRef<HTMLInputElement>(null);

  // Sort mode (drag to reorder)
  const [sortMode, setSortMode] = useState(false);
  // Custom note order stored in localStorage
  const NOTE_ORDER_KEY = "zhiji-note-order";
  const [customNoteOrder, setCustomNoteOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(NOTE_ORDER_KEY) || "[]"); } catch { return []; }
  });
  const sortedUnfolderedRef = useRef<{ id: string }[]>([]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDndEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIds = sortedUnfolderedRef.current.map(n => n.id);
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(currentIds, oldIndex, newIndex);
    localStorage.setItem(NOTE_ORDER_KEY, JSON.stringify(newOrder));
    setCustomNoteOrder(newOrder);
  }, []);

  const toggleBatchSelect = (id: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    for (const id of selectedNoteIds) await deleteNote(id);
    setSelectedNoteIds(new Set());
    setBatchMode(false);
  };

  const handleBatchFavorite = () => {
    for (const id of selectedNoteIds) toggleFavorite(id);
    setSelectedNoteIds(new Set());
    setBatchMode(false);
  };

  const handleBatchMove = (folderId: string | null) => {
    for (const id of selectedNoteIds) moveNoteToFolder(id, folderId);
    setSelectedNoteIds(new Set());
    setBatchMode(false);
  };

  const handleBatchExport = useCallback(async () => {
    const selected = notes.filter(n => selectedNoteIds.has(n.id));
    if (selected.length === 0) return;
    // Export as single markdown file with all notes
    const content = selected.map(n => {
      const text = n.content?.replace(/<[^>]*>/g, "") || "";
      return `# ${n.title || "无标题笔记"}\n\n${text}\n\n---\n`;
    }).join("\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `笔记导出_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "导出成功", description: `已导出 ${selected.length} 篇笔记` });
    setSelectedNoteIds(new Set());
    setBatchMode(false);
  }, [notes, selectedNoteIds, toast]);

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

  const handleNewNote = useCallback(async () => {
    await createNote(activeFolderId || undefined);
    if (activeFolderId) setExpandedFolders((prev) => new Set(prev).add(activeFolderId));
    if (isMobile) setMobileSidebarOpen(false);
  }, [createNote, activeFolderId, isMobile]);

  // ─── Workflow (must be declared before useEffect that uses triggerWorkflow) ──
  const [workflowPanelOpen, setWorkflowPanelOpen] = useState(false);
  const { config: aiConfig } = useAiConfig();
  const workflowDeps = useMemo(() => ({
    aiConfig,
    updateNote: async (id: string, updates: { title?: string; content?: string }) => {
      await updateNote(id, updates);
    },
    addTagToNote: async (noteId: string, tagName: string) => {
      const existing = tags.find(t => t.name === tagName);
      if (existing) {
        addTagToNote(noteId, existing.id);
      } else {
        const newTag = await createTag(tagName);
        if (newTag) addTagToNote(noteId, newTag.id);
      }
    },
    moveNoteToFolder: async (noteId: string, folderId: string | null) => {
      await moveNoteToFolder(noteId, folderId);
    },
    createNote: async (title: string, content: string, folderId?: string | null) => {
      if (storageSettings.mode === "local") {
        const now = new Date().toISOString();
        const note = { id: crypto.randomUUID(), title, content, folder_id: folderId || null, created_at: now, updated_at: now };
        await localNotesStorage.save(note, storageSettings.localPath);
      } else if (user) {
        await supabase.from("notes").insert({ user_id: user.id, title, content, folder_id: folderId || null });
      }
    },
    refreshNotes,
  }), [aiConfig, updateNote, tags, addTagToNote, createTag, moveNoteToFolder, storageSettings, user, refreshNotes]);

  const { workflows, logs, createWorkflow, updateWorkflow, deleteWorkflow, toggleWorkflow, clearLogs, trigger: triggerWorkflow } = useWorkflow(workflowDeps);

  // Trigger on_note_create after a new note is created (activeNoteId changes to a brand-new note)
  const prevActiveNoteIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeNoteId || activeNoteId === prevActiveNoteIdRef.current) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    // Only trigger if this note was just created (content is empty = new note)
    const isNew = !note.content || note.content === "" || note.content === "<p></p>";
    if (isNew) {
      triggerWorkflow("on_note_create", {
        noteId: note.id,
        noteTitle: note.title,
        noteContent: note.content || "",
        noteFolderId: note.folder_id,
        noteTags: [],
        triggerType: "on_note_create",
      });
    }
    prevActiveNoteIdRef.current = activeNoteId;
  }, [activeNoteId, notes, triggerWorkflow]);

  // ─── Global keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      switch (e.key) {
        case "n":
          e.preventDefault();
          handleNewNote();
          break;
        case "\\":
          e.preventDefault();
          setSidebarCollapsed((v) => !v);
          break;
        case "f":
          if (!e.shiftKey) {
            e.preventDefault();
            if (isMobile) {
              setMobileSidebarOpen(true);
            } else {
              setSidebarCollapsed(false);
              setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder="搜索笔记..."]')?.focus(), 300);
            }
          } else {
            // Ctrl+Shift+F → full-text search
            e.preventDefault();
            setFullSearchOpen(true);
            setTimeout(() => fullSearchInputRef.current?.focus(), 50);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewNote, isMobile]);

  // ─── Mobile swipe gesture to open/close sidebar ────────────────
  useEffect(() => {
    if (!isMobile) return;
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Only trigger if horizontal swipe is dominant and long enough
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0 && startX < 40) {
        // Swipe right from left edge → open sidebar
        setMobileSidebarOpen(true);
      } else if (dx < 0 && mobileSidebarOpen) {
        // Swipe left → close sidebar
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, mobileSidebarOpen]);

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

  const { pushRecent, getRecent } = useRecentNotes();
  const [recentOpen, setRecentOpen] = useState(false);

  const handleSelectNote = useCallback(async (id: string, folderId: string | null) => {
    setActiveNoteId(id);
    setActiveFolderId(folderId);
    if (isMobile) setMobileSidebarOpen(false);
    // Record recent
    const note = notes.find(n => n.id === id);
    if (note) pushRecent(note);
    // Lazy load content if not yet loaded
    setContentLoading(true);
    await fetchNoteContent(id);
    setContentLoading(false);
  }, [setActiveNoteId, fetchNoteContent, isMobile, notes, pushRecent]);

  // Workflow-aware note update — fires on_note_save trigger
  const handleUpdateNote = useCallback(async (id: string, updates: { title?: string; content?: string }) => {
    await updateNote(id, updates);
    const note = notes.find(n => n.id === id);
    if (note) {
      triggerWorkflow("on_note_save", {
        noteId: id,
        noteTitle: updates.title ?? note.title,
        noteContent: updates.content ?? note.content,
        noteFolderId: note.folder_id,
        noteTags: (noteTagsMap[id] || []).map(tagId => tags.find(t => t.id === tagId)?.name || ""),
        triggerType: "on_note_save",
      });
    }
  }, [updateNote, notes, noteTagsMap, tags, triggerWorkflow]);

  // Rename note title
  const handleRenameNote = useCallback(async (id: string, newTitle: string) => {
    await updateNote(id, { title: newTitle });
    toast({ title: "已重命名" });
  }, [updateNote, toast]);

  // Workflow-aware tag add — fires on_tag_added trigger
  const handleAddTagToNote = useCallback(async (noteId: string, tagId: string) => {
    await addTagToNote(noteId, tagId);
    const note = notes.find(n => n.id === noteId);
    const tagName = tags.find(t => t.id === tagId)?.name || "";
    if (note) {
      triggerWorkflow("on_tag_added", {
        noteId,
        noteTitle: note.title,
        noteContent: note.content || "",
        noteFolderId: note.folder_id,
        noteTags: [...(noteTagsMap[noteId] || []).map(tid => tags.find(t => t.id === tid)?.name || ""), tagName],
        triggerType: "on_tag_added",
      });
    }
  }, [addTagToNote, notes, tags, noteTagsMap, triggerWorkflow]);

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
    if (showFavoritesOnly) result = result.filter((n) => n.is_favorited);
    if (selectedTagId) result = result.filter((n) => (noteTagsMap[n.id] || []).includes(selectedTagId));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      // Fuzzy match: all query chars appear in order in the target
      const fuzzyMatch = (text: string) => {
        const t = text.toLowerCase();
        // First try substring match (higher priority)
        if (t.includes(q)) return true;
        // Then try fuzzy: every char of q appears in order in t
        let qi = 0;
        for (let i = 0; i < t.length && qi < q.length; i++) {
          if (t[i] === q[qi]) qi++;
        }
        return qi === q.length;
      };
      result = result.filter((n) => fuzzyMatch(n.title) || fuzzyMatch(n.content.replace(/<[^>]*>/g, "")));
    }
    // Sort: pinned always first, then by selected order
    result = [...result].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      switch (sortOrder) {
        case "created_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "title_asc": return (a.title || "").localeCompare(b.title || "", "zh");
        case "title_desc": return (b.title || "").localeCompare(a.title || "", "zh");
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return result;
  }, [notes, searchQuery, selectedTagId, noteTagsMap, sortOrder, showFavoritesOnly]);

  const unfolderedNotes = useMemo(() => filteredNotes.filter((n) => !n.folder_id), [filteredNotes]);

  // Apply custom sort order to unfoldered notes (only when not searching/filtering)
  const sortedUnfolderedNotes = useMemo(() => {
    const base = unfolderedNotes;
    let result: typeof base;
    if (customNoteOrder.length === 0) {
      result = base;
    } else {
      const orderMap = new Map(customNoteOrder.map((id, i) => [id, i]));
      result = [...base].sort((a, b) => {
        const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return ia - ib;
      });
    }
    sortedUnfolderedRef.current = result;
    return result;
  }, [unfolderedNotes, customNoteOrder]);

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
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-muted/60 rounded-lg border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30 transition-shadow"
            />
          </div>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">排序方式：{sortLabels[sortOrder]}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-36">
              {(Object.keys(sortLabels) as SortOrder[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => { setSortOrder(key); localStorage.setItem("noteSortOrder", key); }}
                  className={cn("text-xs", sortOrder === key && "text-primary font-medium")}
                >
                  {sortLabels[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setRecentOpen(v => !v)}
                className={cn("p-2 rounded-lg transition-colors shrink-0", recentOpen ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted")}>
                <Clock className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">最近打开</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Recent notes quick access */}
      {recentOpen && (
        <div className="mx-3 mb-2 rounded-lg border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground">最近打开</span>
            <button onClick={() => setRecentOpen(false)} className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">收起</button>
          </div>
          {getRecent().length === 0 ? (
            <p className="text-xs text-muted-foreground/50 px-3 py-2">暂无记录</p>
          ) : (
            getRecent().map(r => (
              <button key={r.id} onClick={() => { handleSelectNote(r.id, r.folderId); setRecentOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 truncate">
                <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <span className="truncate">{r.title || "无标题笔记"}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-3 pb-2 flex gap-1.5">
        <button          onClick={handleNewNote}          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap overflow-hidden"
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
            <button onClick={() => setShowFavoritesOnly(v => !v)}
              className={cn("px-2 py-2 rounded-lg transition-colors shrink-0", showFavoritesOnly ? "bg-yellow-400/20 text-yellow-500" : "bg-accent text-accent-foreground hover:bg-accent/80")}>
              <Star className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{showFavoritesOnly ? "显示全部" : "只看收藏"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => { setBatchMode(v => !v); setSelectedNoteIds(new Set()); }}
              className={cn("px-2 py-2 rounded-lg transition-colors shrink-0", batchMode ? "bg-primary/20 text-primary" : "bg-accent text-accent-foreground hover:bg-accent/80")}>
              <Tag className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{batchMode ? "退出批量" : "批量操作"}</TooltipContent>
        </Tooltip>
        <NoteTemplates onCreateFromTemplate={handleCreateFromTemplate} />
      </div>

      {/* Batch operation toolbar */}
      {batchMode && selectedNoteIds.size > 0 && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-primary font-medium flex-1">已选 {selectedNoteIds.size} 篇</span>
          <button onClick={handleBatchFavorite} className="px-2 py-1 rounded text-xs bg-yellow-400/20 text-yellow-600 hover:bg-yellow-400/30 transition-colors flex items-center gap-1">
            <Star className="w-3 h-3" /> 收藏
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-1 rounded text-xs bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex items-center gap-1">
                <FolderInput className="w-3 h-3" /> 移动
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleBatchMove(null)} className="text-xs">未分类</DropdownMenuItem>
              {folders.map(f => (
                <DropdownMenuItem key={f.id} onClick={() => handleBatchMove(f.id)} className="text-xs">{f.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={handleBatchDelete} className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> 删除
          </button>
          <button onClick={handleBatchExport} className="px-2 py-1 rounded text-xs bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex items-center gap-1">
            <PackageOpen className="w-3 h-3" /> 导出
          </button>
        </div>
      )}

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
                onTogglePin={togglePin}
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
                    "text-[11px] text-muted-foreground/50 px-3 pb-1 font-medium cursor-pointer hover:text-muted-foreground transition-colors flex items-center gap-1",
                    activeFolderId === null && folders.length > 0 && "text-primary"
                  )}
                  onClick={() => setActiveFolderId(null)}
                >
                  未分类
                  <button
                    onClick={(e) => { e.stopPropagation(); setSortMode(v => !v); }}
                    className={cn("ml-auto p-0.5 rounded transition-colors", sortMode ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground")}
                    title={sortMode ? "退出排序" : "拖拽排序"}
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                </p>
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDndEnd}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                  <SortableContext items={sortedUnfolderedNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                    {sortedUnfolderedNotes.map((note) => (
                      <SortableNoteItem
                        key={note.id}
                        note={note}
                        isActive={activeNoteId === note.id}
                        folders={folders}
                        onSelect={handleSelectNote}
                        onDelete={deleteNote}
                        onMove={handleMoveNote}
                        onDragStart={handleDragStart}
                        onTogglePin={togglePin}
                        onToggleFavorite={toggleFavorite}
                        batchMode={batchMode}
                        isSelected={selectedNoteIds.has(note.id)}
                        onBatchToggle={toggleBatchSelect}
                        sortMode={sortMode}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {sortedUnfolderedNotes.length === 0 && (
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
            onTogglePin={togglePin}
            onToggleFavorite={toggleFavorite}
            onRename={handleRenameNote}
            batchMode={batchMode}
            isSelected={selectedNoteIds.has(note.id)}
            onBatchToggle={toggleBatchSelect}
            searchQuery={searchQuery}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setWorkflowPanelOpen(v => !v)}
                className={cn("p-2 rounded-lg transition-colors", workflowPanelOpen ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
              >
                <Zap className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">工作流</TooltipContent>
          </Tooltip>
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
              <button
                onClick={() => {
                  if (isTauriEnv) {
                    if (tauriUpdate.hasUpdate) {
                      void tauriUpdate.installUpdate();
                      toast({ title: "正在更新...", description: "应用即将重启" });
                    } else {
                      void tauriUpdate
                        .checkForUpdates()
                        .then((found) => {
                          toast({
                            title: found ? "发现新版本" : "已是最新版本",
                            description: found ? "请在更新横幅中点击立即更新" : undefined,
                          });
                        })
                        .catch(() => {
                          toast({ title: "检查更新失败", description: "请检查网络或更新配置" });
                        });
                    }
                  } else {
                    pwaUpdate();
                    toast({
                      title: hasUpdate ? "正在更新..." : "正在检查更新...",
                      description: hasUpdate ? "应用即将刷新" : "已是最新版本",
                    });
                  }
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  updateAvailable
                    ? "text-primary bg-primary/10 hover:bg-primary/20 animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <RefreshCw className={cn("w-4 h-4", updateBusy && "animate-spin")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {updateAvailable ? "有新版本，点击更新" : "检查更新"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleSignOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">退出登录</TooltipContent>
          </Tooltip>
        </div>
        {/* 版本号 */}
        <div className="px-2 pb-2 text-center">
          <span className="text-[10px] text-muted-foreground/40 select-none">v1.0.3</span>
        </div>
      </div>
    </>
  );

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-background" style={{ '--page-font-scale': pageFontSize / 15 } as React.CSSProperties}>
      <TooltipProvider delayDuration={300}>

        {/* ── PWA update banner ── */}
        {hasUpdate && !pwaBannerDismissed && (
          <UpdateBanner
            onUpdate={() => { pwaUpdate(); }}
            onDismiss={() => setPwaBannerDismissed(true)}
            updating={updating}
          />
        )}

        {/* ── Tauri desktop update banner ── */}
        {tauriUpdate.hasUpdate && (
          <UpdateBanner
            onUpdate={tauriUpdate.installUpdate}
            onDismiss={tauriUpdate.dismiss}
            updating={tauriUpdate.updating}
          />
        )}

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
                  {contentLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-muted-foreground">加载中...</p>
                      </div>
                    </div>
                  ) : (
                    <NoteEditor
                      note={activeNote}
                      onUpdate={handleUpdateNote}
                      tags={tags}
                      noteTags={getTagsForNote(activeNote.id)}
                      onCreateTag={createTag}
                      onAddTag={handleAddTagToNote}
                      onRemoveTag={removeTagFromNote}
                      pageFontSize={pageFontSize}
                      onTogglePin={togglePin}
                      onToggleShare={toggleShare}
                      allNotes={notes}
                      onSelectNote={handleSelectNote}
                    />
                  )}
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
                        onClick={() => { setSidebarCollapsed(false); setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder="搜索笔记..."]')?.focus(), 300); }}
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
                  contentLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-muted-foreground">加载中...</p>
                      </div>
                    </div>
                  ) : (
                    <NoteEditor
                      note={activeNote}
                      onUpdate={handleUpdateNote}
                      tags={tags}
                      noteTags={getTagsForNote(activeNote.id)}
                      onCreateTag={createTag}
                      onAddTag={handleAddTagToNote}
                      onRemoveTag={removeTagFromNote}
                      pageFontSize={pageFontSize}
                      onTogglePin={togglePin}
                      onToggleShare={toggleShare}
                      onImportFile={() => importInputRef.current?.click()}
                      allNotes={notes}
                      onSelectNote={handleSelectNote}
                    />
                  )
                ) : (
                  <WorkspaceEmptyState onCreateNote={handleNewNote} />
                )}
              </div>
              <AiChatPanel
                storageSettings={storageSettings}
                allNotes={notes}
                onSaveNote={async (title, content) => {
                  if (!user) return;
                  if (storageSettings.mode === "local") {
                    const now = new Date().toISOString();
                    const note = {
                      id: crypto.randomUUID(), title, content,
                      folder_id: null, created_at: now, updated_at: now,
                    };
                    await localNotesStorage.save(note, storageSettings.localPath);
                    await refreshNotes();
                    setActiveNoteId(note.id);
                  } else {
                    const { data, error } = await supabase
                      .from("notes")
                      .insert({ user_id: user.id, title, content })
                      .select("id, title, content, folder_id, created_at, updated_at")
                      .single();
                    if (error) throw error;
                    await refreshNotes();
                    if (data) setActiveNoteId(data.id);
                  }
                }}
              />
              {/* Workflow Panel */}
              {workflowPanelOpen && (
                <div className="w-80 border-l border-border bg-card flex flex-col h-full shrink-0 overflow-hidden">
                  <WorkflowPanel
                    workflows={workflows}
                    logs={logs}
                    folders={folders}
                    onCreate={createWorkflow}
                    onUpdate={updateWorkflow}
                    onDelete={deleteWorkflow}
                    onToggle={toggleWorkflow}
                    onClearLogs={clearLogs}
                  />
                </div>
              )}
            </main>
          </>
        )}
      </TooltipProvider>

      {/* Full-text search dialog */}
      <Dialog open={fullSearchOpen} onOpenChange={setFullSearchOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
            <DialogTitle className="text-sm font-medium">全文搜索</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={fullSearchInputRef}
                type="text"
                value={fullSearchQuery}
                onChange={(e) => setFullSearchQuery(e.target.value)}
                placeholder="搜索所有笔记内容..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-muted/60 rounded-lg border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto px-2 pb-3">
            {fullSearchQuery.trim() === "" ? (
              <p className="text-xs text-muted-foreground/50 text-center py-6">输入关键词搜索所有笔记</p>
            ) : (() => {
              const q = fullSearchQuery.toLowerCase().trim();
              const results = notes.filter(n =>
                (n.title || "").toLowerCase().includes(q) ||
                (n.content || "").replace(/<[^>]*>/g, "").toLowerCase().includes(q)
              );
              if (results.length === 0) return (
                <p className="text-xs text-muted-foreground/50 text-center py-6">未找到匹配的笔记</p>
              );
              return results.map(n => {
                const plain = (n.content || "").replace(/<[^>]*>/g, "");
                const idx = plain.toLowerCase().indexOf(q);
                const snippet = idx === -1 ? plain.slice(0, 80) :
                  (idx > 20 ? "…" : "") + plain.slice(Math.max(0, idx - 20), idx + 80);
                return (
                  <button key={n.id}
                    onClick={() => { handleSelectNote(n.id, n.folder_id); setFullSearchOpen(false); setFullSearchQuery(""); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors mb-0.5">
                    <p className="text-sm font-medium truncate text-foreground">{n.title || "无标题笔记"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{snippet}</p>
                  </button>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workspace;
