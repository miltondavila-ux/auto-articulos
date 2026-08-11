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

export function checkLoginRateLimit(_ip: string): boolean {
  return true;
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function initRateLimitCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanup, 5 * 60 * 1000);
  }
}

export function stopRateLimitCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
