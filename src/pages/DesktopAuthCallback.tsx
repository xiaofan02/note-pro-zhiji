/**
 * Desktop Auth Callback Page
 * 
 * This page is loaded in the system browser after OAuth completes.
 * It extracts the session tokens and redirects to the Tauri app via deep link.
 * 
 * Flow: OAuth provider → redirect to this page → extract tokens → redirect to smartnote://
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEEP_LINK_SCHEME } from "@/lib/tauriAuth";
import { Sparkles, CheckCircle, AlertCircle } from "lucide-react";

const DesktopAuthCallback = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the OAuth callback and establish session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // If no session yet, wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
              if (newSession) {
                subscription.unsubscribe();
                redirectToApp(newSession.access_token, newSession.refresh_token);
                setStatus("success");
              }
            }
          );

          // Timeout after 30s
          setTimeout(() => {
            subscription.unsubscribe();
            setStatus("error");
          }, 30000);
          return;
        }

        redirectToApp(session.access_token, session.refresh_token);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    handleCallback();
  }, []);

  const redirectToApp = (accessToken: string, refreshToken: string) => {
    const deepLinkUrl = `${DEEP_LINK_SCHEME}://auth/callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
    window.location.href = deepLinkUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>

        {status === "loading" && (
          <div className="space-y-3">
            <div className="animate-spin w-8 h-8 border-3 border-muted border-t-foreground rounded-full mx-auto" />
            <h2 className="text-xl font-bold text-foreground">正在验证登录...</h2>
            <p className="text-sm text-muted-foreground">
              登录成功后将自动跳转回桌面应用
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">登录成功！</h2>
            <p className="text-sm text-muted-foreground">
              正在跳转回智记 AI 桌面应用...<br />
              如果没有自动跳转，请手动返回桌面应用。
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">登录失败</h2>
            <p className="text-sm text-muted-foreground">
              请关闭此页面，返回桌面应用重试。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopAuthCallback;
