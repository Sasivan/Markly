import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { sqlite } from "@/server/db/client";
import { BookmarkRepository } from "@/server/db/repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const client = SupabaseManager.getClient();
    if (!client) {
      return NextResponse.json({ success: true, message: "Offline local mode" });
    }

    // Record login timestamp (cleanup removed in Stage 1 security lockdown)
    BookmarkRepository.recordUserLogin(userId);

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
    const { data: remoteFolders } = await client
      .from("folders")
      .select("*")
      .eq("user_id", userId);

    if (remoteFolders && remoteFolders.length > 0) {
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
            client.from("folders").delete().eq("id", f.id).then(() => {});
          } catch {}
          continue;
        }

        upsertFolder.run(
          f.id,
          userId,
          f.parent_id,
          f.name,
          f.icon,
          f.color,
          f.position,
          f.created_at,
          f.updated_at
        );
      }
    }

    // 2. Fetch remote bookmarks for this user
    const { data: remoteBookmarks } = await client
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId);

    if (remoteBookmarks && remoteBookmarks.length > 0) {
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
            client.from("bookmarks").delete().eq("id", b.id).then(() => {});
          } catch {}
          continue;
        }

        upsertBm.run(
          b.id,
          userId,
          b.folder_id,
          b.url,
          b.canonical_url,
          b.title,
          b.description,
          b.icon_url,
          b.image_url,
          b.domain,
          b.is_favorite ? 1 : 0,
          b.is_archived ? 1 : 0,
          b.status,
          b.visit_count,
          b.last_visited_at,
          b.last_clicked_at,
          b.created_at,
          b.search_text
        );
      }
    }

    // If remote user has 0 bookmarks, seed a minimal starter set (1 folder, 3 bookmarks)
    if (!remoteBookmarks || remoteBookmarks.length === 0) {
      BookmarkRepository.ensureUserStarterData(userId);
    }

    // NOTE: No longer sets markly_user_id cookie — Supabase session handles auth
    return NextResponse.json({
      success: true,
      foldersCount: remoteFolders?.length || 0,
      bookmarksCount: remoteBookmarks?.length || 0,
    });
  } catch (error: any) {
    console.error("Sync user error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
