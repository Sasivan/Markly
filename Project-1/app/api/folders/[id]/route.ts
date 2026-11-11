import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { db } from "@/server/db/client";
import { folders } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/folders/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = BookmarkRepository.updateFolder(id, {
      name: body.name?.trim(),
      parentId: body.parentId !== undefined ? body.parentId : undefined,
      icon: body.icon,
      color: body.color,
      position: body.position,
    });

    return NextResponse.json({ success: true, folder: updated });
  } catch (error: any) {
    console.error("PATCH /api/folders/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update folder" }, { status: 500 });
  }
}

// DELETE /api/folders/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "move_up") as "move_up" | "delete_all";

    const cookieStore = await cookies();
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    BookmarkRepository.deleteFolder(id, mode, userId);

    return NextResponse.json({ success: true, deletedId: id, mode });
  } catch (error: any) {
    console.error("DELETE /api/folders/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete folder" }, { status: 500 });
  }
}

// POST /api/folders/[id] (duplicate folder)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const original = db.select().from(folders).where(eq(folders.id, id)).get();
    if (!original) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    const duplicated = BookmarkRepository.createFolder({
      name: `${original.name} (Copy)`,
      parentId: original.parentId,
      icon: original.icon,
      color: original.color,
    });

    return NextResponse.json({ success: true, folder: duplicated });
  } catch (error: any) {
    console.error("Duplicate folder error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to duplicate folder" }, { status: 500 });
  }
}

