import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export interface AiConfig {
  provider: "lovable" | "custom";
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface AiConfigResult {
  config: AiConfig | null;
  dailyLimit: number;
  loading: boolean;
  /** null = not checked yet, true = allowed, false = over limit */
  usageAllowed: boolean | null;
  recordUsage: (action: string) => Promise<void>;
}

let cachedConfig: AiConfig | null = null;
let cachedLimit = 10;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

export function useAiConfig(): AiConfigResult {
  const { user } = useAuth();
  const { isPro, loading: roleLoading } = useUserRole();
  const [config, setConfig] = useState<AiConfig | null>(cachedConfig);
  const [dailyLimit, setDailyLimit] = useState(cachedLimit);
  const [loading, setLoading] = useState(!cachedConfig);
  const [usageCount, setUsageCount] = useState<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (cachedConfig && now - cacheTime < CACHE_TTL) {
      setConfig(cachedConfig);
      setDailyLimit(cachedLimit);
      setLoading(false);
      return;
    }
    supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["ai_model", "free_daily_limit"])
      .then(({ data }) => {
        const cfg: any = {};
        for (const row of data || []) cfg[row.key] = row.value;
        const aiModel: AiConfig = cfg.ai_model || { provider: "lovable" };
        const limit = typeof cfg.free_daily_limit === "number" ? cfg.free_daily_limit : 10;
        cachedConfig = aiModel;
        cachedLimit = limit;
        cacheTime = Date.now();
        setConfig(aiModel);
        setDailyLimit(limit);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user || roleLoading || isPro) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .then(({ count }) => setUsageCount(count || 0));
  }, [user, isPro, roleLoading]);

  const usageAllowed: boolean | null = roleLoading || loading
    ? null
    : isPro
    ? true
    : usageCount === null
    ? null
    : usageCount < dailyLimit;

  const recordUsage = async (action: string) => {
    if (!user) return;
    await supabase.from("ai_usage").insert({ user_id: user.id, action });
    setUsageCount((c) => (c === null ? 1 : c + 1));
  };

  return { config, dailyLimit, loading, usageAllowed, recordUsage };
}

/** Build fetch params from system_config ai_model */
export function buildAiRequest(
  config: AiConfig,
  messages: { role: string; content: string }[],
  stream = false
): { url: string; headers: Record<string, string>; body: string } | null {
  if (config.provider === "custom") {
    const { apiKey, baseUrl, model } = config;
    if (!apiKey || !baseUrl) return null;
    return {
      url: baseUrl.replace(/\/$/, "") + "/chat/completions",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || "gpt-3.5-turbo", messages, stream }),
    };
  }
  return null; // lovable provider needs edge function
}
