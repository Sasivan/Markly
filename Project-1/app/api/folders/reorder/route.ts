import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { sqlite } from "@/server/db/client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { folderId, targetFolderId, dropPosition } = body;

    // dropPosition: "inside" (nest under targetFolderId) | "before" | "after" | "root"
    if (!folderId) {
      return NextResponse.json({ success: false, error: "folderId is required" }, { status: 400 });
    }

    const currentFolder = BookmarkRepository.getFolderById(folderId, user.id);
    if (!currentFolder) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    // Cyclic check: cannot move folder into itself or its own descendants
    if (targetFolderId && targetFolderId !== "root" && targetFolderId !== "__ROOT__") {
      const descendants = BookmarkRepository.getDescendantFolderIds(folderId, user.id);
      if (descendants.includes(targetFolderId)) {
        return NextResponse.json(
          { success: false, error: "Cannot move a folder into itself or its own subfolder" },
          { status: 400 }
        );
      }
    }

    if (dropPosition === "root" || targetFolderId === null || targetFolderId === "root" || targetFolderId === "__ROOT__") {
      // Move folder to top root level
      await BookmarkRepository.updateFolder(folderId, user.id, {
        parentId: null,
      });
    } else if (dropPosition === "inside") {
      const targetFolder = BookmarkRepository.getFolderById(targetFolderId, user.id);
      if (!targetFolder) {
        return NextResponse.json({ success: false, error: "Target folder not found" }, { status: 404 });
      }
      // Nest folder under targetFolderId
      await BookmarkRepository.updateFolder(folderId, user.id, {
        parentId: targetFolderId,
      });
    } else if (targetFolderId) {
      // Reorder relative to targetFolderId: get target folder's parent and position
      const target = sqlite.prepare(`SELECT parent_id, position FROM folders WHERE id = ? AND user_id = ?`).get(targetFolderId, user.id) as {
        parent_id: string | null;
        position: number;
      } | undefined;

      if (target) {
        const newPos = dropPosition === "before" ? target.position : target.position + 1;

        // Shift siblings belonging to this user
        sqlite.prepare(`
          UPDATE folders
          SET position = position + 1
          WHERE user_id = ? AND (parent_id = ? OR (? IS NULL AND parent_id IS NULL)) AND position >= ?
        `).run(user.id, target.parent_id, target.parent_id, newPos);

        await BookmarkRepository.updateFolder(folderId, user.id, {
          parentId: target.parent_id,
          position: newPos,
        });
      } else {
        return NextResponse.json({ success: false, error: "Target folder not found" }, { status: 404 });
      }
    }

    const updatedTree = BookmarkRepository.getFolderTree(user.id);
    const allFolders = BookmarkRepository.getAllFolders(user.id);

    return NextResponse.json({ success: true, tree: updatedTree, folders: allFolders });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/folders/reorder error:", error);
    return NextResponse.json({ success: false, error: "Failed to reorder folders" }, { status: 500 });
  }
}