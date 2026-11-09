import { describe, it, expect } from "vitest";
import { normalizeUrl } from "../server/scraper/url";
import { isBlockedIp } from "../server/scraper/ssrf";
import { generateSvgAvatar } from "../server/scraper/icons";

describe("Scraper URL Normalizer", () => {
  it("prepends https:// when protocol is missing", () => {
    const res = normalizeUrl("github.com/trending");
    expect(res.url).toBe("https://github.com/trending");
    expect(res.domain).toBe("github.com");
  });

  it("strips UTM and tracking marketing parameters", () => {
    const res = normalizeUrl(
      "https://example.com/blog?utm_source=twitter&utm_medium=social&utm_campaign=launch&fbclid=12345&keep=me"
    );
    expect(res.url).toBe("https://example.com/blog?keep=me");
    expect(res.canonicalUrl).toBe("https://example.com/blog?keep=me");
  });

  it("rejects non-http(s) protocols like javascript: or file:", () => {
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow(/Forbidden protocol/);
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow(/Forbidden protocol/);
    expect(() => normalizeUrl("data:text/html,hello")).toThrow(/Forbidden protocol/);
  });
});

describe("SSRF Guard & IP Validator", () => {
  it("blocks IPv4 loopback (127.0.0.1, 127.0.0.2)", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("127.0.0.2")).toBe(true);
  });

  it("blocks private network ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", () => {
    expect(isBlockedIp("10.0.0.1")).toBe(true);
    expect(isBlockedIp("172.16.0.5")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
  });

  it("blocks cloud metadata IP 169.254.169.254 and link-local ranges", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("169.254.1.1")).toBe(true);
  });

  it("blocks IPv6 loopback (::1) and IPv4-mapped loopback (::ffff:127.0.0.1)", () => {
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:10.0.0.1")).toBe(true);
  });

  it("allows standard public internet IPs", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false); // Google DNS
    expect(isBlockedIp("1.1.1.1")).toBe(false); // Cloudflare DNS
    expect(isBlockedIp("140.82.121.4")).toBe(false); // GitHub
  });
});

describe("Icon Fallback SVG Avatar Generator", () => {
  it("generates valid SVG letter avatar with initial and domain", () => {
    const avatarPath = generateSvgAvatar("openai.com");
    expect(avatarPath).toContain("avatar-openai.com.svg");
  });
});

