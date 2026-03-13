import { Tag } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
}

const TagFilter = ({ tags, selectedTagId, onSelect }: TagFilterProps) => {
  if (tags.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-border flex items-center gap-1.5 overflow-x-auto">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-colors",
          selectedTagId === null
            ? "bg-foreground text-primary-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        全部
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(selectedTagId === tag.id ? null : tag.id)}
          className={cn(
            "px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-colors",
            selectedTagId === tag.id
              ? "text-white"
              : "text-muted-foreground hover:text-foreground bg-muted"
          )}
          style={selectedTagId === tag.id ? { backgroundColor: tag.color } : undefined}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
};

export default TagFilter;
