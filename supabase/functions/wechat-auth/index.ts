import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WECHAT_APP_ID = Deno.env.get("WECHAT_APP_ID") || "";
const WECHAT_APP_SECRET = Deno.env.get("WECHAT_APP_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// In-memory store for pending WeChat login sessions (state -> session data)
// In production, use a database table or Redis for persistence across instances
const pendingSessions = new Map<string, { status: string; access_token?: string; refresh_token?: string; expires_at?: number }>();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingSessions) {
    if (val.expires_at && val.expires_at < now) pendingSessions.delete(key);
  }
}, 300000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // ─── Action: callback ─────────────────────────────────────────
    // WeChat redirects here after user scans QR code
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        return new Response("Missing code or state", { status: 400, headers: corsHeaders });
      }

      if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
        return new Response("WeChat not configured", { status: 500, headers: corsHeaders });
      }

      // Step 1: Exchange code for access_token and openid
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;
      const tokenResp = await fetch(tokenUrl);
      const tokenData = await tokenResp.json();

      if (tokenData.errcode) {
        console.error("WeChat token error:", tokenData);
        return htmlResponse("登录失败：微信授权错误");
      }

      const { access_token: wxAccessToken, openid } = tokenData;

      // Step 2: Get user info from WeChat
      const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${wxAccessToken}&openid=${openid}&lang=zh_CN`;
      const userInfoResp = await fetch(userInfoUrl);
      const userInfo = await userInfoResp.json();

      if (userInfo.errcode) {
        console.error("WeChat userinfo error:", userInfo);
        return htmlResponse("登录失败：获取用户信息失败");
      }

      // Step 3: Find or create user in Supabase using service role
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Look up existing user by wechat openid stored in user metadata
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      let userId: string | null = null;

      if (existingUsers?.users) {
        const existing = existingUsers.users.find(
          (u: any) => u.user_metadata?.wechat_openid === openid
        );
        if (existing) userId = existing.id;
      }

      if (!userId) {
        // Create new user with a random email placeholder (WeChat doesn't provide email)
        const fakeEmail = `wx_${openid.slice(0, 12)}@wechat.placeholder`;
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: fakeEmail,
          email_confirm: true,
          user_metadata: {
            full_name: userInfo.nickname || "微信用户",
            avatar_url: userInfo.headimgurl || "",
            wechat_openid: openid,
            wechat_unionid: userInfo.unionid || "",
            provider: "wechat",
          },
        });

        if (createError || !newUser?.user) {
          console.error("Create user error:", createError);
          return htmlResponse("登录失败：创建用户失败");
        }
        userId = newUser.user.id;
      }

      // Step 4: Generate Supabase session tokens for this user
      // We use a custom JWT approach - generate a magic link token and exchange it
      // Alternative: use admin.generateLink to create a session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: (await supabase.auth.admin.getUserById(userId!)).data.user?.email || "",
      });

      if (linkError || !linkData) {
        console.error("Generate link error:", linkError);
        return htmlResponse("登录失败：生成登录链接失败");
      }

      // Extract the token from the magic link
      const magicLinkUrl = new URL(linkData.properties?.action_link || "");
      const token = magicLinkUrl.searchParams.get("token") || magicLinkUrl.hash;

      // Store the session info so the polling endpoint can pick it up
      // For the magic link flow, we'll redirect the browser to verify the token
      // which will establish a session, then the frontend polls for completion

      // Actually, a simpler approach: use the hashed_token to verify directly
      // and store the result for polling
      if (linkData.properties?.hashed_token) {
        // Verify the OTP to get actual session tokens
        const verifyUrl = `${SUPABASE_URL}/auth/v1/verify`;
        const verifyResp = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            type: "magiclink",
            token: linkData.properties.hashed_token,
          }),
        });

        if (verifyResp.ok) {
          const session = await verifyResp.json();
          pendingSessions.set(state, {
            status: "completed",
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: Date.now() + 300000, // 5 min TTL
          });
          return htmlResponse("登录成功！请返回智记 AI 应用。", true);
        }
      }

      // Fallback: store as pending and let frontend handle
      pendingSessions.set(state, {
        status: "completed",
        expires_at: Date.now() + 300000,
      });
      return htmlResponse("登录处理中，请返回智记 AI 应用。", true);
    }

    // ─── Action: check ────────────────────────────────────────────
    // Frontend polls this to check if WeChat login completed
    if (action === "check") {
      const state = url.searchParams.get("state");
      if (!state) {
        return jsonResponse({ status: "error", message: "Missing state" }, 400);
      }

      const session = pendingSessions.get(state);
      if (!session) {
        return jsonResponse({ status: "pending" });
      }

      if (session.status === "completed") {
        pendingSessions.delete(state); // One-time read
        return jsonResponse({
          status: "completed",
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      return jsonResponse({ status: session.status });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("WeChat auth error:", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function htmlResponse(message: string, success = false) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>智记 AI - 微信登录</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);}
.icon{font-size:48px;margin-bottom:1rem;}
p{color:#666;font-size:14px;}</style></head>
<body><div class="card"><div class="icon">${success ? "✅" : "❌"}</div><h2>${message}</h2><p>可以关闭此页面</p></div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}
