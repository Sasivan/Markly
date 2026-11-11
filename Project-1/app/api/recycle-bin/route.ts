import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";

// GET /api/recycle-bin - List deleted items & current retention
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    const items = BookmarkRepository.getRecycleBinItems(userId);
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

    BookmarkRepository.emptyRecycleBin(userId);

    return NextResponse.json({ success: true, message: "Recycle bin emptied" });
  } catch (error: any) {
    console.error("DELETE /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to empty recycle bin" },
      { status: 500 }
    );
  }
}

// PATCH /api/recycle-bin - Update retention days (1, 7, 15, 30)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { retentionDays } = body;

    const days = parseInt(retentionDays, 10);
    if (![1, 7, 15, 30].includes(days)) {
      return NextResponse.json(
        { success: false, error: "Invalid retention days. Must be 1, 7, 15, or 30." },
        { status: 400 }
      );
    }

    BookmarkRepository.setRecycleBinRetentionDays(days);

    return NextResponse.json({ success: true, retentionDays: days });
  } catch (error: any) {
    console.error("PATCH /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update retention" },
      { status: 500 }
    );
  }
}
