import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Root page — redirect straight to dashboard.
// If the user is not logged in, the dashboard will redirect to /login.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
