import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isTauri } from "@/lib/localNotesStorage";
import { openTauriOAuth } from "@/lib/tauriAuth";
import WechatLoginDialog from "@/components/auth/WechatLoginDialog";

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
      navigate("/workspace");
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

  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);

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

    // Web: use Supabase OAuth directly
    const redirectTo = isDesktopOAuth
      ? `${window.location.origin}/auth?desktop=true`
      : `${window.location.origin}/workspace`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      toast({ title: "登录失败", description: error.message, variant: "destructive" });
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
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-xl font-bold">智记 AI</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            让 AI 帮你记录<br />每一个灵感瞬间
          </h2>
          <p className="text-white/70 text-lg max-w-md">
            语音速记、智能整理、AI 搜索——你的第二大脑，从注册开始。
          </p>
        </div>
        <p className="text-white/40 text-sm">© 2026 智记 AI. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {!isTauri() && (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 返回首页
            </button>
          )}

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
                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-background hover:bg-muted transition-all duration-200 text-sm font-medium hover:shadow-sm"
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
                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-background hover:bg-muted transition-all duration-200 text-sm font-medium hover:shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                使用 Apple 登录
              </button>
              <button
                onClick={() => setWechatDialogOpen(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-[#07C160] hover:bg-[#06ae56] text-white transition-all duration-200 text-sm font-medium hover:shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.49.49 0 0 1 .177-.554C23.469 18.15 24.5 16.396 24.5 14.41c0-3.38-3.236-5.616-7.562-5.552zm-3.2 3.263c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm5.063 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z" />
                </svg>
                微信扫码登录
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
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all duration-200"
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
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all duration-200"
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
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all duration-200"
                  required
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
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
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
      <WechatLoginDialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen} />
    </div>
  );
};

export default Auth;
