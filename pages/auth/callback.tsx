import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Link2 } from 'lucide-react';
import { saveToken } from '@/lib/auth';

/**
 * Backend exchanges the GitHub code, then redirects here with ?token=gho_...
 * We store the token and redirect to dashboard.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { token, code, error } = router.query;

    if (error) {
      router.replace('/login?error=auth_failed');
      return;
    }

    // Case 1: backend already exchanged code and sent ?token=
    if (token) {
      saveToken(token as string);
      router.replace('/dashboard');
      return;
    }

    // Case 2: GitHub sent ?code= directly to frontend — forward to backend
    if (code) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      fetch(`${apiUrl}/auth/callback?code=${code}`)
        .then((res) => {
          if (!res.ok) throw new Error('Auth failed');
          return res.json();
        })
        .then((data) => {
          const t = data.access_token || data.token;
          if (!t) throw new Error('No token in response');
          saveToken(t);
          router.replace('/dashboard');
        })
        .catch(() => router.replace('/login?error=auth_failed'));
      return;
    }

    router.replace('/login?error=auth_failed');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Link2 size={32} className="text-primary animate-pulse" />
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  );
}
