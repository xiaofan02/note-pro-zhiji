import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

export const useTags = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [noteTagsMap, setNoteTagsMap] = useState<Record<string, string[]>>({});

  const fetchTags = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, color")
      .order("created_at", { ascending: true });
    if (!error && data) setTags(data);
  }, [user]);

  const fetchNoteTags = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("note_tags")
      .select("note_id, tag_id");
    if (!error && data) {
      const map: Record<string, string[]> = {};
      data.forEach((nt: any) => {
        if (!map[nt.note_id]) map[nt.note_id] = [];
        map[nt.note_id].push(nt.tag_id);
      });
      setNoteTagsMap(map);
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
    fetchNoteTags();
  }, [fetchTags, fetchNoteTags]);

  const createTag = async (name: string) => {
    if (!user) return;
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name, color })
      .select("id, name, color")
      .single();
    if (error) {
      toast({ title: "创建标签失败", description: error.message, variant: "destructive" });
    } else if (data) {
      setTags((prev) => [...prev, data]);
    }
    return data;
  };

  const deleteTag = async (id: string) => {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (!error) {
      setTags((prev) => prev.filter((t) => t.id !== id));
      setNoteTagsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((noteId) => {
          next[noteId] = next[noteId].filter((tid) => tid !== id);
        });
        return next;
      });
    }
  };

  const addTagToNote = async (noteId: string, tagId: string) => {
    const { error } = await supabase.from("note_tags").insert({ note_id: noteId, tag_id: tagId });
    if (!error) {
      setNoteTagsMap((prev) => ({
        ...prev,
        [noteId]: [...(prev[noteId] || []), tagId],
      }));
    }
  };

  const removeTagFromNote = async (noteId: string, tagId: string) => {
    const { error } = await supabase.from("note_tags").delete().eq("note_id", noteId).eq("tag_id", tagId);
    if (!error) {
      setNoteTagsMap((prev) => ({
        ...prev,
        [noteId]: (prev[noteId] || []).filter((id) => id !== tagId),
      }));
    }
  };

  const getTagsForNote = (noteId: string): Tag[] => {
    const tagIds = noteTagsMap[noteId] || [];
    return tags.filter((t) => tagIds.includes(t.id));
  };

  return { tags, noteTagsMap, createTag, deleteTag, addTagToNote, removeTagFromNote, getTagsForNote, TAG_COLORS };
};
