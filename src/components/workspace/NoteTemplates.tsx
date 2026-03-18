import React from "react";
import {
  BookOpen, Calendar, Lightbulb, ListChecks, FileText, Target, Users, Code,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export interface NoteTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  title: string;
  content: string;
}

const templates: NoteTemplate[] = [
  {
    id: "meeting",
    name: "会议纪要",
    icon: <Users className="w-4 h-4" />,
    title: "会议纪要",
    content: `<h2>会议信息</h2>
<ul>
<li><strong>日期：</strong>${new Date().toLocaleDateString("zh-CN")}</li>
<li><strong>参会人员：</strong></li>
<li><strong>会议主题：</strong></li>
</ul>
<h2>议题讨论</h2>
<ol>
<li></li>
</ol>
<h2>决议事项</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false">待办事项 1</li>
<li data-type="taskItem" data-checked="false">待办事项 2</li>
</ul>
<h2>下次会议安排</h2>
<p></p>`,
  },
  {
    id: "reading",
    name: "读书笔记",
    icon: <BookOpen className="w-4 h-4" />,
    title: "读书笔记",
    content: `<h2>书籍信息</h2>
<ul>
<li><strong>书名：</strong></li>
<li><strong>作者：</strong></li>
<li><strong>阅读日期：</strong>${new Date().toLocaleDateString("zh-CN")}</li>
</ul>
<h2>核心观点</h2>
<p></p>
<h2>精彩摘录</h2>
<blockquote><p></p></blockquote>
<h2>个人感悟</h2>
<p></p>
<h2>行动计划</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>`,
  },
  {
    id: "journal",
    name: "每日日记",
    icon: <Calendar className="w-4 h-4" />,
    title: `${new Date().toLocaleDateString("zh-CN")} 日记`,
    content: `<h2>今日心情</h2>
<p></p>
<h2>今日记录</h2>
<p></p>
<h2>感恩清单</h2>
<ol>
<li></li>
<li></li>
<li></li>
</ol>
<h2>明日计划</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>`,
  },
  {
    id: "brainstorm",
    name: "头脑风暴",
    icon: <Lightbulb className="w-4 h-4" />,
    title: "头脑风暴",
    content: `<h2>主题</h2>
<p></p>
<h2>想法收集</h2>
<ul>
<li>💡 </li>
<li>💡 </li>
<li>💡 </li>
</ul>
<h2>分析与筛选</h2>
<p></p>
<h2>下一步行动</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>`,
  },
  {
    id: "todo",
    name: "待办清单",
    icon: <ListChecks className="w-4 h-4" />,
    title: "待办清单",
    content: `<h2>🔴 紧急重要</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>
<h2>🟡 重要不紧急</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>
<h2>🔵 紧急不重要</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>
<h2>⚪ 不紧急不重要</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>`,
  },
  {
    id: "project",
    name: "项目计划",
    icon: <Target className="w-4 h-4" />,
    title: "项目计划",
    content: `<h2>项目概述</h2>
<ul>
<li><strong>项目名称：</strong></li>
<li><strong>开始日期：</strong>${new Date().toLocaleDateString("zh-CN")}</li>
<li><strong>目标：</strong></li>
</ul>
<h2>里程碑</h2>
<ol>
<li>阶段一：</li>
<li>阶段二：</li>
<li>阶段三：</li>
</ol>
<h2>任务分解</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"></li>
</ul>
<h2>风险与注意事项</h2>
<p></p>`,
  },
  {
    id: "code-snippet",
    name: "代码片段",
    icon: <Code className="w-4 h-4" />,
    title: "代码片段",
    content: `<h2>功能描述</h2>
<p></p>
<h2>代码</h2>
<pre><code class="language-javascript">// 在这里粘贴代码</code></pre>
<h2>使用说明</h2>
<p></p>
<h2>备注</h2>
<p></p>`,
  },
];

interface NoteTemplatesProps {
  onCreateFromTemplate: (title: string, content: string) => void;
}

const NoteTemplates = ({ onCreateFromTemplate }: NoteTemplatesProps) => {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className="px-2.5 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
              <FileText className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">从模板创建</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs">选择笔记模板</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((tpl) => (
          <DropdownMenuItem
            key={tpl.id}
            onClick={() => onCreateFromTemplate(tpl.title, tpl.content)}
            className="gap-2 cursor-pointer"
          >
            {tpl.icon}
            <span>{tpl.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NoteTemplates;
