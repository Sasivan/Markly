import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bulkCopySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  targetFolderId: z.string().nullable().optional(),
});

// POST /api/bookmarks/bulk-copy
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);

    const body = await req.json();
    const parsed = bulkCopySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { ids, targetFolderId } = parsed.data;

    const result = BookmarkRepository.bulkCopyBookmarks(
      ids,
      targetFolderId ?? null,
      user.id
    );

    return NextResponse.json({
      success: true,
      copiedCount: result.copiedCount,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/bookmarks/bulk-copy error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to bulk copy bookmarks" },
      { status: 500 }
    );
  }
}
