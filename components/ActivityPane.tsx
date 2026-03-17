import { useEffect, useState } from 'react';
import { Clock, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { getHistory, type HistoryEntry } from '@/lib/history';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function icon(type: HistoryEntry['type']) {
  if (type === 'created') return <Plus size={13} className="text-violet-600" />;
  if (type === 'updated') return <RefreshCw size={13} className="text-amber-500" />;
  return <Trash2 size={13} className="text-red-500" />;
}

function iconBg(type: HistoryEntry['type']) {
  if (type === 'created') return 'bg-violet-100';
  if (type === 'updated') return 'bg-amber-100';
  return 'bg-red-100';
}

function labelColor(type: HistoryEntry['type']) {
  if (type === 'created') return 'text-violet-600';
  if (type === 'updated') return 'text-amber-500';
  return 'text-red-500';
}

function label(type: HistoryEntry['type']) {
  if (type === 'created') return 'Created';
  if (type === 'updated') return 'Updated';
  return 'Deleted';
}

export default function RecentActivity() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getHistory());
    const handler = () => setEntries(getHistory());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-gray-900">Recent Activity</h1>
        <p className="text-gray-400 text-sm mt-1">Your last {entries.length} actions across all projects.</p>
      </div>

      {entries.length === 0 ? (
        <div className="li-card text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-gray-300" />
          </div>
          <p className="text-gray-600 font-semibold text-base mb-1">No activity yet</p>
          <p className="text-gray-400 text-sm">
            Creating, updating, or deleting projects will appear here.
          </p>
        </div>
      ) : (
        <div className="li-card !p-0 overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {entries.map((e, i) => (
              <li key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg(e.type)}`}>
                  {icon(e.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{e.projectName}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{e.slug}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-semibold ${labelColor(e.type)}`}>{label(e.type)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(e.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
