import { getFileWithSHA, uploadFile } from './githubService';

const CSV_PATH = 'users/users.csv';
const CSV_HEADER = 'sub,provider,name,email,avatar,firstLoginAt,lastLoginAt,loginCount';

export interface UserRecord {
  sub: string;
  provider: 'github' | 'google';
  name: string;
  email: string;
  avatar: string;
  firstLoginAt: string;
  lastLoginAt: string;
  loginCount: number;
}

// Wrap a value in quotes if it contains commas, quotes, or newlines
function escapeField(value: string): string {
  if (/[,"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toRow(u: UserRecord): string {
  return [
    u.sub, u.provider, u.name, u.email, u.avatar,
    u.firstLoginAt, u.lastLoginAt, String(u.loginCount),
  ].map(escapeField).join(',');
}

// Minimal CSV line parser — handles quoted fields
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(raw: string): UserRecord[] {
  const lines = raw.trim().split('\n').slice(1); // skip header
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const [sub, provider, name, email, avatar, firstLoginAt, lastLoginAt, loginCount] = parseRow(line);
      return {
        sub, provider: provider as 'github' | 'google',
        name, email, avatar, firstLoginAt, lastLoginAt,
        loginCount: parseInt(loginCount, 10) || 1,
      };
    });
}

// Returns a map of sub → name for all known users (used to backfill attribution)
export async function getUserNameMap(): Promise<Map<string, string>> {
  try {
    const file = await getFileWithSHA(CSV_PATH);
    if (!file) return new Map();
    const raw = Buffer.from(file.content, 'base64').toString('utf-8');
    return new Map(parseCSV(raw).map((u) => [u.sub, u.name]));
  } catch {
    return new Map();
  }
}

export async function upsertUserRecord(
  sub: string,
  provider: 'github' | 'google',
  name: string,
  email = '',
  avatar = ''
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const file = await getFileWithSHA(CSV_PATH);

    if (file) {
      // Decode existing CSV
      const raw = Buffer.from(file.content, 'base64').toString('utf-8');
      const users = parseCSV(raw);
      const idx = users.findIndex((u) => u.sub === sub);

      if (idx >= 0) {
        // Update existing row
        users[idx] = { ...users[idx], name, email, avatar, lastLoginAt: now, loginCount: users[idx].loginCount + 1 };
      } else {
        // Append new row
        users.push({ sub, provider, name, email, avatar, firstLoginAt: now, lastLoginAt: now, loginCount: 1 });
      }

      const updated = [CSV_HEADER, ...users.map(toRow)].join('\n') + '\n';
      await uploadFile(CSV_PATH, Buffer.from(updated, 'utf-8'), `chore: update user ${sub}`, file.sha);
    } else {
      // Create the CSV for the first time
      const firstRow = toRow({ sub, provider, name, email, avatar, firstLoginAt: now, lastLoginAt: now, loginCount: 1 });
      const content = [CSV_HEADER, firstRow].join('\n') + '\n';
      await uploadFile(CSV_PATH, Buffer.from(content, 'utf-8'), `chore: create users sheet, first user ${sub}`);
    }
  } catch {
    // Never block login due to a user-record write failure
  }
}
