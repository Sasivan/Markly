const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_eid",
  "ref",
  "ref_src",
  "source",
  "_hsenc",
  "_hsmi",
  "mc_cid",
]);

export interface NormalizedUrlResult {
  url: string;
  canonicalUrl: string;
  domain: string;
  protocol: string;
}

/**
 * Normalizes input URL string:
 * - Prepends https:// if protocol is omitted
 * - Strips marketing tracking parameters
 * - Enforces http / https protocol
 * - Computes canonical URL representation
 */
export function normalizeUrl(input: string): NormalizedUrlResult {
  let trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL cannot be empty");
  }

  // Check scheme if present
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      throw new Error(`Forbidden protocol '${scheme}:'. Only http: and https: are allowed.`);
    }
  } else {
    // Prepend https:// if no protocol provided
    trimmed = "https://" + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL format: '${input}'`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden protocol '${parsed.protocol}'. Only http: and https: are allowed.`);
  }

  // Strip tracking query parameters
  const paramsToDelete: string[] = [];
  parsed.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
      paramsToDelete.push(key);
    }
  });

  for (const key of paramsToDelete) {
    parsed.searchParams.delete(key);
  }

  // Strip trailing slash if path is just '/'
  let cleanUrl = parsed.toString();
  if (cleanUrl.endsWith("/") && parsed.pathname === "/" && !parsed.search && !parsed.hash) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  // Canonical base without hash
  const canonicalParsed = new URL(cleanUrl);
  canonicalParsed.hash = "";
  let canonicalUrl = canonicalParsed.toString();
  if (canonicalUrl.endsWith("/") && canonicalParsed.pathname === "/" && !canonicalParsed.search) {
    canonicalUrl = canonicalUrl.slice(0, -1);
  }

  const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");

  return {
    url: cleanUrl,
    canonicalUrl,
    domain,
    protocol: parsed.protocol,
  };
}
