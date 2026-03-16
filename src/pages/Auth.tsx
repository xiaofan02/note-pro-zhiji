import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isTauri } from "@/lib/localNotesStorage";
import { openTauriOAuth } from "@/lib/tauriAuth";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register" | "forgot">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const isDesktopOAuth = searchParams.get("desktop") === "true";

  useEffect(() => {
    if (user) {
      if (isDesktopOAuth) {
        navigate("/desktop-auth-callback");
      } else {
        navigate("/workspace");
      }
    }
  }, [user, navigate, isDesktopOAuth]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "登录失败", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "密码太短", description: "密码至少需要6个字符", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "注册失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "注册成功", description: "请查收邮箱验证链接" });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "发送失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "邮件已发送", description: "请查收重置密码链接" });
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setLoading(true);

    // In Tauri desktop, open system browser for OAuth
    if (isTauri()) {
      const handled = await openTauriOAuth(provider);
      if (handled) {
        toast({ title: "已打开浏览器", description: "请在浏览器中完成登录，登录后将自动返回应用" });
        setLoading(false);
        return;
      }
    }

    // Web: use Lovable Cloud OAuth
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "登录失败", description: String(result.error), variant: "destructive" });
    }
    setLoading(false);
  };

  // Auto-trigger OAuth when opened from desktop app with ?desktop=true&provider=xxx
  useEffect(() => {
    const isDesktop = searchParams.get("desktop") === "true";
    const provider = searchParams.get("provider") as "google" | "apple" | null;
    if (isDesktop && provider && !isTauri()) {
      handleSocialLogin(provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-primary-foreground flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-foreground rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-foreground" />
          </div>
          <span className="text-xl font-bold">智记 AI</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            让 AI 帮你记录<br />每一个灵感瞬间
          </h2>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            语音速记、智能整理、AI 搜索——你的第二大脑，从注册开始。
          </p>
        </div>
        <p className="text-primary-foreground/40 text-sm">© 2026 智记 AI. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </button>

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "login" && "欢迎回来"}
              {mode === "register" && "创建账户"}
              {mode === "forgot" && "重置密码"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {mode === "login" && "登录你的智记 AI 账户"}
              {mode === "register" && "免费注册，开启智能笔记之旅"}
              {mode === "forgot" && "输入邮箱，我们将发送重置链接"}
            </p>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-3">
              <button
                onClick={() => handleSocialLogin("google")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                使用 Google 登录
              </button>
              <button
                onClick={() => handleSocialLogin("apple")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                使用 Apple 登录
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">或使用邮箱</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={mode === "login" ? handleEmailLogin : mode === "register" ? handleEmailRegister : handleForgotPassword} className="space-y-4">
            {mode === "register" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="你的名字"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  忘记密码？
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-foreground text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "处理中..." : mode === "login" ? "登录" : mode === "register" ? "注册" : "发送重置链接"}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <p>
                还没有账户？{" "}
                <button onClick={() => setMode("register")} className="text-foreground font-medium hover:underline">
                  立即注册
                </button>
              </p>
            )}
            {mode === "register" && (
              <p>
                已有账户？{" "}
                <button onClick={() => setMode("login")} className="text-foreground font-medium hover:underline">
                  去登录
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p>
                <button onClick={() => setMode("login")} className="text-foreground font-medium hover:underline">
                  返回登录
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
