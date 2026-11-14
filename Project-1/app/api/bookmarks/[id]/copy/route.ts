import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const copyBookmarkSchema = z.object({
  targetFolderId: z.string().nullable().optional(),
});

// POST /api/bookmarks/[id]/copy
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = copyBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetFolderId } = parsed.data;

    const sourceBm = BookmarkRepository.getBookmarkById(id, user.id);
    if (!sourceBm) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 }
      );
    }

    const copiedBookmark = BookmarkRepository.copyBookmark(
      id,
      targetFolderId ?? null,
      user.id
    );

    return NextResponse.json({
      success: true,
      bookmark: copiedBookmark,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/bookmarks/[id]/copy error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to copy bookmark" },
      { status: 500 }
    );
  }
}
