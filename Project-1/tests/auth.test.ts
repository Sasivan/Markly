import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { BookmarkRepository } from "../server/db/repository";
import { validateHostForSSRF } from "../server/scraper/ssrf";
import { safeFetchHtml } from "../server/scraper/fetcher";
import { validateCsrfOrigin } from "../server/auth/csrf";

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
});

