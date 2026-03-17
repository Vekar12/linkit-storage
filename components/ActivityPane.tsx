import { useEffect, useState } from 'react';
import { Clock, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { getHistory, type HistoryEntry } from '@/lib/history';

export default function RecentActivity() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getHistory());
    const handler = () => setEntries(getHistory());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const icon = (type: HistoryEntry['type']) => {
    if (type === 'created') return <Plus size={12} className="text-primary" />;
    if (type === 'updated') return <RefreshCw size={12} className="text-amber-400" />;
    return <Trash2 size={12} className="text-red-400" />;
  };

  const label = (type: HistoryEntry['type']) => {
    if (type === 'created') return 'Created';
    if (type === 'updated') return 'Updated';
    return 'Deleted';
  };

  const labelColor = (type: HistoryEntry['type']) => {
    if (type === 'created') return 'text-primary';
    if (type === 'updated') return 'text-amber-400';
    return 'text-red-400';
  };

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-dark-text">Recent Activity</h2>
      </div>

      {entries.length === 0 ? (
        <div
          className="rounded-2xl border border-dark-border p-12 text-center"
          style={{ backgroundColor: '#161b22' }}
        >
          <Clock size={32} className="text-dark-dim mx-auto mb-3" />
          <p className="text-dark-muted text-sm">No activity yet.</p>
          <p className="text-dark-dim text-xs mt-1">
            Actions like creating, updating, or deleting projects will appear here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border border-dark-border overflow-hidden"
          style={{ backgroundColor: '#161b22' }}
        >
          <ul className="divide-y divide-dark-border">
            {entries.map((e, i) => (
              <li key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-dark-raised transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#1c2333' }}
                >
                  {icon(e.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-text truncate">{e.projectName}</p>
                  <p className="text-xs text-dark-muted mt-0.5 font-mono">{e.slug}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-semibold ${labelColor(e.type)}`}>{label(e.type)}</p>
                  <p className="text-xs text-dark-dim mt-0.5">{timeAgo(e.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
