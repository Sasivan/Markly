import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// PATCH /api/bookmarks/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const cookieStore = await cookies();
    const userId = body.userId || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    BookmarkRepository.updateBookmark(id, {
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
      tagNames: body.tagNames,
    });

    SupabaseManager.invalidateUserSyncCache(userId);

    const updated = BookmarkRepository.getBookmarkById(id);
    return NextResponse.json({ success: true, bookmark: updated });
  } catch (error: any) {
    console.error("PATCH /api/bookmarks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update bookmark" },
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
    const { id } = await params;
    const cookieStore = await cookies();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    await BookmarkRepository.deleteBookmark(id, userId);
    SupabaseManager.invalidateUserSyncCache(userId);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("DELETE /api/bookmarks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
