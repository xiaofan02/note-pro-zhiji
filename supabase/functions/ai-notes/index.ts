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
      systemPrompt = `你是一个笔记整理助手。请将用户提供的笔记内容整理成结构化的 HTML 格式，严格遵循以下规则：

输出格式要求（必须使用 HTML 标签）：
- 使用 <h2> 作为主要章节标题，<h3> 作为子章节标题
- 使用 <p> 标签包裹正文段落，每个要点独立一段
- 使用 <ul><li> 或 <ol><li> 展示列表和关键要点
- 使用 <strong> 标记重要关键词和核心概念
- 使用 <blockquote> 包裹引用或重要结论
- 使用 <hr> 分隔不同章节
- 段落之间保持清晰间距

内容要求：
- 保持原文核心内容不变，不要删减重要信息
- 修正明显的语法错误
- 按逻辑重新组织内容结构
- 提取关键要点，突出重点

直接输出整理后的 HTML 内容，不要添加任何说明文字，不要使用 Markdown 语法，不要包含 \`\`\`html 代码块标记。`;
    } else if (action === "summarize") {
      systemPrompt = `你是一个笔记总结助手。请为用户的笔记生成一个结构化的摘要，使用 HTML 格式输出。

输出格式要求（必须使用 HTML 标签）：
- 用 <h3> 标签写一个简短的摘要标题（概括主题）
- 用 <p> 标签写 2-3 句话的核心概述
- 用 <ul><li> 列出 3-5 个关键要点，每个要点用 <strong> 标记关键词
- 如果有重要结论，用 <blockquote> 包裹

内容要求：
- 提取最核心的信息和要点
- 语言简练、准确
- 突出重点和关键数据

直接输出 HTML 内容，不要添加额外说明，不要使用 Markdown，不要包含 \`\`\`html 代码块标记。`;
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
