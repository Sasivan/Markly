import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/recycle-bin - List deleted items & current retention
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    const items = await BookmarkRepository.getRecycleBinItems(userId);
    const retentionDays = BookmarkRepository.getRecycleBinRetentionDays(userId);

    return NextResponse.json({
      success: true,
      items,
      retentionDays,
      totalCount: items.length,
    });
  } catch (error: any) {
    console.error("GET /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch recycle bin" },
      { status: 500 }
    );
  }
}

// DELETE /api/recycle-bin - Empty entire recycle bin
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    await BookmarkRepository.emptyRecycleBin(userId);

    return NextResponse.json({ success: true, message: "Recycle bin emptied" });
  } catch (error: any) {
    console.error("DELETE /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to empty recycle bin" },
      { status: 500 }
    );
  }
}

// PATCH /api/recycle-bin - Disabled until Stage 4 (requires auth)
export async function PATCH() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

