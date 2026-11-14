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

  // 2. Comprehensive Description Extraction in Code (0 AI Credits)
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const metaDesc = $('meta[name="description"]').attr("content");
  const twitterDesc = $('meta[name="twitter:description"]').attr("content") || $('meta[property="twitter:description"]').attr("content");
  
  // Extract JSON-LD description if available
  let jsonLdDesc = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).text();
      const parsed = JSON.parse(text);
      if (typeof parsed.description === "string" && parsed.description.trim()) {
        jsonLdDesc = parsed.description.trim();
      } else if (Array.isArray(parsed["@graph"])) {
        const item = parsed["@graph"].find((g: any) => typeof g.description === "string" && g.description.trim());
        if (item?.description) jsonLdDesc = item.description.trim();
      }
    } catch {}
  });

  // Paragraph extraction fallback (if meta description is missing)
  let paragraphExtract = "";
  if (!ogDesc && !metaDesc && !jsonLdDesc) {
    const paragraphs: string[] = [];
    $("article p, main p, [role='main'] p, section p, .content p, p").each((_, el) => {
      const pText = $(el).text().replace(/\s+/g, " ").trim();
      if (
        pText.length > 40 &&
        !/cookie|privacy policy|terms of service|copyright|rights reserved|javascript/i.test(pText)
      ) {
        paragraphs.push(pText);
      }
    });
    if (paragraphs.length > 0) {
      paragraphExtract = paragraphs.slice(0, 2).join(" ");
    }
  }

  const rawDesc = ogDesc || jsonLdDesc || metaDesc || twitterDesc || paragraphExtract || "";
  const description = rawDesc.replace(/\s+/g, " ").trim();

  // 3. Image URL Extraction
  const rawImageCandidate =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="og:image"]').attr("content") ||
    $('meta[property="og:image:url"]').attr("content") ||
    $('meta[property="og:image:secure_url"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('meta[property="twitter:image"]').attr("content") ||
    $('meta[name="twitter:image:src"]').attr("content") ||
    $('meta[itemprop="image"]').attr("content") ||
    $('link[rel="image_src"]').attr("href") ||
    null;

  let imageUrl: string | null = null;
  if (rawImageCandidate) {
    try {
      imageUrl = new URL(rawImageCandidate, pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }

  // Fallback: If no Open Graph image found, provide high-resolution website snapshot
  if (!imageUrl && pageUrl.startsWith("http")) {
    imageUrl = `https://image.thum.io/get/width/1200/crop/800/${pageUrl}`;
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

  // Attempt download and WebP conversion through top candidates (capped at 2 with 2s timeout)
  let resolvedIconUrl: string | null = null;
  const topCandidates = iconCandidates.slice(0, 2);
  for (const candidate of topCandidates) {
    try {
      // Race download with a 2000ms timeout
      const downloadPromise = downloadAndConvertIcon(candidate.url, domain);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
      const res = await Promise.race([downloadPromise, timeoutPromise]);
      if (res && !res.startsWith("/icons/avatar-")) {
        resolvedIconUrl = res;
        break; // Successfully downloaded and converted a real icon!
      }
    } catch {
      continue;
    }
  }

  // Stage 6: Fallback to high-resolution Google Favicon CDN if all candidate downloads failed
  if (!resolvedIconUrl) {
    resolvedIconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
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

/**
 * Fast, deterministic algorithmic knowledge summarizer in code (0 AI credits).
 * Uses Cheerio to extract lead paragraphs, headings, and key points directly from HTML.
 */
export function extractCodeSummary(
  html: string,
  title: string,
  domain: string,
  existingDesc?: string
): string {
  try {
    const $ = cheerio.load(html);
    const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
    const metaDesc = $('meta[name="description"]').attr("content")?.trim();
    const baseDesc = existingDesc?.trim() || ogDesc || metaDesc || "";

    // Extract headings for topic highlights
    const headings: string[] = [];
    $("h1, h2, h3").each((_, el) => {
      const hText = $(el).text().replace(/\s+/g, " ").trim();
      if (hText.length > 5 && hText.length < 80 && !headings.includes(hText)) {
        headings.push(hText);
      }
    });

    // Extract meaningful article / main paragraphs
    const paragraphs: string[] = [];
    $("article p, main p, [role='main'] p, section p, .content p, p").each((_, el) => {
      const pText = $(el).text().replace(/\s+/g, " ").trim();
      if (
        pText.length > 40 &&
        pText.length < 350 &&
        !/cookie|privacy policy|terms of service|copyright|rights reserved|javascript|browser/i.test(pText)
      ) {
        paragraphs.push(pText);
      }
    });

    const leadParagraph = paragraphs.find((p) => p !== baseDesc) || "";
    const mainOverview =
      baseDesc || leadParagraph || `${title} is a web resource hosted on ${domain}.`;

    // Extract bullet points from list items or headings
    const listItems: string[] = [];
    $("ul li, ol li").each((_, el) => {
      const liText = $(el).text().replace(/\s+/g, " ").trim();
      if (liText.length > 15 && liText.length < 120 && !listItems.includes(liText)) {
        listItems.push(liText);
      }
    });

    const selectedHighlights =
      listItems.length >= 2 ? listItems.slice(0, 3) : headings.slice(0, 3);

    let formatted = mainOverview;
    if (selectedHighlights.length > 0) {
      formatted += `\n\n• ${selectedHighlights.join("\n• ")}`;
    }

    return formatted;
  } catch {
    return existingDesc || `${title} (${domain})`;
  }
}


