import { useState, useEffect, useCallback } from "react";
import { isTauri } from "@/lib/localNotesStorage";

export interface TauriUpdateState {
  hasUpdate: boolean;
  version: string | null;
  updating: boolean;
  checkForUpdates: () => Promise<boolean>;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
}

export const useTauriUpdate = (): TauriUpdateState => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  // updater module ref
  const [updaterMod, setUpdaterMod] = useState<any>(null);
  const [updateObj, setUpdateObj] = useState<any>(null);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!isTauri()) return false;
    try {
      const mod = await import("@tauri-apps/plugin-updater");
      setUpdaterMod(mod);
      const update = await mod.check();
      if (!update) {
        setUpdateObj(null);
        setHasUpdate(false);
        setVersion(null);
        return false;
      }
      setUpdateObj(update);
      setVersion(update.version ?? null);
      setHasUpdate(true);
      return true;
    } catch (e) {
      console.error("Tauri update check failed:", e);
      setUpdateObj(null);
      setHasUpdate(false);
      setVersion(null);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    // Initial check on mount.
    void checkForUpdates();
  }, [checkForUpdates]);

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
    setUpdateObj(null);
    setVersion(null);
  }, []);

  return { hasUpdate, version, updating, checkForUpdates, installUpdate, dismiss };
};
