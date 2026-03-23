import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localChatStorage, LocalConversation, LocalChatMessage } from "@/lib/localChatStorage";
import { StorageSettings } from "@/lib/localNotesStorage";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const useChatConversations = (storageSettings?: StorageSettings) => {
  const { user } = useAuth();
  const isLocal = storageSettings?.mode === "local";
  const localPath = storageSettings?.localPath;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    if (isLocal) {
      const data = await localChatStorage.getConversations(localPath);
      setConversations(data);
    } else {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false });
      setConversations((data as Conversation[]) || []);
    }
    setLoadingConversations(false);
  }, [user, isLocal, localPath]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (isLocal) {
      const data = await localChatStorage.getMessages(conversationId, localPath);
      setMessages(data as ChatMessage[]);
    } else {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data as ChatMessage[]) || []);
    }
    setActiveConversationId(conversationId);
  }, [isLocal, localPath]);

  const createConversation = useCallback(async (title?: string) => {
    if (!user) return null;
    const now = new Date().toISOString();
    if (isLocal) {
      const conv: LocalConversation = {
        id: crypto.randomUUID(),
        title: title || "新对话",
        created_at: now,
        updated_at: now,
      };
      await localChatStorage.saveConversation(conv, localPath);
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setMessages([]);
      return conv as Conversation;
    }
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, title: title || "新对话" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error || !data) return null;
    const conv = data as Conversation;
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setMessages([]);
    return conv;
  }, [user, isLocal, localPath]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    if (isLocal) {
      const existing = conversations.find(c => c.id === id);
      if (existing) {
        const updated = { ...existing, title, updated_at: new Date().toISOString() };
        await localChatStorage.saveConversation(updated, localPath);
      }
    } else {
      await supabase.from("chat_conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", id);
    }
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, [isLocal, localPath, conversations]);

  const deleteConversation = useCallback(async (id: string) => {
    if (isLocal) {
      await localChatStorage.deleteConversation(id, localPath);
    } else {
      await supabase.from("chat_conversations").delete().eq("id", id);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [activeConversationId, isLocal, localPath]);

  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    const now = new Date().toISOString();
    if (isLocal) {
      const msg: LocalChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role,
        content,
        created_at: now,
      };
      await localChatStorage.saveMessage(msg, localPath);
      // update conversation updated_at
      const existing = conversations.find(c => c.id === conversationId);
      if (existing) {
        const updated = { ...existing, updated_at: now };
        await localChatStorage.saveConversation(updated, localPath);
        setConversations(prev => prev.map(c => c.id === conversationId ? updated : c));
      }
      setMessages((prev) => {
        const exists = prev.find(m => m.role === role && m.content === content);
        if (exists) return prev;
        return [...prev, msg as ChatMessage];
      });
      return;
    }
    const { data } = await supabase
      .from("chat_messages")
      .insert({ conversation_id: conversationId, role, content })
      .select("id, conversation_id, role, content, created_at")
      .single();
    if (data) {
      const msg = data as ChatMessage;
      setMessages((prev) => {
        const existing = prev.find((m) => m.role === role && m.content === content && !m.id.startsWith("temp-"));
        if (existing) return prev;
        return [...prev.filter((m) => !m.id.startsWith("temp-") || m.role !== role), msg];
      });
    }
    await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }, [isLocal, localPath, conversations]);

  const updateLastAssistantMessage = useCallback(async (_conversationId: string, content: string) => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || lastAssistant.id.startsWith("temp-")) return;
    if (isLocal) {
      const updated = { ...lastAssistant, content };
      await localChatStorage.saveMessage(updated as LocalChatMessage, localPath);
    } else {
      await supabase.from("chat_messages").update({ content }).eq("id", lastAssistant.id);
    }
  }, [messages, isLocal, localPath]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    loadingConversations,
    fetchConversations,
    loadMessages,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    saveMessage,
    updateLastAssistantMessage,
    startNewChat,
  };
};
