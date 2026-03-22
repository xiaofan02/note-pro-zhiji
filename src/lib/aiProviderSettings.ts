// AI Provider configuration stored in localStorage

export type AiProviderType = "edge" | "openai" | "custom";

export interface AiProviderSettings {
  provider: AiProviderType;
  // OpenAI direct
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
  // Custom third-party (国内模型 etc.)
  customApiKey?: string;
  customModel?: string;
  customBaseUrl?: string;
}

const STORAGE_KEY = "ai-provider-settings";

const defaults: AiProviderSettings = {
  provider: "edge",
  openaiModel: "gpt-4o-mini",
  openaiBaseUrl: "https://api.openai.com/v1",
  customModel: "",
  customBaseUrl: "",
};

export function getAiProviderSettings(): AiProviderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveAiProviderSettings(settings: AiProviderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Build fetch params for a chat completion request */
export function buildDirectChatRequest(
  settings: AiProviderSettings,
  messages: { role: string; content: string }[],
  stream = false
): { url: string; headers: Record<string, string>; body: string } | null {
  if (settings.provider === "openai") {
    const apiKey = settings.openaiApiKey;
    const baseUrl = (settings.openaiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = settings.openaiModel || "gpt-4o-mini";
    if (!apiKey) return null;
    return {
      url: `${baseUrl}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream }),
    };
  }
  if (settings.provider === "custom") {
    const apiKey = settings.customApiKey;
    const baseUrl = (settings.customBaseUrl || "").replace(/\/$/, "");
    const model = settings.customModel || "";
    if (!apiKey || !baseUrl) return null;
    return {
      url: `${baseUrl}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream }),
    };
  }
  return null; // edge function mode
}
