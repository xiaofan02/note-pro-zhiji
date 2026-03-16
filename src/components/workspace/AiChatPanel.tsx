import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Loader2, MessageSquare, X, Save, Bot, User, Plus, History, ArrowLeft, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useUserRole } from "@/hooks/useUserRole";
import UpgradePrompt from "./UpgradePrompt";

interface AiChatPanelProps {
  onSaveNote: (title: string, content: string, folderId?: string) => Promise<void>;
}

type ViewMode = "chat" | "history";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AiChatPanel = ({ onSaveNote }: AiChatPanelProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [localMessages, setLocalMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isPro } = useUserRole();

  const [bubbleY, setBubbleY] = useState(() => {
    const saved = localStorage.getItem("aiChatBubbleY");
    return saved ? parseInt(saved, 10) : 50;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartPos = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    conversations, activeConversationId, messages: dbMessages, setMessages: setDbMessages,
    loadMessages, createConversation, updateConversationTitle, deleteConversation, saveMessage, updateLastAssistantMessage, startNewChat,
  } = useChatConversations();

  useEffect(() => {
    if (activeConversationId) {
      setLocalMessages(dbMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  }, [dbMessages, activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [localMessages]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartPos.current = bubbleY;
  }, [bubbleY]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const deltaPercent = ((clientY - dragStartY.current) / window.innerHeight) * 100;
      setBubbleY(Math.max(5, Math.min(85, dragStartPos.current + deltaPercent)));
    };
    const handleEnd = () => {
      setIsDragging(false);
      setBubbleY((v) => { localStorage.setItem("aiChatBubbleY", String(v)); return v; });
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleEnd); window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleEnd); };
  }, [isDragging]);

  const extractNoteFromResponse = (content: string) => {
    const noteMatch = content.match(/<!--SAVE_NOTE-->(.*?)\|\|\|(.*?)<!--\/SAVE_NOTE-->/s);
    if (noteMatch) {
      const cleanContent = content.replace(/<!--SAVE_NOTE-->.*?<!--\/SAVE_NOTE-->/s, "").trim();
      return { cleanContent, noteTitle: noteMatch[1].trim(), noteContent: noteMatch[2].trim() };
    }
    return { cleanContent: content };
  };

  const handleSaveExtractedNote = async (title: string, content: string) => {
    try {
      await onSaveNote(title, content);
      toast({ title: "已保存", description: `笔记「${title}」已创建` });
    } catch { toast({ title: "保存失败", variant: "destructive" }); }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!isPro) { setShowUpgrade(true); return; }

    let convId = activeConversationId;
    if (!convId) {
      const conv = await createConversation(text.slice(0, 30));
      if (!conv) { toast({ title: "创建对话失败", variant: "destructive" }); return; }
      convId = conv.id;
    }

    const userMsg = { role: "user" as const, content: text };
    const allLocal = [...localMessages, userMsg];
    setLocalMessages(allLocal);
    setInput("");
    setIsLoading(true);

    await saveMessage(convId, "user", text);
    if (localMessages.length === 0) await updateConversationTitle(convId, text.slice(0, 30));

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allLocal }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${resp.status})`);
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setLocalMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }

      const { cleanContent, noteTitle, noteContent } = extractNoteFromResponse(assistantContent);
      const finalContent = cleanContent || (noteTitle ? `已为你整理笔记「${noteTitle}」` : assistantContent);
      if (noteTitle && noteContent) {
        setLocalMessages((prev) => prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, content: finalContent } : m)));
        await handleSaveExtractedNote(noteTitle, noteContent);
      }
      await saveMessage(convId, "assistant", finalContent);
    } catch (e: any) {
      toast({ title: "发送失败", description: e.message, variant: "destructive" });
      const errMsg = "抱歉，请求出现错误，请稍后重试。";
      setLocalMessages((prev) => [...prev.filter((m) => !(m.role === "assistant" && m.content === "")), { role: "assistant", content: errMsg }]);
      await saveMessage(convId, "assistant", errMsg);
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleManualSave = async (content: string) => {
    const title = content.slice(0, 20).replace(/<[^>]*>/g, "").trim() || "AI 对话笔记";
    await handleSaveExtractedNote(title, `<p>${content}</p>`);
  };

  const handleNewChat = () => { startNewChat(); setLocalMessages([]); setViewMode("chat"); };

  const handleSelectConversation = async (convId: string) => { await loadMessages(convId); setViewMode("chat"); };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => { e.stopPropagation(); await deleteConversation(convId); };

  if (!isOpen) {
    return (
      <div className="fixed right-5 z-50 flex flex-col items-center gap-1" style={{ top: `${bubbleY}%`, transform: "translateY(-50%)" }}>
        <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} onClick={() => { if (!isDragging) setIsOpen(true); }}
          className={cn("w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform", isDragging && "scale-110 opacity-80")}>
          <MessageSquare className="w-5 h-5" />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium select-none pointer-events-none">AI助理</span>
      </div>
    );
  }

  return (
    <>
    <div className="w-[340px] border-l border-border bg-card flex flex-col h-full shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          {viewMode === "history" ? (
            <button onClick={() => setViewMode("chat")} className="p-1 rounded hover:bg-muted transition-colors" title="返回"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></button>
          ) : (<Bot className="w-4 h-4 text-primary" />)}
          <span className="font-semibold text-sm text-foreground">{viewMode === "history" ? "历史对话" : "AI 助手"}</span>
        </div>
        <div className="flex items-center gap-1">
          {viewMode === "chat" && (
            <>
              <button onClick={handleNewChat} className="p-1.5 rounded hover:bg-muted transition-colors" title="新对话"><Plus className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button onClick={() => setViewMode("history")} className="p-1.5 rounded hover:bg-muted transition-colors" title="历史对话"><History className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </>
          )}
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-muted transition-colors" title="收起"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      </div>

      {viewMode === "history" ? (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-2 pt-2 pb-1 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索对话..."
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          {(() => {
            const filtered = conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
            if (filtered.length === 0) return (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 py-8">
                <History className="w-6 h-6 text-muted-foreground/30" />
                <p className="text-xs">{searchQuery ? "未找到匹配的对话" : "暂无历史对话"}</p>
              </div>
            );
            return (
              <div className="p-2 space-y-1">
                {filtered.map((conv) => (
                  <div key={conv.id} onClick={() => handleSelectConversation(conv.id)}
                    className={cn("group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors", activeConversationId === conv.id ? "bg-accent" : "hover:bg-muted/60")}>
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-foreground">{conv.title}</p>
                      <p className="text-[11px] text-muted-foreground/60">{new Date(conv.updated_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <button onClick={(e) => handleDeleteConversation(e, conv.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0" title="删除">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {localMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-8">
                <MessageSquare className="w-8 h-8 text-primary/30" />
                <p className="text-xs text-center">发送消息给 AI 助手<br />它会理解你的意思并自动保存为笔记</p>
                <div className="text-[11px] space-y-1 mt-1 text-muted-foreground/70">
                  <p>💡 「帮我整理今天的会议记录」</p>
                  <p>💡 「记住：明天下午3点开会」</p>
                  <p>💡 直接发送任何想法，AI 会帮你记录</p>
                </div>
              </div>
            )}
            {localMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (<div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3 h-3 text-primary" /></div>)}
                <div className={cn("max-w-[82%] rounded-xl px-3 py-2 text-sm leading-relaxed", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (<p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>)}
                  {msg.role === "assistant" && msg.content && (
                    <button onClick={() => handleManualSave(msg.content)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      <Save className="w-3 h-3" /> 保存为笔记
                    </button>
                  )}
                </div>
                {msg.role === "user" && (<div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5"><User className="w-3 h-3 text-primary-foreground" /></div>)}
              </div>
            ))}
            {isLoading && localMessages[localMessages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-primary" /></div>
                <div className="bg-muted rounded-xl px-3 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /></div>
              </div>
            )}
          </div>
          <div className="border-t border-border p-2.5 shrink-0">
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送)" rows={1}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-24"
                style={{ minHeight: 36 }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "36px"; t.style.height = Math.min(t.scrollHeight, 96) + "px"; }} />
              <button onClick={sendMessage} disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} feature="AI 对话助手" />
    </>
  );
};

export default AiChatPanel;
