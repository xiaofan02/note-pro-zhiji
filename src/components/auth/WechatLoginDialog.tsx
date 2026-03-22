import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WECHAT_APP_ID = import.meta.env.VITE_WECHAT_APP_ID || "";
const WECHAT_AUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wechat-auth`;

interface WechatLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WechatLoginDialog = ({ open, onOpenChange }: WechatLoginDialogProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "polling" | "success" | "error">("idle");
  const [qrcodeUrl, setQrcodeUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const stateRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setQrcodeUrl(null);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    if (!WECHAT_APP_ID) {
      setStatus("error");
      return;
    }

    // Generate a random state for CSRF protection and session tracking
    const state = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    stateRef.current = state;

    // Construct WeChat OAuth URL for QR code scanning
    const redirectUri = encodeURIComponent(`${WECHAT_AUTH_URL}?action=callback`);
    const wechatUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
    setQrcodeUrl(wechatUrl);
    setStatus("polling");

    // Poll the Edge Function to check if the user has completed scanning
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`${WECHAT_AUTH_URL}?action=check&state=${state}`);
        if (!resp.ok) return;
        const data = await resp.json();

        if (data.status === "completed" && data.access_token && data.refresh_token) {
          clearInterval(pollRef.current);
          const { error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          if (error) {
            setStatus("error");
            toast({ title: "登录失败", description: error.message, variant: "destructive" });
          } else {
            setStatus("success");
            toast({ title: "微信登录成功" });
            onOpenChange(false);
          }
        }
      } catch {
        // Polling errors are expected, continue
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">微信扫码登录</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {!WECHAT_APP_ID ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                微信登录尚未配置
              </p>
              <p className="text-xs text-muted-foreground/70">
                请在环境变量中设置 VITE_WECHAT_APP_ID 和 WECHAT_APP_SECRET
              </p>
            </div>
          ) : status === "polling" && qrcodeUrl ? (
            <>
              <div className="w-[300px] h-[400px] border border-border rounded-lg overflow-hidden bg-white">
                <iframe
                  src={qrcodeUrl}
                  className="w-full h-full border-none"
                  title="微信扫码登录"
                  sandbox="allow-scripts allow-same-origin allow-top-navigation"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                请使用微信扫描二维码
              </div>
            </>
          ) : status === "success" ? (
            <p className="text-sm text-green-600">登录成功，正在跳转...</p>
          ) : status === "error" ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-destructive">登录失败，请重试</p>
              <button
                onClick={() => onOpenChange(false)}
                className="text-sm text-primary hover:underline"
              >
                关闭
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WechatLoginDialog;
