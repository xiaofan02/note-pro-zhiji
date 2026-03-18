import React from "react";
import {
  FolderOpen, ChevronRight, ChevronDown, Plus, MoreHorizontal, FolderPlus, Edit2, Trash2,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Note } from "@/hooks/useNotes";
import { Folder as FolderType } from "@/hooks/useFolders";
import SidebarNoteItem from "./SidebarNoteItem";

interface SidebarFolderTreeProps {
  folder: FolderType;
  depth?: number;
  notesByFolder: Record<string, Note[]>;
  getChildFolders: (parentId: string | null) => FolderType[];
  expandedFolders: Set<string>;
  activeFolderId: string | null;
  activeNoteId: string | null;
  dragOverFolderId: string | null;
  renamingFolderId: string | null;
  renameValue: string;
  folders: FolderType[];
  onToggleFolder: (id: string) => void;
  onSetActiveFolder: (id: string | null) => void;
  onRenameValueChange: (val: string) => void;
  onRenameSubmit: (id: string) => void;
  onStartRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onCreateNoteInFolder: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectNote: (id: string, folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onDragStart: (e: React.DragEvent, noteId: string) => void;
  onFolderDragEnter: (e: React.DragEvent, folderId: string) => void;
  onFolderDragLeave: (e: React.DragEvent, folderId: string) => void;
  onDropOnFolder: (e: React.DragEvent, folderId: string) => void;
  onTogglePin?: (id: string) => void;
}

const SidebarFolderTree = React.memo(({
  folder, depth = 0, notesByFolder, getChildFolders, expandedFolders,
  activeFolderId, activeNoteId, dragOverFolderId, renamingFolderId, renameValue, folders,
  onToggleFolder, onSetActiveFolder, onRenameValueChange, onRenameSubmit,
  onStartRename, onCancelRename, onCreateNoteInFolder, onCreateSubfolder,
  onDeleteFolder, onSelectNote, onDeleteNote, onMoveNote, onDragStart,
  onFolderDragEnter, onFolderDragLeave, onDropOnFolder, onTogglePin,
}: SidebarFolderTreeProps) => {
  const folderNotes = notesByFolder[folder.id] || [];
  const childFolders = getChildFolders(folder.id);
  const isExpanded = expandedFolders.has(folder.id);
  const totalNotes = folderNotes.length;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => onFolderDragEnter(e, folder.id)}
      onDragLeave={(e) => onFolderDragLeave(e, folder.id)}
      onDrop={(e) => onDropOnFolder(e, folder.id)}
      className={cn(
        "mb-0.5 rounded-lg transition-all duration-200",
        dragOverFolderId === folder.id && "bg-primary/10 ring-2 ring-primary/30"
      )}
    >
      {/* Folder header */}
      <div
        onClick={() => onSetActiveFolder(activeFolderId === folder.id ? null : folder.id)}
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150",
          dragOverFolderId !== folder.id && "hover:bg-muted/60",
          activeFolderId === folder.id && dragOverFolderId !== folder.id && "bg-accent"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onSetActiveFolder(folder.id); onToggleFolder(folder.id); }}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          {isExpanded
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200" />
          }
          <FolderOpen className={cn("w-4 h-4 shrink-0 transition-colors", isExpanded ? "text-primary" : "text-muted-foreground")} />
          {renamingFolderId === folder.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameValueChange(e.target.value)}
              onBlur={() => onRenameSubmit(folder.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameSubmit(folder.id);
                if (e.key === "Escape") onCancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-sm bg-transparent border-b border-primary outline-none text-foreground"
            />
          ) : (
            <span className="text-sm font-medium text-foreground truncate">{folder.name}</span>
          )}
          <span className="text-[11px] text-muted-foreground/50 ml-1">{totalNotes}</span>
        </button>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onCreateNoteInFolder(folder.id); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">在此目录新建笔记</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)}>
                <FolderPlus className="w-3.5 h-3.5 mr-2" /> 新建子目录
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStartRename(folder.id, folder.name)}>
                <Edit2 className="w-3.5 h-3.5 mr-2" /> 重命名
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除目录
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除目录</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除目录「{folder.name}」吗？目录内的笔记将移至未分类。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteFolder(folder.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Folder contents with animation */}
      {isExpanded && (
        <div className="ml-3 mt-0.5 space-y-0.5 min-h-[32px] animate-in fade-in-50 slide-in-from-top-1 duration-200">
          {childFolders.map((child) => (
            <SidebarFolderTree
              key={child.id}
              folder={child}
              depth={depth + 1}
              notesByFolder={notesByFolder}
              getChildFolders={getChildFolders}
              expandedFolders={expandedFolders}
              activeFolderId={activeFolderId}
              activeNoteId={activeNoteId}
              dragOverFolderId={dragOverFolderId}
              renamingFolderId={renamingFolderId}
              renameValue={renameValue}
              folders={folders}
              onToggleFolder={onToggleFolder}
              onSetActiveFolder={onSetActiveFolder}
              onRenameValueChange={onRenameValueChange}
              onRenameSubmit={onRenameSubmit}
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              onCreateNoteInFolder={onCreateNoteInFolder}
              onCreateSubfolder={onCreateSubfolder}
              onDeleteFolder={onDeleteFolder}
              onSelectNote={onSelectNote}
              onDeleteNote={onDeleteNote}
              onMoveNote={onMoveNote}
              onDragStart={onDragStart}
              onFolderDragEnter={onFolderDragEnter}
              onFolderDragLeave={onFolderDragLeave}
              onDropOnFolder={onDropOnFolder}
              onTogglePin={onTogglePin}
            />
          ))}
          {folderNotes.map((note) => (
            <SidebarNoteItem
              key={note.id}
              note={note}
              isActive={activeNoteId === note.id}
              folders={folders}
              onSelect={onSelectNote}
              onDelete={onDeleteNote}
              onMove={onMoveNote}
              onDragStart={onDragStart}
              onTogglePin={onTogglePin}
            />
          ))}
          {folderNotes.length === 0 && childFolders.length === 0 && (
            <p className="text-xs text-muted-foreground/50 py-2 pl-4">目录为空</p>
          )}
        </div>
      )}
    </div>
  );
});

SidebarFolderTree.displayName = "SidebarFolderTree";

export default SidebarFolderTree;
