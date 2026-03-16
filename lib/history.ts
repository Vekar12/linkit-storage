export interface HistoryEntry {
  type: 'created' | 'updated' | 'deleted';
  projectName: string;
  slug: string;
  at: string;
}

const KEY = 'linkit_history';

export const getHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const addHistory = (entry: Omit<HistoryEntry, 'at'>): void => {
  const history = getHistory();
  history.unshift({ ...entry, at: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(history.slice(0, 100)));
};
