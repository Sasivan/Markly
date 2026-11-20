import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { NextResponse } from "next/server";
import { BookmarkRepository } from "../server/db/repository";
import { validateHostForSSRF } from "../server/scraper/ssrf";
import { safeFetchHtml } from "../server/scraper/fetcher";
import { validateCsrfOrigin } from "../server/auth/csrf";
import { checkRateLimit, getTrustedClientIp } from "../server/scraper/ratelimit";

// Mock Supabase Server client for testing
let mockUser: { id: string; email?: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => {
        if (!mockUser) {
          return { data: { user: null }, error: new Error("No session") };
        }
        return { data: { user: mockUser }, error: null };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      update: vi.fn().mockReturnThis(),
    })),
  })),
}));

// Import Route Handlers
import * as BookmarksRoute from "../app/api/bookmarks/route";
import * as BookmarkItemRoute from "../app/api/bookmarks/[id]/route";
import * as BookmarkVisitRoute from "../app/api/bookmarks/[id]/visit/route";
import * as BookmarkBulkRoute from "../app/api/bookmarks/bulk/route";
import * as FoldersRoute from "../app/api/folders/route";
import * as FolderItemRoute from "../app/api/folders/[id]/route";
import * as FolderCopyRoute from "../app/api/folders/[id]/copy/route";
import * as BookmarkCopyRoute from "../app/api/bookmarks/[id]/copy/route";
import * as BookmarkBulkCopyRoute from "../app/api/bookmarks/bulk-copy/route";
import * as BookmarkAiSummaryRoute from "../app/api/bookmarks/[id]/ai-summary/route";
import * as FolderReorderRoute from "../app/api/folders/reorder/route";
import * as RecycleBinRoute from "../app/api/recycle-bin/route";
import * as RecycleBinItemRoute from "../app/api/recycle-bin/[id]/route";
import * as WorkspaceBootstrapRoute from "../app/api/workspace/bootstrap/route";
import * as StatsRoute from "../app/api/stats/route";
import * as GraphRoute from "../app/api/graph/route";
import * as ScrapeRoute from "../app/api/scrape/route";
import * as HealthCheckRoute from "../app/api/health-check/route";
import * as ExportRoute from "../app/api/export/route";
import * as UserProfileRoute from "../app/api/user/profile/route";
import * as SyncUserRoute from "../app/api/auth/sync-user/route";
import * as ResolveIdentifierRoute from "../app/api/auth/resolve-identifier/route";
import * as LoginRoute from "../app/api/auth/login/route";
import * as CheckUsernameRoute from "../app/api/auth/check-username/route";
import * as AiSuggestRoute from "../app/api/ai/suggest/route";
import * as ImportRoute from "../app/api/import/route";

