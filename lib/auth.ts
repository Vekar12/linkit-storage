const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Redirects the browser to GitHub OAuth login.
 */
export const loginWithGitHub = (): void => {
  window.location.href =
    `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`;
};

/**
 * Redirects the browser to Google OAuth login via backend.
 */
export const loginWithGoogle = (): void => {
  window.location.href = `${API_URL}/auth/google`;
};

/**
 * Stores the access token returned from the backend OAuth callback.
 */
export const saveToken = (token: string): void => {
  localStorage.setItem('linkit_token', token);
};

/**
 * Returns true if a valid, non-expired token exists in localStorage.
 */
export const checkAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('linkit_token');
  if (!token) return false;
  // Lazy import to avoid circular deps — inline the expiry check
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('linkit_token');
      return false;
    }
  } catch {
    // Non-JWT token (e.g. raw GitHub token) — treat as valid
  }
  return true;
};

/**
 * Clears the token and redirects to login.
 */
export const logout = (): void => {
  localStorage.removeItem('linkit_token');
  window.location.href = '/login';
};
