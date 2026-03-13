import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "加载失败", description: error.message, variant: "destructive" });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "无标题笔记", content: "" })
      .select("id, title, content, created_at, updated_at")
      .single();

    if (error) {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    } else if (data) {
      setNotes((prev) => [data, ...prev]);
      setActiveNoteId(data.id);
    }
  };

  const updateNote = async (id: string, updates: { title?: string; content?: string }) => {
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
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  return { notes, loading, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote };
};
