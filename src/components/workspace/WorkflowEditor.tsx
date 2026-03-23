/**
 * WorkflowEditor — dialog for creating/editing a workflow
 */
import { useState, useEffect } from "react";
import { Workflow, TriggerConfig, WorkflowCondition, ActionConfig, TriggerType, ActionType } from "@/lib/workflow/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { Folder } from "@/hooks/useFolders";

interface WorkflowEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (wf: Omit<Workflow, "id" | "created_at" | "updated_at" | "run_count">) => void;
  initial?: Workflow | null;
  folders: Folder[];
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  on_note_save:   "笔记保存时",
  on_note_create: "新建笔记时",
  on_tag_added:   "添加标签时",
  on_schedule:    "定时执行",
};

const ACTION_LABELS: Record<ActionType, string> = {
  ai_summarize:   "AI 自动摘要",
  ai_organize:    "AI 整理结构",
  add_tag:        "自动添加标签",
  move_to_folder: "移动到文件夹",
  webhook:        "Webhook 推送",
  create_note:    "自动创建笔记",
};

const WEEK_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const emptyTrigger = (): TriggerConfig => ({ type: "on_note_save" });
const emptyCondition = (): WorkflowCondition => ({ field: "title", op: "contains", value: "" });
const emptyAction = (): ActionConfig => ({ type: "ai_summarize" });

