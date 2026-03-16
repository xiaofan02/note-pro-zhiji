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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await anonClient.auth.getUser(token);

    const { content, action } = await req.json();
    const config = await getAiConfig(supabase);

    if (user) {
      const allowed = await checkUsageLimit(supabase, user.id, config);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "今日 AI 使用次数已达上限，请升级 Pro 获取无限使用" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("ai_usage").insert({ user_id: user.id, action });
    }

    const { url, apiKey, model } = getProviderUrl(config.ai_model);

    let systemPrompt = "";
    if (action === "organize") {
      systemPrompt = `你是一个笔记整理助手。请将用户提供的笔记内容整理成结构化的格式：
- 添加清晰的标题层级（用 # ## ### 标记）
- 提取关键要点，用列表形式展示
- 保持原文核心内容不变
- 修正明显的语法错误
- 使内容更加清晰易读
直接输出整理后的内容，不要添加额外说明。`;
    } else if (action === "summarize") {
      systemPrompt = `你是一个笔记总结助手。请为用户的笔记生成一个简洁的摘要：
- 摘要控制在 3-5 句话
- 提取最核心的信息和要点
- 语言简练、准确
直接输出摘要内容，不要添加额外说明。`;
    } else {
      throw new Error("Unknown action: " + action);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content }],
        stream: false,
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
      throw new Error(`AI 请求失败 (${response.status}): ${t.slice(0, 200)}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
