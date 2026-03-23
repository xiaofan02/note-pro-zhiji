// Lightweight note version history stored in localStorage
// Keeps up to 20 snapshots per note

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  savedAt: string;
}

const KEY = (noteId: string) => `note_versions_${noteId}`;
const MAX_VERSIONS = 20;
const MIN_INTERVAL_MS = 60_000; // don't save more than once per minute

export const noteVersions = {
  save(noteId: string, title: string, content: string) {
    try {
      const existing = this.getAll(noteId);
      const last = existing[0];
      // Skip if content unchanged or saved too recently
      if (last) {
        if (last.title === title && last.content === content) return;
        if (Date.now() - new Date(last.savedAt).getTime() < MIN_INTERVAL_MS) return;
      }
      const version: NoteVersion = {
        id: crypto.randomUUID(),
        noteId,
        title,
        content,
        savedAt: new Date().toISOString(),
      };
      const updated = [version, ...existing].slice(0, MAX_VERSIONS);
      localStorage.setItem(KEY(noteId), JSON.stringify(updated));
    } catch { /* storage full, skip */ }
  },

  getAll(noteId: string): NoteVersion[] {
    try {
      const raw = localStorage.getItem(KEY(noteId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  clear(noteId: string) {
    localStorage.removeItem(KEY(noteId));
  },
};
