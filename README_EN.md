# Smart Note AI — Intelligent Note-Taking Assistant

A full-featured AI-powered note-taking application that helps you efficiently capture, organize, and retrieve knowledge.

## ✨ Key Features

### 📝 Editor
- **Tiptap Rich Text Editor** — Headings, lists, code blocks, images, task lists, blockquotes, and more
- **Enhanced Code Blocks** — Syntax highlighting, auto language detection (20+ languages), one-click copy
- **Code Execution** — Run Python (Pyodide WASM) and JavaScript/HTML/CSS directly in notes
- **Image Support** — Paste or upload images with cloud storage
- **Auto-Save** — Debounced real-time saving

### 🤖 AI Capabilities
- **AI Organize** — One-click note restructuring into structured HTML
- **AI Summary** — Extract core information instantly
- **AI Selection Editing** — Rewrite, polish, expand, or continue selected text
- **AI Chat Assistant** — Persistent conversations based on note content with history management
- **AI Note Generation** — Automatically generate structured notes from conversations

### 🎤 Voice & Input
- **Voice Notes** — Real-time speech-to-text (Web Speech API)

### 📂 Organization
- **Nested Folders** — Multi-level folder hierarchy with drag-and-drop
- **Pin Notes** — Pin important notes to the top
- **Note Templates** — Pre-built templates for quick note creation
- **Trash Bin** — Recover or permanently delete notes
- **Search** — Real-time search across titles and content

### 📤 Import & Export
- **Multi-Format Import** — TXT, Markdown, HTML, CSV, DOCX, JSON, XML, RTF, and 20+ code file formats
- **Multi-Format Export** — Markdown, HTML, Plain Text, Word (DOCX), CSV, JSON, XML, RTF, Log, and 15+ code formats
- **Data Migration** — Bi-directional sync between cloud and local storage

### 🔗 Sharing
- **Public Sharing** — Generate unique share links, viewable without login

### 🎨 UI & Experience
- **Dark / Light Mode** — One-click theme switching
- **Font Size Control** — Adjustable editor font size
- **PWA Support** — Installable as desktop/mobile app with one-click updates
- **Responsive Layout** — Optimized for desktop and mobile

## 🚀 Getting Started

### Online

Visit the deployed URL and sign up to start using the app.

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:8080` in your browser.

## 📖 Usage Guide

1. **Sign Up / Log In** — Create an account with your email
2. **Create Notes** — Click "New Note" in the sidebar, or use templates
3. **Edit Notes** — Use the toolbar for rich text editing with Markdown shortcuts
4. **AI Features** — Click "Organize" or "Summarize" buttons; select text for rewrite, polish, etc.
5. **AI Chat** — Click the "AI Assistant" bubble at the bottom right for context-aware conversations
6. **Voice Input** — Click the "Voice" button for speech-to-text
7. **Run Code** — Write code in a code block and click "Run"
8. **Folders** — Create folders in the sidebar and drag notes to organize
9. **Import / Export** — Use the import/export buttons in the editor toolbar
10. **Share** — Click "Share" to generate a public link
11. **Update App** — Click the update button at the bottom of the sidebar

## 🖥 Desktop App (Tauri v2)

Package Smart Note AI as a native Windows / macOS / Linux desktop application.

### Prerequisites

1. **Node.js** ≥ 18
2. **Rust** — Install from [https://rustup.rs](https://rustup.rs/)
3. **System Dependencies** (Linux only):
   ```bash
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```
4. **Python 3** (for local Python execution)

### Build Steps

```bash
# Install Tauri CLI
npm install -D @tauri-apps/cli@latest

# Initialize Tauri
npx tauri init

# Add Shell plugin (local Python support)
npm install @tauri-apps/plugin-shell

# Development mode
npx tauri dev

# Build installer
npx tauri build
```

Desktop-specific features:
- Uses local `python3` for code execution, supporting all third-party libraries (numpy, pandas, etc.)
- Web version continues using Pyodide (in-browser WASM)

| Platform | Package Format |
|----------|---------------|
| Windows | `.msi` / `.exe` |
| macOS | `.dmg` / `.app` |
| Linux | `.deb` / `.AppImage` |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Editor | Tiptap v2 + CodeBlockLowlight |
| Backend | Lovable Cloud (Database, Auth, Storage, Edge Functions) |
| AI | Lovable AI (Gemini models) |
| Code Execution | Pyodide (Python WASM) + Sandboxed iframe (JS/HTML/CSS) |
| Desktop | Tauri v2 (optional) |
| PWA | vite-plugin-pwa + Service Worker |

## 🗺 Roadmap

- [ ] SSH Remote Execution — Connect to and manage real devices from notes
- [ ] AI Automation Scripts — AI generates and executes automation scripts from note content
- [ ] Native Mobile Apps — iOS/Android via Capacitor
- [ ] Knowledge Graph — Visual note relationship mapping
- [ ] Version History — View and restore previous note versions

## 🙏 Acknowledgments

This project was inspired by [Get笔记 (GetBNote)](https://getbnote.com). While using Get笔记, I was impressed by its excellent design but found it didn't fully meet my specific needs. I built Smart Note AI by drawing on Get笔记's strengths and extending it significantly with features like deep AI integration, nested folders, code execution, SSH planning, and more. Many thanks to the Get笔记 team for the inspiration!

## 📄 License

MIT License
