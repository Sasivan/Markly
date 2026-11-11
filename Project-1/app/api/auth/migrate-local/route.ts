import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { sqlite } from "@/server/db/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Safely migrate all local items from default user to authenticated user
    sqlite.prepare(`
      DELETE FROM bookmarks
      WHERE user_id = 'usr_default_markly'
      AND canonical_url IN (SELECT canonical_url FROM bookmarks WHERE user_id = ?)
    `).run(userId);

    sqlite.prepare(`
      DELETE FROM tags
      WHERE user_id = 'usr_default_markly'
      AND name IN (SELECT name FROM tags WHERE user_id = ?)
    `).run(userId);

    sqlite.prepare(`UPDATE folders SET user_id = ? WHERE user_id = 'usr_default_markly'`).run(userId);
    sqlite.prepare(`UPDATE bookmarks SET user_id = ? WHERE user_id = 'usr_default_markly'`).run(userId);
    sqlite.prepare(`UPDATE tags SET user_id = ? WHERE user_id = 'usr_default_markly'`).run(userId);

    // Sync newly migrated data to Supabase in the background
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
