import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StorageSettings, localNotesStorage } from "@/lib/localNotesStorage";

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_pinned?: boolean;
  is_favorited?: boolean;
  share_token?: string | null;
  _contentLoaded?: boolean; // internal flag for lazy loading
}

export const useNotes = (storageSettings?: StorageSettings) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const isLocal = storageSettings?.mode === "local";

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    if (isLocal) {
      try {
        const localNotes = await localNotesStorage.getAll(storageSettings?.localPath);
        setNotes(localNotes.filter(n => !n.deleted_at));
        setTrashedNotes(localNotes.filter(n => !!n.deleted_at));
      } catch (e: any) {
        toast({ title: "加载失败", description: e.message, variant: "destructive" });
      }
    } else {
      // Fetch active notes - exclude content for faster list loading
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, folder_id, created_at, updated_at, deleted_at, is_pinned, share_token")
        .is("deleted_at", null)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        toast({ title: "加载失败", description: error.message, variant: "destructive" });
      } else {
        setNotes((data || []).map(n => ({ ...n, content: "", _contentLoaded: false })));
      }

      // Fetch trashed notes metadata only
      const { data: trashed, error: trashError } = await supabase
        .from("notes")
        .select("id, title, folder_id, created_at, updated_at, deleted_at, is_pinned, share_token")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (!trashError) {
        setTrashedNotes((trashed || []).map(n => ({ ...n, content: "", _contentLoaded: false })));
      }
    }
    setLoading(false);
  }, [user, toast, isLocal, storageSettings?.localPath]);

  /** Lazily load full content for a note (cloud mode only) */
  const fetchNoteContent = useCallback(async (id: string): Promise<void> => {
    if (isLocal) {
      // Local mode: load from storage if not already loaded
      // Use functional update to check current state without depending on notes
      let alreadyLoaded = false;
      setNotes(prev => {
        const existing = prev.find(n => n.id === id);
        alreadyLoaded = !!existing?._contentLoaded;
        return prev;
      });
      if (alreadyLoaded) return;
      try {
        const full = await localNotesStorage.getOne(id, storageSettings?.localPath);
        if (full) {
          setNotes(prev => prev.map(n => n.id === id ? { ...n, ...full, _contentLoaded: true } : n));
        }
      } catch {}
      return;
    }
    // Cloud mode: check if already loaded via functional update to avoid stale closure
    let alreadyLoaded = false;
    setNotes(prev => {
      const existing = prev.find(n => n.id === id);
      alreadyLoaded = !!existing?._contentLoaded;
      return prev;
    });
    if (alreadyLoaded) return;

    const { data, error } = await supabase
      .from("notes")
      .select("content")
      .eq("id", id)
      .single();

    if (!error && data) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content: data.content || "", _contentLoaded: true } : n));
    }
  }, [isLocal, storageSettings?.localPath]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ─── Local folder auto-sync: poll every 5s when in local mode ──
  const lastModifiedRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!isLocal || !user) return;
    const interval = setInterval(async () => {
      try {
        const localNotes = await localNotesStorage.getAll(storageSettings?.localPath);
        // Build a quick fingerprint: id+updated_at map
        const fingerprint: Record<string, string> = {};
        for (const n of localNotes) fingerprint[n.id] = n.updated_at;
        const prev = lastModifiedRef.current;
        const changed =
          Object.keys(fingerprint).length !== Object.keys(prev).length ||
          Object.keys(fingerprint).some(id => fingerprint[id] !== prev[id]);
        if (changed) {
          lastModifiedRef.current = fingerprint;
          setNotes(localNotes.filter(n => !n.deleted_at));
          setTrashedNotes(localNotes.filter(n => !!n.deleted_at));
        }
      } catch {
        // silently ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLocal, user, storageSettings?.localPath]);

  const createNote = async (folderId?: string) => {
    if (!user) return;

    if (isLocal) {
      const now = new Date().toISOString();
      const note: Note = {
        id: crypto.randomUUID(),
        title: "无标题笔记",
        content: "",
        folder_id: folderId || null,
        created_at: now,
        updated_at: now,
        _contentLoaded: true,
      };
      try {
        await localNotesStorage.save(note, storageSettings?.localPath);
        setNotes((prev) => [note, ...prev]);
        setActiveNoteId(note.id);
      } catch (e: any) {
        toast({ title: "创建失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: "无标题笔记", content: "", folder_id: folderId || null })
        .select("id, title, folder_id, created_at, updated_at, deleted_at, is_pinned, share_token")
        .single();

      if (error) {
        toast({ title: "创建失败", description: error.message, variant: "destructive" });
      } else if (data) {
        setNotes((prev) => [{ ...data, content: "", _contentLoaded: true }, ...prev]);
        setActiveNoteId(data.id);
      }
    }
  };

  const updateNote = async (id: string, updates: { title?: string; content?: string }) => {
    if (isLocal) {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      try {
        await localNotesStorage.save(updated, storageSettings?.localPath);
        setNotes((prev) => {
          const mapped = prev.map((n) => (n.id === id ? updated : n));
          return [...mapped].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
        });
      } catch (e: any) {
        toast({ title: "保存失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").update(updates).eq("id", id);
      if (error) {
        toast({ title: "保存失败", description: error.message, variant: "destructive" });
      } else {
        const now = new Date().toISOString();
        setNotes((prev) => {
          const updated = prev.map((n) =>
            n.id === id ? { ...n, ...updates, updated_at: now } : n
          );
          // Re-sort: pinned first, then by updated_at desc
          return [...updated].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
        });
      }
    }
  };

  // Soft delete - move to trash
  const deleteNote = async (id: string) => {
    const now = new Date().toISOString();

    if (isLocal) {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;
      const updated = { ...existing, deleted_at: now, updated_at: now };
      try {
        await localNotesStorage.save(updated, storageSettings?.localPath);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setTrashedNotes((prev) => [updated, ...prev]);
        if (activeNoteId === id) setActiveNoteId(null);
        toast({ title: "已移至回收站", description: "可在30天内恢复" });
      } catch (e: any) {
        toast({ title: "删除失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").update({ deleted_at: now }).eq("id", id);
      if (error) {
        toast({ title: "删除失败", description: error.message, variant: "destructive" });
      } else {
        const deleted = notes.find((n) => n.id === id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (deleted) setTrashedNotes((prev) => [{ ...deleted, deleted_at: now }, ...prev]);
        if (activeNoteId === id) setActiveNoteId(null);
        toast({ title: "已移至回收站", description: "可在30天内恢复" });
      }
    }
  };

  // Restore from trash
  const restoreNote = async (id: string) => {
    if (isLocal) {
      const existing = trashedNotes.find((n) => n.id === id);
      if (!existing) return;
      const updated = { ...existing, deleted_at: null, updated_at: new Date().toISOString() };
      try {
        await localNotesStorage.save(updated as Note, storageSettings?.localPath);
        setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
        setNotes((prev) => [updated as Note, ...prev]);
        toast({ title: "已恢复笔记" });
      } catch (e: any) {
        toast({ title: "恢复失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").update({ deleted_at: null }).eq("id", id);
      if (error) {
        toast({ title: "恢复失败", description: error.message, variant: "destructive" });
      } else {
        const restored = trashedNotes.find((n) => n.id === id);
        setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
        if (restored) setNotes((prev) => [{ ...restored, deleted_at: null }, ...prev]);
        toast({ title: "已恢复笔记" });
      }
    }
  };

  // Permanent delete
  const permanentDeleteNote = async (id: string) => {
    if (isLocal) {
      try {
        await localNotesStorage.delete(id, storageSettings?.localPath);
        setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
        toast({ title: "已永久删除" });
      } catch (e: any) {
        toast({ title: "删除失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) {
        toast({ title: "删除失败", description: error.message, variant: "destructive" });
      } else {
        setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
        toast({ title: "已永久删除" });
      }
    }
  };

  // Empty trash
  const emptyTrash = async () => {
    if (isLocal) {
      try {
        for (const note of trashedNotes) {
          await localNotesStorage.delete(note.id, storageSettings?.localPath);
        }
        setTrashedNotes([]);
        toast({ title: "回收站已清空" });
      } catch (e: any) {
        toast({ title: "清空失败", description: e.message, variant: "destructive" });
      }
    } else {
      const ids = trashedNotes.map((n) => n.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from("notes").delete().in("id", ids);
      if (error) {
        toast({ title: "清空失败", description: error.message, variant: "destructive" });
      } else {
        setTrashedNotes([]);
        toast({ title: "回收站已清空" });
      }
    }
  };

  // Toggle pin
  const togglePin = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.is_pinned;

    if (isLocal) {
      const updated = { ...note, is_pinned: newPinned, updated_at: new Date().toISOString() };
      try {
        await localNotesStorage.save(updated, storageSettings?.localPath);
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        toast({ title: newPinned ? "已置顶" : "已取消置顶" });
      } catch (e: any) {
        toast({ title: "操作失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").update({ is_pinned: newPinned }).eq("id", id);
      if (error) {
        toast({ title: "操作失败", description: error.message, variant: "destructive" });
      } else {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, is_pinned: newPinned } : n)));
        toast({ title: newPinned ? "已置顶" : "已取消置顶" });
      }
    }
  };

  // Toggle share (cloud only)
  const toggleShare = async (id: string): Promise<string | null> => {
    if (isLocal) {
      toast({ title: "本地模式不支持分享", description: "请切换到云端模式后使用分享功能", variant: "destructive" });
      return null;
    }
    const note = notes.find((n) => n.id === id);
    if (!note) return null;

    if (note.share_token) {
      const { error } = await supabase.from("notes").update({ share_token: null }).eq("id", id);
      if (!error) {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, share_token: null } : n)));
        toast({ title: "已取消分享" });
      }
      return null;
    } else {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { error } = await supabase.from("notes").update({ share_token: token }).eq("id", id);
      if (error) {
        toast({ title: "分享失败", description: error.message, variant: "destructive" });
        return null;
      }
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, share_token: token } : n)));
      toast({ title: "已生成分享链接" });
      return token;
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  // Toggle favorite — stored in localStorage (no DB migration needed)
  const FAVORITES_KEY = "zhiji-favorites";
  const getFavoriteIds = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); } catch { return new Set(); }
  };

  const toggleFavorite = (id: string) => {
    const favs = getFavoriteIds();
    const wasFavorited = favs.has(id);
    if (wasFavorited) favs.delete(id); else favs.add(id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_favorited: !wasFavorited } : n));
    toast({ title: wasFavorited ? "已取消收藏" : "已加入收藏" });
  };

  // Hydrate favorites from localStorage on load
  useEffect(() => {
    const favs = getFavoriteIds();
    if (favs.size > 0) {
      setNotes(prev => prev.map(n => ({ ...n, is_favorited: favs.has(n.id) })));
    }
  }, [notes.length]);

  return {
    notes, trashedNotes, loading, activeNote, activeNoteId, setActiveNoteId,
    createNote, updateNote, deleteNote, restoreNote, permanentDeleteNote, emptyTrash,
    refreshNotes: fetchNotes, fetchNoteContent, togglePin, toggleShare, toggleFavorite,
  };
};
