import { useState, useRef } from "react";
import { Download, Upload, FileDown, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { localNotesStorage, StorageSettings } from "@/lib/localNotesStorage";
import { Note } from "@/hooks/useNotes";
import JSZip from "jszip";
import TurndownService from "turndown";

type ExportFormat = "md" | "html" | "json" | "txt" | "csv" | "docx";

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: "md", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "txt", label: "纯文本" },
  { value: "csv", label: "CSV" },
  { value: "docx", label: "DOCX" },
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

function escapeCSV(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertNote(note: Note, format: ExportFormat): { content: string | Blob; ext: string; isBinary?: boolean } {
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
    case "csv": {
      const plainContent = htmlToPlainText(note.content).replace(/\r?\n/g, " ");
      const row = `${escapeCSV(note.title)},${escapeCSV(plainContent)},${escapeCSV(note.created_at)},${escapeCSV(note.updated_at)}`;
      return { content: row, ext: ".csv" };
    }
    case "docx":
      // Will be handled separately with async docx generation
      return { content: "", ext: ".docx" };
  }
}

async function generateDocxBlob(note: Note): Promise<Blob> {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
  
  const plainText = htmlToPlainText(note.content);
  const paragraphs = plainText.split("\n").filter(Boolean);
  
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: note.title, bold: true })],
        }),
        ...paragraphs.map(text => new Paragraph({ children: [new TextRun(text)] })),
      ],
    }],
  });
  
  return await Packer.toBlob(doc);
}

