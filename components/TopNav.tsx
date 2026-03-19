import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Link2, Bell, LogOut, ChevronDown, Upload, LayoutGrid, Clock, Menu, X } from 'lucide-react';
import { logout } from '@/lib/auth';
import { getTokenPayload, type TokenPayload } from '@/lib/jwt';

export default function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getTokenPayload());
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname, router.query]);

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
          {/* Bell — desktop only (notifications coming soon) */}
          <button
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative"
            title="Notifications"
          >
            <Bell size={17} />
          </button>

          {/* Avatar dropdown — always visible */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
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
