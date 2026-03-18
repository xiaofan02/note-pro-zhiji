import { useState, useEffect, useCallback } from "react";
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
  share_token?: string | null;
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
      // Fetch active notes
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at, deleted_at, is_pinned, share_token")
        .is("deleted_at", null)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        toast({ title: "加载失败", description: error.message, variant: "destructive" });
      } else {
        setNotes(data || []);
      }

      // Fetch trashed notes
      const { data: trashed, error: trashError } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at, deleted_at, is_pinned, share_token")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (!trashError) {
        setTrashedNotes(trashed || []);
      }
    }
    setLoading(false);
  }, [user, toast, isLocal, storageSettings?.localPath]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
        .select("id, title, content, folder_id, created_at, updated_at, deleted_at")
        .single();

      if (error) {
        toast({ title: "创建失败", description: error.message, variant: "destructive" });
      } else if (data) {
        setNotes((prev) => [data, ...prev]);
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
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
      } catch (e: any) {
        toast({ title: "保存失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").update(updates).eq("id", id);
      if (error) {
        toast({ title: "保存失败", description: error.message, variant: "destructive" });
      } else {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
          )
        );
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

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  return {
    notes, trashedNotes, loading, activeNote, activeNoteId, setActiveNoteId,
    createNote, updateNote, deleteNote, restoreNote, permanentDeleteNote, emptyTrash,
    refreshNotes: fetchNotes,
  };
};
