import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = BookmarkRepository.recordVisit(id);
    const updated = BookmarkRepository.getBookmarkById(id);
    return NextResponse.json({
      success,
      visitCount: updated?.visitCount || 0,
      lastVisitedAt: updated?.lastVisitedAt || Date.now(),
      lastClickedAt: updated?.lastClickedAt || Date.now(),
    });
  } catch (err) {
    console.error("POST /api/bookmarks/[id]/visit error:", err);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}
