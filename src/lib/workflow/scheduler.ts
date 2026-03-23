/**
 * Workflow Scheduler — handles on_schedule triggers
 * Checks every minute if any scheduled workflow should run.
 */
import { workflowStorage } from "./storage";
import { runWorkflow, ActionExecutorDeps } from "./engine";
import { WorkflowContext } from "./types";

const LAST_RUN_KEY = "zhiji-workflow-schedule-last";

function getLastRuns(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LAST_RUN_KEY) || "{}");
  } catch {
    return {};
  }
}

function setLastRun(workflowId: string, isoDate: string) {
  const runs = getLastRuns();
  runs[workflowId] = isoDate;
  localStorage.setItem(LAST_RUN_KEY, JSON.stringify(runs));
}

function shouldRunNow(
  schedule: "daily" | "weekly",
  scheduleTime: string,   // "HH:MM"
  scheduleDay: number | undefined,
  lastRunAt: string | undefined
): boolean {
  const now = new Date();
  const [hh, mm] = (scheduleTime || "08:00").split(":").map(Number);

  // Check time window: within the current minute
  if (now.getHours() !== hh || now.getMinutes() !== mm) return false;

  // Check day for weekly
  if (schedule === "weekly" && scheduleDay !== undefined) {
    if (now.getDay() !== scheduleDay) return false;
  }

  // Check if already ran today (or this week)
  if (lastRunAt) {
    const last = new Date(lastRunAt);
    if (schedule === "daily") {
      // same calendar day?
      if (
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate()
      ) return false;
    } else {
      // same week?
      const weekStart = (d: Date) => {
        const s = new Date(d);
        s.setDate(d.getDate() - d.getDay());
        s.setHours(0, 0, 0, 0);
        return s.getTime();
      };
      if (weekStart(last) === weekStart(now)) return false;
    }
  }

  return true;
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startScheduler(deps: ActionExecutorDeps) {
  if (schedulerTimer) return; // already running

  const tick = () => {
    const workflows = workflowStorage.getAll();
    const lastRuns = getLastRuns();

    for (const wf of workflows) {
      if (!wf.enabled || wf.trigger.type !== "on_schedule") continue;
      const { schedule, scheduleTime, scheduleDay } = wf.trigger;
      if (!schedule) continue;

      if (
        shouldRunNow(schedule, scheduleTime || "08:00", scheduleDay, lastRuns[wf.id])
      ) {
        setLastRun(wf.id, new Date().toISOString());

        // Build a synthetic context for schedule-triggered workflows
        const ctx: WorkflowContext = {
          noteId: "",
          noteTitle: "",
          noteContent: "",
          noteFolderId: null,
          noteTags: [],
          triggerType: "on_schedule",
        };

        runWorkflow(wf, ctx, deps).catch(console.error);
      }
    }
  };

  // Check every 60 seconds
  schedulerTimer = setInterval(tick, 60_000);
  // Also run immediately on start
  tick();
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
