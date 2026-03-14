import { useState, useEffect } from "react";
import { Settings, HardDrive, Cloud, FolderOpen, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  getStorageSettings,
  setStorageSettings,
  StorageSettings,
  localNotesStorage,
  isTauri,
} from "@/lib/localNotesStorage";

const PAGE_FONT_MIN = 12;
const PAGE_FONT_MAX = 24;

const PAGE_FONT_PRESETS = [
  { label: "小", value: PAGE_FONT_MIN },
  { label: "默认", value: 15 },
  { label: "大", value: 18 },
  { label: "特大", value: PAGE_FONT_MAX },
];

interface SettingsDialogProps {
  pageFontSize: number;
  onPageFontSizeChange: (size: number) => void;
  storageSettings: StorageSettings;
  onStorageSettingsChange: (settings: StorageSettings) => void;
}

const SettingsDialog = ({
  pageFontSize,
  onPageFontSizeChange,
  storageSettings,
  onStorageSettingsChange,
}: SettingsDialogProps) => {
  const isDesktop = isTauri();

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">设置</DialogTitle>
        </DialogHeader>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
