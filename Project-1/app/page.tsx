import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { MarklyWorkspace } from "@/components/markly-workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const initialView = (cookieStore.get("markly_active_view")?.value || "home") as any;
  const initialFolderId = cookieStore.get("markly_active_folder_id")?.value || null;
  const initialSidebarCollapsed = cookieStore.get("markly_sidebar_collapsed")?.value === "true";

  const emptyStats = {
    totalBookmarks: 0,
    totalFolders: 0,
    addedThisWeek: 0,
    deadLinks: 0,
    topDomain: "None",
    topDomains: [],
    tagDistribution: [],
    timeline: [],
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Unauthenticated guest: empty workspace
      return (
        <MarklyWorkspace
          initialFolderTree={[]}
          initialFolders={[]}
          initialBookmarks={[]}
          initialStats={emptyStats}
          initialView={initialView}
          initialFolderId={initialFolderId}
          initialSidebarCollapsed={initialSidebarCollapsed}
        />
      );
    }

    // Authenticated user
    try {
      const syncRes = await SupabaseManager.ensureUserSynced(user.id);
      if (syncRes.synced && syncRes.foldersCount === 0 && syncRes.bookmarksCount === 0) {
        BookmarkRepository.ensureUserStarterData(user.id);
      } else {
        BookmarkRepository.ensureUser(user.id);
      }
    } catch (e) {
      console.warn("SSR sync user notice:", e);
    }

    const folderTree = BookmarkRepository.getFolderTree(user.id) || [];
    const allFolders = BookmarkRepository.getAllFolders(user.id) || [];
    const bookmarks = BookmarkRepository.getBookmarks({ view: "all", includeArchived: true, userId: user.id }) || [];
    const stats = BookmarkRepository.getDashboardStats(user.id) || emptyStats;

    return (
      <MarklyWorkspace
        initialFolderTree={folderTree}
        initialFolders={allFolders}
        initialBookmarks={bookmarks}
        initialStats={stats}
        initialView={initialView}
        initialFolderId={initialFolderId}
        initialSidebarCollapsed={initialSidebarCollapsed}
      />
    );
  } catch (error) {
    console.error("HomePage SSR error (handled):", error);
    return (
      <MarklyWorkspace
        initialFolderTree={[]}
        initialFolders={[]}
        initialBookmarks={[]}
        initialStats={emptyStats}
        initialView={initialView}
        initialFolderId={initialFolderId}
        initialSidebarCollapsed={initialSidebarCollapsed}
      />
    );
  }
}