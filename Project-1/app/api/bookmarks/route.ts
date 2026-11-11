import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    // When a folder is clicked, default to strictly that specific folder only
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";
    const rawView = searchParams.get("view") || "all";
    const view = (rawView === "home" || rawView === "database" || rawView === "collections" ? "all" : rawView) as any;
    const domain = searchParams.get("domain") || undefined;
    const status = (searchParams.get("status") || undefined) as any;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    const cookieStore = await cookies();
    const queryUserId = searchParams.get("userId");
    const userId = queryUserId || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    // Coherently sync from Supabase if cache is stale or lambda instance is fresh
    if (userId && userId !== DEFAULT_USER_ID) {
      try {
        const syncRes = await SupabaseManager.ensureUserSynced(userId);
        if (syncRes.synced && syncRes.bookmarksCount === 0 && syncRes.foldersCount === 0) {
          BookmarkRepository.ensureUserStarterData(userId);
        } else {
          BookmarkRepository.ensureUser(userId);
        }
      } catch (err) {
        console.warn("Bookmark cache check warning:", err);
      }
    }

    const bookmarks = BookmarkRepository.getBookmarks({
      folderId: folderId === "null" || folderId === "" ? null : folderId,
      includeSubfolders,
      view,
      domain,
      status,
      tag,
      search,
      userId,
    });

    SupabaseManager.invalidateUserSyncCache(userId);

    return NextResponse.json({ success: true, count: bookmarks.length, bookmarks });
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let rawUrl = (body.url || "").trim();
    if (!rawUrl || rawUrl === "https://" || rawUrl === "http://") {
      rawUrl = `https://example.com/item-${Date.now().toString(36)}`;
    } else if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = `https://${rawUrl}`;
    }

    let domain = "example.com";
    try {
      domain = new URL(rawUrl).hostname.replace(/^www\./, "");
    } catch {}

    const title = (body.title || "New Bookmark").trim();
    const folderId = body.folderId === "null" || !body.folderId ? null : body.folderId;
    const tagNames = Array.isArray(body.tagNames) ? body.tagNames : [];

    const cookieStore = await cookies();
    const userId = body.userId || cookieStore.get("markly_user_id")?.value || "usr_default_markly";

    const bookmark = BookmarkRepository.createBookmark({
      url: rawUrl,
      canonicalUrl: rawUrl,
      title,
      description: body.description || "",
      iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      imageUrl: body.imageUrl || null,
      domain,
      folderId,
      isFavorite: Boolean(body.isFavorite),
      tagNames,
      userId,
    });

    SupabaseManager.invalidateUserSyncCache(userId);

    return NextResponse.json({
      success: true,
      bookmark,
      id: bookmark.id,
    });
  } catch (error: any) {
    console.error("POST /api/bookmarks error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create bookmark" },
      { status: 500 }
    );
  }
}
