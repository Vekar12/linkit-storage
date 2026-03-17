const KEY = 'linkit_visibility';

export type Visibility = 'personal' | 'public';

export function getVisibility(slug: string): Visibility {
  if (typeof window === 'undefined') return 'personal';
  const map: Record<string, Visibility> = JSON.parse(localStorage.getItem(KEY) || '{}');
  return map[slug] ?? 'personal';
}

export function setVisibility(slug: string, visibility: Visibility): void {
  const map: Record<string, Visibility> = JSON.parse(localStorage.getItem(KEY) || '{}');
  map[slug] = visibility;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function removeVisibility(slug: string): void {
  const map: Record<string, Visibility> = JSON.parse(localStorage.getItem(KEY) || '{}');
  delete map[slug];
  localStorage.setItem(KEY, JSON.stringify(map));
}
