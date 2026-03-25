import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Link2, Bell, LogOut, ChevronDown, Upload, LayoutGrid, Clock, Menu, X, RefreshCw, Trash2 } from 'lucide-react';
import { logout } from '@/lib/auth';
import { getTokenPayload, type TokenPayload } from '@/lib/jwt';
import { getNotifications, getUnreadCount, markNotificationsRead, clearNotifications } from '@/services/api';
import type { Notification } from '@/types';
import { checkAuth } from '@/lib/auth';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const PAGE_SIZE = 20;
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getTokenPayload());
  }, []);

  // Poll unread count every 30s
  const refreshUnreadCount = useCallback(async () => {
    if (!checkAuth()) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[TopNav] unread count fetch failed', err);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const id = setInterval(refreshUnreadCount, 30_000);
    return () => clearInterval(id);
  }, [refreshUnreadCount]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname, router.query]);

  const handleOpenNotif = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (!opening) return;
    if (notifLoading) return;
    setNotifLoading(true);
    try {
      const list = await getNotifications({ limit: PAGE_SIZE, offset: 0 });
      setNotifications(list);
      setHasMore(list.length === PAGE_SIZE);
      const unread = list.filter((n) => !n.read);
      if (unread.length > 0) {
        await markNotificationsRead(unread.map((n) => n.id)).catch(() => {});
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[TopNav] notifications fetch failed', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const list = await getNotifications({ limit: PAGE_SIZE, offset: notifications.length });
      setNotifications((prev) => [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
      const unread = list.filter((n) => !n.read);
      if (unread.length > 0) {
        const unreadIds = new Set(unread.map((n) => n.id));
        await markNotificationsRead(unread.map((n) => n.id)).catch(() => {});
        setNotifications((prev) => prev.map((n) => (unreadIds.has(n.id) ? { ...n, read: true } : n)));
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[TopNav] load more failed', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleClearAll = async () => {
    if (clearing) return;
    setNotifications([]);
    setHasMore(false);
    setUnreadCount(0);
    setClearing(true);
    try {
      await clearNotifications();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[TopNav] clear notifications failed', err);
    } finally {
      setClearing(false);
    }
  };

  const currentView = typeof router.query.view === 'string' ? router.query.view : undefined;
  const isActive = (view?: string) => {
    if (!view) return router.pathname === '/dashboard' && !currentView;
    return router.pathname === '/dashboard' && currentView === view;
  };

  const displayName = user?.name || user?.login || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.avatar_url || user?.picture || null;
  const initials = displayName.slice(0, 2).toUpperCase();

  const navItems = [
    { label: 'Projects', icon: LayoutGrid, view: undefined, href: '/dashboard' },
    { label: 'Upload',   icon: Upload,      view: 'upload',    href: '/dashboard?view=upload' },
    { label: 'Recent',   icon: Clock,       view: 'recent',    href: '/dashboard?view=recent' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
          >
            <Link2 size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">LinkIt</span>
        </Link>

        {/* Tab nav — desktop only */}
        <nav
          className="hidden sm:flex items-center gap-0.5 rounded-full px-1.5 py-1.5"
          style={{ backgroundColor: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          {navItems.map(({ label, view, href }) => (
            <Link key={label} href={href} className={isActive(view) ? 'nav-tab-active' : 'nav-tab'}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-1">

          {/* Notification bell — desktop only */}
          <div className="relative hidden sm:block" ref={notifRef}>
            <button
              onClick={handleOpenNotif}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl overflow-hidden z-50"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && !notifLoading && (
                      <button
                        onClick={handleClearAll}
                        disabled={clearing}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        title="Clear all"
                      >
                        <Trash2 size={11} />
                        Clear all
                      </button>
                    )}
                    {(notifLoading || clearing) && <RefreshCw size={13} className="text-gray-300 animate-spin" />}
                  </div>
                </div>

                {notifications.length === 0 && !notifLoading ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={20} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No notifications yet.</p>
                    <p className="text-xs text-gray-300 mt-0.5">You&apos;ll be notified when a project you&apos;ve contributed to is updated.</p>
                  </div>
                ) : (
                  <>
                  <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-violet-50/40' : ''}`}
                        onClick={() => {
                          setNotifOpen(false);
                          router.push(`/projects/${n.slug}?owner=${n.ownerId}`);
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <RefreshCw size={12} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold">{n.projectName}</span>
                            {' '}was updated by{' '}
                            <span className="font-semibold">{n.updatedBy}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.updatedAt)}</p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </li>
                    ))}
                  </ul>
                  {hasMore && (
                    <div className="px-4 py-2.5 border-t border-gray-50">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium py-1 disabled:opacity-50 transition-colors"
                      >
                        {loadingMore && <RefreshCw size={11} className="animate-spin" />}
                        {loadingMore ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Avatar dropdown — always visible */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              {avatarUrl && !avatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-7 h-7 rounded-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
              )}
              <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white rounded-2xl py-1.5 z-50"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  {user?.email && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors ml-0.5"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {navItems.map(({ label, icon: Icon, view, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive(view)
                  ? 'bg-violet-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
