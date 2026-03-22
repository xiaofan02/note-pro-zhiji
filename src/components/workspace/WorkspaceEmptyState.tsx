import { FileText, Plus } from "lucide-react";

interface WorkspaceEmptyStateProps {
  onCreateNote: () => void;
}

const WorkspaceEmptyState = ({ onCreateNote }: WorkspaceEmptyStateProps) => (
  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-6 animate-in fade-in-50 duration-500">
    <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center shadow-sm">
      <FileText className="w-8 h-8 text-primary/60" />
    </div>
    <div className="text-center space-y-2">
      <p className="font-semibold text-foreground text-lg">选择或创建一条笔记</p>
      <p className="text-sm max-w-xs">从左侧列表选择笔记，或点击下方按钮开始记录</p>
    </div>
    <button
      onClick={onCreateNote}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
    >
      <Plus className="w-4 h-4" />
      新建笔记
    </button>
  </div>
);

export default WorkspaceEmptyState;
