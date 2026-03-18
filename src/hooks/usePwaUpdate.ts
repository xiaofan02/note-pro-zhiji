import { useState, useEffect, useCallback } from "react";

interface PwaUpdateState {
  hasUpdate: boolean;
  updating: boolean;
  update: () => void;
}

export const usePwaUpdate = (): PwaUpdateState => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for controlling SW change → reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Check existing registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setRegistration(reg);

      // If a new SW is already waiting
      if (reg.waiting) {
        setHasUpdate(true);
        return;
      }

      // Listen for new SW installing
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setHasUpdate(true);
          }
        });
      });
    });

    // Periodically check for updates (every 30 minutes)
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const update = useCallback(() => {
    if (!registration?.waiting) {
      // No waiting SW, just reload to get latest
      window.location.reload();
      return;
    }
    setUpdating(true);
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, [registration]);

  return { hasUpdate, updating, update };
};
