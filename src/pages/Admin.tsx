import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Bot, BarChart3, ArrowLeft, Save, Loader2 } from "lucide-react";

interface UserInfo {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  usage_today: number;
}

const Admin = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [aiConfig, setAiConfig] = useState<any>({ provider: "lovable", model: "google/gemini-3-flash-preview" });
  const [dailyLimit, setDailyLimit] = useState(10);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [totalUsageToday, setTotalUsageToday] = useState(0);
  const [tab, setTab] = useState<"users" | "ai" | "stats">("users");

  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      navigate("/workspace");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (role === "admin") {
      loadData();
    }
  }, [role]);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      // Load profiles
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url");
      // Load roles
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      // Load today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: usage } = await supabase.from("ai_usage").select("user_id").gte("created_at", today.toISOString());

      const usageMap: Record<string, number> = {};
      (usage || []).forEach((u: any) => { usageMap[u.user_id] = (usageMap[u.user_id] || 0) + 1; });

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      const userList: UserInfo[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: roleMap[p.user_id] || "free",
        usage_today: usageMap[p.user_id] || 0,
      }));

      setUsers(userList);
      setTotalUsageToday((usage || []).length);

      // Load config
      const { data: configs } = await supabase.from("system_config").select("key, value");
      (configs || []).forEach((c: any) => {
        if (c.key === "ai_model") setAiConfig(c.value);
        if (c.key === "free_daily_limit") setDailyLimit(typeof c.value === "number" ? c.value : 10);
      });
    } catch (e) {
      console.error(e);
    }
    setLoadingUsers(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) {
      // Try insert if no row exists
      const { error: insertErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (insertErr) { toast({ title: "更新失败", description: insertErr.message, variant: "destructive" }); return; }
    }
    toast({ title: "角色已更新" });
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
  };

  const saveAiConfig = async () => {
    setSavingConfig(true);
    try {
      await supabase.from("system_config").upsert({ key: "ai_model", value: aiConfig, updated_at: new Date().toISOString() });
      await supabase.from("system_config").upsert({ key: "free_daily_limit", value: dailyLimit, updated_at: new Date().toISOString() });
      toast({ title: "配置已保存" });
    } catch (e: any) {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
    }
    setSavingConfig(false);
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/workspace")} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">管理后台</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          {[
            { id: "users" as const, label: "用户管理", icon: Users },
            { id: "ai" as const, label: "AI 配置", icon: Bot },
            { id: "stats" as const, label: "用量统计", icon: BarChart3 },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === "users" && (
          <div className="bg-card rounded-lg border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">用户列表 ({users.length})</h2>
            </div>
            {loadingUsers ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div key={u.user_id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {u.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.display_name || "未命名"}</p>
                        <p className="text-xs text-muted-foreground">今日 AI 用量: {u.usage_today}</p>
                      </div>
                    </div>
                    <select value={u.role} onChange={(e) => updateUserRole(u.user_id, e.target.value)}
                      className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI config tab */}
        {tab === "ai" && (
          <div className="bg-card rounded-lg border border-border p-6 space-y-6 max-w-lg">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">AI 服务提供商</label>
              <select value={aiConfig.provider || "lovable"} onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="lovable">Lovable AI（内置）</option>
                <option value="custom">自定义（DeepSeek / 通义千问 / OpenAI 等）</option>
              </select>
            </div>

            {aiConfig.provider === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">API Base URL</label>
                  <input type="text" value={aiConfig.baseUrl || ""} onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com/v1"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">API Key</label>
                  <input type="password" value={aiConfig.apiKey || ""} onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">模型名称</label>
              <input type="text" value={aiConfig.model || ""} onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                placeholder="google/gemini-3-flash-preview"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">免费用户每日 AI 调用上限</label>
              <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)} min={0}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <button onClick={saveAiConfig} disabled={savingConfig}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存配置
            </button>
          </div>
        )}

        {/* Stats tab */}
        {tab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border p-6">
              <p className="text-xs text-muted-foreground mb-1">总用户数</p>
              <p className="text-3xl font-bold text-foreground">{users.length}</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              <p className="text-xs text-muted-foreground mb-1">今日 AI 调用</p>
              <p className="text-3xl font-bold text-foreground">{totalUsageToday}</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              <p className="text-xs text-muted-foreground mb-1">Pro 用户数</p>
              <p className="text-3xl font-bold text-foreground">{users.filter((u) => u.role === "pro" || u.role === "admin").length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
