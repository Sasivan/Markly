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
 * Extracts the trusted client IP from platform-verified headers.
 * Never trusts a client-spoofed leftmost X-Forwarded-For value.
 * Priority:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Nginx / standard reverse proxy)
 * 3. x-vercel-proxied-for (Vercel edge)
 * 4. fly-client-ip (Fly.io)
 * 5. Rightmost entry of x-forwarded-for (appended by closest upstream proxy)
 * 6. Fallback: "127.0.0.1"
 */
export function getTrustedClientIp(
  reqOrHeaders: Request | Headers | { get(name: string): string | null }
): string {
  const getHeader = (name: string): string | null => {
    if ("headers" in reqOrHeaders && typeof (reqOrHeaders as any).headers?.get === "function") {
      return (reqOrHeaders as any).headers.get(name);
    }
    if (typeof (reqOrHeaders as any).get === "function") {
      return (reqOrHeaders as any).get(name);
    }
    return null;
  };

  const cf = getHeader("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();

  const realIp = getHeader("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const vercel = getHeader("x-vercel-proxied-for");
  if (vercel?.trim()) return vercel.trim();

  const fly = getHeader("fly-client-ip");
  if (fly?.trim()) return fly.trim();

  // If x-forwarded-for is present, take the rightmost IP (closest to server), never the client-supplied leftmost
  const xff = getHeader("x-forwarded-for");
  if (xff?.trim()) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return "127.0.0.1";
}

/**
 * Sliding window rate limiter:
 * Tracks exact timestamps within the window for the given identifier (session user ID or trusted IP).
 * NOTE: Operates in-memory (per-instance). If Upstash KV or external Redis is configured,
 * it acts as an additional layer of local DDoS protection.
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
