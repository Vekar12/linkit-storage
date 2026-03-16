import { useRouter } from 'next/router';
import { LogOut, Link2 } from 'lucide-react';
import { logout } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  return (
    <header
      className="sticky top-0 z-20"
      style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between w-full">
        {/* Logo */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 font-extrabold text-lg text-white tracking-tight"
        >
          <Link2 size={20} className="text-white/90" />
          LinkIt
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm font-medium"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  );
}
