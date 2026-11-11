import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ids, folderId, isFavorite, isArchived, status, tagNames } = body;

    const cookieStore = await cookies();
    const { searchParams } = new URL(req.url);
    const userId = body.userId || searchParams.get("userId") || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "ids must be a non-empty array" }, { status: 400 });
    }

    switch (action) {
      case "move":
        BookmarkRepository.bulkUpdate(ids, { folderId: folderId ?? null });
        break;

      case "favorite":
        BookmarkRepository.bulkUpdate(ids, { isFavorite: Boolean(isFavorite) });
        break;

      case "archive":
        BookmarkRepository.bulkUpdate(ids, { isArchived: Boolean(isArchived) });
        break;

      case "status":
        BookmarkRepository.bulkUpdate(ids, { status });
        break;

      case "tag":
        if (Array.isArray(tagNames)) {
          for (const id of ids) {
            BookmarkRepository.attachTagsToBookmark(id, tagNames);
          }
        }
        break;

      case "delete":
        await BookmarkRepository.bulkDelete(ids, userId);
        break;

      default:
        return NextResponse.json({ success: false, error: `Unknown action '${action}'` }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: ids.length, action });
  } catch (error: any) {
    console.error("POST /api/bookmarks/bulk error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
