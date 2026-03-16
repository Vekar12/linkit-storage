import { useEffect, useState } from 'react';
import { Clock, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { getHistory, type HistoryEntry } from '@/lib/history';

export default function ActivityPane() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getHistory());
    // refresh whenever localStorage changes (e.g. from other tab)
    const handler = () => setEntries(getHistory());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const icon = (type: HistoryEntry['type']) => {
    if (type === 'created') return <Plus size={10} className="text-primary" />;
    if (type === 'updated') return <RefreshCw size={10} className="text-amber-500" />;
    return <Trash2 size={10} className="text-red-400" />;
  };

  const label = (type: HistoryEntry['type']) => {
    if (type === 'created') return 'Created';
    if (type === 'updated') return 'Updated';
    return 'Deleted';
  };

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="w-44 flex-shrink-0 bg-white rounded-2xl border border-purple-100 shadow-sm p-3 self-start sticky top-20">
      <div className="flex items-center gap-1.5 mb-3">
        <Clock size={13} className="text-primary" />
        <h2 className="text-xs font-bold text-gray-900">Activity</h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {entries.map((e, i) => (
            <li key={i} className="flex gap-2">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                {icon(e.type)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{e.projectName}</p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {label(e.type)} · {timeAgo(e.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
