# OpenClaw 与智记前台活动日志

## 日志位置（Windows）

桌面版在开启「设置 → 前台活动记录」后，会把**前台窗口**的采样写入应用数据目录下的 `activity_log.jsonl`（每行一条 JSON）。

典型路径：

`%APPDATA%\com.smartnote.app\activity_log.jsonl`

配置保存在同目录 `activity_config.json`（是否启用、采样间隔秒数）。

## 每条记录字段

- `ts`：UTC 时间（RFC3339）
- `category`：`cursor` | `browser` | `other`
- `pid`：进程 ID
- `exe`：可执行文件完整路径（若可解析）
- `title`：窗口标题（可能包含文档名、浏览器标签标题等）

## 与 OpenClaw 配合

1. **独立安装 OpenClaw**（Python 环境），按官方文档常驻或开机自启。
2. 在 OpenClaw 中增加一个 **Skill / 定时任务**（例如每天 9:00）：
   - 读取上一日的 `activity_log.jsonl`；
   - 过滤 `category` 为 `cursor` / `browser` 的行；
   - 调用 **Claude**（或其它模型）生成「昨日小结」Markdown；
   - 将结果写入智记笔记（通过智记 API、剪贴板或本地文件导入——按你实际部署选择）。
3. 智记**不会**内嵌 OpenClaw 解释器，避免安装包体积与运行时内存叠加；两边通过**共享文件路径**集成。

## 资源说明

- 智记侧：单后台线程 + 可配置间隔（默认 10s），仅在前台切换或标题变化时追加一行，内存占用保持较低。
- OpenClaw 与模型推理的内存由你本机 OpenClaw / 推理服务配置决定，与智记进程分离。

## 隐私边界

当前实现**不包含**键盘记录、剪贴板全量、屏幕截图或浏览器历史 API；仅前台窗口标题与进程路径级信息。若需更细粒度，应单独做显式授权与合规评估。
