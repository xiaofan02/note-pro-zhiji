// AI Provider configuration stored in localStorage

export type AiProviderType = "lovable" | "openai" | "custom";

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
  provider: "lovable",
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
