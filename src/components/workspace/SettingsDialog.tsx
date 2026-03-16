import { useState, useEffect } from "react";
import { Settings, HardDrive, Cloud, FolderOpen, Info, Bot, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getStorageSettings,
  setStorageSettings,
  StorageSettings,
  localNotesStorage,
  isTauri,
} from "@/lib/localNotesStorage";
import {
  AiProviderSettings,
  AiProviderType,
  getAiProviderSettings,
  saveAiProviderSettings,
} from "@/lib/aiProviderSettings";
import DataMigration from "./DataMigration";

const PAGE_FONT_MIN = 12;
const PAGE_FONT_MAX = 24;

const PAGE_FONT_PRESETS = [
  { label: "小", value: PAGE_FONT_MIN },
  { label: "默认", value: 15 },
  { label: "大", value: 18 },
  { label: "特大", value: PAGE_FONT_MAX },
];

const AI_PROVIDERS: { id: AiProviderType; label: string; desc: string }[] = [
  { id: "lovable", label: "内置 AI", desc: "开箱即用，无需配置" },
  { id: "openai", label: "OpenAI", desc: "使用自己的 OpenAI Key" },
  { id: "custom", label: "自定义", desc: "国内模型或其他兼容接口" },
];

interface SettingsDialogProps {
  pageFontSize: number;
  onPageFontSizeChange: (size: number) => void;
  storageSettings: StorageSettings;
  onStorageSettingsChange: (settings: StorageSettings) => void;
  onMigrationComplete?: () => void;
}

const SettingsDialog = ({
  pageFontSize,
  onPageFontSizeChange,
  storageSettings,
  onStorageSettingsChange,
  onMigrationComplete,
}: SettingsDialogProps) => {
  const isDesktop = isTauri();
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(getAiProviderSettings);
  const [showKeys, setShowKeys] = useState(false);

  const handleModeChange = (mode: "cloud" | "local") => {
    const next = { ...storageSettings, mode };
    onStorageSettingsChange(next);
  };

  const handlePickDirectory = async () => {
    if (isDesktop) {
      const dir = await localNotesStorage.pickDirectory();
      if (dir) {
        const next = { ...storageSettings, localPath: dir };
        onStorageSettingsChange(next);
      }
    }
  };

  const updateAiSettings = (partial: Partial<AiProviderSettings>) => {
    const next = { ...aiSettings, ...partial };
    setAiSettings(next);
    saveAiProviderSettings(next);
  };

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">设置</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-base">设置</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
        <div className="space-y-6 py-2">
          {/* Storage mode */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">笔记存储方式</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange("cloud")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  storageSettings.mode === "cloud"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30 bg-background"
                }`}
              >
                <Cloud className={`w-6 h-6 ${storageSettings.mode === "cloud" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${storageSettings.mode === "cloud" ? "text-primary" : "text-foreground"}`}>
                  云端同步
                </span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  数据保存在云端，多设备同步
                </span>
              </button>
              <button
                onClick={() => handleModeChange("local")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  storageSettings.mode === "local"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30 bg-background"
                }`}
              >
                <HardDrive className={`w-6 h-6 ${storageSettings.mode === "local" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${storageSettings.mode === "local" ? "text-primary" : "text-foreground"}`}>
                  本地存储
                </span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  {isDesktop ? "保存为本地文件" : "浏览器本地存储"}
                </span>
              </button>
            </div>

            {/* Local path picker (Tauri desktop only) */}
            {storageSettings.mode === "local" && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                {isDesktop ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">保存目录</label>
                      <button
                        onClick={handlePickDirectory}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                      >
                        <FolderOpen className="w-3 h-3" />
                        选择目录
                      </button>
                    </div>
                    {storageSettings.localPath ? (
                      <p className="text-xs text-muted-foreground font-mono break-all bg-background px-2 py-1.5 rounded border border-border">
                        {storageSettings.localPath}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">未选择目录，请点击「选择目录」设置保存位置</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs text-foreground font-medium">Web 端本地存储说明</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        当前为 Web 版本，笔记将保存在浏览器本地数据库（IndexedDB）中。
                        数据仅存在于当前浏览器，清除浏览器数据会丢失笔记。
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        如需保存为本地文件并自选目录，请使用桌面安装版（Tauri）。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Provider settings */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Bot className="w-4 h-4" /> AI 模型配置
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => updateAiSettings({ provider: p.id })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    aiSettings.provider === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 bg-background"
                  }`}
                >
                  <span className={`text-xs font-medium ${aiSettings.provider === p.id ? "text-primary" : "text-foreground"}`}>
                    {p.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>

            {/* OpenAI config */}
            {aiSettings.provider === "openai" && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">API Key</label>
                  <div className="relative">
                    <input
                      type={showKeys ? "text" : "password"}
                      value={aiSettings.openaiApiKey || ""}
                      onChange={(e) => updateAiSettings({ openaiApiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full h-8 px-3 pr-8 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">模型名称</label>
                  <input
                    type="text"
                    value={aiSettings.openaiModel || ""}
                    onChange={(e) => updateAiSettings({ openaiModel: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Base URL（可选）</label>
                  <input
                    type="text"
                    value={aiSettings.openaiBaseUrl || ""}
                    onChange={(e) => updateAiSettings({ openaiBaseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Custom provider config */}
            {aiSettings.provider === "custom" && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    支持所有兼容 OpenAI API 格式的模型，包括通义千问、文心一言、DeepSeek、Moonshot 等。
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">API Base URL</label>
                  <input
                    type="text"
                    value={aiSettings.customBaseUrl || ""}
                    onChange={(e) => updateAiSettings({ customBaseUrl: e.target.value })}
                    placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                    className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">API Key</label>
                  <div className="relative">
                    <input
                      type={showKeys ? "text" : "password"}
                      value={aiSettings.customApiKey || ""}
                      onChange={(e) => updateAiSettings({ customApiKey: e.target.value })}
                      placeholder="你的 API Key"
                      className="w-full h-8 px-3 pr-8 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">模型名称</label>
                  <input
                    type="text"
                    value={aiSettings.customModel || ""}
                    onChange={(e) => updateAiSettings({ customModel: e.target.value })}
                    placeholder="qwen-turbo / deepseek-chat / moonshot-v1-8k"
                    className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Page font size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">页面字体大小</label>
              <span className="text-xs text-muted-foreground">{pageFontSize}px</span>
            </div>
            <Slider
              value={[pageFontSize]}
              onValueChange={(val) => onPageFontSizeChange(val[0])}
              min={PAGE_FONT_MIN}
              max={PAGE_FONT_MAX}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{PAGE_FONT_MIN}px</span>
              <span>{PAGE_FONT_MAX}px</span>
            </div>
            <div className="flex gap-1.5">
              {PAGE_FONT_PRESETS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onPageFontSizeChange(s.value)}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                    pageFontSize === s.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* Data migration */}
          <DataMigration
            storageSettings={storageSettings}
            onMigrationComplete={onMigrationComplete || (() => {})}
          />
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
