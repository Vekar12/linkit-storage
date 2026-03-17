import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutGrid, Upload, Clock, Link2, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import { getTokenPayload, type TokenPayload } from '@/lib/jwt';

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState<TokenPayload | null>(null);

  useEffect(() => {
    setUser(getTokenPayload());
  }, []);

  const currentView = router.query.view as string | undefined;

  const isActive = (view?: string) => {
    if (!view) return router.pathname === '/dashboard' && !currentView;
    return router.pathname === '/dashboard' && currentView === view;
  };

  const handleLogout = () => {
    logout();
  };

  const displayName = user?.name || user?.login || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.avatar_url || user?.picture || null;
  const initials = displayName.slice(0, 2).toUpperCase();

  const navItems = [
    { label: 'Projects', icon: LayoutGrid, href: '/dashboard', view: undefined },
    { label: 'Upload', icon: Upload, href: '/dashboard?view=upload', view: 'upload' },
    { label: 'Recent', icon: Clock, href: '/dashboard?view=recent', view: 'recent' },
  ];

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 border-r border-dark-border"
      style={{ width: '220px', minHeight: '100vh', backgroundColor: '#161b22' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-dark-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-purple flex-shrink-0">
            <Link2 size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-dark-text group-hover:text-primary transition-colors">
            LinkIt
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ label, icon: Icon, href, view }) => (
          <Link
            key={label}
            href={href}
            className={isActive(view) ? 'sidebar-item-active' : 'sidebar-item'}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="px-3 py-4 border-t border-dark-border flex flex-col gap-2">
        {/* User info */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <span className="text-xs text-dark-muted truncate">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-left"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
