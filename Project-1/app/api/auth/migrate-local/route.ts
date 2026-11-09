import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "markly.db");
const sqlite = new Database(dbPath);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // 1. Check if user already has data
    const existingCount = sqlite
      .prepare(`SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?`)
      .get(userId) as { count: number };

    // 2. If new user has 0 bookmarks, copy from local default library
    if (existingCount.count === 0) {
      const defaultFolders = sqlite
        .prepare(`SELECT * FROM folders WHERE user_id = 'usr_default_markly'`)
        .all() as any[];

      const defaultBookmarks = sqlite
        .prepare(`SELECT * FROM bookmarks WHERE user_id = 'usr_default_markly'`)
        .all() as any[];

      const defaultTags = sqlite
        .prepare(`SELECT * FROM tags WHERE user_id = 'usr_default_markly'`)
        .all() as any[];

      const defaultBookmarkTags = sqlite
        .prepare(`SELECT bt.* FROM bookmark_tags bt JOIN bookmarks b ON bt.bookmark_id = b.id WHERE b.user_id = 'usr_default_markly'`)
        .all() as any[];

      // Insert Folders for new user
      const insertFolder = sqlite.prepare(`
        INSERT OR IGNORE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const f of defaultFolders) {
        insertFolder.run(
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

      // Insert Tags
      const insertTag = sqlite.prepare(`
        INSERT OR IGNORE INTO tags (id, user_id, name, color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const t of defaultTags) {
        insertTag.run(t.id, userId, t.name, t.color, t.created_at);
      }

      // Insert Bookmarks
      const insertBm = sqlite.prepare(`
        INSERT OR IGNORE INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, image_url, domain, is_favorite, is_archived, status, visit_count, last_visited_at, last_clicked_at, created_at, search_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const b of defaultBookmarks) {
        insertBm.run(
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
          b.is_favorite,
          b.is_archived,
          b.status,
          b.visit_count,
          b.last_visited_at,
          b.last_clicked_at,
          b.created_at,
          b.search_text
        );
      }

      // Insert Bookmark Tags
      const insertBt = sqlite.prepare(`
        INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)
      `);
      for (const bt of defaultBookmarkTags) {
        insertBt.run(bt.bookmark_id, bt.tag_id);
      }
    }

    // 3. Sync newly migrated data to Supabase in the background
    SupabaseManager.syncLocalToSupabase().catch((err) => {
      console.warn("Background cloud sync after migration warning:", err);
    });

    return NextResponse.json({
      success: true,
      message: "User account initialized and synced with library data.",
      userId,
    });
  } catch (error: any) {
    console.error("Migrate local error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

