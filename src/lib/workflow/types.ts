/**
 * Workflow Engine Types
 */

// ─── Trigger Types ──────────────────────────────────────────────
export type TriggerType =
  | "on_note_save"      // fires on every note save
  | "on_note_create"    // fires when a new note is created
  | "on_tag_added"      // fires when a tag is added to a note
  | "on_schedule";      // fires on a cron-like schedule

export interface TriggerConfig {
  type: TriggerType;
  // for on_tag_added: which tag name triggers this
  tagName?: string;
  // for on_schedule: "daily" | "weekly"
  schedule?: "daily" | "weekly";
  // for on_schedule: time like "08:00"
  scheduleTime?: string;
  // for on_schedule: day of week 0-6 (weekly only)
  scheduleDay?: number;
}

// ─── Condition Types ────────────────────────────────────────────
export type ConditionField = "title" | "content" | "folder_id" | "tag";
export type ConditionOp = "contains" | "not_contains" | "equals" | "starts_with" | "is_empty";

export interface WorkflowCondition {
  field: ConditionField;
  op: ConditionOp;
  value: string;
}

// ─── Action Types ───────────────────────────────────────────────
export type ActionType =
  | "ai_summarize"    // append AI summary to note
  | "ai_organize"     // rewrite note with AI structure
  | "add_tag"         // add a tag to the note
  | "move_to_folder"  // move note to a folder
  | "webhook"         // POST to external URL
  | "create_note";    // create a new note from template

export interface ActionConfig {
  type: ActionType;
  // for add_tag
  tagName?: string;
  // for move_to_folder
  folderId?: string;
  folderName?: string;
  // for webhook
  webhookUrl?: string;
  webhookMethod?: "POST" | "GET";
  webhookBody?: string; // template string, {{title}}, {{content}}, {{url}}
  // for create_note
  noteTitle?: string;  // template: {{date}}, {{week}}
  noteContent?: string;
  noteFolderId?: string;
  // for ai actions: optional custom prompt suffix
  aiPrompt?: string;
}

// ─── Workflow ───────────────────────────────────────────────────
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: TriggerConfig;
  conditions: WorkflowCondition[];
  actions: ActionConfig[];
  created_at: string;
  updated_at: string;
  // execution stats
  run_count: number;
  last_run_at?: string;
  last_run_status?: "success" | "error";
  last_run_error?: string;
}

// ─── Execution Context ──────────────────────────────────────────
export interface WorkflowContext {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  noteFolderId: string | null;
  noteTags: string[];
  triggerType: TriggerType;
  addedTagName?: string;
}

// ─── Execution Log ──────────────────────────────────────────────
export interface WorkflowLog {
  id: string;
  workflow_id: string;
  workflow_name: string;
  triggered_at: string;
  status: "success" | "error";
  note_title: string;
  actions_run: string[];
  error?: string;
}
