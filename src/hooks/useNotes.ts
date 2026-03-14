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
}

export const useNotes = (storageSettings?: StorageSettings) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const isLocal = storageSettings?.mode === "local";

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isLocal) {
      try {
        const localNotes = await localNotesStorage.getAll(storageSettings?.localPath);
        setNotes(localNotes);
      } catch (e: any) {
        toast({ title: "加载失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        toast({ title: "加载失败", description: error.message, variant: "destructive" });
      } else {
        setNotes(data || []);
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
        .select("id, title, content, folder_id, created_at, updated_at")
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

  const deleteNote = async (id: string) => {
    if (isLocal) {
      try {
        await localNotesStorage.delete(id, storageSettings?.localPath);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
      } catch (e: any) {
        toast({ title: "删除失败", description: e.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) {
        toast({ title: "删除失败", description: error.message, variant: "destructive" });
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
      }
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  return { notes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote, refreshNotes: fetchNotes };
};
