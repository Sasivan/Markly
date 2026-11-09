import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { parseNetscapeHtml } from "@/server/import-export/netscape";
import { normalizeUrl } from "@/server/scraper/url";

export async function POST(req: Request) {
  try {
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
    const existingFolders = BookmarkRepository.getAllFolders();
    const folderMap = new Map<string, string>();
    for (const f of existingFolders) {
      folderMap.set(f.name.toLowerCase(), f.id);
    }

    if (filename.endsWith(".html") || filename.endsWith(".htm") || text.includes("NETSCAPE-Bookmark-file-1")) {
      const parsed = parseNetscapeHtml(text);

      // Create missing folders
      for (const fName of parsed.folders) {
        if (!folderMap.has(fName.toLowerCase())) {
          const newFolder = BookmarkRepository.createFolder({ name: fName });
          folderMap.set(fName.toLowerCase(), newFolder.id);
          createdFoldersCount++;
        }
      }

      // Add bookmarks
      for (const item of parsed.bookmarks) {
        try {
          const { url, canonicalUrl, domain } = normalizeUrl(item.url);
          // Check duplicate
          const dup = BookmarkRepository.findDuplicate(canonicalUrl);
          if (dup) continue;

          const fId = item.folderName ? folderMap.get(item.folderName.toLowerCase()) || null : null;

          BookmarkRepository.createBookmark({
            url,
            canonicalUrl,
            title: item.title || domain,
            domain,
            folderId: fId,
            tagNames: item.tags,
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
          const dup = BookmarkRepository.findDuplicate(canonicalUrl);
          if (dup) continue;

          BookmarkRepository.createBookmark({
            url,
            canonicalUrl,
            title: b.title || domain,
            description: b.description,
            domain,
            iconUrl: b.iconUrl,
            folderId: b.folderId || null,
            isFavorite: Boolean(b.isFavorite),
            tagNames: Array.isArray(b.tags) ? b.tags.map((t: any) => (typeof t === "string" ? t : t.name)) : [],
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

    return NextResponse.json({
      success: true,
      importedCount,
      createdFoldersCount,
      message: `Successfully imported ${importedCount} bookmarks into Markly.`,
    });
  } catch (error: any) {
    console.error("POST /api/import error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to parse import file" }, { status: 500 });
  }
}

