import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { sqlite } from "@/server/db/client";
import { MarklyWorkspace } from "@/components/markly-workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    BookmarkRepository.ensureDefaultUser();
    const cookieStore = await cookies();
    const userId = cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    if (userId && userId !== DEFAULT_USER_ID) {
      try {
        const syncRes = await SupabaseManager.ensureUserSynced(userId);
        if (syncRes.synced && syncRes.foldersCount === 0 && syncRes.bookmarksCount === 0) {
          BookmarkRepository.ensureUserStarterData(userId);
        } else {
          BookmarkRepository.ensureUser(userId);
        }
      } catch (e) {
        console.warn("SSR sync user notice:", e);
      }
    }

    const folderTree = BookmarkRepository.getFolderTree(userId) || [];
    const allFolders = BookmarkRepository.getAllFolders(userId) || [];
    const bookmarks = BookmarkRepository.getBookmarks({ view: "all", userId }) || [];
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

    const initialView = (cookieStore.get("markly_active_view")?.value || "home") as any;
    const initialFolderId = cookieStore.get("markly_active_folder_id")?.value || null;
    const initialSidebarCollapsed = cookieStore.get("markly_sidebar_collapsed")?.value === "true";

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
        initialStats={{
          totalBookmarks: 0,
          totalFolders: 0,
          addedThisWeek: 0,
          deadLinks: 0,
          topDomain: "None",
          topDomains: [],
          tagDistribution: [],
          timeline: [],
        }}
      />
    );
  }
}
