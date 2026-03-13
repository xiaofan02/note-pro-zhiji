import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Folder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const useFolders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("folders")
      .select("id, name, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "加载目录失败", description: error.message, variant: "destructive" });
    } else {
      setFolders(data || []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async (name?: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name: name || "新建目录" })
      .select("id, name, created_at, updated_at")
      .single();

    if (error) {
      toast({ title: "创建目录失败", description: error.message, variant: "destructive" });
    } else if (data) {
      setFolders((prev) => [...prev, data]);
    }
    return data;
  };

  const renameFolder = async (id: string, name: string) => {
    const { error } = await supabase.from("folders").update({ name }).eq("id", id);
    if (error) {
      toast({ title: "重命名失败", description: error.message, variant: "destructive" });
    } else {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    }
  };

  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (error) {
      toast({ title: "删除目录失败", description: error.message, variant: "destructive" });
    } else {
      setFolders((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    const { error } = await supabase.from("notes").update({ folder_id: folderId }).eq("id", noteId);
    if (error) {
      toast({ title: "移动失败", description: error.message, variant: "destructive" });
    }
    return !error;
  };

  return { folders, loading, createFolder, renameFolder, deleteFolder, moveNoteToFolder };
};
