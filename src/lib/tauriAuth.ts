/**
 * Tauri Desktop OAuth Helper
 * 
 * Flow:
 * 1. User clicks Google/Apple login in Tauri app
 * 2. App opens system browser → web auth page with ?desktop=true&provider=xxx
 * 3. Web page completes OAuth normally
 * 4. After success, web page redirects to smartnote://auth/callback#access_token=...&refresh_token=...
 * 5. Tauri deep-link plugin receives the URL
 * 6. App extracts tokens → supabase.auth.setSession()
 */

import { isTauri } from "./localNotesStorage";
import { supabase } from "@/integrations/supabase/client";

/**
 * The web URL where OAuth redirects are properly configured.
 * Uses the Lovable published URL. Update this if you connect a custom domain later.
 */
const WEB_AUTH_URL = import.meta.env.VITE_WEB_AUTH_URL || window.location.origin;

/** Custom URL scheme registered in Tauri config */
export const DEEP_LINK_SCHEME = "smartnote";

/**
 * Open OAuth login in system browser (Tauri only).
 * Returns true if handled, false if not in Tauri.
 */
export async function openTauriOAuth(provider: "google" | "apple"): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const shell = await dynamicImport("@tauri-apps/plugin-shell");
    if (!shell?.open) return false;

    const url = `${WEB_AUTH_URL}/auth?desktop=true&provider=${provider}`;
    await shell.open(url);
    return true;
  } catch (e) {
    console.error("Failed to open system browser for OAuth:", e);
    return false;
  }
}

/**
 * Initialize deep link listener to receive OAuth callback tokens.
 * Call once at app startup.
 */
export async function initTauriDeepLinkListener(): Promise<void> {
  if (!isTauri()) return;

  try {
    const deepLink = await dynamicImport("@tauri-apps/plugin-deep-link");
    if (!deepLink?.onOpenUrl) return;

    deepLink.onOpenUrl(async (urls: string[]) => {
      for (const url of urls) {
        await handleDeepLinkUrl(url);
      }
    });

    console.log("[TauriAuth] Deep link listener initialized");
  } catch (e) {
    console.error("Failed to init deep link listener:", e);
  }
}

/**
 * Parse a deep link URL and set the Supabase session if tokens are present.
 * Expected format: smartnote://auth/callback#access_token=...&refresh_token=...
 */
async function handleDeepLinkUrl(rawUrl: string): Promise<void> {
  try {
    if (!rawUrl.includes("auth/callback")) return;

    // Extract fragment (after #)
    const hashIndex = rawUrl.indexOf("#");
    if (hashIndex === -1) return;

    const fragment = rawUrl.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      console.warn("[TauriAuth] Deep link missing tokens");
      return;
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("[TauriAuth] Failed to set session:", error);
    } else {
      console.log("[TauriAuth] Session set successfully via deep link");
    }
  } catch (e) {
    console.error("[TauriAuth] Error handling deep link:", e);
  }
}

// Dynamic import helper to avoid build errors when Tauri plugins aren't installed
async function dynamicImport(module: string): Promise<any> {
  try {
    return await (Function(`return import("${module}")`)() as Promise<any>);
  } catch {
    return null;
  }
}
