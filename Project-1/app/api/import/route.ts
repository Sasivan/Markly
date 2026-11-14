import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { parseNetscapeHtml } from "@/server/import-export/netscape";
import { normalizeUrl } from "@/server/scraper/url";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const filename = file.name.toLowerCase();

    let importedCount = 0;
    let createdFoldersCount = 0;

    // Map existing folders
    const existingFolders = BookmarkRepository.getAllFolders(user.id);
    const folderMap = new Map<string, string>();
    for (const f of existingFolders) {
      folderMap.set(f.name.toLowerCase(), f.id);
    }

    if (filename.endsWith(".html") || filename.endsWith(".htm") || text.includes("NETSCAPE-Bookmark-file-1")) {
      const parsed = parseNetscapeHtml(text);

      // Create missing folders
      for (const fName of parsed.folders) {
        if (!folderMap.has(fName.toLowerCase())) {
          const newFolder = BookmarkRepository.createFolder({ name: fName, userId: user.id });
          folderMap.set(fName.toLowerCase(), newFolder.id);
          createdFoldersCount++;
        }
      }

      // Add bookmarks
      for (const item of parsed.bookmarks) {
        try {
          const { url, canonicalUrl, domain } = normalizeUrl(item.url);
          // Check duplicate
          const dup = BookmarkRepository.findDuplicate(canonicalUrl, user.id);
          if (dup) continue;

          const fId = item.folderName ? folderMap.get(item.folderName.toLowerCase()) || null : null;

          BookmarkRepository.createBookmark({
            url,
            canonicalUrl,
            title: item.title || domain,
            domain,
            folderId: fId,
            tagNames: item.tags,
            userId: user.id,
          });
          importedCount++;
        } catch {
          continue;
        }
      }
    } else if (filename.endsWith(".json")) {
      const data = JSON.parse(text);
      const bookmarksList = Array.isArray(data) ? data : data.bookmarks || [];

      for (const b of bookmarksList) {
        if (!b.url) continue;
        try {
          const { url, canonicalUrl, domain } = normalizeUrl(b.url);
          const dup = BookmarkRepository.findDuplicate(canonicalUrl, user.id);
          if (dup) continue;

          let targetFolderId: string | null = null;
          if (b.folderId && folderMap.has(b.folderId)) {
            targetFolderId = b.folderId;
          }

          BookmarkRepository.createBookmark({
            url,
            canonicalUrl,
            title: b.title || domain,
            description: b.description,
            domain,
            iconUrl: b.iconUrl,
            folderId: targetFolderId,
            isFavorite: Boolean(b.isFavorite),
            tagNames: Array.isArray(b.tags) ? b.tags.map((t: any) => (typeof t === "string" ? t : t.name)) : [],
            userId: user.id,
          });
          importedCount++;
        } catch {
          continue;
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported file format. Please upload HTML bookmarks or JSON." },
        { status: 400 }
      );
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({
      success: true,
      importedCount,
      createdFoldersCount,
      message: `Successfully imported ${importedCount} bookmarks into Markly.`,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/import error:", error);
    return NextResponse.json({ success: false, error: "Failed to parse import file" }, { status: 500 });
  }
}