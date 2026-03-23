/**
 * Workflow Engine — evaluates conditions and executes actions
 */
import {
  Workflow, WorkflowContext, WorkflowCondition, ActionConfig, WorkflowLog,
} from "./types";
import { workflowStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";
import { buildAiRequest, AiConfig } from "@/hooks/useAiConfig";

// ─── Condition Evaluator ────────────────────────────────────────
function evalCondition(cond: WorkflowCondition, ctx: WorkflowContext): boolean {
  let fieldValue = "";
  switch (cond.field) {
    case "title":     fieldValue = ctx.noteTitle; break;
    case "content":   fieldValue = ctx.noteContent.replace(/<[^>]*>/g, ""); break;
    case "folder_id": fieldValue = ctx.noteFolderId || ""; break;
    case "tag":       fieldValue = ctx.noteTags.join(","); break;
  }
  const v = fieldValue.toLowerCase();
  const q = (cond.value || "").toLowerCase();
  switch (cond.op) {
    case "contains":     return v.includes(q);
    case "not_contains": return !v.includes(q);
    case "equals":       return v === q;
    case "starts_with":  return v.startsWith(q);
    case "is_empty":     return v.trim() === "";
    default:             return true;
  }
}

function evalConditions(conditions: WorkflowCondition[], ctx: WorkflowContext): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evalCondition(c, ctx));
}

// ─── Template Renderer ──────────────────────────────────────────
function renderTemplate(template: string, ctx: WorkflowContext): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN");
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekStr = `星期${weekDays[now.getDay()]}`;
  return template
    .replace(/\{\{title\}\}/g, ctx.noteTitle)
    .replace(/\{\{content\}\}/g, ctx.noteContent.replace(/<[^>]*>/g, "").slice(0, 500))
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{week\}\}/g, weekStr)
    .replace(/\{\{url\}\}/g, window.location.origin);
}

