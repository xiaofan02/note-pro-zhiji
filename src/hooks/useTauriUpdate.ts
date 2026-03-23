import { useState, useEffect, useCallback } from "react";
import { isTauri } from "@/lib/localNotesStorage";

export interface TauriUpdateState {
  hasUpdate: boolean;
  version: string | null;
  updating: boolean;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
}

export const useTauriUpdate = (): TauriUpdateState => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // updater module ref
  const [updaterMod, setUpdaterMod] = useState<any>(null);
  const [updateObj, setUpdateObj] = useState<any>(null);

  useEffect(() => {
    if (!isTauri() || dismissed) return;

    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@tauri-apps/plugin-updater");
        if (cancelled) return;
        setUpdaterMod(mod);
        const update = await mod.check();
        if (cancelled || !update) return;
        setUpdateObj(update);
        setVersion(update.version ?? null);
        setHasUpdate(true);
      } catch {
        // updater plugin not configured or no network — silently ignore
      }
    })();

    return () => { cancelled = true; };
  }, [dismissed]);

  const installUpdate = useCallback(async () => {
    if (!updateObj) return;
    setUpdating(true);
    try {
      await updateObj.downloadAndInstall();
      // On Windows/Linux the app restarts automatically.
      // On macOS it may need a manual relaunch.
    } catch (e) {
      console.error("Tauri update failed:", e);
    } finally {
      setUpdating(false);
    }
  }, [updateObj]);

  const dismiss = useCallback(() => {
    setHasUpdate(false);
    setDismissed(true);
  }, []);

  return { hasUpdate, version, updating, installUpdate, dismiss };
};
