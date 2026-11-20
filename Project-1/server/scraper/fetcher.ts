import { validateHostForSSRF } from "./ssrf";
import { normalizeUrl } from "./url";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MarklyBot/1.0";

export interface FetchHtmlResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
}

/**
 * Safely fetches an HTML document with SSRF protection on each redirect hop,
 * strict 8s timeout, and 2MB payload cap.
 */
export async function safeFetchHtml(initialUrl: string): Promise<FetchHtmlResult> {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    const { url, domain } = normalizeUrl(currentUrl);

    // SSRF Check: resolve DNS and verify IP range before connecting
    await validateHostForSSRF(domain);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Scraper timeout: Request exceeded ${TIMEOUT_MS / 1000}s limit`);
      }
      throw new Error(`Failed to fetch '${url}': ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle redirects manually
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Redirect with status ${response.status} missing Location header`);
      }

      // Resolve relative redirect against current URL
      const redirectTarget = new URL(location, currentUrl).toString();
      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new Error(`Scraper exceeded maximum redirect limit (${MAX_REDIRECTS})`);
      }

      currentUrl = redirectTarget;
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // Read response body stream with 2MB limit
    if (!response.body) {
      return { html: "", finalUrl: currentUrl, statusCode: response.status, contentType };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_BYTES) {
          reader.cancel();
          throw new Error(`Response payload exceeded 2MB limit (${receivedBytes} bytes read)`);
        }
        chunks.push(value);
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const html = decoder.decode(totalBuffer);

    return {
      html,
      finalUrl: currentUrl,
      statusCode: response.status,
      contentType,
    };
  }

  throw new Error("Scraper redirect loop detected");
}