// ─── AI Helper ──────────────────────────────────────────────────
async function callAi(
  aiConfig: AiConfig | null,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  if (aiConfig) {
    const req = buildAiRequest(aiConfig, messages, false);
    if (req) {
      const resp = await fetch(req.url, {
        method: "POST",
        headers: req.headers,
        body: req.body,
      });
      if (!resp.ok) throw new Error(`AI 请求失败 (${resp.status})`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "";
    }
  }

  // fallback to edge function
  const { data, error } = await supabase.functions.invoke("ai-notes", {
    body: { content: userContent, action: "summarize" },
  });
  if (error) throw error;
  return data?.result || "";
}

// ─── Action Executor ────────────────────────────────────────────
export interface ActionExecutorDeps {
  aiConfig: AiConfig | null;
  updateNote: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  addTagToNote: (noteId: string, tagName: string) => Promise<void>;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  createNote: (title: string, content: string, folderId?: string | null) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

async function executeAction(
  action: ActionConfig,
  ctx: WorkflowContext,
  deps: ActionExecutorDeps
): Promise<string> {
  switch (action.type) {
    case "ai_summarize": {
      const plain = ctx.noteContent.replace(/<[^>]*>/g, "");
      if (!plain.trim()) return "跳过（内容为空）";
      const prompt = action.aiPrompt ||
        "你是一个笔记总结助手。请为用户的笔记生成结构化摘要，使用 HTML 格式。用 <h3> 写标题，<p> 写概述，<ul><li> 列关键要点。直接输出 HTML，不要 Markdown 或代码块标记。";
      const summary = await callAi(deps.aiConfig, prompt, plain);
      const newContent = ctx.noteContent + `<hr><h3>📋 AI 自动摘要</h3>` + summary;
      await deps.updateNote(ctx.noteId, { content: newContent });
      return "AI 摘要已追加";
    }

    case "ai_organize": {
      const plain = ctx.noteContent.replace(/<[^>]*>/g, "");
      if (!plain.trim()) return "跳过（内容为空）";
      const prompt = action.aiPrompt ||
        "你是一个笔记整理助手。请将用户提供的笔记内容整理成结构化的 HTML 格式。使用 <h2>/<h3> 标题、<p> 段落、<ul><li> 列表、<strong> 关键词。直接输出 HTML，不要 Markdown 或代码块标记。";
      const organized = await callAi(deps.aiConfig, prompt, plain);
      await deps.updateNote(ctx.noteId, { content: organized });
      return "AI 整理完成";
    }

    case "add_tag": {
      if (!action.tagName) return "跳过（未配置标签）";
      await deps.addTagToNote(ctx.noteId, action.tagName);
      return `已添加标签「${action.tagName}」`;
    }

    case "move_to_folder": {
      const folderId = action.folderId || null;
      await deps.moveNoteToFolder(ctx.noteId, folderId);
      return `已移动到「${action.folderName || "未分类"}」`;
    }

    case "webhook": {
      if (!action.webhookUrl) return "跳过（未配置 Webhook URL）";
      const body = action.webhookBody
        ? renderTemplate(action.webhookBody, ctx)
        : JSON.stringify({
            title: ctx.noteTitle,
            content: ctx.noteContent.replace(/<[^>]*>/g, "").slice(0, 1000),
            url: `${window.location.origin}/workspace`,
            triggered_at: new Date().toISOString(),
          });
      const method = action.webhookMethod || "POST";
      const resp = await fetch(action.webhookUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? body : undefined,
      });
      if (!resp.ok) throw new Error(`Webhook 请求失败 (${resp.status})`);
      return `Webhook 已发送 (${resp.status})`;
    }

    case "create_note": {
      const title = renderTemplate(action.noteTitle || "{{date}} 自动笔记", ctx);
      const content = renderTemplate(action.noteContent || "<p>由工作流自动创建</p>", ctx);
      await deps.createNote(title, content, action.noteFolderId || null);
      await deps.refreshNotes();
      return `已创建笔记「${title}」`;
    }

    default:
      return "未知动作";
  }
}

// ─── Main Runner ────────────────────────────────────────────────
export async function runWorkflow(
  workflow: Workflow,
  ctx: WorkflowContext,
  deps: ActionExecutorDeps
): Promise<void> {
  if (!workflow.enabled) return;
  if (!evalConditions(workflow.conditions, ctx)) return;

  const actionsRun: string[] = [];
  let status: "success" | "error" = "success";
  let errorMsg: string | undefined;

  for (const action of workflow.actions) {
    try {
      const result = await executeAction(action, ctx, deps);
      actionsRun.push(`${action.type}: ${result}`);
    } catch (e: any) {
      status = "error";
      errorMsg = e.message;
      actionsRun.push(`${action.type}: 失败 — ${e.message}`);
      break; // stop on first error
    }
  }

  // persist stats + log
  workflowStorage.updateStats(workflow.id, status, errorMsg);
  const log: WorkflowLog = {
    id: crypto.randomUUID(),
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    triggered_at: new Date().toISOString(),
    status,
    note_title: ctx.noteTitle,
    actions_run: actionsRun,
    error: errorMsg,
  };
  workflowStorage.addLog(log);
}

// ─── Trigger Dispatcher ─────────────────────────────────────────
export async function dispatchTrigger(
  triggerType: "on_note_save" | "on_note_create" | "on_tag_added",
  ctx: WorkflowContext,
  deps: ActionExecutorDeps
): Promise<void> {
  const workflows = workflowStorage.getAll();
  const matching = workflows.filter(
    (wf) => wf.enabled && wf.trigger.type === triggerType
  );

  for (const wf of matching) {
    // for on_tag_added: check if the tag matches
    if (
      triggerType === "on_tag_added" &&
      wf.trigger.tagName &&
      wf.trigger.tagName !== ctx.addedTagName
    ) {
      continue;
    }
    // run async, don't block the caller
    runWorkflow(wf, ctx, deps).catch(console.error);
  }
}
