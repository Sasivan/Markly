import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/recycle-bin/[id] - Restore item from recycle bin
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    const result = await BookmarkRepository.restoreRecycleBinItem(id, userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, restored: result.item, type: result.type });
  } catch (error: any) {
    console.error("POST /api/recycle-bin/[id] restore error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to restore item" },
      { status: 500 }
    );
  }
}

// DELETE /api/recycle-bin/[id] - Permanently delete single item
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    await BookmarkRepository.permanentlyDeleteRecycleBinItem(id, userId);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("DELETE /api/recycle-bin/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to permanently delete item" },
      { status: 500 }
    );
  }
}

