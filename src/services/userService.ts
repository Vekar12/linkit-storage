import { readJSON, writeJSON } from './githubService';

export interface UserRecord {
  sub: string;
  provider: 'github' | 'google';
  name: string;
  email?: string;
  avatar?: string;
  firstLoginAt: string;
  lastLoginAt: string;
  loginCount: number;
}

// Upsert user record on every login — creates on first visit, updates lastLoginAt thereafter
export async function upsertUserRecord(
  sub: string,
  provider: 'github' | 'google',
  name: string,
  email?: string,
  avatar?: string
): Promise<void> {
  const path = `users/${sub}.json`;
  const now = new Date().toISOString();

  try {
    const existing = await readJSON<UserRecord>(path);

    if (existing) {
      await writeJSON(path, {
        ...existing,
        name,         // update in case they changed their display name
        email,
        avatar,
        lastLoginAt: now,
        loginCount: (existing.loginCount ?? 1) + 1,
      }, `chore: update user record ${sub}`);
    } else {
      await writeJSON(path, {
        sub,
        provider,
        name,
        email,
        avatar,
        firstLoginAt: now,
        lastLoginAt: now,
        loginCount: 1,
      }, `chore: register user ${sub}`);
    }
  } catch {
    // Never block login due to a user-record write failure
  }
}
