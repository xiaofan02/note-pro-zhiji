const KEY = "zhiji-recent-notes";
const MAX = 10;

export interface RecentNote {
  id: string;
  title: string;
  folderId: string | null;
  openedAt: string;
}

export const useRecentNotes = () => {
  const getRecent = (): RecentNote[] => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  };

  const pushRecent = (note: { id: string; title: string; folder_id: string | null }) => {
    const list = getRecent().filter(r => r.id !== note.id);
    list.unshift({ id: note.id, title: note.title, folderId: note.folder_id, openedAt: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  };

  const clearRecent = () => localStorage.removeItem(KEY);

  return { getRecent, pushRecent, clearRecent };
};
