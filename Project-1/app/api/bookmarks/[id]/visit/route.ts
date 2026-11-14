import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const success = await BookmarkRepository.recordVisit(id, user.id);
    if (!success) {
      return NextResponse.json({ success: false, error: "Bookmark not found" }, { status: 404 });
    }

    const updated = BookmarkRepository.getBookmarkById(id, user.id);
    return NextResponse.json({
      success: true,
      visitCount: updated?.visitCount || 0,
      lastVisitedAt: updated?.lastVisitedAt || Date.now(),
      lastClickedAt: updated?.lastClickedAt || Date.now(),
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("POST /api/bookmarks/[id]/visit error:", err);
    return NextResponse.json({ success: false, error: "Failed to record visit" }, { status: 500 });
  }
}