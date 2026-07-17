type RateLimitEntry = {
  count: number;
  resetsAt: number;
};

const memoryStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetsAt <= now) {
    memoryStore.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetsAt - now };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return { allowed: true, remaining: limit - existing.count };
}
