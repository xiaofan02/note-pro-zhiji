import { Sparkles, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const UpgradePrompt = ({ open, onOpenChange, feature }: UpgradePromptProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-primary" />
            升级到 Pro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {feature ? `「${feature}」是 Pro 专属功能。` : "此功能仅限 Pro 用户使用。"}
            升级后解锁全部高级能力：
          </p>
          <ul className="space-y-2 text-sm">
            {[
              "AI 智能整理 & 摘要",
              "AI 对话助手",
              "语音速记",
              "无限笔记数量",
              "多设备云端同步",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            了解升级方案
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            支付功能即将上线，敬请期待
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
