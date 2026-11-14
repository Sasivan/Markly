import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    // When a folder is clicked, default to strictly that specific folder only
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const rawView = searchParams.get("view") || "all";
    const view = (rawView === "home" || rawView === "database" || rawView === "collections" ? "all" : rawView) as any;
    const domain = searchParams.get("domain") || undefined;
    const status = (searchParams.get("status") || undefined) as any;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    // Coherently sync from Supabase if cache is stale or lambda instance is fresh
    try {
      const syncRes = await SupabaseManager.ensureUserSynced(user.id);
      if (syncRes.synced && syncRes.bookmarksCount === 0 && syncRes.foldersCount === 0) {
        BookmarkRepository.ensureUserStarterData(user.id);
      } else {
        BookmarkRepository.ensureUser(user.id);
      }
    } catch (err) {
      console.warn("Bookmark cache check warning:", err);
    }

    const bookmarks = BookmarkRepository.getBookmarks({
      folderId: folderId === "null" || folderId === "" ? null : folderId,
      includeSubfolders,
      includeArchived,
      view,
      domain,
      status,
      tag,
      search,
      userId: user.id,
    });

    return NextResponse.json({ success: true, count: bookmarks.length, bookmarks });
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/bookmarks error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
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
      userId: user.id,
    });

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({
      success: true,
      bookmark,
      id: bookmark.id,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/bookmarks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
}