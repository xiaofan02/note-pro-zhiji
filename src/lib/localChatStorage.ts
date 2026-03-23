/**
 * Local Chat Storage
 * - Web: IndexedDB
 * - Tauri: JSON files in {localPath}/.chat/
 */
import { isTauri } from "./localNotesStorage";

const DB_NAME = "zhiji-chat-local";
const DB_VERSION = 1;
const CONV_STORE = "conversations";
const MSG_STORE = "messages";

export interface LocalConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface LocalChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ─── Tauri fs module (lazy-loaded once) ─────────────────────────
let tauriFs: typeof import("@tauri-apps/plugin-fs") | null = null;

async function loadFs() {
  if (!isTauri()) return;
  if (!tauriFs) {
    try { tauriFs = await import("@tauri-apps/plugin-fs"); } catch {}
  }
}

// ─── IndexedDB ──────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CONV_STORE)) {
        const s = db.createObjectStore(CONV_STORE, { keyPath: "id" });
        s.createIndex("updated_at", "updated_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(MSG_STORE)) {
        const s = db.createObjectStore(MSG_STORE, { keyPath: "id" });
        s.createIndex("conversation_id", "conversation_id", { unique: false });
        s.createIndex("created_at", "created_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTx(db: IDBDatabase, stores: string[], mode: IDBTransactionMode) {
  return db.transaction(stores, mode);
}

// ─── Tauri helpers ──────────────────────────────────────────────
function chatDir(localPath: string) { return `${localPath}/.chat`; }

async function tauriReadJson<T>(path: string): Promise<T | null> {
  await loadFs();
  if (!tauriFs) return null;
  try { return JSON.parse(await tauriFs.readTextFile(path)); } catch { return null; }
}

async function tauriWriteJson(path: string, data: any, localPath: string) {
  await loadFs();
  if (!tauriFs) return;
  await tauriFs.mkdir(chatDir(localPath), { recursive: true }).catch(() => {});
  await tauriFs.writeTextFile(path, JSON.stringify(data, null, 2));
}

// ─── Unified API ────────────────────────────────────────────────
export const localChatStorage = {
  async getConversations(localPath?: string): Promise<LocalConversation[]> {
    if (isTauri() && localPath) {
      await loadFs();
      if (!tauriFs) return [];
      try {
        const entries = await tauriFs.readDir(chatDir(localPath));
        const convs: LocalConversation[] = [];
        for (const e of entries) {
          if (e.name?.startsWith("conv_") && e.name.endsWith(".json")) {
            const data = await tauriReadJson<LocalConversation>(`${chatDir(localPath)}/${e.name}`);
            if (data) convs.push(data);
          }
        }
        return convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } catch { return []; }
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = idbTx(db, [CONV_STORE], "readonly");
      const req = tx.objectStore(CONV_STORE).index("updated_at").openCursor(null, "prev");
      const results: LocalConversation[] = [];
      req.onsuccess = () => { const c = req.result; if (c) { results.push(c.value); c.continue(); } else resolve(results); };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async saveConversation(conv: LocalConversation, localPath?: string): Promise<void> {
    if (isTauri() && localPath) {
      await tauriWriteJson(`${chatDir(localPath)}/conv_${conv.id}.json`, conv, localPath);
      return;
    }
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idbTx(db, [CONV_STORE], "readwrite");
      const req = tx.objectStore(CONV_STORE).put(conv);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async deleteConversation(id: string, localPath?: string): Promise<void> {
    if (isTauri() && localPath) {
      await loadFs();
      if (tauriFs) await tauriFs.remove(`${chatDir(localPath)}/conv_${id}.json`).catch(() => {});
      if (tauriFs) await tauriFs.remove(`${chatDir(localPath)}/msgs_${id}.json`).catch(() => {});
      return;
    }
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idbTx(db, [CONV_STORE, MSG_STORE], "readwrite");
      tx.objectStore(CONV_STORE).delete(id);
      // delete all messages for this conversation
      const msgStore = tx.objectStore(MSG_STORE);
      const idx = msgStore.index("conversation_id");
      const req = idx.openCursor(IDBKeyRange.only(id));
      req.onsuccess = () => { const c = req.result; if (c) { c.delete(); c.continue(); } };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  },

  async getMessages(conversationId: string, localPath?: string): Promise<LocalChatMessage[]> {
    if (isTauri() && localPath) {
      const msgs = await tauriReadJson<LocalChatMessage[]>(`${chatDir(localPath)}/msgs_${conversationId}.json`);
      return msgs || [];
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = idbTx(db, [MSG_STORE], "readonly");
      const req = tx.objectStore(MSG_STORE).index("conversation_id").getAll(IDBKeyRange.only(conversationId));
      req.onsuccess = () => resolve((req.result as LocalChatMessage[]).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async saveMessage(msg: LocalChatMessage, localPath?: string): Promise<void> {
    if (isTauri() && localPath) {
      const existing = await tauriReadJson<LocalChatMessage[]>(`${chatDir(localPath)}/msgs_${msg.conversation_id}.json`) || [];
      const idx = existing.findIndex(m => m.id === msg.id);
      if (idx >= 0) existing[idx] = msg; else existing.push(msg);
      await tauriWriteJson(`${chatDir(localPath)}/msgs_${msg.conversation_id}.json`, existing, localPath);
      return;
    }
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idbTx(db, [MSG_STORE], "readwrite");
      const req = tx.objectStore(MSG_STORE).put(msg);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },
};
