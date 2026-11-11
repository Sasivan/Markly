import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { sqlite } from "@/server/db/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const queryUserId = searchParams.get("userId");
    const userId = queryUserId || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    // Check if user is known in local SQLite cache; only sync from Supabase if brand new
    if (userId && userId !== DEFAULT_USER_ID) {
      try {
        const userRow = sqlite
          .prepare(`SELECT id FROM users WHERE id = ?`)
          .get(userId);
        if (!userRow) {
          const syncRes = await SupabaseManager.syncRemoteUserToLocal(userId);
          if (syncRes.foldersCount === 0 && syncRes.bookmarksCount === 0) {
            BookmarkRepository.ensureUserStarterData(userId);
          } else {
            BookmarkRepository.ensureUser(userId);
          }
        }
      } catch (err) {
        console.warn("Folder cache check warning:", err);
      }
    }

    const tree = BookmarkRepository.getFolderTree(userId);
    const flat = BookmarkRepository.getAllFolders(userId);
    return NextResponse.json({ success: true, tree, folders: flat });
  } catch (error) {
    console.error("GET /api/folders error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userId = body.userId || cookieStore.get("markly_user_id")?.value || "usr_default_markly";

    const folder = BookmarkRepository.createFolder({
      id: body.id || undefined,
      name: body.name.trim(),
      parentId: body.parentId || null,
      icon: body.icon || "📁",
      color: body.color || "gray",
      userId,
    });

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error("POST /api/folders error:", error);
    return NextResponse.json({ success: false, error: "Failed to create folder" }, { status: 500 });
  }
}

