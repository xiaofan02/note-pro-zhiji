/**
 * useWorkflow — React hook for workflow CRUD + trigger dispatch
 */
import { useState, useCallback, useEffect } from "react";
import { Workflow, WorkflowLog, WorkflowContext } from "@/lib/workflow/types";
import { workflowStorage } from "@/lib/workflow/storage";
import { dispatchTrigger, ActionExecutorDeps } from "@/lib/workflow/engine";
import { startScheduler, stopScheduler } from "@/lib/workflow/scheduler";

export { type Workflow, type WorkflowLog };

export function useWorkflow(deps: ActionExecutorDeps | null) {
  const [workflows, setWorkflows] = useState<Workflow[]>(() =>
    workflowStorage.getAll()
  );
  const [logs, setLogs] = useState<WorkflowLog[]>(() =>
    workflowStorage.getLogs()
  );

  // Refresh from storage
  const refresh = useCallback(() => {
    setWorkflows(workflowStorage.getAll());
    setLogs(workflowStorage.getLogs());
  }, []);

  // Start scheduler when deps are ready
  useEffect(() => {
    if (!deps) return;
    startScheduler(deps);
    return () => stopScheduler();
  }, [deps]);

  const createWorkflow = useCallback(
    (partial: Omit<Workflow, "id" | "created_at" | "updated_at" | "run_count">) => {
      const now = new Date().toISOString();
      const wf: Workflow = {
        ...partial,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        run_count: 0,
      };
      workflowStorage.save(wf);
      refresh();
      return wf;
    },
    [refresh]
  );

  const updateWorkflow = useCallback(
    (wf: Workflow) => {
      workflowStorage.save({ ...wf, updated_at: new Date().toISOString() });
      refresh();
    },
    [refresh]
  );

  const deleteWorkflow = useCallback(
    (id: string) => {
      workflowStorage.delete(id);
      refresh();
    },
    [refresh]
  );

  const toggleWorkflow = useCallback(
    (id: string) => {
      const wf = workflowStorage.getAll().find((w) => w.id === id);
      if (!wf) return;
      workflowStorage.save({ ...wf, enabled: !wf.enabled, updated_at: new Date().toISOString() });
      refresh();
    },
    [refresh]
  );

  const clearLogs = useCallback(() => {
    workflowStorage.clearLogs();
    setLogs([]);
  }, []);

  // Trigger dispatcher — call this from Workspace when events happen
  const trigger = useCallback(
    async (
      type: "on_note_save" | "on_note_create" | "on_tag_added",
      ctx: WorkflowContext
    ) => {
      if (!deps) return;
      await dispatchTrigger(type, ctx, deps);
      // Refresh logs after a short delay to pick up new entries
      setTimeout(refresh, 500);
    },
    [deps, refresh]
  );

  return {
    workflows,
    logs,
    refresh,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    clearLogs,
    trigger,
  };
}
