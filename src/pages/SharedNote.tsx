import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import AppLogo from "@/components/AppLogo";

const SharedNote = () => {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<{ title: string; content: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchNote = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("title, content, updated_at")
        .eq("share_token", token)
        .is("deleted_at", null)
        .single();
      if (error || !data) {
        setError("笔记不存在或已取消分享");
      } else {
        setNote(data);
      }
      setLoading(false);
    };
    fetchNote();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse glow-primary-sm rounded-xl">
            <AppLogo size={40} />
          </div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">{error || "笔记不存在"}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-lg glow-primary-sm overflow-hidden shrink-0">
              <AppLogo size={28} />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">智记 AI</span>
          </Link>
          <span className="text-xs text-muted-foreground">· 分享笔记</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{note.title || "无标题笔记"}</h1>
        <p className="text-xs text-muted-foreground mb-6">
          更新于 {new Date(note.updated_at).toLocaleString("zh-CN")}
        </p>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </main>
    </div>
  );
};

export default SharedNote;
