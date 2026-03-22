import React from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Note } from "@/hooks/useNotes";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TrashBinProps {
  trashedNotes: Note[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
}

const TrashBin = ({ trashedNotes, onRestore, onPermanentDelete, onEmptyTrash }: TrashBinProps) => {
  const getDaysRemaining = (deletedAt: string | null | undefined) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  };

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
              <Trash2 className="w-4 h-4" />
              {trashedNotes.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                  {trashedNotes.length > 9 ? "9+" : trashedNotes.length}
                </span>
              )}
            </button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">回收站</TooltipContent>
      </Tooltip>

      <SheetContent side="left" className="w-[360px] sm:w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            回收站
            <span className="text-xs text-muted-foreground font-normal">
              ({trashedNotes.length} 条笔记)
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {trashedNotes.length === 0 && (
            <div className="text-center py-16">
              <Trash2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">回收站为空</p>
            </div>
          )}

          {trashedNotes.map((note) => {
            const daysLeft = getDaysRemaining(note.deleted_at);
            return (
              <div
                key={note.id}
                className="p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {note.title || "无标题笔记"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {note.content?.replace(/<[^>]*>/g, "").slice(0, 60) || "空笔记"}
                    </p>
                    <p className={cn(
                      "text-[11px] mt-1 flex items-center gap-1",
                      daysLeft <= 7 ? "text-destructive" : "text-muted-foreground/60"
                    )}>
                      {daysLeft <= 7 && <AlertTriangle className="w-3 h-3" />}
                      {daysLeft > 0 ? `${daysLeft} 天后自动删除` : "即将删除"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onRestore(note.id)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">恢复</TooltipContent>
                    </Tooltip>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">永久删除</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>永久删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要永久删除「{note.title || "无标题笔记"}」吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onPermanentDelete(note.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            永久删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {trashedNotes.length > 0 && (
          <div className="border-t border-border pt-3 mt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
                  清空回收站
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清空回收站</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要永久删除回收站中的所有 {trashedNotes.length} 条笔记吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onEmptyTrash}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    清空
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TrashBin;
