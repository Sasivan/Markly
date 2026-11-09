import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { sqlite } from "@/server/db/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { folderId, targetFolderId, dropPosition } = body;

    // dropPosition: "inside" (nest under targetFolderId) | "before" | "after"
    if (!folderId) {
      return NextResponse.json({ success: false, error: "folderId is required" }, { status: 400 });
    }

    if (dropPosition === "inside") {
      // Nest folder under targetFolderId
      BookmarkRepository.updateFolder(folderId, {
        parentId: targetFolderId,
      });
    } else if (targetFolderId) {
      // Reorder relative to targetFolderId: get target folder's parent and position
      const target = sqlite.prepare(`SELECT parent_id, position FROM folders WHERE id = ?`).get(targetFolderId) as {
        parent_id: string | null;
        position: number;
      };

      if (target) {
        const newPos = dropPosition === "before" ? target.position : target.position + 1;

        // Shift siblings
        sqlite.prepare(`
          UPDATE folders
          SET position = position + 1
          WHERE (parent_id = ? OR (? IS NULL AND parent_id IS NULL)) AND position >= ?
        `).run(target.parent_id, target.parent_id, newPos);

        BookmarkRepository.updateFolder(folderId, {
          parentId: target.parent_id,
          position: newPos,
        });
      }
    }

    const updatedTree = BookmarkRepository.getFolderTree();
    const allFolders = BookmarkRepository.getAllFolders();

    return NextResponse.json({ success: true, tree: updatedTree, folders: allFolders });
  } catch (error: any) {
    console.error("POST /api/folders/reorder error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to reorder folders" }, { status: 500 });
  }
}

