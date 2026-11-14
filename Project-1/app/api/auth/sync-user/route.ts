import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sqlite } from "@/server/db/client";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const userId = user.id;

    // Record login timestamp
    BookmarkRepository.recordUserLogin(userId);

    // Prefer session-authenticated Supabase client, fall back to environment client
    let client: any = null;
    try {
      client = await createServerClient();
    } catch {
      client = SupabaseManager.getClient();
    }

    if (!client) {
      const localFolders = sqlite.prepare(`SELECT COUNT(*) as c FROM folders WHERE user_id = ?`).get(userId) as any;
      const localBms = sqlite.prepare(`SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?`).get(userId) as any;
      return NextResponse.json({
        success: true,
        message: "Offline local mode",
        foldersCount: localFolders?.c || 0,
        bookmarksCount: localBms?.c || 0,
      });
    }

    // 0. Load ALL tombstoned IDs across local database to permanently prevent resurrected folders/bookmarks
    const tombstonedFolders = sqlite
      .prepare(`SELECT id FROM deleted_folders`)
      .all() as { id: string }[];
    const tombstoneFolderSet = new Set(tombstonedFolders.map((t) => t.id));

    const tombstonedBookmarks = sqlite
      .prepare(`SELECT id FROM deleted_bookmarks`)
      .all() as { id: string }[];
    const tombstoneBmSet = new Set(tombstonedBookmarks.map((t) => t.id));

    // 1. Fetch remote folders for this user
    let remoteFolders: any[] = [];
    try {
      const { data, error } = await client
        .from("folders")
        .select("*")
        .eq("user_id", userId);
      if (!error && Array.isArray(data)) {
        remoteFolders = data;
      }
    } catch (err) {
      console.warn("Sync: remote folders query warning:", err);
    }

    // 2. Fetch remote bookmarks for this user
    let remoteBookmarks: any[] = [];
    try {
      const { data, error } = await client
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId);
      if (!error && Array.isArray(data)) {
        remoteBookmarks = data;
      }
    } catch (err) {
      console.warn("Sync: remote bookmarks query warning:", err);
    }

    // Disable foreign key constraints during bulk sync upsert to prevent ordering issues
    try {
      sqlite.pragma("foreign_keys = OFF");

      if (remoteFolders.length > 0) {
        const upsertFolder = sqlite.prepare(`
          INSERT INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            parent_id = excluded.parent_id,
            icon = excluded.icon,
            color = excluded.color,
            position = excluded.position,
            updated_at = excluded.updated_at
        `);

        for (const f of remoteFolders) {
          if (tombstoneFolderSet.has(f.id)) {
            try {
              client.from("folders").delete().eq("id", f.id).then(() => {}).catch(() => {});
            } catch {}
            continue;
          }

          const now = Date.now();
          const createdAt = typeof f.created_at === "number" ? f.created_at : f.created_at ? new Date(f.created_at).getTime() || now : now;
          const updatedAt = typeof f.updated_at === "number" ? f.updated_at : f.updated_at ? new Date(f.updated_at).getTime() || createdAt : createdAt;

          upsertFolder.run(
            f.id,
            userId,
            f.parent_id || null,
            f.name || "Folder",
            f.icon || "📁",
            f.color || "#3b82f6",
            typeof f.position === "number" ? f.position : 0,
            createdAt,
            updatedAt
          );
        }
      }

      if (remoteBookmarks.length > 0) {
        const upsertBm = sqlite.prepare(`
          INSERT INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, image_url, domain, is_favorite, is_archived, status, visit_count, last_visited_at, last_clicked_at, created_at, search_text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            url = excluded.url,
            folder_id = excluded.folder_id,
            is_favorite = excluded.is_favorite,
            is_archived = excluded.is_archived,
            status = excluded.status,
            visit_count = excluded.visit_count,
            last_visited_at = excluded.last_visited_at,
            last_clicked_at = excluded.last_clicked_at
        `);

        for (const b of remoteBookmarks) {
          if (tombstoneBmSet.has(b.id)) {
            try {
              client.from("bookmarks").delete().eq("id", b.id).then(() => {}).catch(() => {});
            } catch {}
            continue;
          }

          const now = Date.now();
          const createdAt = typeof b.created_at === "number" ? b.created_at : b.created_at ? new Date(b.created_at).getTime() || now : now;
          let domain = b.domain;
          if (!domain && b.url) {
            try {
              domain = new URL(b.url).hostname.replace(/^www\./, "");
            } catch {
              domain = "website";
            }
          }

          upsertBm.run(
            b.id,
            userId,
            b.folder_id || null,
            b.url || "https://example.com",
            b.canonical_url || b.url || "https://example.com",
            b.title || domain || "Bookmark",
            b.description || "",
            b.icon_url || null,
            b.image_url || null,
            domain || "website",
            b.is_favorite ? 1 : 0,
            b.is_archived ? 1 : 0,
            b.status || "alive",
            typeof b.visit_count === "number" ? b.visit_count : 0,
            b.last_visited_at ? (typeof b.last_visited_at === "number" ? b.last_visited_at : new Date(b.last_visited_at).getTime() || null) : null,
            b.last_clicked_at ? (typeof b.last_clicked_at === "number" ? b.last_clicked_at : new Date(b.last_clicked_at).getTime() || null) : null,
            createdAt,
            b.search_text || `${b.title || ""} ${b.description || ""} ${domain || ""}`.toLowerCase()
          );
        }
      }
    } finally {
      try {
        sqlite.pragma("foreign_keys = ON");
      } catch {}
    }

    // If remote user has 0 bookmarks, seed a minimal starter set (1 folder, 3 bookmarks)
    if (remoteBookmarks.length === 0) {
      BookmarkRepository.ensureUserStarterData(userId);
    }

    const localFolders = sqlite.prepare(`SELECT COUNT(*) as c FROM folders WHERE user_id = ?`).get(userId) as any;
    const localBms = sqlite.prepare(`SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?`).get(userId) as any;

    return NextResponse.json({
      success: true,
      foldersCount: remoteFolders.length || localFolders?.c || 0,
      bookmarksCount: remoteBookmarks.length || localBms?.c || 0,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.warn("Sync user fallback notice:", error);
    try {
      const user = await requireUser(req).catch(() => null);
      const userId = user?.id || "guest";
      const localFolders = sqlite.prepare(`SELECT COUNT(*) as c FROM folders WHERE user_id = ?`).get(userId) as any;
      const localBms = sqlite.prepare(`SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?`).get(userId) as any;
      return NextResponse.json({
        success: true,
        message: "Offline local cache synchronized",
        foldersCount: localFolders?.c || 0,
        bookmarksCount: localBms?.c || 0,
      });
    } catch {
      return NextResponse.json({ success: true, message: "Local cache synchronized", foldersCount: 0, bookmarksCount: 0 });
    }
  }
}
