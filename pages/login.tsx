import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Link2 } from 'lucide-react';
import { loginWithGitHub, checkAuth } from '@/lib/auth';

// GitHub SVG icon (no extra dependency needed)
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If already logged in, skip to dashboard
  useEffect(() => {
    if (checkAuth()) {
      router.replace('/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Purple hero top */}
      <div
        className="flex-1 flex items-center justify-center px-4 py-16"
        style={{ background: 'linear-gradient(160deg, #7C3AED 0%, #6D28D9 60%, #F5F3FF 100%)' }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-purple-lg">
              <Link2 size={26} className="text-white" />
            </div>
            <span className="text-4xl font-extrabold text-white tracking-tight">LinkIt</span>
          </div>
          <p className="text-center text-purple-200 text-sm mb-10">
            Upload files. Share links. Update anytime.
          </p>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-purple-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm mb-8">
              Sign in with GitHub to manage your projects.
            </p>

            <button
              onClick={loginWithGitHub}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-700 transition-colors duration-200"
            >
              <GitHubIcon />
              Login with GitHub
            </button>

            {/* Feature pills */}
            <div className="flex justify-center gap-2 flex-wrap mt-8">
              {['Permanent links', 'Version history', 'Instant updates'].map((f) => (
                <span
                  key={f}
                  className="text-xs bg-secondary text-primary px-3 py-1 rounded-full font-medium"
                >
                  {f}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-6">
              By logging in you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-purple-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} LinkIt — Upload once. Share forever.
      </footer>
    </div>
  );
}
