import React, { useCallback } from "react";
import { FileText, FolderOpen, Folder, Trash2, Pin, PinOff, Star } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Note } from "@/hooks/useNotes";
import { Folder as FolderType } from "@/hooks/useFolders";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface SidebarNoteItemProps {
  note: Note;
  isActive: boolean;
  folders: FolderType[];
  onSelect: (id: string, folderId: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (noteId: string, folderId: string | null) => void;
  onDragStart: (e: React.DragEvent, noteId: string) => void;
  onTogglePin?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  searchQuery?: string;
  batchMode?: boolean;
  isSelected?: boolean;
  onBatchToggle?: (id: string) => void;
}

const SidebarNoteItem = React.memo(({
  note, isActive, folders, onSelect, onDelete, onMove, onDragStart, onTogglePin, onToggleFavorite,
  searchQuery = "", batchMode = false, isSelected = false, onBatchToggle,
}: SidebarNoteItemProps) => {
  const handleClick = useCallback(() => {
    if (batchMode && onBatchToggle) { onBatchToggle(note.id); return; }
    onSelect(note.id, note.folder_id);
  }, [note.id, note.folder_id, onSelect, batchMode, onBatchToggle]);

  const plainText = note.content?.replace(/<[^>]*>/g, "").slice(0, 120) || "空笔记";
  const wordCount = note.content ? note.content.replace(/<[^>]*>/g, "").replace(/\s+/g, "").length : 0;
  const readMins = Math.max(1, Math.ceil(wordCount / 300));

  // Highlight matching text
  const highlight = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  // For content preview: find the match context
  const getContentPreview = () => {
    if (!searchQuery.trim()) return plainText.slice(0, 60);
    const idx = plainText.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return plainText.slice(0, 60);
    const start = Math.max(0, idx - 20);
    const snippet = (start > 0 ? "…" : "") + plainText.slice(start, start + 80);
    return snippet;
  };

  return (
    <div
      draggable={!batchMode}
      onDragStart={(e) => !batchMode && onDragStart(e, note.id)}
      onClick={handleClick}
      className={cn(
        "group flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-all duration-150",
        isActive && !batchMode ? "bg-accent text-accent-foreground shadow-sm" : "hover:bg-muted/60 text-foreground",
        batchMode && isSelected && "bg-primary/10 ring-1 ring-primary/30",
      )}
    >
      {batchMode && (
        <div className={cn("w-4 h-4 rounded border-2 shrink-0 mt-1 transition-colors", isSelected ? "bg-primary border-primary" : "border-muted-foreground/40")} />
      )}
      <div className={cn("w-1 h-8 rounded-full shrink-0 mt-0.5 transition-colors duration-200", !batchMode && isActive ? "bg-primary" : "bg-transparent")} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {note.is_pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
          {note.is_favorited && <Star className="w-3 h-3 text-yellow-500 shrink-0 fill-yellow-500" />}
          <p className="text-sm font-medium truncate">
            {searchQuery ? highlight(note.title || "无标题笔记", searchQuery) : (note.title || "无标题笔记")}
          </p>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
          {searchQuery ? highlight(getContentPreview(), searchQuery) : plainText.slice(0, 60)}
        </p>
        <p className="text-[11px] text-muted-foreground/50 mt-1 flex items-center gap-1.5">
          <span>{new Date(note.updated_at).toLocaleDateString("zh-CN")}</span>
          {wordCount > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span>{wordCount} 字</span>
              <span className="opacity-40">·</span>
              <span>约 {readMins} 分钟</span>
            </>
          )}
        </p>
      </div>
      {!batchMode && (
      <div className="flex items-center gap-0.5 shrink-0">
        {onToggleFavorite && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id); }}
                className={cn("opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all", note.is_favorited ? "opacity-100 text-yellow-500" : "text-muted-foreground")}>
                <Star className={cn("w-3.5 h-3.5", note.is_favorited && "fill-yellow-500")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{note.is_favorited ? "取消收藏" : "收藏"}</TooltipContent>
          </Tooltip>
        )}
        {onTogglePin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-all"
              >
                {note.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{note.is_pinned ? "取消置顶" : "置顶"}</TooltipContent>
          </Tooltip>
        )}
        {folders.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                title="移动到目录"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {note.folder_id && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(note.id, null); }}>
                  <FileText className="w-3.5 h-3.5 mr-2" /> 移出目录
                </DropdownMenuItem>
              )}
              {folders.filter(f => f.id !== note.folder_id).map((folder) => (
                <DropdownMenuItem key={folder.id} onClick={(e) => { e.stopPropagation(); onMove(note.id, folder.id); }}>
                  <Folder className="w-3.5 h-3.5 mr-2" /> {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>移至回收站</AlertDialogTitle>
              <AlertDialogDescription>
                确定要将「{note.title || "无标题笔记"}」移至回收站吗？可在30天内恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(note.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                移至回收站
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      )}
    </div>
  );
});

SidebarNoteItem.displayName = "SidebarNoteItem";

export default SidebarNoteItem;
