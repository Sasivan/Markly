import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const queryUserId = searchParams.get("userId");
    const userId = queryUserId || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    // 1. Ensure user is synced with Supabase cloud
    if (userId && userId !== DEFAULT_USER_ID) {
      try {
        const syncRes = await SupabaseManager.ensureUserSynced(userId);
        if (syncRes.synced && syncRes.foldersCount === 0 && syncRes.bookmarksCount === 0) {
          BookmarkRepository.ensureUserStarterData(userId);
        } else {
          BookmarkRepository.ensureUser(userId);
        }
      } catch (err) {
        console.warn("Bootstrap user sync warning:", err);
      }
    } else {
      BookmarkRepository.ensureDefaultUser();
    }

    // 2. Fetch canonical tree, folders, bookmarks, and stats in parallel from local SQLite
    const tree = BookmarkRepository.getFolderTree(userId) || [];
    const flat = BookmarkRepository.getAllFolders(userId) || [];
    const bookmarks = BookmarkRepository.getBookmarks({ view: "all", includeArchived: true, userId }) || [];
    const stats = BookmarkRepository.getDashboardStats(userId) || {
      totalBookmarks: 0,
      totalFolders: 0,
      addedThisWeek: 0,
      deadLinks: 0,
      topDomain: "None",
      topDomains: [],
      tagDistribution: [],
      timeline: [],
    };

    const res = NextResponse.json({
      success: true,
      tree,
      folders: flat,
      bookmarks,
      stats,
      userId,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("GET /api/workspace/bootstrap error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bootstrap workspace" },
      { status: 500 }
    );
  }
}

