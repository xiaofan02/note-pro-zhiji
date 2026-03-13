import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export const useChatConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false });
    setConversations((data as Conversation[]) || []);
    setLoadingConversations(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, conversation_id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as ChatMessage[]) || []);
    setActiveConversationId(conversationId);
  }, []);

  const createConversation = useCallback(async (title?: string) => {
    if (!user) return null;
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
  }, [user]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    await supabase.from("chat_conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [activeConversationId]);

  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .insert({ conversation_id: conversationId, role, content })
      .select("id, conversation_id, role, content, created_at")
      .single();
    if (data) {
      const msg = data as ChatMessage;
      setMessages((prev) => {
        // Replace temp message or append
        const existing = prev.find((m) => m.role === role && m.content === content && !m.id.startsWith("temp-"));
        if (existing) return prev;
        return [...prev.filter((m) => !m.id.startsWith("temp-") || m.role !== role), msg];
      });
    }
    // Update conversation timestamp
    await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }, []);

  const updateLastAssistantMessage = useCallback(async (conversationId: string, content: string) => {
    // Find the last assistant message and update it
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && !lastAssistant.id.startsWith("temp-")) {
      await supabase.from("chat_messages").update({ content }).eq("id", lastAssistant.id);
    }
  }, [messages]);

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