function sanitizeFileName(name: string): string {
  return (name || "无标题笔记").replace(/[\\/:*?"<>|]/g, "_").slice(0, 100);
}

interface ProgressState {
  current: number;
  total: number;
  label: string;
}

interface DataMigrationProps {
  storageSettings: StorageSettings;
  onMigrationComplete: () => void;
}

const DataMigration = ({ storageSettings, onMigrationComplete }: DataMigrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("md");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocal = storageSettings.mode === "local";
  const isProcessing = !!progress;

  // ─── Generic export logic ─────────────────────────────────────
  const doExport = async (notes: Note[], label: string) => {
    if (notes.length === 0) {
      toast({ title: "无笔记可导出", description: "没有找到任何笔记" });
      return;
    }

    setProgress({ current: 0, total: notes.length, label: `正在导出 (0/${notes.length})` });

    try {
      // Special handling for CSV: single file with header
      if (exportFormat === "csv") {
        const header = "标题,内容,创建时间,更新时间\n";
        const rows: string[] = [];
        for (let i = 0; i < notes.length; i++) {
          const { content } = convertNote(notes[i], "csv");
          rows.push(content as string);
          setProgress({ current: i + 1, total: notes.length, label: `正在导出 (${i + 1}/${notes.length})` });
        }
        const csvContent = "\uFEFF" + header + rows.join("\n"); // BOM for Excel
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, `智记笔记导出_${new Date().toISOString().slice(0, 10)}.csv`);
        toast({ title: "导出成功", description: `已导出 ${notes.length} 条笔记为 CSV` });
        setProgress(null);
        return;
      }

      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        let fileName = sanitizeFileName(note.title);

        if (exportFormat === "docx") {
          const blob = await generateDocxBlob(note);
          let finalName = fileName + ".docx";
          let counter = 1;
          while (usedNames.has(finalName)) { finalName = `${fileName}_${counter++}.docx`; }
          usedNames.add(finalName);
          zip.file(finalName, blob);
        } else {
          const { content, ext } = convertNote(note, exportFormat);
          let finalName = fileName + ext;
          let counter = 1;
          while (usedNames.has(finalName)) { finalName = `${fileName}_${counter++}${ext}`; }
          usedNames.add(finalName);
          zip.file(finalName, content as string);
        }

        setProgress({ current: i + 1, total: notes.length, label: `正在导出 (${i + 1}/${notes.length})` });
      }

      setProgress({ current: notes.length, total: notes.length, label: "正在打包 ZIP..." });
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `智记笔记导出_${new Date().toISOString().slice(0, 10)}.zip`);

      toast({ title: "导出成功", description: `已导出 ${notes.length} 条笔记为 ${exportFormat.toUpperCase()} 格式` });
    } catch (e: any) {
      toast({ title: "导出失败", description: e.message, variant: "destructive" });
    }
    setProgress(null);
  };

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleExport = async () => {
    if (isLocal) {
      const notes = await localNotesStorage.getAll(storageSettings.localPath);
      await doExport(notes, "本地");
    } else {
      if (!user) return;
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) { toast({ title: "导出失败", description: error.message, variant: "destructive" }); return; }
      await doExport(data || [], "云端");
    }
  };

  // ─── Import files ─────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    e.target.value = "";

    setProgress({ current: 0, total: fileArr.length, label: `正在导入 (0/${fileArr.length})` });
    let successCount = 0;

    for (let i = 0; i < fileArr.length; i++) {
      try {
        const parsed = await parseImportFile(fileArr[i]);
        if (!parsed) { setProgress(p => p ? { ...p, current: i + 1, label: `正在导入 (${i + 1}/${fileArr.length})` } : null); continue; }

        if (isLocal) {
          const now = new Date().toISOString();
          await localNotesStorage.save({
            id: crypto.randomUUID(), title: parsed.title, content: parsed.content,
            folder_id: null, created_at: now, updated_at: now,
          }, storageSettings.localPath);
          successCount++;
        } else if (user) {
          const { error } = await supabase.from("notes").insert({
            user_id: user.id, title: parsed.title, content: parsed.content,
          });
          if (!error) successCount++;
        }
      } catch {}
      setProgress({ current: i + 1, total: fileArr.length, label: `正在导入 (${i + 1}/${fileArr.length})` });
    }

    setProgress(null);
    if (successCount > 0) {
      toast({ title: "导入成功", description: `已将 ${successCount} 条笔记导入到${isLocal ? "本地" : "云端"}` });
      onMigrationComplete();
    } else {
      toast({ title: "导入失败", description: "未能成功导入任何笔记", variant: "destructive" });
    }
  };

  // ─── Cloud ↔ Local sync ───────────────────────────────────────
  const handleCloudToLocal = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, folder_id, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { toast({ title: "无笔记可迁移" }); return; }

      setProgress({ current: 0, total: data.length, label: `正在迁移 (0/${data.length})` });
      for (let i = 0; i < data.length; i++) {
        await localNotesStorage.save(data[i], storageSettings.localPath);
        setProgress({ current: i + 1, total: data.length, label: `正在迁移 (${i + 1}/${data.length})` });
      }
      setProgress(null);
      toast({ title: "迁移成功", description: `已将 ${data.length} 条云端笔记复制到本地` });
      onMigrationComplete();
    } catch (e: any) {
      setProgress(null);
      toast({ title: "迁移失败", description: e.message, variant: "destructive" });
    }
  };

  const handleLocalToCloud = async () => {
    if (!user) return;
    try {
      const localNotes = await localNotesStorage.getAll(storageSettings.localPath);
      if (localNotes.length === 0) { toast({ title: "无笔记可迁移" }); return; }

      setProgress({ current: 0, total: localNotes.length, label: `正在迁移 (0/${localNotes.length})` });
      let count = 0;
      for (let i = 0; i < localNotes.length; i++) {
        const { error } = await supabase.from("notes").insert({
          user_id: user.id, title: localNotes[i].title, content: localNotes[i].content, folder_id: null,
        });
        if (!error) count++;
        setProgress({ current: i + 1, total: localNotes.length, label: `正在迁移 (${i + 1}/${localNotes.length})` });
      }
      setProgress(null);
      toast({ title: "迁移成功", description: `已将 ${count} 条本地笔记上传到云端` });
      onMigrationComplete();
    } catch (e: any) {
      setProgress(null);
      toast({ title: "迁移失败", description: e.message, variant: "destructive" });
    }
  };

  const progressPercent = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">数据迁移</label>

      {/* Progress bar */}
      {progress && (
        <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">{progress.label}</span>
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Export format selector */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">导出格式</p>
        <div className="grid grid-cols-3 gap-1.5">
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

      {/* Export button */}
      <div className="space-y-2">
        <button
          onClick={handleExport}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          导出{isLocal ? "本地" : "云端"}笔记为 {exportFormat.toUpperCase()}
        </button>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {exportFormat === "csv" ? "导出为单个 CSV 文件" : "导出为 ZIP 压缩包"}，格式为 {exportFormat.toUpperCase()}
        </p>
      </div>

      {/* Import files */}
      <div className="space-y-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          批量导入文件到{isLocal ? "本地" : "云端"}
        </button>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          支持 .md、.txt、.html、.json、.csv、.docx 等格式，可多选
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
          if (parsed.title && parsed.content) return { title: parsed.title, content: parsed.content };
          const formatted = JSON.stringify(parsed, null, 2);
          return { title, content: `<pre><code>${formatted.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>` };
        } catch { return { title, content: `<p>${text}</p>` }; }
      }
      case ".csv": {
        const text = await file.text();
        const lines = text.trim().split("\n");
        if (lines.length === 0) return { title, content: "<p></p>" };
        const rows = lines.map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        let html = "<table><thead><tr>";
        rows[0].forEach(c => { html += `<th>${c}</th>`; });
        html += "</tr></thead><tbody>";
        for (let i = 1; i < rows.length; i++) { html += "<tr>"; rows[i].forEach(c => { html += `<td>${c}</td>`; }); html += "</tr>"; }
        html += "</tbody></table>";
        return { title, content: html };
      }
      case ".docx": {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return { title, content: result.value };
      }
      default: {
        const text = await file.text();
        const html = text.split("\n").map(l => `<p>${l || "<br>"}</p>`).join("");
        return { title, content: html };
      }
    }
  } catch { return null; }
}

export default DataMigration;
