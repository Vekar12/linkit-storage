import { Link2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-purple-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <Link2 size={16} />
          LinkIt
        </div>

        {/* Tagline */}
        <p className="text-xs text-gray-400 text-center">
          Upload once. Share forever. Update anytime.
        </p>

        {/* Copyright */}
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} LinkIt. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
