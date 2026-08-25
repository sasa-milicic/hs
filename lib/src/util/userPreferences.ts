const STORAGE_KEY = 'hybridsign-user-preferences';

function readAll(): Record<string, unknown> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function getUserPreference<T>(key: string): T | undefined {
  return readAll()[key] as T | undefined;
}

export function saveUserPreference<T>(key: string, value: T): void {
  const all = readAll();
  all[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
