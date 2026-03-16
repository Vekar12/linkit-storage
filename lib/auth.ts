const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '';

/**
 * Redirects the browser to GitHub OAuth login.
 * GitHub redirects to backend /auth/callback, which then
 * redirects to the frontend /auth/callback?token=...
 */
export const loginWithGitHub = (): void => {
  window.location.href =
    `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`;
};

/**
 * Stores the access token returned from the backend OAuth callback.
 */
export const saveToken = (token: string): void => {
  localStorage.setItem('linkit_token', token);
};

/**
 * Returns true if a token exists in localStorage.
 */
export const checkAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('linkit_token');
};

/**
 * Clears the token and redirects to login.
 */
export const logout = (): void => {
  localStorage.removeItem('linkit_token');
  window.location.href = '/login';
};
