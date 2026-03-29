import { isTauri } from "@/lib/localNotesStorage";

export type ActivityStatus = {
  supported: boolean;
  enabled: boolean;
  intervalSec: number;
  logPath: string;
  running: boolean;
};

export async function getActivityStatus(): Promise<ActivityStatus | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ActivityStatus>("activity_get_status");
  } catch {
    return null;
  }
}

export async function setActivityConfig(enabled: boolean, intervalSec: number): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("activity_set_config", { enabled, intervalSec });
}

export async function readActivityLogTail(maxLines = 80): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<string>("activity_read_log_tail", { max_lines: maxLines });
}
