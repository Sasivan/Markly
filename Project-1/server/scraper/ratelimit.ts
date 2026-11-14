const requestTimestamps = new Map<string, number[]>();

// Clean up stale timestamps periodically
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, timestamps] of requestTimestamps.entries()) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        requestTimestamps.delete(key);
      } else {
        requestTimestamps.set(key, valid);
      }
    }
  }, 5 * 60 * 1000);

  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as any).unref();
  }
}

/**
 * Sliding window rate limiter:
 * Tracks exact timestamps within the window for the given identifier (session user ID or trusted IP).
 * Default: 30 requests per 60-second window.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = requestTimestamps.get(identifier) || [];
  const currentWindow = existing.filter((t) => t > windowStart);

  if (currentWindow.length >= maxRequests) {
    const oldestInWindow = currentWindow[0];
    const resetMs = Math.max(0, oldestInWindow + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil(resetMs / 1000),
    };
  }

  currentWindow.push(now);
  requestTimestamps.set(identifier, currentWindow);

  return {
    allowed: true,
    remaining: maxRequests - currentWindow.length,
    resetInSec: Math.ceil(windowMs / 1000),
  };
}
