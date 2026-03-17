import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Link2 } from 'lucide-react';
import { loginWithGitHub, loginWithGoogle, checkAuth } from '@/lib/auth';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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

            <div className="flex flex-col gap-3">
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-200 py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200 shadow-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={loginWithGitHub}
                className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-700 transition-colors duration-200"
              >
                <GitHubIcon />
                Continue with GitHub
              </button>
            </div>

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
