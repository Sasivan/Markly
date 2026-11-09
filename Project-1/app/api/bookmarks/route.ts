import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    // When a folder is clicked, default to strictly that specific folder only
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";
    const rawView = searchParams.get("view") || "all";
    const view = (rawView === "home" ? "all" : rawView) as any;
    const domain = searchParams.get("domain") || undefined;
    const status = (searchParams.get("status") || undefined) as any;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    const bookmarks = BookmarkRepository.getBookmarks({
      folderId: folderId === "null" || folderId === "" ? null : folderId,
      includeSubfolders,
      view,
      domain,
      status,
      tag,
      search,
    });

    return NextResponse.json({ success: true, count: bookmarks.length, bookmarks });
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

