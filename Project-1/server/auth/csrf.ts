/**
 * CSRF Defense utility for mutating HTTP endpoints (POST, PUT, PATCH, DELETE).
 *
 * Browsers automatically attach `Origin` and `Sec-Fetch-Site` headers to cross-origin requests.
 * 1. If `sec-fetch-site` is present:
 *    - "cross-site": untrusted cross-origin request -> BLOCKED.
 *    - "same-origin", "same-site", "none": trusted -> ALLOWED.
 * 2. If `origin` header is present:
 *    - Compare origin hostname/port with `host`, `x-forwarded-host`, and `NEXT_PUBLIC_APP_URL`.
 *    - If mismatched -> BLOCKED.
 * 3. If neither `origin` nor `referer` is present:
 *    - Allowed (non-browser clients, server-side fetch, vitest test runner).
 */
export function validateCsrfOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  // Safe idempotent methods do not mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  // 1. Check Sec-Fetch-Site header (standard modern browser header)
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  // 2. Check Origin header
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host");

      if (hostHeader) {
        const cleanHostHeader = hostHeader.toLowerCase().trim();
        const originHostWithPort = originUrl.host.toLowerCase();
        if (cleanHostHeader === originHostWithPort) {
          return true;
        }
        if (cleanHostHeader === originUrl.hostname.toLowerCase()) {
          return true;
        }
      }

      // Check configured NEXT_PUBLIC_APP_URL
      if (process.env.NEXT_PUBLIC_APP_URL) {
        try {
          const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
          if (originUrl.origin.toLowerCase() === appUrl.origin.toLowerCase()) {
            return true;
          }
        } catch {}
      }

      // Allow local development / loopback origins matching localhost
      if (["localhost", "127.0.0.1", "[::1]"].includes(originUrl.hostname.toLowerCase())) {
        if (!hostHeader || hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1")) {
          return true;
        }
      }

      // Origin was explicitly provided but matched neither host nor app url
      return false;
    } catch {
      return false;
    }
  }

  // 3. Fallback to Referer header if Origin was not sent
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host");

      if (hostHeader) {
        const cleanHostHeader = hostHeader.toLowerCase().trim();
        if (
          cleanHostHeader === refererUrl.host.toLowerCase() ||
          cleanHostHeader === refererUrl.hostname.toLowerCase()
        ) {
          return true;
        }
      }

      if (process.env.NEXT_PUBLIC_APP_URL) {
        try {
          const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
          if (refererUrl.origin.toLowerCase() === appUrl.origin.toLowerCase()) {
            return true;
          }
        } catch {}
      }

      if (["localhost", "127.0.0.1", "[::1]"].includes(refererUrl.hostname.toLowerCase())) {
        if (!hostHeader || hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1")) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // Non-browser / test-runner requests without origin/referer are permitted
  return true;
}
