import { useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED_EXTENSIONS = [
  ".txt", ".md", ".markdown", ".html", ".htm", ".csv",
  ".docx", ".doc", ".rtf", ".json", ".xml", ".log",
  // Code files
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".h", ".hpp",
  ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".sql", ".sh", ".bash",
  ".css", ".scss", ".sass", ".less", ".yaml", ".yml", ".toml", ".ini",
  ".r", ".lua", ".pl", ".dart", ".scala", ".vue", ".svelte",
];

const CODE_EXTENSIONS: Record<string, string> = {
  ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
  ".py": "python", ".java": "java", ".c": "c", ".cpp": "cpp", ".h": "c", ".hpp": "cpp",
  ".go": "go", ".rs": "rust", ".rb": "ruby", ".php": "php", ".swift": "swift",
  ".kt": "kotlin", ".sql": "sql", ".sh": "bash", ".bash": "bash",
  ".css": "css", ".scss": "css", ".sass": "css", ".less": "css",
  ".yaml": "yaml", ".yml": "yaml", ".toml": "yaml", ".ini": "yaml",
  ".r": "r", ".lua": "lua", ".pl": "perl", ".dart": "dart", ".scala": "scala",
  ".vue": "html", ".svelte": "html",
};

const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
}

function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("");
}

function csvToHtml(csv: string): string {
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return "<p></p>";
  const rows = lines.map((line) => {
    // Simple CSV parsing (handles basic cases)
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return cells;
  });
  let html = "<table><thead><tr>";
  rows[0].forEach((cell) => {
    html += `<th>${cell}</th>`;
  });
  html += "</tr></thead><tbody>";
  for (let i = 1; i < rows.length; i++) {
    html += "<tr>";
    rows[i].forEach((cell) => {
      html += `<td>${cell}</td>`;
    });
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

function jsonToHtml(json: string): string {
  try {
    const parsed = JSON.parse(json);
    const formatted = JSON.stringify(parsed, null, 2);
    return `<pre><code>${formatted.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
  } catch {
    return textToHtml(json);
  }
}

function xmlToHtml(xml: string): string {
  return `<pre><code>${xml.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
}

async function parseFile(file: File): Promise<{ title: string; content: string }> {
  const name = file.name;
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  const title = name.substring(0, name.lastIndexOf(".")) || name;

  switch (ext) {
    case ".txt":
    case ".log": {
      const text = await readFileAsText(file);
      return { title, content: textToHtml(text) };
    }
    case ".md":
    case ".markdown": {
      const text = await readFileAsText(file);
      const { marked } = await import("marked");
      const html = await marked(text);
      return { title, content: html };
    }
    case ".html":
    case ".htm": {
      const html = await readFileAsText(file);
      // Extract body content if full HTML document
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return { title, content: bodyMatch ? bodyMatch[1] : html };
    }
    case ".csv": {
      const text = await readFileAsText(file);
      return { title, content: csvToHtml(text) };
    }
    case ".json": {
      const text = await readFileAsText(file);
      return { title, content: jsonToHtml(text) };
    }
    case ".xml": {
      const text = await readFileAsText(file);
      return { title, content: xmlToHtml(text) };
    }
    case ".rtf": {
      const text = await readFileAsText(file);
      // Strip RTF formatting, keep plain text
      const plain = text.replace(/\\{\\[^{}]*\\}/g, "").replace(/\\[a-z]+\d*\s?/gi, "").replace(/[{}]/g, "");
      return { title, content: textToHtml(plain) };
    }
    case ".docx": {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ arrayBuffer });
      return { title, content: result.value };
    }
    case ".doc": {
      // .doc (legacy binary format) - limited support
      const text = await readFileAsText(file);
      return { title, content: textToHtml(text) };
    }
    default: {
      // Check if it's a code file
      const lang = CODE_EXTENSIONS[ext];
      if (lang) {
        const code = await readFileAsText(file);
        return { title, content: `<pre><code class="language-${lang}">${code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>` };
      }
      throw new Error(`不支持的文件格式: ${ext}`);
    }
  }
}

export const useDocumentImport = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const importFile = useCallback(
    async (file: File): Promise<{ title: string; content: string } | null> => {
      try {
        const result = await parseFile(file);
        toast({ title: "导入成功", description: `已导入「${result.title}」` });
        return result;
      } catch (e: any) {
        toast({
          title: "导入失败",
          description: e.message || "无法解析该文件",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast]
  );

  return { importFile, fileInputRef, acceptString: ACCEPT_STRING };
};