export default function WorkflowEditor({ open, onClose, onSave, initial, folders }: WorkflowEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [trigger, setTrigger] = useState<TriggerConfig>(emptyTrigger());
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [actions, setActions] = useState<ActionConfig[]>([emptyAction()]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description || "");
      setEnabled(initial.enabled);
      setTrigger(initial.trigger);
      setConditions(initial.conditions || []);
      setActions(initial.actions.length > 0 ? initial.actions : [emptyAction()]);
    } else {
      setName("");
      setDescription("");
      setEnabled(true);
      setTrigger(emptyTrigger());
      setConditions([]);
      setActions([emptyAction()]);
    }
  }, [initial, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description, enabled, trigger, conditions, actions });
    onClose();
  };

  const updateTrigger = (patch: Partial<TriggerConfig>) =>
    setTrigger((t) => ({ ...t, ...patch }));

  const updateCondition = (i: number, patch: Partial<WorkflowCondition>) =>
    setConditions((cs) => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  const updateAction = (i: number, patch: Partial<ActionConfig>) =>
    setActions((as) => as.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑工作流" : "新建工作流"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">工作流名称 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：保存后自动摘要" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">描述（可选）</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简短描述" className="text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">{enabled ? "已启用" : "已禁用"}</span>
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">触发器</Label>
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <Select value={trigger.type} onValueChange={(v) => updateTrigger({ type: v as TriggerType })}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-sm">{TRIGGER_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {trigger.type === "on_tag_added" && (
                <Input
                  value={trigger.tagName || ""}
                  onChange={(e) => updateTrigger({ tagName: e.target.value })}
                  placeholder="标签名称（留空=任意标签）"
                  className="text-sm h-8"
                />
              )}

              {trigger.type === "on_schedule" && (
                <div className="grid grid-cols-3 gap-2">
                  <Select value={trigger.schedule || "daily"} onValueChange={(v) => updateTrigger({ schedule: v as "daily" | "weekly" })}>
                    <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily" className="text-sm">每天</SelectItem>
                      <SelectItem value="weekly" className="text-sm">每周</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={trigger.scheduleTime || "08:00"}
                    onChange={(e) => updateTrigger({ scheduleTime: e.target.value })}
                    className="text-sm h-8"
                  />
                  {trigger.schedule === "weekly" && (
                    <Select
                      value={String(trigger.scheduleDay ?? 1)}
                      onValueChange={(v) => updateTrigger({ scheduleDay: Number(v) })}
                    >
                      <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEEK_DAYS.map((d, i) => (
                          <SelectItem key={i} value={String(i)} className="text-sm">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">条件（可选，全部满足才执行）</Label>
              <button onClick={() => setConditions((cs) => [...cs, emptyCondition()])}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> 添加条件
              </button>
            </div>
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/10">
                <Select value={cond.field} onValueChange={(v) => updateCondition(i, { field: v as any })}>
                  <SelectTrigger className="text-xs h-7 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title" className="text-xs">标题</SelectItem>
                    <SelectItem value="content" className="text-xs">内容</SelectItem>
                    <SelectItem value="tag" className="text-xs">标签</SelectItem>
                    <SelectItem value="folder_id" className="text-xs">文件夹</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={cond.op} onValueChange={(v) => updateCondition(i, { op: v as any })}>
                  <SelectTrigger className="text-xs h-7 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains" className="text-xs">包含</SelectItem>
                    <SelectItem value="not_contains" className="text-xs">不包含</SelectItem>
                    <SelectItem value="equals" className="text-xs">等于</SelectItem>
                    <SelectItem value="starts_with" className="text-xs">开头是</SelectItem>
                    <SelectItem value="is_empty" className="text-xs">为空</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })}
                  placeholder="值" className="text-xs h-7 flex-1" />
                <button onClick={() => setConditions((cs) => cs.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">动作（按顺序执行）</Label>
              <button onClick={() => setActions((as) => [...as, emptyAction()])}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> 添加动作
              </button>
            </div>
            {actions.map((action, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <Select value={action.type} onValueChange={(v) => updateAction(i, { type: v as ActionType })}>
                    <SelectTrigger className="text-sm h-8 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACTION_LABELS) as ActionType[]).map((k) => (
                        <SelectItem key={k} value={k} className="text-sm">{ACTION_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {actions.length > 1 && (
                    <button onClick={() => setActions((as) => as.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Action-specific config */}
                {action.type === "add_tag" && (
                  <Input value={action.tagName || ""} onChange={(e) => updateAction(i, { tagName: e.target.value })}
                    placeholder="标签名称" className="text-sm h-8" />
                )}

                {action.type === "move_to_folder" && (
                  <Select value={action.folderId || "__none__"}
                    onValueChange={(v) => {
                      const folder = folders.find(f => f.id === v);
                      updateAction(i, { folderId: v === "__none__" ? undefined : v, folderName: folder?.name || "未分类" });
                    }}>
                    <SelectTrigger className="text-sm h-8"><SelectValue placeholder="选择文件夹" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-sm">未分类</SelectItem>
                      {folders.map(f => (
                        <SelectItem key={f.id} value={f.id} className="text-sm">{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {action.type === "webhook" && (
                  <div className="space-y-1.5">
                    <Input value={action.webhookUrl || ""} onChange={(e) => updateAction(i, { webhookUrl: e.target.value })}
                      placeholder="https://hooks.example.com/..." className="text-sm h-8" />
                    <Textarea value={action.webhookBody || ""}
                      onChange={(e) => updateAction(i, { webhookBody: e.target.value })}
                      placeholder='留空使用默认 JSON。可用变量：{{title}} {{content}} {{date}} {{url}}'
                      className="text-xs min-h-[60px] resize-none" />
                  </div>
                )}

                {action.type === "create_note" && (
                  <div className="space-y-1.5">
                    <Input value={action.noteTitle || ""} onChange={(e) => updateAction(i, { noteTitle: e.target.value })}
                      placeholder="笔记标题，可用 {{date}} {{week}}" className="text-sm h-8" />
                    <Textarea value={action.noteContent || ""}
                      onChange={(e) => updateAction(i, { noteContent: e.target.value })}
                      placeholder="笔记内容（HTML），可用 {{title}} {{content}} {{date}}"
                      className="text-xs min-h-[60px] resize-none" />
                    <Select value={action.noteFolderId || "__none__"}
                      onValueChange={(v) => updateAction(i, { noteFolderId: v === "__none__" ? undefined : v })}>
                      <SelectTrigger className="text-sm h-8"><SelectValue placeholder="保存到文件夹（可选）" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-sm">未分类</SelectItem>
                        {folders.map(f => (
                          <SelectItem key={f.id} value={f.id} className="text-sm">{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(action.type === "ai_summarize" || action.type === "ai_organize") && (
                  <Textarea value={action.aiPrompt || ""}
                    onChange={(e) => updateAction(i, { aiPrompt: e.target.value })}
                    placeholder="自定义 AI 提示词（留空使用默认）"
                    className="text-xs min-h-[60px] resize-none" />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">取消</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="text-sm">保存工作流</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
