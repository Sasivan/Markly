import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { validateHostForSSRF } from "./ssrf";

const ICONS_DIR = path.join(process.cwd(), "public", "icons");

// Ensure public/icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

export interface CandidateIcon {
  url: string;
  size?: number;
  type?: string;
  source: "apple-touch-icon" | "favicon" | "manifest" | "root-favicon" | "google-s2" | "svg-fallback";
}

/**
 * Downloads an image buffer, validates image format, resizes to 64x64, converts to WebP (or preserves valid ICO/SVG),
 * and saves to /public/icons/<hash>.<ext>.
 * Returns the public relative path `/icons/<hash>.<ext>`.
 */
export async function downloadAndConvertIcon(iconUrl: string, domain: string): Promise<string> {
  const parsed = new URL(iconUrl);
  // SSRF guard on icon download host
  await validateHostForSSRF(parsed.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  const response = await fetch(iconUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/webp,image/png,image/svg+xml,image/x-icon,image/*,*/*;q=0.8",
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to download icon from ${iconUrl}: status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error("Downloaded icon buffer is empty");
  }

  // 1. Try converting and resizing with Sharp (WebP 64x64)
  try {
    const webpBuffer = await sharp(buffer)
      .resize(64, 64, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 85 })
      .toBuffer();

    const hash = crypto.createHash("sha256").update(webpBuffer).digest("hex").slice(0, 16);
    const filename = `${hash}.webp`;
    const filepath = path.join(ICONS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      await fs.promises.writeFile(filepath, webpBuffer);
    }

    return `/icons/${filename}`;
  } catch {
    // 2. Sharp cannot convert certain Windows .ico or raw SVG formats directly
    // Save the raw image buffer with its native extension so the browser renders it directly
    const isIco = buffer.length > 4 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0;
    const isSvg = buffer.toString("utf-8", 0, 100).toLowerCase().includes("<svg");
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

    const ext = isIco ? "ico" : isSvg ? "svg" : isPng ? "png" : "ico";
    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `${hash}.${ext}`;
    const filepath = path.join(ICONS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      await fs.promises.writeFile(filepath, buffer);
    }

    return `/icons/${filename}`;
  }
}

/**
 * Generates an SVG letter avatar icon and saves to /public/icons/avatar-<domain>.svg
 */
export function generateSvgAvatar(domain: string): string {
  const initial = domain.replace(/^www\./, "").charAt(0).toUpperCase() || "M";

  // Deterministic color palette based on domain name
  const hues = [210, 260, 330, 150, 35, 180, 280, 20];
  let hashVal = 0;
  for (let i = 0; i < domain.length; i++) {
    hashVal = (hashVal << 5) - hashVal + domain.charCodeAt(i);
    hashVal |= 0;
  }
  const hue = hues[Math.abs(hashVal) % hues.length];
  const bgGradStart = `hsl(${hue}, 80%, 55%)`;
  const bgGradEnd = `hsl(${hue + 30}, 85%, 45%)`;

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradStart}" />
      <stop offset="100%" stop-color="${bgGradEnd}" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#grad)" />
  <text x="32" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${initial}</text>
</svg>
`.trim();

  const domainSafe = domain.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `avatar-${domainSafe}.svg`;
  const filepath = path.join(ICONS_DIR, filename);

  try {
    fs.writeFileSync(filepath, svgContent, "utf-8");
  } catch (e) {
    console.warn("Could not write avatar svg:", e);
  }

  return `/icons/${filename}`;
}
