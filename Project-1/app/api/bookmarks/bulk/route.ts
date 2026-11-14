import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { action, ids, folderId, isFavorite, isArchived, status, tagNames } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "ids must be a non-empty array" }, { status: 400 });
    }

    switch (action) {
      case "move":
        if (folderId) {
          const folder = BookmarkRepository.getFolderById(folderId, user.id);
          if (!folder) {
            return NextResponse.json({ success: false, error: "Target folder not found" }, { status: 404 });
          }
        }
        await BookmarkRepository.bulkUpdate(ids, { folderId: folderId ?? null }, user.id);
        break;

      case "favorite":
        await BookmarkRepository.bulkUpdate(ids, { isFavorite: Boolean(isFavorite) }, user.id);
        break;

      case "archive":
        await BookmarkRepository.bulkUpdate(ids, { isArchived: Boolean(isArchived) }, user.id);
        break;

      case "status":
        await BookmarkRepository.bulkUpdate(ids, { status }, user.id);
        break;

      case "tag":
        if (Array.isArray(tagNames)) {
          for (const id of ids) {
            BookmarkRepository.attachTagsToBookmark(id, tagNames, user.id);
          }
        }
        break;

      case "delete":
        await BookmarkRepository.bulkDelete(ids, user.id);
        break;

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: ids.length, action });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/bookmarks/bulk error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}