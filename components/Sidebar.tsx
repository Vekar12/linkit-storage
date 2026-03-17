import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutGrid, Upload, Clock, Link2, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';

export default function Sidebar() {
  const router = useRouter();

  const currentView = router.query.view as string | undefined;

  const isActive = (view?: string) => {
    if (!view) return router.pathname === '/dashboard' && !currentView;
    return router.pathname === '/dashboard' && currentView === view;
  };

  const handleLogout = () => {
    logout();
  };

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

      {/* Bottom: logout */}
      <div className="px-3 py-4 border-t border-dark-border">
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
