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

// PATCH /api/recycle-bin - Update retention days (1, 7, 15, 30)
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
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
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("PATCH /api/recycle-bin error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update retention" },
      { status: 500 }
    );
  }
}