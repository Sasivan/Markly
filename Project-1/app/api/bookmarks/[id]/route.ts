import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

// PATCH /api/bookmarks/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

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

    const updated = BookmarkRepository.getBookmarks().find((b) => b.id === id);
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
    BookmarkRepository.deleteBookmark(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("DELETE /api/bookmarks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
