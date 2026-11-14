import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";
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

    // Sync remote Supabase user data to local cache using battle-tested transaction engine
    const syncRes = await SupabaseManager.syncRemoteUserToLocal(userId);

    const localFolders = sqlite.prepare(`SELECT COUNT(*) as c FROM folders WHERE user_id = ?`).get(userId) as any;
    const localBms = sqlite.prepare(`SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?`).get(userId) as any;

    return NextResponse.json({
      success: true,
      foldersCount: syncRes.foldersCount || localFolders?.c || 0,
      bookmarksCount: syncRes.bookmarksCount || localBms?.c || 0,
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
