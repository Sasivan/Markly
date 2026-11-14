import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/bookmarks/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const bookmark = BookmarkRepository.getBookmarkById(id, user.id);
    if (!bookmark) {
      return NextResponse.json({ success: false, error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, bookmark });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/bookmarks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/bookmarks/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await req.json();

    const updated = BookmarkRepository.updateBookmark(id, user.id, {
      title: body.title?.trim(),
      description: body.description,
      url: body.url?.trim(),
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
      iconUrl: body.iconUrl !== undefined ? body.iconUrl : undefined,
      folderId: body.folderId !== undefined ? body.folderId : undefined,
      isFavorite: body.isFavorite,
      isArchived: body.isArchived,
      status: body.status,
      visitCount: body.visitCount,
      lastVisitedAt: body.lastVisitedAt,
      tagNames:
        body.tagNames !== undefined
          ? body.tagNames
          : Array.isArray(body.tags)
          ? body.tags.map((t: any) => (typeof t === "string" ? t : t.name))
          : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Bookmark not found" }, { status: 404 });
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    const bookmark = BookmarkRepository.getBookmarkById(id, user.id);
    return NextResponse.json({ success: true, bookmark });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("PATCH /api/bookmarks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update bookmark" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookmarks/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const deleted = await BookmarkRepository.deleteBookmark(id, user.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Bookmark not found" }, { status: 404 });
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("DELETE /api/bookmarks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}