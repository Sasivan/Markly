import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/recycle-bin - List deleted items & current retention
export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const items = await BookmarkRepository.getRecycleBinItems(user.id);
    const retentionDays = BookmarkRepository.getRecycleBinRetentionDays(user.id);

    return NextResponse.json({
      success: true,
      items,
      retentionDays,
      totalCount: items.length,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recycle bin" },
      { status: 500 }
    );
  }
}

// DELETE /api/recycle-bin - Empty entire recycle bin
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();

    await BookmarkRepository.emptyRecycleBin(user.id);

    return NextResponse.json({ success: true, message: "Recycle bin emptied" });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("DELETE /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to empty recycle bin" },
      { status: 500 }
    );
  }
}

// PATCH /api/recycle-bin - Disabled until Stage 4 (requires auth)
export async function PATCH() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}