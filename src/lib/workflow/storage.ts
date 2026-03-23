/**
 * Workflow Storage — persists workflows and logs to localStorage
 */
import { Workflow, WorkflowLog } from "./types";

const WORKFLOWS_KEY = "zhiji-workflows";
const LOGS_KEY = "zhiji-workflow-logs";
const MAX_LOGS = 100;

export const workflowStorage = {
  getAll(): Workflow[] {
    try {
      return JSON.parse(localStorage.getItem(WORKFLOWS_KEY) || "[]");
    } catch {
      return [];
    }
  },

  save(workflow: Workflow): void {
    const all = this.getAll();
    const idx = all.findIndex((w) => w.id === workflow.id);
    if (idx >= 0) {
      all[idx] = workflow;
    } else {
      all.push(workflow);
    }
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(all));
  },

  delete(id: string): void {
    const all = this.getAll().filter((w) => w.id !== id);
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(all));
  },

  updateStats(
    id: string,
    status: "success" | "error",
    error?: string
  ): void {
    const all = this.getAll();
    const wf = all.find((w) => w.id === id);
    if (!wf) return;
    wf.run_count = (wf.run_count || 0) + 1;
    wf.last_run_at = new Date().toISOString();
    wf.last_run_status = status;
    wf.last_run_error = error;
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(all));
  },

  // ─── Logs ──────────────────────────────────────────────────────
  getLogs(): WorkflowLog[] {
    try {
      return JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    } catch {
      return [];
    }
  },

  addLog(log: WorkflowLog): void {
    const logs = this.getLogs();
    logs.unshift(log);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  },

  clearLogs(): void {
    localStorage.removeItem(LOGS_KEY);
  },
};
