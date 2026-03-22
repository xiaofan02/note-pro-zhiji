import { useState } from "react";
import { Tag as TagIcon, Plus, X } from "lucide-react";
import { Tag } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface TagManagerProps {
  tags: Tag[];
  noteTags: Tag[];
  onCreateTag: (name: string) => Promise<any>;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
}

const TagManager = ({ tags, noteTags, onCreateTag, onAddTag, onRemoveTag }: TagManagerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const availableTags = tags.filter((t) => !noteTags.find((nt) => nt.id === t.id));

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    const tag = await onCreateTag(newTagName.trim());
    if (tag) {
      onAddTag(tag.id);
      setNewTagName("");
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {noteTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button onClick={() => onRemoveTag(tag.id)} className="hover:opacity-70">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-muted-foreground border border-dashed border-border hover:border-foreground/30 transition-colors"
        >
          <TagIcon className="w-3 h-3" />
          标签
        </button>
        {showPicker && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 p-2 space-y-1">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { onAddTag(tag.id); setShowPicker(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            ))}
            <div className="flex items-center gap-1 pt-1 border-t border-border mt-1">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="新标签..."
                className="flex-1 text-xs px-2 py-1 bg-muted rounded border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              />
              <button onClick={handleCreate} className="p-1 text-muted-foreground hover:text-foreground">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;
