/**
 * Local Notes Storage Service
 * - Web: uses IndexedDB for offline local storage
 * - Tauri desktop: uses filesystem to save notes as JSON files in a user-chosen directory
 */

import { Note } from "@/hooks/useNotes";

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
async function getTauriFs(): Promise<any> {
  try {
    return await (Function('return import("@tauri-apps/plugin-fs")')() as Promise<any>);
  } catch { return null; }
}

async function getTauriDialog(): Promise<any> {
  try {
    return await (Function('return import("@tauri-apps/plugin-dialog")')() as Promise<any>);
  } catch { return null; }
}

async function tauriWriteNote(localPath: string, note: Note & { user_id?: string }) {
  if (!isTauri()) return;
  const fs = await getTauriFs();
  if (!fs) return;
  try {
    await fs.mkdir(localPath, { recursive: true }).catch(() => {});
    await fs.writeTextFile(`${localPath}/${note.id}.json`, JSON.stringify(note, null, 2));
  } catch (e) { console.error("Tauri write failed:", e); }
}

async function tauriReadAllNotes(localPath: string): Promise<Note[]> {
  if (!isTauri() || !localPath) return [];
  const fs = await getTauriFs();
  if (!fs) return [];
  try {
    const entries = await fs.readDir(localPath);
    const notes: Note[] = [];
    for (const entry of entries) {
      if (entry.name?.endsWith(".json")) {
        try {
          const content = await fs.readTextFile(`${localPath}/${entry.name}`);
          notes.push(JSON.parse(content));
        } catch {}
      }
    }
    return notes.sort((a: Note, b: Note) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (e) { console.error("Tauri read failed:", e); return []; }
}

async function tauriDeleteNote(localPath: string, noteId: string) {
  if (!isTauri()) return;
  const fs = await getTauriFs();
  if (!fs) return;
  try { await fs.remove(`${localPath}/${noteId}.json`); } catch (e) { console.error("Tauri delete failed:", e); }
}

async function tauriPickDirectory(): Promise<string | null> {
  if (!isTauri()) return null;
  const dialog = await getTauriDialog();
  if (!dialog) return null;
  try {
    const selected = await dialog.open({ directory: true, multiple: false, title: "选择笔记保存目录" });
    return typeof selected === "string" ? selected : null;
  } catch (e) { console.error("Tauri dialog failed:", e); return null; }
}

// ─── Unified Local Storage API ──────────────────────────────────
export const localNotesStorage = {
  async getAll(localPath?: string): Promise<Note[]> {
    if (isTauri() && localPath) {
      return tauriReadAllNotes(localPath);
    }
    // Web: IndexedDB
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
