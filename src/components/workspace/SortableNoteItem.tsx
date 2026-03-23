import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import SidebarNoteItem from "./SidebarNoteItem";
import { Note } from "@/hooks/useNotes";
import { Folder } from "@/hooks/useFolders";
import { cn } from "@/lib/utils";

interface SortableNoteItemProps {
  note: Note;
  isActive: boolean;
  folders: Folder[];
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
  sortMode?: boolean;
}

const SortableNoteItem = ({
  note, sortMode = false, ...props
}: SortableNoteItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: !sortMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group/sortable", isDragging && "shadow-lg rounded-lg")}>
      {sortMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover/sortable:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
      )}
      <div className={cn(sortMode && "pl-4")}>
        <SidebarNoteItem note={note} {...props} />
      </div>
    </div>
  );
};

export default SortableNoteItem;
