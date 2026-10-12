// Admin user IDs — only these users can access /admin
const ADMIN_IDS = new Set([
  '110922760772516553877', // divmaharshi@gmail.com
]);

export function isAdminUser(userId: string | undefined): boolean {
  return !!userId && ADMIN_IDS.has(userId);
}
