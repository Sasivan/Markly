import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/recycle-bin/[id] - Restore item from recycle bin
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const result = await BookmarkRepository.restoreRecycleBinItem(id, user.id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: "Item not found in recycle bin" }, { status: 404 });
    }

    return NextResponse.json({ success: true, restored: result.item, type: result.type });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/recycle-bin/[id] restore error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restore item" },
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
    const user = await requireUser();
    const { id } = await params;

    const deleted = await BookmarkRepository.permanentlyDeleteRecycleBinItem(id, user.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Item not found in recycle bin" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("DELETE /api/recycle-bin/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to permanently delete item" },
      { status: 500 }
    );
  }
}