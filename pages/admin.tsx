import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Users, LayoutGrid, TrendingUp, FileText, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAdminStats, getAdminUsers, getAdminActivity } from '@/services/api';
import { checkAuth } from '@/lib/auth';
import { getTokenPayload } from '@/lib/jwt';
import { isAdminUser } from '@/lib/admin';
import type { AdminStats, AdminUser, AdminActivity } from '@/types';

const typeColors: Record<string, string> = {
  html: 'bg-orange-400',
  pdf: 'bg-red-400',
  md: 'bg-blue-400',
  pptx: 'bg-amber-400',
  png: 'bg-emerald-400',
  jpg: 'bg-emerald-400',
  jpeg: 'bg-emerald-400',
  zip: 'bg-sky-400',
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminPage() {
  const router = useRouter();
  const payload = getTokenPayload();
  const isAdmin = isAdminUser(payload?.sub);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checkAuth()) { router.replace('/login'); return; }
    if (!isAdmin) { setLoading(false); return; }

    const load = async () => {
      try {
        const [s, u, a] = await Promise.all([
          getAdminStats(),
          getAdminUsers(),
          getAdminActivity(20),
        ]);
        setStats(s);
        setUsers(u.sort((a, b) => b.projectCount - a.projectCount));
        setActivity(a);
      } catch (err) {
        console.error('Admin data load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, isAdmin]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="li-card max-w-md mx-auto py-12">
            <p className="text-lg font-bold text-gray-800 mb-2">Access Denied</p>
            <p className="text-sm text-gray-400">You do not have permission to view this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <RefreshCw size={24} className="animate-spin text-primary mx-auto" />
          <p className="text-sm text-gray-400 mt-3">Loading admin data...</p>
        </div>
      </DashboardLayout>
    );
  }

  const fileTypes = stats?.projectsByFileType ?? {};
  const maxFileTypeCount = Math.max(...Object.values(fileTypes), 1);
  const fileTypeCount = Object.keys(fileTypes).length;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, bg: 'bg-violet-100', color: 'text-violet-600' },
    { label: 'Total Projects', value: stats?.totalProjects ?? 0, icon: LayoutGrid, bg: 'bg-blue-100', color: 'text-blue-600' },
    { label: 'Recent Uploads (7d)', value: stats?.recentUploads ?? 0, icon: TrendingUp, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    { label: 'File Types', value: fileTypeCount, icon: FileText, bg: 'bg-orange-100', color: 'text-orange-500' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Platform-wide statistics and user activity.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="li-card flex items-start gap-4 !p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Projects by File Type */}
          <div className="li-card !p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Projects by File Type</h2>
            <div className="space-y-3">
              {Object.entries(fileTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const pct = Math.round((count / maxFileTypeCount) * 100);
                  const barColor = typeColors[type.toLowerCase()] ?? 'bg-gray-400';
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600 uppercase">{type}</span>
                        <span className="text-xs text-gray-400">{count}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(fileTypes).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No data yet.</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="li-card !p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No recent activity.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto">
                {activity.map((a, i) => (
                  <li key={`${a.slug}-${a.version}-${i}`} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <RefreshCw size={11} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">{a.projectName}</span>
                        {' '}v{a.version} by{' '}
                        <span className="font-semibold">{a.updatedBy || a.ownerName}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(a.uploadedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="li-card !p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400">User</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400">Provider</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400">Projects</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400">Last Login</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400">Logins</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.sub} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2.5">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                          {u.email && <p className="text-[10px] text-gray-400 truncate">{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">
                        {u.provider}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-xs font-semibold text-gray-700">{u.projectCount}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-xs text-gray-500">{timeAgo(u.lastLoginAt)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-xs text-gray-500">{u.loginCount}</span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-gray-400">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
