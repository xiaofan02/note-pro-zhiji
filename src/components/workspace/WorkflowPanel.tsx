/**
 * WorkflowPanel — full workflow management UI
 */
import { useState } from "react";
import { Workflow, WorkflowLog } from "@/lib/workflow/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Play, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import WorkflowEditor from "./WorkflowEditor";
import { Folder } from "@/hooks/useFolders";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS: Record<string, string> = {
  on_note_save:   "笔记保存时",
  on_note_create: "新建笔记时",
  on_tag_added:   "添加标签时",
  on_schedule:    "定时执行",
};

const ACTION_LABELS: Record<string, string> = {
  ai_summarize:   "AI 摘要",
  ai_organize:    "AI 整理",
  add_tag:        "添加标签",
  move_to_folder: "移动文件夹",
  webhook:        "Webhook",
  create_note:    "创建笔记",
};

interface WorkflowPanelProps {
  workflows: Workflow[];
  logs: WorkflowLog[];
  folders: Folder[];
  onCreate: (wf: Omit<Workflow, "id" | "created_at" | "updated_at" | "run_count">) => void;
  onUpdate: (wf: Workflow) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearLogs: () => void;
}

export default function WorkflowPanel({
  workflows, logs, folders, onCreate, onUpdate, onDelete, onToggle, onClearLogs,
}: WorkflowPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (wf: Workflow) => { setEditing(wf); setEditorOpen(true); };

  const handleSave = (data: Omit<Workflow, "id" | "created_at" | "updated_at" | "run_count">) => {
    if (editing) {
      onUpdate({ ...editing, ...data });
    } else {
      onCreate(data);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">工作流</span>
          {workflows.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{workflows.length}</Badge>
          )}
        </div>
        <Button size="sm" onClick={openCreate} className="h-7 text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> 新建
        </Button>
      </div>

      <Tabs defaultValue="workflows" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 h-7 shrink-0">
          <TabsTrigger value="workflows" className="text-xs flex-1">工作流</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs flex-1">
            执行日志
            {logs.filter(l => l.status === "error").length > 0 && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Workflows list */}
        <TabsContent value="workflows" className="flex-1 overflow-y-auto px-4 pb-4 mt-2 space-y-2">
          {workflows.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">还没有工作流</p>
              <p className="text-xs text-muted-foreground/60 mt-1">点击「新建」创建第一个自动化规则</p>
            </div>
          ) : (
            workflows.map((wf) => (
              <div key={wf.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  wf.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"
                )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{wf.name}</span>
                      {wf.last_run_status === "success" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      )}
                      {wf.last_run_status === "error" && (
                        <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                    </div>
                    {wf.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{wf.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {TRIGGER_LABELS[wf.trigger.type] || wf.trigger.type}
                      </Badge>
                      {wf.actions.map((a, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {ACTION_LABELS[a.type] || a.type}
                        </Badge>
                      ))}
                    </div>
                    {wf.run_count > 0 && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                        <Play className="w-2.5 h-2.5" />
                        已执行 {wf.run_count} 次
                        {wf.last_run_at && (
                          <span>· 最近：{new Date(wf.last_run_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch checked={wf.enabled} onCheckedChange={() => onToggle(wf.id)} className="scale-75" />
                    <button onClick={() => openEdit(wf)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除工作流</AlertDialogTitle>
                          <AlertDialogDescription>确定要删除「{wf.name}」吗？此操作不可撤销。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(wf.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto px-4 pb-4 mt-2">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">暂无执行记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={onClearLogs} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  清空日志
                </button>
              </div>
              {logs.map((log) => (
                <div key={log.id}
                  className={cn(
                    "p-2.5 rounded-lg border text-xs",
                    log.status === "success" ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"
                  )}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {log.status === "success"
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      }
                      <span className="font-medium truncate">{log.workflow_name}</span>
                    </div>
                    <span className="text-muted-foreground/60 shrink-0">
                      {new Date(log.triggered_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {log.note_title && (
                    <p className="text-muted-foreground mt-1 truncate">笔记：{log.note_title}</p>
                  )}
                  <div className="mt-1 space-y-0.5">
                    {log.actions_run.map((a, i) => (
                      <p key={i} className="text-muted-foreground/70 truncate">· {a}</p>
                    ))}
                  </div>
                  {log.error && (
                    <p className="text-destructive mt-1 truncate">错误：{log.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WorkflowEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        initial={editing}
        folders={folders}
      />
    </div>
  );
}
