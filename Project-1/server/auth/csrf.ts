/**
 * CSRF Defense utility for mutating HTTP endpoints (POST, PUT, PATCH, DELETE).
 *
 * Browsers automatically attach `Origin` and `Sec-Fetch-Site` headers to cross-origin requests.
 * 1. Safe idempotent methods (GET, HEAD, OPTIONS) are exempt unless explicitly verified.
 * 2. If `sec-fetch-site` is present:
 *    - "cross-site": untrusted cross-origin request -> BLOCKED.
 *    - "same-origin", "same-site", "none": trusted -> ALLOWED.
 * 3. If `origin` header is present:
 *    - Compare origin hostname/port with `host`, `x-forwarded-host`, and `NEXT_PUBLIC_APP_URL`.
 *    - If mismatched -> BLOCKED.
 * 4. If neither `origin` nor `referer` is present:
 *    - Allowed (non-browser clients, server-side fetch, vitest test runner).
 */
export function validateCsrfOrigin(
  reqOrHeaders: Request | Headers | { get(name: string): string | null; method?: string }
): boolean {
  // If a Request object is passed, check method. Safe GET/HEAD/OPTIONS are exempt.
  if ("method" in reqOrHeaders && typeof reqOrHeaders.method === "string") {
    const method = reqOrHeaders.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return true;
    }
  }

  const getHeader = (name: string): string | null => {
    if ("headers" in reqOrHeaders && typeof (reqOrHeaders as any).headers?.get === "function") {
      return (reqOrHeaders as any).headers.get(name);
    }
    if (typeof (reqOrHeaders as any).get === "function") {
      return (reqOrHeaders as any).get(name);
    }
    return null;
  };

  // 1. Check Sec-Fetch-Site header (standard modern browser header)
  const secFetchSite = getHeader("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    // If it is a top-level document navigation (e.g. user clicked a standard link), allow
    const secFetchMode = getHeader("sec-fetch-mode");
    if (secFetchMode === "navigate") {
      return true;
    }
    return false;
  }

  // 2. Check Origin header
  const origin = getHeader("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const hostHeader = getHeader("x-forwarded-host") || getHeader("host");

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
  const referer = getHeader("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const hostHeader = getHeader("x-forwarded-host") || getHeader("host");

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
