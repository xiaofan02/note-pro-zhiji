/**
 * Simple heuristic-based programming language detector
 */

interface LangPattern {
  lang: string;
  patterns: RegExp[];
  weight: number;
}

const LANG_RULES: LangPattern[] = [
  // HTML - check first due to distinctive markers
  { lang: "html", patterns: [/<!DOCTYPE\s+html/i, /<html[\s>]/i, /<\/?(div|span|head|body|section|article|nav|footer|header|form|table|ul|ol|li|a\s|img\s|p[\s>]|h[1-6][\s>])/i], weight: 2 },
  // CSS
  { lang: "css", patterns: [/[\w-]+\s*:\s*[\w#]+;/, /@media\s/, /@keyframes\s/, /\.([\w-]+)\s*\{/, /#[\w-]+\s*\{/], weight: 2 },
  // Python
  { lang: "python", patterns: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w+/, /\bfrom\s+\w+\s+import/, /\bclass\s+\w+.*:/, /\bprint\s*\(/, /\bif\s+.*:\s*$/, /\belif\s+/, /\bself\.\w+/], weight: 1 },
  // TypeScript (check before JS)
  { lang: "typescript", patterns: [/:\s*(string|number|boolean|any|void|never|unknown)\b/, /\binterface\s+\w+/, /\btype\s+\w+\s*=/, /<\w+>/, /\bas\s+(string|number|any)\b/], weight: 2 },
  // JavaScript
  { lang: "javascript", patterns: [/\bconst\s+\w+\s*=/, /\blet\s+\w+\s*=/, /\bfunction\s+\w+\s*\(/, /=>\s*\{/, /\bconsole\.\w+\(/, /\bdocument\.\w+/, /\bwindow\.\w+/, /\brequire\s*\(/], weight: 1 },
  // JSON
  { lang: "json", patterns: [/^\s*[\[{]/, /"\w+"\s*:\s*["{\[\dtfn]/], weight: 1 },
  // SQL
  { lang: "sql", patterns: [/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i, /\bFROM\s+\w+/i, /\bWHERE\s+/i, /\bJOIN\s+/i], weight: 2 },
  // Bash/Shell
  { lang: "bash", patterns: [/^#!\s*\/bin\/(ba)?sh/, /\becho\s+/, /\bsudo\s+/, /\bapt(-get)?\s+/, /\bnpm\s+(install|run|start)/, /\bcd\s+/, /\bexport\s+\w+=/], weight: 1 },
  // Go
  { lang: "go", patterns: [/\bpackage\s+\w+/, /\bfunc\s+\w+\s*\(/, /\bfmt\.\w+/, /\bimport\s+\(/, /:=\s*/], weight: 2 },
  // Rust
  { lang: "rust", patterns: [/\bfn\s+\w+\s*\(/, /\blet\s+mut\s+/, /\bimpl\s+/, /\bpub\s+fn\b/, /\buse\s+\w+::/, /println!\s*\(/], weight: 2 },
  // Java
  { lang: "java", patterns: [/\bpublic\s+class\s+/, /\bSystem\.out\.print/, /\bpublic\s+static\s+void\s+main/, /\bimport\s+java\./], weight: 2 },
  // Ruby
  { lang: "ruby", patterns: [/\bdef\s+\w+/, /\bputs\s+/, /\bend\s*$/, /\brequire\s+['"]/, /\battr_(accessor|reader|writer)\b/], weight: 1 },
  // PHP
  { lang: "php", patterns: [/<\?php/, /\$\w+\s*=/, /\becho\s+/, /\bfunction\s+\w+\s*\(/], weight: 2 },
  // YAML
  { lang: "yaml", patterns: [/^\w[\w-]*:\s+\S/, /^\s+-\s+\w/], weight: 1 },
  // Kotlin
  { lang: "kotlin", patterns: [/\bfun\s+\w+\s*\(/, /\bval\s+\w+/, /\bvar\s+\w+/, /\bprintln\s*\(/], weight: 2 },
  // Swift
  { lang: "swift", patterns: [/\bfunc\s+\w+\s*\(/, /\bvar\s+\w+\s*:/, /\blet\s+\w+\s*:/, /\bguard\s+let\b/, /\bprint\s*\(/], weight: 1 },
  // C/C++
  { lang: "cpp", patterns: [/#include\s*</, /\bstd::/, /\bcout\s*<</, /\bint\s+main\s*\(/], weight: 2 },
  { lang: "c", patterns: [/#include\s*<stdio\.h>/, /\bprintf\s*\(/, /\bint\s+main\s*\(/], weight: 2 },
];

export function detectLanguage(code: string): string {
  if (!code.trim()) return "";

  const lines = code.split("\n").slice(0, 30); // Only check first 30 lines
  const sample = lines.join("\n");

  // Quick checks for obvious cases
  if (/^\s*[\[{]/.test(sample)) {
    try { JSON.parse(code); return "json"; } catch {}
  }
  if (/^\s*<!DOCTYPE\s+html/i.test(sample) || /^\s*<html/i.test(sample)) return "html";
  if (/^#!\s*\/bin\/(ba)?sh/m.test(sample)) return "bash";

  // Score each language
  const scores: Record<string, number> = {};
  for (const rule of LANG_RULES) {
    let matched = 0;
    for (const pat of rule.patterns) {
      if (pat.test(sample)) matched++;
    }
    if (matched > 0) {
      scores[rule.lang] = (scores[rule.lang] || 0) + matched * rule.weight;
    }
  }

  // Return highest scoring language
  const entries = Object.entries(scores);
  if (entries.length === 0) return "";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] >= 2 ? entries[0][0] : "";
}
