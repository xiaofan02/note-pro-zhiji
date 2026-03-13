import { Settings, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
}

const SettingsDialog = ({ pageFontSize, onPageFontSizeChange }: SettingsDialogProps) => {
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
          {/* Page font size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">页面字体大小</label>
              <span className="text-xs text-muted-foreground">{pageFontSize}px</span>
            </div>
            <Slider
              value={[pageFontSize]}
              onValueChange={(val) => onPageFontSizeChange(val[0])}
              min={12}
              max={24}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>12px</span>
              <span>24px</span>
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
