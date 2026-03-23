# 智记 AI — 智能笔记助手

一款基于 AI 的全功能智能笔记应用，帮助你高效记录、整理和检索知识。
## ✨ 核心功能

### 📝 编辑器
- **Tiptap 富文本编辑器** — 支持标题、列表、代码块、图片、任务清单、引用等格式
- **代码块增强** — 语法高亮着色、自动语言检测（支持 20+ 语言）、一键复制
- **代码运行** — 支持在笔记中直接运行 Python（Pyodide WASM）和 JavaScript/HTML/CSS 代码
- **图片插入** — 支持粘贴和上传图片，云端存储
- **实时自动保存** — 防抖保存机制，编辑即保存

### 🤖 AI 能力
- **AI 智能整理** — 一键整理笔记结构，生成结构化 HTML 格式
- **AI 摘要** — 快速提取核心信息
- **AI 选中编辑** — 选中文本后可改写、润色、扩写、续写
- **AI 对话助理** — 基于笔记内容的持久化对话，支持历史记录管理
- **AI 笔记生成** — 对话中自动生成结构化笔记

### 🎤 语音与输入
- **语音速记** — 实时语音转文字（Web Speech API）

### 📂 组织管理
- **多级文件夹** — 支持嵌套文件夹，拖拽笔记排序
- **笔记置顶** — 重要笔记一键置顶
- **笔记模板** — 预设多种模板快速创建笔记
- **回收站** — 已删除笔记可恢复或永久删除
- **搜索** — 标题和内容实时搜索

### 📤 导入与导出
- **多格式导入** — 支持 TXT、Markdown、HTML、CSV、DOCX、JSON、XML、RTF 及 20+ 种代码文件
- **多格式导出** — Markdown、HTML、纯文本、Word (DOCX)、CSV、JSON、XML、RTF、Log 及 15+ 种代码格式
- **数据迁移** — 云端与本地存储双向同步

### 🔗 分享与协作
- **公开分享** — 生成唯一分享链接，无需登录即可查看

### 🎨 界面与体验
- **深色/浅色模式** — 一键切换主题
- **字号调节** — 编辑器字号自由增减
- **PWA 支持** — 可安装为桌面/移动应用，支持一键更新
- **响应式布局** — 适配桌面和移动设备

## 🚀 快速开始

### 在线使用

访问部署地址，注册账号即可开始使用。

### 本地开发

```bash
# 克隆仓库
git clone <仓库地址>
cd <项目目录>

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:8080` 即可访问。

## 📖 使用指南

1. **注册/登录** — 使用邮箱注册账号并登录
2. **创建笔记** — 点击侧边栏的 "新建笔记" 按钮，或使用模板创建
3. **编辑笔记** — 使用工具栏进行富文本编辑，支持 Markdown 快捷输入
4. **AI 功能** — 点击顶部的 "整理" 或 "总结" 按钮使用 AI 能力；选中文本可触发改写、润色等操作
5. **AI 对话** — 点击右下角 "AI助理" 气泡，与 AI 就笔记内容进行深入对话
6. **语音输入** — 点击 "语音" 按钮，开始语音转文字输入
7. **代码运行** — 在代码块中编写代码，点击 "运行" 按钮执行
8. **文件夹** — 在侧边栏创建文件夹，拖拽笔记进行分类
9. **导入/导出** — 点击编辑器顶部的导入/导出按钮
10. **分享** — 点击 "分享" 按钮生成公开链接
11. **更新应用** — 点击侧边栏底部的更新按钮检查并安装最新版本

## 🖥 桌面应用打包（Tauri v2）

支持将智记 AI 打包为 Windows / macOS / Linux 桌面应用。

### 前置要求

1. **Node.js** ≥ 18
2. **Rust** — 访问 [https://rustup.rs](https://rustup.rs/) 安装
3. **系统依赖**（仅 Linux）：
   ```bash
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```
4. **Python 3**（用于本地执行 Python 代码）

### 构建步骤

```bash
# 安装 Tauri CLI
npm install -D @tauri-apps/cli@latest

# 初始化 Tauri
npx tauri init

# 添加 Shell 插件（本地 Python 支持）
npm install @tauri-apps/plugin-shell

# 开发模式测试
npx tauri dev

# 构建安装包
npx tauri build
```

桌面端特性：
- 调用本地 `python3` 执行代码，支持所有第三方库（numpy、pandas 等）
- Web 版继续使用 Pyodide（浏览器内 WASM）

| 平台 | 安装包格式 |
|------|-----------|
| Windows | `.msi` / `.exe` |
| macOS | `.dmg` / `.app` |
| Linux | `.deb` / `.AppImage` |

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 组件 | Tailwind CSS + shadcn/ui |
| 编辑器 | Tiptap v2 + CodeBlockLowlight |
| 后端服务 | Lovable Cloud（数据库、认证、存储、边缘函数） |
| AI | Lovable AI（Gemini 系列模型） |
| 代码运行 | Pyodide (Python WASM) + 沙箱 iframe (JS/HTML/CSS) |
| 桌面端 | Tauri v2（可选） |
| PWA | vite-plugin-pwa + Service Worker |

## 🗺 未来规划

### 🔄 工作流自动化（开发中）

让笔记从"被动记录"变成"主动执行"，内置工作流引擎，无需第三方工具：

- [ ] **触发器** — 笔记创建/更新/打标签时自动触发工作流
- [ ] **定时任务** — 每天/每周自动生成日报、周报、待办笔记
- [ ] **AI 自动处理** — 保存后自动总结、自动整理结构、自动提取关键词
- [ ] **Webhook 推送** — 笔记内容变化时推送到外部系统（邮件、钉钉、飞书、Slack）
- [ ] **条件分支** — 根据笔记内容/标签执行不同动作
- [ ] **跨笔记联动** — 一篇笔记更新，自动同步关联笔记的摘要

### 🤖 OpenClaw AI 集成（规划中）

[OpenClaw](https://openclaw.ai) 是一个自托管的 AI 个人助手网关，可将 WhatsApp、Telegram、Discord 等聊天 App 接入 AI Agent。集成后的卖点：

- [ ] **随时随地操作笔记** — 在 WhatsApp/Telegram 发一句话，即可创建、查询、更新笔记，无需打开 App
- [ ] **主动推送** — AI 定时提醒你查看重要笔记、未完成的待办
- [ ] **笔记执行动作** — 在笔记里写"发邮件给张三"，OpenClaw 直接帮你执行
- [ ] **跨 Agent 记忆** — 笔记作为持久化记忆层，在 Claude Code、Cursor、Manus 等 AI 工具间共享上下文
- [ ] **自托管，数据私有** — OpenClaw 运行在用户自己的机器上，笔记数据完全自主可控

### 其他规划

- [ ] SSH 远程命令执行 — 在笔记中直接连接并管理真实设备
- [ ] 移动端原生应用 — 通过 Capacitor 适配 iOS/Android
- [ ] 知识图谱 — 笔记间关联可视化

## 🙏 致谢

本项目的灵感源于 [Get笔记](https://getbnote.com)。在使用 Get笔记 的过程中，我深受其优秀的产品设计启发，但同时也发现它在某些方面无法完全满足我的个人需求。因此，我在借鉴 Get笔记 优点的基础上，结合自身需求进行了大量扩展和改进（如 AI 深度集成、多级目录、代码运行、SSH 规划等），最终打造了智记 AI。感谢 Get笔记 团队带来的灵感与启发！

## 📄 许可证

MIT License
