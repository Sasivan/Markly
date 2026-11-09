import { BookmarkRepository } from "@/server/db/repository";
import { MarklyWorkspace } from "@/components/markly-workspace";

export const dynamic = "force-dynamic";

export default function HomePage() {
  BookmarkRepository.ensureDefaultUser();
  const folderTree = BookmarkRepository.getFolderTree();
  const allFolders = BookmarkRepository.getAllFolders();
  const bookmarks = BookmarkRepository.getBookmarks({ view: "all" });
  const stats = BookmarkRepository.getDashboardStats();

  return (
    <MarklyWorkspace
      initialFolderTree={folderTree}
      initialFolders={allFolders}
      initialBookmarks={bookmarks}
      initialStats={stats}
    />
  );
}
