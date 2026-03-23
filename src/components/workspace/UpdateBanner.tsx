import { RefreshCw, X } from "lucide-react";

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss: () => void;
  updating?: boolean;
}

/** Top banner shown when a new PWA version is available */
const UpdateBanner = ({ onUpdate, onDismiss, updating }: UpdateBannerProps) => (
  <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-2.5 bg-primary text-primary-foreground text-sm shadow-lg">
    <div className="flex items-center gap-2">
      <RefreshCw className={`w-4 h-4 shrink-0 ${updating ? "animate-spin" : ""}`} />
      <span>发现新版本，更新后体验更好的功能</span>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onUpdate}
        disabled={updating}
        className="px-3 py-1 rounded-md bg-primary-foreground text-primary text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {updating ? "更新中..." : "立即更新"}
      </button>
      <button onClick={onDismiss} className="p-1 rounded hover:bg-primary-foreground/20 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default UpdateBanner;
