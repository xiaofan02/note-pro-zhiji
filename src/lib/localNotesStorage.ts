/**
 * Local Notes Storage Service
 * - Web: uses IndexedDB for offline local storage
 * - Tauri desktop: uses filesystem to save notes as JSON files in a user-chosen directory
 */

import { Note } from "@/hooks/useNotes";

// Static Tauri plugin imports — tree-shaken away in web builds
let tauriFs: typeof import("@tauri-apps/plugin-fs") | null = null;
let tauriDialog: typeof import("@tauri-apps/plugin-dialog") | null = null;

async function loadTauriPlugins() {
  if (!isTauri()) return;
  if (!tauriFs) {
    try { tauriFs = await import("@tauri-apps/plugin-fs"); } catch {}
  }
  if (!tauriDialog) {
    try { tauriDialog = await import("@tauri-apps/plugin-dialog"); } catch {}
  }
}

const DB_NAME = "zhiji-notes-local";
const DB_VERSION = 1;
const STORE_NAME = "notes";

// ─── Environment Detection ──────────────────────────────────────
export function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

// ─── Settings ───────────────────────────────────────────────────
export interface StorageSettings {
  mode: "cloud" | "local";
  localPath: string; // Only used in Tauri
}

const STORAGE_SETTINGS_KEY = "zhiji-storage-settings";

export function getStorageSettings(): StorageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { mode: "cloud", localPath: "" };
}

export function setStorageSettings(settings: StorageSettings) {
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Helpers (Tauri paths + virtual folder id mapping) ──────────
function normalizeFsPath(p: string) {
  // Tauri runs on native OS; however user-selected paths may contain backslashes.
  // Normalize to `/` and trim trailing slashes so we build consistent virtual ids.
  return p.replace(/\\/g, "/").replace(/\/+$/g, "");
}

const FS_FOLDER_PREFIX = "fsdir:";
const FILE_NOTE_PREFIX = "file:";
function folderIdFromRelDir(relDir: string): string {
  return `${FS_FOLDER_PREFIX}${encodeURIComponent(relDir)}`;
}

function isFsFolderId(folderId: string | null | undefined): folderId is string {
  return typeof folderId === "string" && folderId.startsWith(FS_FOLDER_PREFIX);
}

function isFileNoteId(noteId: string | null | undefined): noteId is string {
  return typeof noteId === "string" && noteId.startsWith(FILE_NOTE_PREFIX);
}

// ─── IndexedDB Helpers (Web local mode) ─────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updated_at", "updated_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTransaction(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void
): Promise<any> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = fn(store);
        if (result) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        }
        tx.oncomplete = () => {
          if (!result) resolve(undefined);
          db.close();
        };
        tx.onerror = () => {
          reject(tx.error);
          db.close();
        };
      })
  );
}

// ─── Tauri Filesystem Helpers ───────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
async function tauriWriteNote(localPath: string, note: Note & { user_id?: string }) {
  if (!isTauri()) return;
  await loadTauriPlugins();
  if (!tauriFs) return;

  const base = normalizeFsPath(localPath);
  if (isFileNoteId(note.id)) {
    // For notes loaded from existing local files, write back to original file path.
    const relPath = decodeURIComponent(note.id.slice(FILE_NOTE_PREFIX.length));
    const targetPath = `${base}/${relPath}`;
    const plainText = note.content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    await tauriFs.writeTextFile(targetPath, plainText);
    return;
  }
  // If note.folder_id is a virtual filesystem folder id, write into that subdir.
  // Otherwise, default to base root.
  let targetDir = base;
  if (isFsFolderId(note.folder_id)) {
    const relDir = decodeURIComponent(note.folder_id.slice(FS_FOLDER_PREFIX.length));
    targetDir = relDir ? `${base}/${relDir}` : base;
  }

  await tauriFs.mkdir(targetDir, { recursive: true });
  await tauriFs.writeTextFile(`${targetDir}/${note.id}.json`, JSON.stringify(note, null, 2));
}

