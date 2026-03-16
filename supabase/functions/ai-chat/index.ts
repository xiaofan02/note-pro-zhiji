import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAiConfig(supabase: any) {
  const { data } = await supabase.from("system_config").select("key, value").in("key", ["ai_model", "free_daily_limit"]);
  const config: any = {};
  for (const row of data || []) config[row.key] = row.value;
  return config;
}

async function checkUsageLimit(supabase: any, userId: string, config: any) {
  // Check user role
  const { data: roleData } = await supabase.rpc("get_user_role", { _user_id: userId });
  const role = roleData || "free";
  if (role === "pro" || role === "admin") return true;

  const dailyLimit = typeof config.free_daily_limit === "number" ? config.free_daily_limit : 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());

  return (count || 0) < dailyLimit;
}

function getProviderUrl(aiModel: any): { url: string; apiKey: string; model: string } {
  const provider = aiModel?.provider || "lovable";
  const model = aiModel?.model || "google/gemini-3-flash-preview";

  if (provider === "custom") {
    const apiKey = aiModel?.apiKey;
    const baseUrl = aiModel?.baseUrl;
    if (!apiKey || !baseUrl) throw new Error("自定义 AI 未配置");
    return { url: baseUrl.replace(/\/$/, "") + "/chat/completions", apiKey, model };
  }

  // Default: Lovable AI
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: LOVABLE_API_KEY,
    model,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await anonClient.auth.getUser(token);

    const { messages } = await req.json();
    const config = await getAiConfig(supabase);

    // Check usage limit for authenticated users
    if (user) {
      const allowed = await checkUsageLimit(supabase, user.id, config);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "今日 AI 使用次数已达上限，请升级 Pro 获取无限使用" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Record usage
      await supabase.from("ai_usage").insert({ user_id: user.id, action: "chat" });
    }

    const { url, apiKey, model } = getProviderUrl(config.ai_model);

    const systemPrompt = `你是一个智能笔记助手。你的核心职责是：理解用户发送的任何内容，给出有用的回复，并且**每次都自动将理解的内容整理成笔记保存**。

规则：
1. 无论用户发什么（想法、问题、信息、会议记录、灵感、配置命令等），你都要：
   - 先给出简洁、有帮助的回复
   - 然后**一定要**在回复末尾添加保存标记，将你理解的内容整理成结构化笔记
2. 保存标记格式：<!--SAVE_NOTE-->标题|||内容<!--/SAVE_NOTE-->
   - 标题：简短概括（5-15字）
   - 内容：用 HTML 格式整理（使用 <h3>、<ul>、<li>、<p>、<strong>、<em>、<pre>、<code> 等标签）
3. 整理笔记时要：
   - 提炼核心要点，去除冗余
   - 补充你的理解和见解
   - 结构清晰，方便日后查阅
   - **重要：如果用户发送了代码、命令、配置片段等，必须在笔记中用 <pre><code> 标签完整保留原始内容**
4. 用中文回复，保持简洁有条理
5. 即使用户只是随口说一句话，也要整理保存`;

    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度不足" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI 请求失败 (${response.status})`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