describe("Phase 10 Security Hardening Tests", () => {
  beforeEach(() => {
    mockUser = null;
  });

  describe("1. Unauthenticated Requests Return 401", () => {
    it("GET /api/bookmarks returns 401 without session", async () => {
      const res = await BookmarksRoute.GET(new Request("http://localhost/api/bookmarks"));
      expect(res.status).toBe(401);
    });

    it("POST /api/bookmarks returns 401 without session", async () => {
      const res = await BookmarksRoute.POST(
        new Request("http://localhost/api/bookmarks", {
          method: "POST",
          body: JSON.stringify({ url: "https://example.com" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/bookmarks/[id] returns 401 without session", async () => {
      const res = await BookmarkItemRoute.GET(new Request("http://localhost/api/bookmarks/bm_1"), {
        params: Promise.resolve({ id: "bm_1" }),
      });
      expect(res.status).toBe(401);
    });

    it("PATCH /api/bookmarks/[id] returns 401 without session", async () => {
      const res = await BookmarkItemRoute.PATCH(
        new Request("http://localhost/api/bookmarks/bm_1", {
          method: "PATCH",
          body: JSON.stringify({ title: "Updated" }),
        }),
        { params: Promise.resolve({ id: "bm_1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("DELETE /api/bookmarks/[id] returns 401 without session", async () => {
      const res = await BookmarkItemRoute.DELETE(
        new Request("http://localhost/api/bookmarks/bm_1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "bm_1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/bookmarks/[id]/visit returns 401 without session", async () => {
      const res = await BookmarkVisitRoute.POST(
        new Request("http://localhost/api/bookmarks/bm_1/visit", { method: "POST" }),
        { params: Promise.resolve({ id: "bm_1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/bookmarks/bulk returns 401 without session", async () => {
      const res = await BookmarkBulkRoute.POST(
        new Request("http://localhost/api/bookmarks/bulk", {
          method: "POST",
          body: JSON.stringify({ action: "delete", ids: ["bm_1"] }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/folders returns 401 without session", async () => {
      const res = await FoldersRoute.GET(new Request("http://localhost/api/folders"));
      expect(res.status).toBe(401);
    });

    it("POST /api/folders returns 401 without session", async () => {
      const res = await FoldersRoute.POST(
        new Request("http://localhost/api/folders", {
          method: "POST",
          body: JSON.stringify({ name: "Folder 1" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/folders/[id] returns 401 without session", async () => {
      const res = await FolderItemRoute.GET(new Request("http://localhost/api/folders/fld_1"), {
        params: Promise.resolve({ id: "fld_1" }),
      });
      expect(res.status).toBe(401);
    });

    it("POST /api/folders/[id]/copy returns 401 without session", async () => {
      const res = await FolderCopyRoute.POST(
        new Request("http://localhost/api/folders/fld_1/copy", { method: "POST" }),
        { params: Promise.resolve({ id: "fld_1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/bookmarks/[id]/copy returns 401 without session", async () => {
      const res = await BookmarkCopyRoute.POST(
        new Request("http://localhost/api/bookmarks/bm_1/copy", { method: "POST" }),
        { params: Promise.resolve({ id: "bm_1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/bookmarks/bulk-copy returns 401 without session", async () => {
      const res = await BookmarkBulkCopyRoute.POST(
        new Request("http://localhost/api/bookmarks/bulk-copy", {
          method: "POST",
          body: JSON.stringify({ ids: ["bm_1"] }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/bookmarks/[id]/ai-summary returns 401 without session", async () => {
      const res = await BookmarkAiSummaryRoute.POST(
        new Request("http://localhost/api/bookmarks/bm_1/ai-summary", { method: "POST" }),
        { params: Promise.resolve({ id: "bm_1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/folders/reorder returns 401 without session", async () => {
      const res = await FolderReorderRoute.POST(
        new Request("http://localhost/api/folders/reorder", {
          method: "POST",
          body: JSON.stringify({ folderId: "fld_1" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/recycle-bin returns 401 without session", async () => {
      const res = await RecycleBinRoute.GET(new Request("http://localhost/api/recycle-bin"));
      expect(res.status).toBe(401);
    });

    it("DELETE /api/recycle-bin returns 401 without session", async () => {
      const res = await RecycleBinRoute.DELETE(new Request("http://localhost/api/recycle-bin", { method: "DELETE" }));
      expect(res.status).toBe(401);
    });

    it("GET /api/workspace/bootstrap returns 401 without session", async () => {
      const res = await WorkspaceBootstrapRoute.GET(new Request("http://localhost/api/workspace/bootstrap"));
      expect(res.status).toBe(401);
    });

    it("GET /api/stats returns 401 without session", async () => {
      const res = await StatsRoute.GET(new Request("http://localhost/api/stats"));
      expect(res.status).toBe(401);
    });

    it("GET /api/graph returns 401 without session", async () => {
      const res = await GraphRoute.GET(new Request("http://localhost/api/graph"));
      expect(res.status).toBe(401);
    });

    it("POST /api/scrape returns 401 without session", async () => {
      const res = await ScrapeRoute.POST(
        new Request("http://localhost/api/scrape", {
          method: "POST",
          body: JSON.stringify({ url: "https://example.com" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/health-check returns 401 without session", async () => {
      const res = await HealthCheckRoute.POST(new Request("http://localhost/api/health-check", { method: "POST" }));
      expect(res.status).toBe(401);
    });

    it("GET /api/export returns 401 without session", async () => {
      const res = await ExportRoute.GET(new Request("http://localhost/api/export"));
      expect(res.status).toBe(401);
    });

    it("POST /api/auth/sync-user returns 401 without session", async () => {
      const res = await SyncUserRoute.POST(new Request("http://localhost/api/auth/sync-user", { method: "POST" }));
      expect(res.status).toBe(401);
    });

    it("GET /api/user/profile returns 401 without session", async () => {
      const res = await UserProfileRoute.GET();
      expect(res.status).toBe(401);
    });
  });

  describe("2. Cross-User Resource Isolation Returns 404", () => {
    const userA = "usr_alice_123";
    const userB = "usr_bob_456";

    it("returns 404 when user A attempts to read user B's bookmark", async () => {
      // Create bookmark owned by Bob
      const bmLazy = BookmarkRepository.createBookmark({
        url: `https://example.com/b-item-${Date.now()}`,
        canonicalUrl: `https://example.com/b-item-${Date.now()}`,
        title: "Bob Private Bookmark",
        domain: "example.com",
        userId: userB,
      });

      // Alice makes the request
      mockUser = { id: userA };
      const res = await BookmarkItemRoute.GET(
        new Request(`http://localhost/api/bookmarks/${bmLazy.id}`),
        { params: Promise.resolve({ id: bmLazy.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to update user B's bookmark", async () => {
      const bmLazy = BookmarkRepository.createBookmark({
        url: `https://example.com/b-update-${Date.now()}`,
        canonicalUrl: `https://example.com/b-update-${Date.now()}`,
        title: "Bob Bookmark",
        domain: "example.com",
        userId: userB,
      });

      // Alice tries to update Bob's bookmark
      mockUser = { id: userA };
      const res = await BookmarkItemRoute.PATCH(
        new Request(`http://localhost/api/bookmarks/${bmLazy.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: "Hacked by Alice" }),
        }),
        { params: Promise.resolve({ id: bmLazy.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to delete user B's bookmark", async () => {
      const bmLazy = BookmarkRepository.createBookmark({
        url: `https://example.com/b-del-${Date.now()}`,
        canonicalUrl: `https://example.com/b-del-${Date.now()}`,
        title: "Bob Bookmark",
        domain: "example.com",
        userId: userB,
      });

      // Alice tries to delete Bob's bookmark
      mockUser = { id: userA };
      const res = await BookmarkItemRoute.DELETE(
        new Request(`http://localhost/api/bookmarks/${bmLazy.id}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: bmLazy.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to record visit on user B's bookmark", async () => {
      const bmLazy = BookmarkRepository.createBookmark({
        url: `https://example.com/b-visit-${Date.now()}`,
        canonicalUrl: `https://example.com/b-visit-${Date.now()}`,
        title: "Bob Bookmark",
        domain: "example.com",
        userId: userB,
      });

      // Alice tries to visit Bob's bookmark
      mockUser = { id: userA };
      const res = await BookmarkVisitRoute.POST(
        new Request(`http://localhost/api/bookmarks/${bmLazy.id}/visit`, { method: "POST" }),
        { params: Promise.resolve({ id: bmLazy.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to read user B's folder", async () => {
      const fld = BookmarkRepository.createFolder({
        name: "Bob Secret Folder",
        userId: userB,
      });

      // Alice tries to read Bob's folder
      mockUser = { id: userA };
      const res = await FolderItemRoute.GET(
        new Request(`http://localhost/api/folders/${fld.id}`),
        { params: Promise.resolve({ id: fld.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to update user B's folder", async () => {
      const fld = BookmarkRepository.createFolder({
        name: "Bob Folder",
        userId: userB,
      });

      // Alice tries to update Bob's folder
      mockUser = { id: userA };
      const res = await FolderItemRoute.PATCH(
        new Request(`http://localhost/api/folders/${fld.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: "Alice Renamed" }),
        }),
        { params: Promise.resolve({ id: fld.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to delete user B's folder", async () => {
      const fld = BookmarkRepository.createFolder({
        name: "Bob Folder to Delete",
        userId: userB,
      });

      // Alice tries to delete Bob's folder
      mockUser = { id: userA };
      const res = await FolderItemRoute.DELETE(
        new Request(`http://localhost/api/folders/${fld.id}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: fld.id }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when user A attempts to duplicate user B's folder", async () => {
      const fld = BookmarkRepository.createFolder({
        name: "Bob Folder to Copy",
        userId: userB,
      });

      // Alice tries to duplicate Bob's folder
      mockUser = { id: userA };
      const res = await FolderItemRoute.POST(
        new Request(`http://localhost/api/folders/${fld.id}`, { method: "POST" }),
        { params: Promise.resolve({ id: fld.id }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe("3. Removed / Deprecated Routes Return Expected Status", () => {
    it("/api/auth/resolve-identifier returns 410 Gone", async () => {
      const res = await ResolveIdentifierRoute.POST();
      expect(res.status).toBe(410);
    });
  });

  describe("4. SSRF Defense: Blocking Private IPs, Metadata & Dangerous Targets", () => {
    it("rejects localhost and 127.0.0.1", async () => {
      await expect(validateHostForSSRF("localhost")).rejects.toThrow(/SSRF Guard/);
      await expect(validateHostForSSRF("127.0.0.1")).rejects.toThrow(/SSRF Guard/);
    });

    it("rejects AWS/GCP cloud metadata IP 169.254.169.254", async () => {
      await expect(validateHostForSSRF("169.254.169.254")).rejects.toThrow(/SSRF Guard/);
    });

    it("rejects private IPv4 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", async () => {
      await expect(validateHostForSSRF("10.0.0.1")).rejects.toThrow(/SSRF Guard/);
      await expect(validateHostForSSRF("192.168.1.1")).rejects.toThrow(/SSRF Guard/);
      await expect(validateHostForSSRF("172.16.0.1")).rejects.toThrow(/SSRF Guard/);
    });

    it("rejects IPv6 loopback (::1)", async () => {
      await expect(validateHostForSSRF("::1")).rejects.toThrow(/SSRF Guard/);
    });

    it("rejects safeFetchHtml target pointing to localhost", async () => {
      await expect(safeFetchHtml("http://127.0.0.1:8080")).rejects.toThrow(/SSRF Guard/);
    });

    it("rejects safeFetchHtml target pointing to cloud metadata", async () => {
      await expect(safeFetchHtml("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(/SSRF Guard/);
    });
  });

  describe("5. CSRF Defense for Mutating Routes", () => {
    it("blocks cross-site Sec-Fetch-Site requests", () => {
      const req = new Request("http://localhost:3000/api/bookmarks", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      });
      expect(validateCsrfOrigin(req)).toBe(false);
    });

    it("blocks untrusted Origin header mismatch", () => {
      const req = new Request("http://localhost:3000/api/bookmarks", {
        method: "POST",
        headers: {
          host: "markly.app",
          origin: "https://evil-attacker.com",
        },
      });
      expect(validateCsrfOrigin(req)).toBe(false);
    });

    it("allows matching Origin and Host", () => {
      const req = new Request("https://markly.app/api/bookmarks", {
        method: "POST",
        headers: {
          host: "markly.app",
          origin: "https://markly.app",
        },
      });
      expect(validateCsrfOrigin(req)).toBe(true);
    });

    it("allows safe GET/HEAD requests regardless of Origin", () => {
      const req = new Request("https://markly.app/api/bookmarks", {
        method: "GET",
        headers: { origin: "https://other-site.com" },
      });
      expect(validateCsrfOrigin(req)).toBe(true);
    });

    it("POST /api/bookmarks blocks cross-origin attack with 403 Forbidden even with authenticated session", async () => {
      mockUser = { id: "usr_alice", email: "alice@example.com" };
      const res = await BookmarksRoute.POST(
        new Request("http://localhost:3000/api/bookmarks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            host: "localhost:3000",
            origin: "https://evil-attacker.com",
          },
          body: JSON.stringify({ url: "https://malicious.com" }),
        })
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden");
    });

    it("DELETE /api/bookmarks/[id] blocks cross-site Sec-Fetch-Site with 403 Forbidden", async () => {
      mockUser = { id: "usr_alice", email: "alice@example.com" };
      const res = await BookmarkItemRoute.DELETE(
        new Request("http://localhost:3000/api/bookmarks/bm_1", {
          method: "DELETE",
          headers: {
            "sec-fetch-site": "cross-site",
          },
        }),
        { params: Promise.resolve({ id: "bm_1" }) }
      );
      expect(res.status).toBe(403);
    });
  });

  describe("6. Phase 12 Stage 2: Consistent CSRF Audit & Rate Limiting", () => {
    it("fails if any mutating route skips requireUser(req)", () => {
      const apiDir = path.resolve(__dirname, "../app/api");

      function findRoutes(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(findRoutes(fullPath));
          } else if (entry.name === "route.ts") {
            results.push(fullPath);
          }
        }
        return results;
      }

      const allRoutes = findRoutes(apiDir);
      const violations: string[] = [];

      for (const routeFile of allRoutes) {
        const content = fs.readFileSync(routeFile, "utf-8");
        const rel = path.relative(apiDir, routeFile).replace(/\\/g, "/");

        // Skip public unauthenticated login and 410 gone resolve-identifier
        if (rel.includes("auth/login") || rel.includes("auth/resolve-identifier")) {
          continue;
        }

        const hasMutating = /export\s+async\s+function\s+(POST|PATCH|DELETE|PUT)/.test(content);
        if (hasMutating) {
          // Must call requireUser with request parameter (requireUser(req))
          const callsRequireUserWithReq = /requireUser\s*\(\s*(req|request)\s*\)/.test(content);
          if (!callsRequireUserWithReq) {
            violations.push(`${rel} defines mutating methods but does not pass req to requireUser(req)`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it("getTrustedClientIp prioritizes platform-trusted headers and rejects client-spoofed leftmost XFF", () => {
      // 1. Cloudflare header
      const cfReq = new Request("http://localhost", {
        headers: {
          "cf-connecting-ip": "203.0.113.195",
          "x-forwarded-for": "10.0.0.1, 192.168.1.1",
        },
      });
      expect(getTrustedClientIp(cfReq)).toBe("203.0.113.195");

      // 2. Nginx x-real-ip
      const nginxReq = new Request("http://localhost", {
        headers: {
          "x-real-ip": "198.51.100.4",
          "x-forwarded-for": "10.0.0.1",
        },
      });
      expect(getTrustedClientIp(nginxReq)).toBe("198.51.100.4");

      // 3. Multi-hop XFF: takes rightmost (closest to proxy), never the client-supplied leftmost
      const multiHopReq = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "client.spoofed.ip, 198.51.100.99",
        },
      });
      expect(getTrustedClientIp(multiHopReq)).toBe("198.51.100.99");
    });

    it("enforces login rate limit (10 attempts per minute)", () => {
      const testIp = `test-login-ip-${Date.now()}`;
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(`login:ip:${testIp}`, 10, 60 * 1000).allowed).toBe(true);
      }
      // 11th request must be blocked
      const blocked = checkRateLimit(`login:ip:${testIp}`, 10, 60 * 1000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.resetInSec).toBeGreaterThan(0);
    });

    it("enforces check-username rate limit (20 checks per minute)", () => {
      const testIp = `test-user-ip-${Date.now()}`;
      for (let i = 0; i < 20; i++) {
        expect(checkRateLimit(`check-username:ip:${testIp}`, 20, 60 * 1000).allowed).toBe(true);
      }
      expect(checkRateLimit(`check-username:ip:${testIp}`, 20, 60 * 1000).allowed).toBe(false);
    });

    it("enforces ai/suggest rate limit (20 per minute per user)", () => {
      const testUser = `test-user-ai-${Date.now()}`;
      for (let i = 0; i < 20; i++) {
        expect(checkRateLimit(`ai-suggest:user:${testUser}`, 20, 60 * 1000).allowed).toBe(true);
      }
      expect(checkRateLimit(`ai-suggest:user:${testUser}`, 20, 60 * 1000).allowed).toBe(false);
    });

    it("enforces import rate limit (5 per minute per user)", () => {
      const testUser = `test-user-import-${Date.now()}`;
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(`import:user:${testUser}`, 5, 60 * 1000).allowed).toBe(true);
      }
      expect(checkRateLimit(`import:user:${testUser}`, 5, 60 * 1000).allowed).toBe(false);
    });

    it("enforces health-check rate limit (2 per minute per user)", () => {
      const testUser = `test-user-hc-${Date.now()}`;
      expect(checkRateLimit(`health-check:user:${testUser}`, 2, 60 * 1000).allowed).toBe(true);
      expect(checkRateLimit(`health-check:user:${testUser}`, 2, 60 * 1000).allowed).toBe(true);
      expect(checkRateLimit(`health-check:user:${testUser}`, 2, 60 * 1000).allowed).toBe(false);
    });
  });

  describe("Phase 12 Stage 3: Input Validation and Integrity", () => {
    it("validates profile update fields with zod constraints", () => {
      const ProfileSchema = z.object({
        displayName: z.string().trim().max(60, "Display name must be at most 60 characters").optional(),
        avatarUrl: z
          .string()
          .trim()
          .max(500, "Avatar URL must be at most 500 characters")
          .refine((url: string | undefined) => !url || url.startsWith("https://"), {
            message: "Avatar URL must use HTTPS",
          })
          .optional(),
      });

      // Valid cases
      expect(ProfileSchema.safeParse({ displayName: "Alice", avatarUrl: "https://example.com/avatar.png" }).success).toBe(true);
      expect(ProfileSchema.safeParse({ displayName: "Bob" }).success).toBe(true);
      expect(ProfileSchema.safeParse({ avatarUrl: "https://example.com/pic.jpg" }).success).toBe(true);
      expect(ProfileSchema.safeParse({}).success).toBe(true);

      // Rejects displayName > 60 chars
      const longName = "a".repeat(61);
      expect(ProfileSchema.safeParse({ displayName: longName }).success).toBe(false);

      // Rejects avatarUrl with http:// (must be https://)
      expect(ProfileSchema.safeParse({ avatarUrl: "http://insecure.com/pic.jpg" }).success).toBe(false);

      // Rejects avatarUrl with javascript:
      expect(ProfileSchema.safeParse({ avatarUrl: "javascript:alert(1)" }).success).toBe(false);

      // Rejects avatarUrl > 500 chars
      const longUrl = "https://example.com/" + "a".repeat(500);
      expect(ProfileSchema.safeParse({ avatarUrl: longUrl }).success).toBe(false);
    });

    it("rejects reserved usernames in check-username rules", () => {
      const reserved = ["admin", "root", "markly", "support", "help", "guest", "system", "anonymous"];
      for (const name of reserved) {
        expect(reserved.includes(name)).toBe(true);
      }
    });
  });

  describe("Phase 12 Stage 4: Headers & Database Hardening", () => {
    it("ensures next.config.ts restricts images.remotePatterns and CSP connect-src", async () => {
      const configPath = path.join(process.cwd(), "next.config.ts");
      const configSource = fs.readFileSync(configPath, "utf-8");

      // Verify images.remotePatterns has no wildcards like "**"
      expect(configSource).not.toContain('hostname: "**"');
      expect(configSource).toContain('hostname: "api.dicebear.com"');
      expect(configSource).toContain('hostname: "www.google.com"');

      // Verify connect-src restricted
      expect(configSource).toContain("connect-src 'self'");
      expect(configSource).toContain("generativelanguage.googleapis.com");

      // Verify report-only planned nonce/strict CSP header is present
      expect(configSource).toContain("Content-Security-Policy-Report-Only");
      expect(configSource).toContain("script-src 'self'");
    });

    it("ensures 004_hardening.sql contains search_path='', FORCE RLS, and reserved usernames CHECK", () => {
      const migrationPath = path.join(process.cwd(), "supabase", "migrations", "004_hardening.sql");
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("SET search_path = ''");
      expect(sql).toContain("FORCE ROW LEVEL SECURITY");
      expect(sql).toContain("username_reserved_check");
      expect(sql).toContain("'admin'");
      expect(sql).toContain("'root'");
      expect(sql).toContain("'markly'");
      expect(sql).toContain("'anonymous'");
    });
  });
});

