import { useState, useRef } from "react";
import { Download, Upload, FileDown, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { localNotesStorage, StorageSettings } from "@/lib/localNotesStorage";
import { Note } from "@/hooks/useNotes";
import JSZip from "jszip";
import TurndownService from "turndown";

type ExportFormat = "md" | "html" | "json" | "txt";

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: "md", label: "Markdown", desc: ".md 文件" },
  { value: "html", label: "HTML", desc: ".html 文件" },
  { value: "json", label: "JSON", desc: ".json 文件" },
  { value: "txt", label: "纯文本", desc: ".txt 文件" },
];

function htmlToMarkdown(html: string): string {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  return td.turndown(html);
}

function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function convertNote(note: Note, format: ExportFormat): { content: string; ext: string } {
  switch (format) {
    case "md":
      return { content: `# ${note.title}\n\n${htmlToMarkdown(note.content)}`, ext: ".md" };
    case "html": {
      const htmlDoc = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <title>${note.title}</title>\n</head>\n<body>\n<h1>${note.title}</h1>\n${note.content}\n</body>\n</html>`;
      return { content: htmlDoc, ext: ".html" };
    }
    case "json":
      return {
        content: JSON.stringify({
          title: note.title,
          content: note.content,
          created_at: note.created_at,
          updated_at: note.updated_at,
          folder_id: note.folder_id,
        }, null, 2),
        ext: ".json",
      };
    case "txt":
      return { content: `${note.title}\n\n${htmlToPlainText(note.content)}`, ext: ".txt" };
  }
}

function sanitizeFileName(name: string): string {
  return (name || "无标题笔记").replace(/[\\/:*?"<>|]/g, "_").slice(0, 100);
}

interface DataMigrationProps {
  storageSettings: StorageSettings;
  onMigrationComplete: () => void;
}

const DataMigration = ({ storageSettings, onMigrationComplete }: DataMigrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("md");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocal = storageSettings.mode === "local";

  // ─── Export: Cloud → Local files (download as zip) ────────────
  const handleExportCloudToLocal = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "无笔记可导出", description: "云端没有找到任何笔记" });
        setExporting(false);
        return;
      }

      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const note of data) {
        const { content, ext } = convertNote(note, exportFormat);
        let fileName = sanitizeFileName(note.title);
        // Deduplicate names
        let finalName = fileName + ext;
        let counter = 1;
        while (usedNames.has(finalName)) {
          finalName = `${fileName}_${counter}${ext}`;
          counter++;
        }
        usedNames.add(finalName);
        zip.file(finalName, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `智记笔记导出_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "导出成功", description: `已导出 ${data.length} 条笔记为 ${exportFormat.toUpperCase()} 格式` });
    } catch (e: any) {
      toast({ title: "导出失败", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  // ─── Export: Local → download as zip ──────────────────────────
  const handleExportLocalToFiles = async () => {
    setExporting(true);
    try {
      const localNotes = await localNotesStorage.getAll(storageSettings.localPath);
      if (localNotes.length === 0) {
        toast({ title: "无笔记可导出", description: "本地没有找到任何笔记" });
        setExporting(false);
        return;
      }

      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const note of localNotes) {
        const { content, ext } = convertNote(note, exportFormat);
        let fileName = sanitizeFileName(note.title);
        let finalName = fileName + ext;
        let counter = 1;
        while (usedNames.has(finalName)) {
          finalName = `${fileName}_${counter}${ext}`;
          counter++;
        }
        usedNames.add(finalName);
        zip.file(finalName, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `智记笔记导出_本地_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "导出成功", description: `已导出 ${localNotes.length} 条本地笔记` });
    } catch (e: any) {
      toast({ title: "导出失败", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  // ─── Import: Files → Cloud ────────────────────────────────────
  const handleImportToCloud = async (files: FileList) => {
    if (!user) return;
    setImporting(true);
    setImportCount(0);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        const parsed = await parseImportFile(file);
        if (!parsed) continue;

        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          title: parsed.title,
          content: parsed.content,
        });

        if (!error) successCount++;
      } catch {}
    }

    setImportCount(successCount);
    setImporting(false);

    if (successCount > 0) {
      toast({ title: "导入成功", description: `已将 ${successCount} 条笔记导入到云端` });
      onMigrationComplete();
    } else {
      toast({ title: "导入失败", description: "未能成功导入任何笔记", variant: "destructive" });
    }
  };

  // ─── Import: Files → Local ────────────────────────────────────
  const handleImportToLocal = async (files: FileList) => {
    setImporting(true);
    setImportCount(0);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        const parsed = await parseImportFile(file);
        if (!parsed) continue;

        const now = new Date().toISOString();
        const note: Note = {
          id: crypto.randomUUID(),
          title: parsed.title,
          content: parsed.content,
          folder_id: null,
          created_at: now,
          updated_at: now,
        };
        await localNotesStorage.save(note, storageSettings.localPath);
        successCount++;
      } catch {}
    }

    setImportCount(successCount);
    setImporting(false);

    if (successCount > 0) {
      toast({ title: "导入成功", description: `已将 ${successCount} 条笔记导入到本地` });
      onMigrationComplete();
    } else {
      toast({ title: "导入失败", description: "未能成功导入任何笔记", variant: "destructive" });
    }
  };

  // ─── Cloud ↔ Local sync ───────────────────────────────────────
  const handleCloudToLocal = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "无笔记可迁移", description: "云端没有笔记" });
        setImporting(false);
        return;
      }

      let count = 0;
      for (const note of data) {
        await localNotesStorage.save(note, storageSettings.localPath);
        count++;
      }

      toast({ title: "迁移成功", description: `已将 ${count} 条云端笔记复制到本地存储` });
      onMigrationComplete();
    } catch (e: any) {
      toast({ title: "迁移失败", description: e.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const handleLocalToCloud = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const localNotes = await localNotesStorage.getAll(storageSettings.localPath);
      if (localNotes.length === 0) {
        toast({ title: "无笔记可迁移", description: "本地没有笔记" });
        setImporting(false);
        return;
      }

      let count = 0;
      for (const note of localNotes) {
        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          title: note.title,
          content: note.content,
          folder_id: null,
        });
        if (!error) count++;
      }

      toast({ title: "迁移成功", description: `已将 ${count} 条本地笔记上传到云端` });
      onMigrationComplete();
    } catch (e: any) {
      toast({ title: "迁移失败", description: e.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isLocal) {
      handleImportToLocal(files);
    } else {
      handleImportToCloud(files);
    }
    e.target.value = "";
  };

  const isProcessing = exporting || importing;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">数据迁移</label>

      {/* Export format selector */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">导出格式</p>
        <div className="grid grid-cols-4 gap-1.5">
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setExportFormat(fmt.value)}
              disabled={isProcessing}
              className={`py-1.5 px-2 text-xs rounded-md transition-colors ${
                exportFormat === fmt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent text-foreground"
              } disabled:opacity-50`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export buttons */}
      <div className="space-y-2">
        <button
          onClick={isLocal ? handleExportLocalToFiles : handleExportCloudToLocal}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "正在导出..." : `导出${isLocal ? "本地" : "云端"}笔记为文件`}
        </button>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          将{isLocal ? "本地存储" : "云端"}的所有笔记打包为 .zip 下载，格式为 {exportFormat.toUpperCase()}
        </p>
      </div>

      {/* Import files */}
      <div className="space-y-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? `正在导入... (${importCount})` : `批量导入文件到${isLocal ? "本地" : "云端"}`}
        </button>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          支持 .md、.txt、.html、.json、.csv、.docx 等格式，可多选文件
        </p>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".txt,.md,.markdown,.html,.htm,.csv,.docx,.doc,.rtf,.json,.xml,.log"
          onChange={handleFileSelect}
        />
      </div>

      {/* Cloud ↔ Local sync */}
      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium text-foreground">云端 ↔ 本地 数据同步</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCloudToLocal}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">云端 → 本地</span>
            <span className="text-[10px] text-muted-foreground">复制到本地存储</span>
          </button>
          <button
            onClick={handleLocalToCloud}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors disabled:opacity-50"
          >
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">本地 → 云端</span>
            <span className="text-[10px] text-muted-foreground">上传到云端</span>
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          注意：同步会复制笔记而非移动，不会删除源端数据。重复执行可能产生重复笔记。
        </p>
      </div>
    </div>
  );
};

// ─── File parser (matches import formats) ───────────────────────
async function parseImportFile(file: File): Promise<{ title: string; content: string } | null> {
  const name = file.name;
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  const title = name.substring(0, name.lastIndexOf(".")) || name;

  try {
    switch (ext) {
      case ".md":
      case ".markdown": {
        const text = await file.text();
        const { marked } = await import("marked");
        const html = await marked(text);
        return { title, content: html };
      }
      case ".html":
      case ".htm": {
        const html = await file.text();
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        return { title, content: bodyMatch ? bodyMatch[1] : html };
      }
      case ".json": {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          // If it looks like our export format, use title/content directly
          if (parsed.title && parsed.content) {
            return { title: parsed.title, content: parsed.content };
          }
          const formatted = JSON.stringify(parsed, null, 2);
          return { title, content: `<pre><code>${formatted.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>` };
        } catch {
          return { title, content: `<p>${text}</p>` };
        }
      }
      case ".csv": {
        const text = await file.text();
        const lines = text.trim().split("\n");
        if (lines.length === 0) return { title, content: "<p></p>" };
        const rows = lines.map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        let html = "<table><thead><tr>";
        rows[0].forEach(c => { html += `<th>${c}</th>`; });
        html += "</tr></thead><tbody>";
        for (let i = 1; i < rows.length; i++) {
          html += "<tr>";
          rows[i].forEach(c => { html += `<td>${c}</td>`; });
          html += "</tr>";
        }
        html += "</tbody></table>";
        return { title, content: html };
      }
      case ".docx": {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return { title, content: result.value };
      }
      case ".txt":
      case ".log":
      case ".rtf":
      case ".xml":
      default: {
        const text = await file.text();
        const html = text.split("\n").map(l => `<p>${l || "<br>"}</p>`).join("");
        return { title, content: html };
      }
    }
  } catch {
    return null;
  }
}

export default DataMigration;
