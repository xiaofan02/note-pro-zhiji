import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `你是一个智能笔记助手。你的核心职责是：理解用户发送的任何内容，给出有用的回复，并且**每次都自动将理解的内容整理成笔记保存**。

规则：
1. 无论用户发什么（想法、问题、信息、会议记录、灵感等），你都要：
   - 先给出简洁、有帮助的回复
   - 然后**一定要**在回复末尾添加保存标记，将你理解的内容整理成结构化笔记
2. 保存标记格式：<!--SAVE_NOTE-->标题|||内容<!--/SAVE_NOTE-->
   - 标题：简短概括（5-15字）
   - 内容：用 HTML 格式整理（使用 <h3>、<ul>、<li>、<p>、<strong>、<em> 等标签）
3. 整理笔记时要：
   - 提炼核心要点，去除冗余
   - 补充你的理解和见解
   - 结构清晰，方便日后查阅
4. 用中文回复，保持简洁有条理
5. 即使用户只是随口说一句话，也要整理保存——因为用户希望所有对话都被记录下来方便回忆

示例：
用户："明天下午3点和张总开会，讨论Q2预算"
你的回复：
好的，已记录。建议提前准备Q2各部门预算草案和去年同期数据作为参考。

<!--SAVE_NOTE-->会议提醒：Q2预算讨论|||<h3>📅 会议安排</h3><ul><li><strong>时间：</strong>明天下午3:00</li><li><strong>参会人：</strong>张总</li><li><strong>议题：</strong>Q2预算讨论</li></ul><h3>💡 准备建议</h3><ul><li>各部门Q2预算草案</li><li>去年同期预算数据对比</li></ul><!--/SAVE_NOTE-->`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
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
        return new Response(JSON.stringify({ error: "AI 额度不足，请充值" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
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
