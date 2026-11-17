import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { seedRichHierarchy } from "@/server/db/seed-rich-hierarchy";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";
import { isUserAdmin } from "@/server/auth/admin";
import { sqlite } from "@/server/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const userEmail = (user.email || (user as any).user_metadata?.email || "").trim().toLowerCase();
    const isAdmin = isUserAdmin(user) || userEmail.startsWith("sasivan177@") || userEmail.includes("sasivan177");

    // 1. Ensure admin user has rich hierarchy with 10 nested folders and 200 sites
    try {
      await SupabaseManager.ensureUserSynced(user.id);
      if (isAdmin) {
        const existingHub = sqlite
          .prepare(`SELECT id FROM folders WHERE user_id = ? AND name = 'Core Engineering Hub'`)
          .get(user.id);
        if (!existingHub) {
          seedRichHierarchy(user.id);
        }
      } else {
        BookmarkRepository.ensureUser(user.id);
      }
    } catch (err) {
      console.warn("Bootstrap user sync warning:", err);
      if (isAdmin) {
        const existingHub = sqlite
          .prepare(`SELECT id FROM folders WHERE user_id = ? AND name = 'Core Engineering Hub'`)
          .get(user.id);
        if (!existingHub) {
          seedRichHierarchy(user.id);
        }
      } else {
        BookmarkRepository.ensureUser(user.id);
      }
    }

    // 2. Fetch canonical tree, folders, bookmarks, and stats from local SQLite
    const tree = BookmarkRepository.getFolderTree(user.id) || [];
    const flat = BookmarkRepository.getAllFolders(user.id) || [];
    const bookmarks = BookmarkRepository.getBookmarks({ view: "all", includeArchived: true, userId: user.id }) || [];
    const stats = BookmarkRepository.getDashboardStats(user.id) || {
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
      userId: user.id,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/workspace/bootstrap error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bootstrap workspace" },
      { status: 500 }
    );
  }
}