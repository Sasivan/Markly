import * as cheerio from "cheerio";
import { CandidateIcon, downloadAndConvertIcon, generateSvgAvatar } from "./icons";
import { safeFetchHtml } from "./fetcher";

export interface ScrapedMetadata {
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string | null;
  canonicalUrl: string;
  language: string | null;
  iconUrl: string;
  domain: string;
}

/**
 * Parses size string like "192x192" or "any" to a numeric value for ranking
 */
function parseIconSize(sizeAttr?: string): number {
  if (!sizeAttr) return 16;
  if (sizeAttr === "any") return 256;
  const match = sizeAttr.match(/(\d+)x(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 16;
}

/**
 * Extracts comprehensive metadata and resolves high-quality WebP icon from HTML.
 */
export async function parseHtmlMetadata(html: string, pageUrl: string, domain: string): Promise<ScrapedMetadata> {
  const $ = cheerio.load(html);

  // 1. Title Extraction
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const docTitle = $("title").first().text();
  const rawTitle = ogTitle || docTitle || twitterTitle || domain;
  const title = rawTitle.replace(/\s+/g, " ").trim();

  // 2. Description Extraction
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const metaDesc = $('meta[name="description"]').attr("content");
  const twitterDesc = $('meta[name="twitter:description"]').attr("content");
  const rawDesc = ogDesc || metaDesc || twitterDesc || "";
  const description = rawDesc.replace(/\s+/g, " ").trim();

  // 3. Image URL Extraction
  const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
  let imageUrl: string | null = null;
  if (ogImage) {
    try {
      imageUrl = new URL(ogImage, pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }

  // 4. Site Name
  const siteName = $('meta[property="og:site_name"]').attr("content") || null;

  // 5. Canonical URL
  const linkCanonical = $('link[rel="canonical"]').attr("href");
  let canonicalUrl = pageUrl;
  if (linkCanonical) {
    try {
      canonicalUrl = new URL(linkCanonical, pageUrl).toString();
    } catch {
      canonicalUrl = pageUrl;
    }
  }

  // 6. Language
  const language = $("html").attr("lang") || null;

  // 7. Icon Resolution Waterfall
  const iconCandidates: CandidateIcon[] = [];

  // Stage 1: Apple Touch Icons (often highest resolution 180x180)
  $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        const absUrl = new URL(href, pageUrl).toString();
        const sizes = $(el).attr("sizes");
        iconCandidates.push({
          url: absUrl,
          size: parseIconSize(sizes) || 180,
          source: "apple-touch-icon",
        });
      } catch {}
    }
  });

  // Stage 2: Standard Favicons (<link rel="icon"> or <link rel="shortcut icon">)
  $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        const absUrl = new URL(href, pageUrl).toString();
        const sizes = $(el).attr("sizes");
        const type = $(el).attr("type");
        iconCandidates.push({
          url: absUrl,
          size: parseIconSize(sizes) || 32,
          type,
          source: "favicon",
        });
      } catch {}
    }
  });

  // Stage 3: Web App Manifest icons
  const manifestHref = $('link[rel="manifest"]').attr("href");
  if (manifestHref) {
    try {
      const manifestUrl = new URL(manifestHref, pageUrl).toString();
      const manifestRes = await safeFetchHtml(manifestUrl);
      if (manifestRes.html) {
        const manifest = JSON.parse(manifestRes.html);
        if (Array.isArray(manifest.icons)) {
          for (const icon of manifest.icons) {
            if (icon.src) {
              const absIconUrl = new URL(icon.src, manifestUrl).toString();
              iconCandidates.push({
                url: absIconUrl,
                size: parseIconSize(icon.sizes) || 192,
                source: "manifest",
              });
            }
          }
        }
      }
    } catch {}
  }

  // Stage 4: Root /favicon.ico fallback
  try {
    const rootFavicon = new URL("/favicon.ico", pageUrl).toString();
    iconCandidates.push({
      url: rootFavicon,
      size: 16,
      source: "root-favicon",
    });
  } catch {}

  // Stage 5: Google S2 & DuckDuckGo Favicon services fallback
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  iconCandidates.push({
    url: googleFavicon,
    size: 128,
    source: "google-s2",
  });

  const ddgFavicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  iconCandidates.push({
    url: ddgFavicon,
    size: 64,
    source: "favicon",
  });

  // Sort candidates by size descending, prioritizing apple-touch-icon and manifest icons
  iconCandidates.sort((a, b) => {
    const priority = {
      "apple-touch-icon": 4,
      "manifest": 3,
      "favicon": 2,
      "root-favicon": 1,
      "google-s2": 0,
      "svg-fallback": -1,
    };
    const pDiff = (priority[b.source] || 0) - (priority[a.source] || 0);
    if (pDiff !== 0) return pDiff;
    return (b.size || 0) - (a.size || 0);
  });

  // Attempt download and WebP conversion through candidates
  let resolvedIconUrl: string | null = null;
  for (const candidate of iconCandidates) {
    try {
      resolvedIconUrl = await downloadAndConvertIcon(candidate.url, domain);
      if (resolvedIconUrl && !resolvedIconUrl.startsWith("/icons/avatar-")) {
        break; // Successfully downloaded and converted a real icon!
      }
    } catch {
      continue;
    }
  }

  // Stage 6: Fallback to SVG letter avatar or default globe image if all candidate downloads failed
  if (!resolvedIconUrl) {
    try {
      resolvedIconUrl = generateSvgAvatar(domain);
    } catch {
      resolvedIconUrl = "/icons/default-globe.svg";
    }
  }

  if (!resolvedIconUrl) {
    resolvedIconUrl = "/icons/default-globe.svg";
  }

  return {
    title,
    description,
    imageUrl,
    siteName,
    canonicalUrl,
    language,
    iconUrl: resolvedIconUrl,
    domain,
  };
}

