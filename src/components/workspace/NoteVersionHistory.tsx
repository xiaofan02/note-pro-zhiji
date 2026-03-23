import { useState } from "react";
import { History, X, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { noteVersions, NoteVersion } from "@/lib/noteVersions";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface NoteVersionHistoryProps {
  noteId: string;
  onRestore: (title: string, content: string) => void;
}

const NoteVersionHistory = ({ noteId, onRestore }: NoteVersionHistoryProps) => {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<NoteVersion | null>(null);

  const versions = noteVersions.getAll(noteId);

  const handleRestore = (v: NoteVersion) => {
    onRestore(v.title, v.content);
    setOpen(false);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
              <History className="w-3 h-3" /> 历史
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">版本历史</TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">版本历史</DialogTitle>
        </DialogHeader>
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <History className="w-8 h-8 opacity-30" />
            <p className="text-sm">暂无历史版本</p>
            <p className="text-xs opacity-60">每次保存后超过1分钟会自动记录版本</p>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Version list */}
            <ScrollArea className="w-48 shrink-0 border-r border-border pr-3">
              <div className="space-y-1 py-1">
                {versions.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setPreview(v)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      preview?.id === v.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium truncate">{v.title || "无标题"}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(v.savedAt).toLocaleString("zh-CN", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {i === 0 && <span className="text-[10px] text-primary font-medium">最新</span>}
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Preview */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {preview ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{preview.title || "无标题"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(preview.savedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(preview)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> 恢复此版本
                    </button>
                  </div>
                  <ScrollArea className="flex-1 border border-border rounded-lg p-3">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-xs"
                      dangerouslySetInnerHTML={{ __html: preview.content }}
                    />
                  </ScrollArea>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  选择左侧版本预览内容
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NoteVersionHistory;
