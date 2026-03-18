import React, { useCallback } from "react";
import { FileText, FolderOpen, Folder, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Note } from "@/hooks/useNotes";
import { Folder as FolderType } from "@/hooks/useFolders";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SidebarNoteItemProps {
  note: Note;
  isActive: boolean;
  folders: FolderType[];
  onSelect: (id: string, folderId: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (noteId: string, folderId: string | null) => void;
  onDragStart: (e: React.DragEvent, noteId: string) => void;
}

const SidebarNoteItem = React.memo(({
  note, isActive, folders, onSelect, onDelete, onMove, onDragStart,
}: SidebarNoteItemProps) => {
  const handleClick = useCallback(() => {
    onSelect(note.id, note.folder_id);
  }, [note.id, note.folder_id, onSelect]);

  const plainText = note.content?.replace(/<[^>]*>/g, "").slice(0, 60) || "空笔记";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, note.id)}
      onClick={handleClick}
      className={cn(
        "group flex items-start gap-2.5 p-3 rounded-lg cursor-grab transition-all duration-150 active:cursor-grabbing",
        isActive
          ? "bg-accent text-accent-foreground shadow-sm"
          : "hover:bg-muted/60 text-foreground"
      )}
    >
      <div className={cn(
        "w-1 h-8 rounded-full shrink-0 mt-0.5 transition-colors duration-200",
        isActive ? "bg-primary" : "bg-transparent"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {note.title || "无标题笔记"}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
          {plainText}
        </p>
        <p className="text-[11px] text-muted-foreground/50 mt-1">
          {new Date(note.updated_at).toLocaleDateString("zh-CN")}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
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
                  <FileText className="w-3.5 h-3.5 mr-2" />
                  移出目录
                </DropdownMenuItem>
              )}
              {folders.filter(f => f.id !== note.folder_id).map((folder) => (
                <DropdownMenuItem key={folder.id} onClick={(e) => { e.stopPropagation(); onMove(note.id, folder.id); }}>
                  <Folder className="w-3.5 h-3.5 mr-2" />
                  {folder.name}
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
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

SidebarNoteItem.displayName = "SidebarNoteItem";

export default SidebarNoteItem;
