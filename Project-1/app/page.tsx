import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { MarklyWorkspace } from "@/components/markly-workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    BookmarkRepository.ensureDefaultUser();
    const cookieStore = await cookies();
    const userId = cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

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

    return (
      <MarklyWorkspace
        initialFolderTree={folderTree}
        initialFolders={allFolders}
        initialBookmarks={bookmarks}
        initialStats={stats}
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