async function tauriReadAllNotesRecursive(basePath: string, currentDir: string): Promise<Note[]> {
  const entries = await tauriFs!.readDir(currentDir);
  const notes: Note[] = [];
  const sepPattern = /[\\/]/;
  const getEntryName = (entry: any): string => {
    if (typeof entry?.name === "string" && entry.name) return entry.name;
    if (typeof entry?.path === "string" && entry.path) {
      const parts = entry.path.split(sepPattern).filter(Boolean);
      return parts[parts.length - 1] || "";
    }
    return "";
  };
  const getEntryPath = (dir: string, entry: any): string => {
    if (typeof entry?.path === "string" && entry.path) return normalizeFsPath(entry.path);
    const name = getEntryName(entry);
    return `${dir}/${name}`;
  };

  const toIsoDate = (value: unknown, fallback: string): string => {
    if (typeof value !== "string" || !value) return fallback;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
  };

  const normalizeLegacyNote = (raw: any, fallbackId: string, relDir: string): Note | null => {
    if (!raw || typeof raw !== "object") return null;
    const now = new Date().toISOString();
    const id =
      (typeof raw.id === "string" && raw.id) ||
      (typeof raw.noteId === "string" && raw.noteId) ||
      fallbackId;
    if (!id) return null;
    const createdAt = toIsoDate(raw.created_at ?? raw.createdAt, now);
    const updatedAt = toIsoDate(raw.updated_at ?? raw.updatedAt ?? createdAt, createdAt);
    return {
      id,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "无标题笔记",
      content: typeof raw.content === "string" ? raw.content : "",
      folder_id: relDir ? folderIdFromRelDir(relDir) : null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: raw.deleted_at ?? null,
      is_pinned: !!raw.is_pinned,
      share_token: typeof raw.share_token === "string" ? raw.share_token : null,
      _contentLoaded: true,
    };
  };

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const extFromName = (name: string) => {
    const idx = name.lastIndexOf(".");
    return idx >= 0 ? name.slice(idx).toLowerCase() : "";
  };

  const isCodeExt = (ext: string) =>
    [".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".go", ".rs", ".cpp", ".c", ".cs", ".sql", ".sh", ".css", ".yaml", ".yml", ".json", ".xml", ".php", ".rb", ".swift", ".kt"].includes(ext);

  const fileIdFromRelPath = (relPath: string) => `file:${encodeURIComponent(relPath)}`;

  const parseNonJsonFile = async (entryPath: string, relDir: string, fileName: string): Promise<Note | null> => {
    const relPath = relDir ? `${relDir}/${fileName}` : fileName;
    const id = fileIdFromRelPath(relPath);
    const now = new Date().toISOString();
    const ext = extFromName(fileName);
    const title = fileName.replace(/\.[^/.]+$/, "") || fileName;
    try {
      const text = await tauriFs!.readTextFile(entryPath);
      let content = "";
      if (ext === ".md" || ext === ".markdown") {
        try {
          const { marked } = await import("marked");
          content = await marked(text);
        } catch {
          content = `<pre><code>${escapeHtml(text)}</code></pre>`;
        }
      } else if (ext === ".html" || ext === ".htm") {
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        content = bodyMatch ? bodyMatch[1] : text;
      } else if (isCodeExt(ext)) {
        const language = ext.replace(".", "") || "text";
        content = `<pre><code class="language-${language}">${escapeHtml(text)}</code></pre>`;
      } else {
        content = text
          .split(/\r?\n/)
          .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
          .join("");
      }
      return {
        id,
        title,
        content,
        folder_id: relDir ? folderIdFromRelDir(relDir) : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        is_pinned: false,
        share_token: null,
        _contentLoaded: true,
      };
    } catch {
      return null;
    }
  };

  for (const entry of entries) {
    const entryName = getEntryName(entry);
    const entryPath = getEntryPath(currentDir, entry);
    if (!entryName || !entryPath) continue;

    if (entry.isDirectory) {
      notes.push(...(await tauriReadAllNotesRecursive(basePath, entryPath)));
      continue;
    }

    if (entry.isFile) {
      const relDir = currentDir === basePath ? "" : currentDir.slice(basePath.length + 1);
      if (entryName.endsWith(".json")) {
        try {
          const content = await tauriFs!.readTextFile(entryPath);
          const fallbackId = (entryName || "").replace(/\.json$/i, "");
          const normalized = normalizeLegacyNote(JSON.parse(content), fallbackId, relDir);
          if (normalized) notes.push(normalized);
        } catch {
          // Ignore malformed file and continue scanning.
        }
      } else {
        const nonJson = await parseNonJsonFile(entryPath, relDir, entryName);
        if (nonJson) notes.push(nonJson);
      }
    }
  }

  return notes;
}

async function tauriReadAllNotes(localPath: string): Promise<Note[]> {
  if (!isTauri() || !localPath) return [];
  await loadTauriPlugins();
  if (!tauriFs) return [];

  const base = normalizeFsPath(localPath);
  let notes: Note[] = [];
  try {
    notes = await tauriReadAllNotesRecursive(base, base);
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    const missingDir =
      /ENOENT|NotFound|cannot find|does not exist|path not found/i.test(msg);
    if (missingDir) {
      try {
        await tauriFs.mkdir(base, { recursive: true });
        notes = [];
      } catch {}
    } else {
      throw e;
    }
  }
  const byId = new Map<string, Note>();
  for (const note of notes) {
    const existed = byId.get(note.id);
    if (!existed || new Date(note.updated_at).getTime() >= new Date(existed.updated_at).getTime()) {
      byId.set(note.id, note);
    }
  }
  return Array.from(byId.values()).sort((a: Note, b: Note) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

async function tauriReadOneByIdRecursive(basePath: string, currentDir: string, noteId: string): Promise<Note | null> {
  let entries: Awaited<ReturnType<NonNullable<typeof tauriFs>["readDir"]>>;
  try {
    entries = await tauriFs!.readDir(currentDir);
  } catch {
    return null;
  }

  const sepPattern = /[\\/]/;
  const getEntryName = (entry: any): string => {
    if (typeof entry?.name === "string" && entry.name) return entry.name;
    if (typeof entry?.path === "string" && entry.path) {
      const parts = entry.path.split(sepPattern).filter(Boolean);
      return parts[parts.length - 1] || "";
    }
    return "";
  };
  const getEntryPath = (dir: string, entry: any): string => {
    if (typeof entry?.path === "string" && entry.path) return normalizeFsPath(entry.path);
    const name = getEntryName(entry);
    return `${dir}/${name}`;
  };

  for (const entry of entries) {
    const entryName = getEntryName(entry);
    const entryPath = getEntryPath(currentDir, entry);
    if (!entryName || !entryPath) continue;

    if (entry.isDirectory) {
      const found = await tauriReadOneByIdRecursive(basePath, entryPath, noteId);
      if (found) return found;
      continue;
    }

    if (entry.isFile && entryName === `${noteId}.json`) {
      const content = await tauriFs!.readTextFile(entryPath);
      const raw = JSON.parse(content) as any;
      const relDir = currentDir === basePath ? "" : currentDir.slice(basePath.length + 1);
      const now = new Date().toISOString();
      const note: Note = {
        id: (typeof raw.id === "string" && raw.id) || noteId,
        title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "无标题笔记",
        content: typeof raw.content === "string" ? raw.content : "",
        folder_id: relDir ? folderIdFromRelDir(relDir) : null,
        created_at: typeof raw.created_at === "string" ? raw.created_at : now,
        updated_at: typeof raw.updated_at === "string" ? raw.updated_at : now,
        deleted_at: raw.deleted_at ?? null,
        is_pinned: !!raw.is_pinned,
        share_token: typeof raw.share_token === "string" ? raw.share_token : null,
        _contentLoaded: true,
      };
      return note;
    }
  }

  return null;
}

async function tauriDeleteNote(localPath: string, noteId: string) {
  if (!isTauri()) return;
  await loadTauriPlugins();
  if (!tauriFs) return;
  const base = normalizeFsPath(localPath);

  if (isFileNoteId(noteId)) {
    const relPath = decodeURIComponent(noteId.slice(FILE_NOTE_PREFIX.length));
    await tauriFs.remove(`${base}/${relPath}`);
    return;
  }

  // Delete in the root first (fast path).
  try {
    await tauriFs.remove(`${base}/${noteId}.json`);
    return;
  } catch {}

  // Fallback: delete recursively for older notes stored in subfolders.
  async function delRec(dir: string): Promise<boolean> {
    let entries: Awaited<ReturnType<NonNullable<typeof tauriFs>["readDir"]>>;
    try {
      entries = await tauriFs!.readDir(dir);
    } catch {
      return false;
    }
    const sepPattern = /[\\/]/;
    const getEntryName = (entry: any): string => {
      if (typeof entry?.name === "string" && entry.name) return entry.name;
      if (typeof entry?.path === "string" && entry.path) {
        const parts = entry.path.split(sepPattern).filter(Boolean);
        return parts[parts.length - 1] || "";
      }
      return "";
    };
    const getEntryPath = (baseDir: string, entry: any): string => {
      if (typeof entry?.path === "string" && entry.path) return normalizeFsPath(entry.path);
      const name = getEntryName(entry);
      return `${baseDir}/${name}`;
    };
    for (const entry of entries) {
      const entryName = getEntryName(entry);
      const entryPath = getEntryPath(dir, entry);
      if (!entryName || !entryPath) continue;
      if (entry.isDirectory) {
        const ok = await delRec(entryPath);
        if (ok) return true;
        continue;
      }
      if (entry.isFile && entryName === `${noteId}.json`) {
        await tauriFs!.remove(entryPath);
        return true;
      }
    }
    return false;
  }

  await delRec(base);
}

async function tauriPickDirectory(): Promise<string | null> {
  if (!isTauri()) return null;
  await loadTauriPlugins();
  if (!tauriDialog) return null;
  try {
    const selected = await tauriDialog.open({ directory: true, multiple: false, title: "选择笔记保存目录" });
    return typeof selected === "string" ? selected : null;
  } catch (e) { console.error("Tauri dialog failed:", e); return null; }
}

// ─── Unified Local Storage API ──────────────────────────────────
export const localNotesStorage = {
  /** Get all notes metadata (without content for performance) */
  async getAll(localPath?: string): Promise<Note[]> {
    if (isTauri() && localPath) {
      return tauriReadAllNotes(localPath);
    }
    // Web: IndexedDB - return all fields (content is small enough for IndexedDB)
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.index("updated_at").openCursor(null, "prev");
      const results: Note[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  /** Get a single note by id (with full content) */
  async getOne(noteId: string, localPath?: string): Promise<Note | null> {
    if (isTauri() && localPath) {
      await loadTauriPlugins();
      if (!tauriFs) return null;
      const base = normalizeFsPath(localPath);
      // Fast path: try root.
      try {
        const content = await tauriFs.readTextFile(`${base}/${noteId}.json`);
        const raw = JSON.parse(content) as any;
        const now = new Date().toISOString();
        const note: Note = {
          id: (typeof raw.id === "string" && raw.id) || noteId,
          title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "无标题笔记",
          content: typeof raw.content === "string" ? raw.content : "",
          folder_id: null,
          created_at: typeof raw.created_at === "string" ? raw.created_at : now,
          updated_at: typeof raw.updated_at === "string" ? raw.updated_at : now,
          deleted_at: raw.deleted_at ?? null,
          is_pinned: !!raw.is_pinned,
          share_token: typeof raw.share_token === "string" ? raw.share_token : null,
          _contentLoaded: true,
        };
        return note;
      } catch {}

      // Fallback: recursive scan for older notes in subfolders.
      return tauriReadOneByIdRecursive(base, base, noteId);
    }
    // Web: IndexedDB
    return idbTransaction("readonly", (store) => store.get(noteId));
  },

  async save(note: Note, localPath?: string): Promise<void> {
    if (isTauri() && localPath) {
      await tauriWriteNote(localPath, note);
      return;
    }
    await idbTransaction("readwrite", (store) => store.put(note));
  },

  async delete(noteId: string, localPath?: string): Promise<void> {
    if (isTauri() && localPath) {
      await tauriDeleteNote(localPath, noteId);
      return;
    }
    await idbTransaction("readwrite", (store) => store.delete(noteId));
  },

  pickDirectory: tauriPickDirectory,
  isTauri,
};
