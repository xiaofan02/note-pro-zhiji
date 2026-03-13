import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquare, X, Save, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatPanelProps {
  onSaveNote: (title: string, content: string, folderId?: string) => Promise<void>;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AiChatPanel = ({ onSaveNote, onClose }: AiChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const extractNoteFromResponse = (content: string): { cleanContent: string; noteTitle?: string; noteContent?: string } => {
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
    } catch {
      toast({ title: "保存失败", variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
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
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Check for auto-save note marker
      const { cleanContent, noteTitle, noteContent } = extractNoteFromResponse(assistantContent);
      if (noteTitle && noteContent) {
        // Update the message to clean version
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, content: cleanContent || `已为你整理笔记「${noteTitle}」` } : m))
        );
        await handleSaveExtractedNote(noteTitle, noteContent);
      }
    } catch (e: any) {
      toast({ title: "发送失败", description: e.message, variant: "destructive" });
      // Remove the failed user message or add error
      setMessages((prev) => [...prev.filter((m) => !(m.role === "assistant" && m.content === "")), { role: "assistant", content: "抱歉，请求出现错误，请稍后重试。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleManualSave = async (content: string) => {
    const title = content.slice(0, 20).replace(/<[^>]*>/g, "").trim() || "AI 对话笔记";
    await handleSaveExtractedNote(title, `<p>${content}</p>`);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border" style={{ width: 380 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">AI 助手</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12">
            <MessageSquare className="w-10 h-10 text-primary/30" />
            <p className="text-sm text-center">发送消息给 AI 助手<br />它会帮你整理内容并保存为笔记</p>
            <div className="text-xs space-y-1 mt-2 text-muted-foreground/70">
              <p>💡 试试说：「帮我整理今天的会议记录」</p>
              <p>💡 或者：「把以下内容保存为笔记：...」</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === "assistant" && msg.content && (
                <button
                  onClick={() => handleManualSave(msg.content)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Save className="w-3 h-3" /> 保存为笔记
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-xl px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-32"
            style={{ minHeight: 38 }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "38px";
              t.style.height = Math.min(t.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChatPanel;
