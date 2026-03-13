# 智记 AI — 智能笔记助手

一款基于 AI 的智能笔记应用，帮助你高效记录、整理和检索知识。

## ✨ 核心功能

- **富文本编辑器** — 支持标题、列表、代码块、图片、任务清单等格式
- **AI 智能整理** — 一键整理笔记结构，让内容更清晰有条理
- **AI 摘要** — 快速生成笔记摘要，提炼核心信息
- **AI 对话** — 基于笔记内容与 AI 对话，深入理解知识
- **语音速记** — 语音转文字，解放双手快速记录
- **文件夹管理** — 分层文件夹组织笔记，支持拖拽排序
- **标签系统** — 多标签分类，灵活管理笔记
- **文档导入** — 支持 .txt、.md、.docx、.html、.csv、.json 等多种格式
- **图片插入** — 支持粘贴和上传图片到笔记中
- **搜索** — 快速搜索所有笔记内容
- **深色模式** — 支持明暗主题切换

## 🚀 快速开始

### 在线使用

访问部署地址，注册账号即可开始使用。

### 本地开发

```bash
# 克隆仓库
git clone <仓库地址>

# 进入项目目录
cd <项目名>

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173` 即可访问。

## 📖 使用指南

1. **注册/登录** — 使用邮箱注册账号并登录
2. **创建笔记** — 点击侧边栏的 "+" 按钮新建笔记
3. **编辑笔记** — 使用工具栏进行富文本编辑，支持 Markdown 快捷输入
4. **AI 功能** — 点击顶部的"智能整理"或"AI 总结"按钮使用 AI 能力
5. **AI 对话** — 点击右侧 AI 面板，与 AI 就笔记内容进行对话
6. **语音输入** — 点击"语音速记"按钮，开始语音转文字输入
7. **文件夹** — 在侧边栏创建文件夹，拖拽笔记进行分类
8. **导入文档** — 点击导入按钮，支持多种文档格式

## 🖥 桌面应用打包（Tauri）

将智记 AI 打包为 Windows / macOS / Linux 桌面应用，并支持本地 Python 执行。

### 前置要求

1. **Node.js** ≥ 18
2. **Rust** — 访问 [https://rustup.rs](https://rustup.rs/) 安装
3. **系统依赖**（仅 Linux）：
   ```bash
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```
4. **Python 3**（用于本地执行 Python 代码）— 确保 `python3 --version` 可用

### 步骤 1：导出项目并安装依赖

```bash
# 从 GitHub 克隆导出的项目
git clone <你的仓库地址>
cd <项目目录>
npm install
```

### 步骤 2：安装 Tauri CLI 并初始化

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
```

初始化时按以下内容填写：
| 问题 | 填写 |
|------|------|
| App name | `智记AI` |
| Window title | `智记 AI — 智能笔记助手` |
| Web assets (前端构建目录) | `../dist` |
| Dev server URL | `http://localhost:5173` |
| Frontend dev command | `npm run dev` |
| Frontend build command | `npm run build` |

### 步骤 3：添加 Shell 插件（支持本地 Python）

```bash
npm install @tauri-apps/plugin-shell
```

编辑 `src-tauri/Cargo.toml`，在 `[dependencies]` 下添加：
```toml
tauri-plugin-shell = "2"
```

编辑 `src-tauri/src/lib.rs`，注册插件：
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

编辑 `src-tauri/capabilities/default.json`，添加 Shell 权限：
```json
{
  "permissions": [
    "core:default",
    "shell:allow-execute",
    "shell:allow-spawn",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        { "name": "python", "cmd": "python3", "args": true }
      ]
    }
  ]
}
```

### 步骤 4：修改代码运行器以支持本地 Python

在 `src/lib/codeRunner.ts` 中，添加 Tauri 环境下调用本地 Python 的逻辑：

```typescript
// 在文件顶部添加
async function runPythonLocal(code: string): Promise<RunResult> {
  try {
    const { Command } = await import("@tauri-apps/plugin-shell");
    const cmd = Command.create("python", ["-c", code]);
    const output = await cmd.execute();
    return {
      output: output.stdout || "",
      error: output.stderr || undefined,
    };
  } catch (e: any) {
    return { output: "", error: e.message };
  }
}

// 判断是否在 Tauri 环境中
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}
```

然后修改 `runCode` 函数中的 Python 分支：
```typescript
case "python":
  return isTauri() ? runPythonLocal(code) : runPython(code);
```

这样：
- **桌面应用** → 调用本地 `python3`，支持所有第三方库（numpy、pandas 等）
- **Web 版** → 继续使用 Pyodide（浏览器内 WASM）

### 步骤 5：构建安装包

```bash
# 开发模式测试
npx tauri dev

# 构建正式安装包
npx tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`：
| 平台 | 安装包格式 |
|------|-----------|
| Windows | `.msi` / `.exe` |
| macOS | `.dmg` / `.app` |
| Linux | `.deb` / `.AppImage` |

### 注意事项

- 每个平台只能构建当前系统的安装包（不能交叉编译）
- 如需多平台构建，可使用 [GitHub Actions + tauri-action](https://github.com/tauri-apps/tauri-action) 自动化 CI/CD
- 本地 Python 执行需要用户机器上已安装 Python 3
- Web 版不受影响，继续使用浏览器内 Pyodide 运行 Python

## 🛠 技术栈

- **前端** — React + TypeScript + Vite
- **UI** — Tailwind CSS + shadcn/ui
- **编辑器** — Tiptap 富文本编辑器
- **后端** — Lovable Cloud（数据库、认证、存储、边缘函数）
- **AI** — 集成多种 AI 模型用于笔记整理和对话
- **桌面端** — Tauri v2（可选打包）

## 🙏 致谢

本项目的灵感源于 [Get笔记](https://getbnote.com)。在使用 Get笔记 的过程中，我深受其优秀的产品设计启发，但同时也发现它在某些方面无法完全满足我的个人需求。因此，我在借鉴 Get笔记 优点的基础上，结合自身需求进行了扩展和改进，最终打造了智记 AI。感谢 Get笔记 团队带来的灵感与启发！

## 📄 许可证

MIT License
