import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/folders/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const folder = BookmarkRepository.getFolderById(id, user.id);
    if (!folder) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/folders/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/folders/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await req.json();

    if (body.parentId) {
      const parent = BookmarkRepository.getFolderById(body.parentId, user.id);
      if (!parent) {
        return NextResponse.json({ success: false, error: "Parent folder not found" }, { status: 404 });
      }
    }

    const updated = await BookmarkRepository.updateFolder(id, user.id, {
      name: body.name?.trim(),
      parentId: body.parentId !== undefined ? body.parentId : undefined,
      icon: body.icon,
      color: body.color,
      position: body.position,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({ success: true, folder: updated });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("PATCH /api/folders/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update folder" }, { status: 500 });
  }
}

// DELETE /api/folders/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    // Prevent deletion of permanent system folder
    if (id === "__UNSORTED__" || id.startsWith("fld_unsorted_")) {
      return NextResponse.json(
        { success: false, error: "The Unsorted system folder is permanent and cannot be deleted." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "move_up") as "move_up" | "delete_all";

    const deleted = await BookmarkRepository.deleteFolder(id, user.id, mode);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({ success: true, deletedId: id, mode });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("DELETE /api/folders/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete folder" }, { status: 500 });
  }
}

// POST /api/folders/[id] (duplicate folder)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const original = BookmarkRepository.getFolderById(id, user.id);
    if (!original) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    const duplicated = BookmarkRepository.createFolder({
      name: `${original.name} (Copy)`,
      parentId: original.parentId,
      icon: original.icon,
      color: original.color,
      userId: user.id,
    });

    // Also duplicate bookmarks belonging to original folder into the new copy
    const originalBookmarks = BookmarkRepository.getBookmarks({ folderId: original.id, userId: user.id });
    for (const b of originalBookmarks) {
      BookmarkRepository.createBookmark({
        url: b.url,
        canonicalUrl: `${b.canonicalUrl}#copy_${Date.now().toString(36)}`,
        title: b.title,
        description: b.description || "",
        iconUrl: b.iconUrl || undefined,
        imageUrl: b.imageUrl || undefined,
        domain: b.domain,
        folderId: duplicated.id,
        isFavorite: b.isFavorite,
        tagNames: b.tags?.map((t) => t.name) || [],
        userId: user.id,
      });
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({ success: true, folder: duplicated });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("Duplicate folder error:", error);
    return NextResponse.json({ success: false, error: "Failed to duplicate folder" }, { status: 500 });
  }
}