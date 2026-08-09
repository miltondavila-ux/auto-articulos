const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

function getKey(ip: string): string {
  return `login:${ip}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = getKey(ip);

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;

  entry.count++;
  return true;
}

// Limpieza cada 5 minutos para evitar memory leak
setInterval(cleanup, 5 * 60 * 1000);
