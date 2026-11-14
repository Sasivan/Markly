import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();

    // Coherently sync from Supabase if cache is stale or lambda instance is fresh
    try {
      const syncRes = await SupabaseManager.ensureUserSynced(user.id);
      if (syncRes.synced && syncRes.foldersCount === 0 && syncRes.bookmarksCount === 0) {
        BookmarkRepository.ensureUserStarterData(user.id);
      } else {
        BookmarkRepository.ensureUser(user.id);
      }
    } catch (err) {
      console.warn("Folder cache check warning:", err);
    }

    const tree = BookmarkRepository.getFolderTree(user.id);
    const flat = BookmarkRepository.getAllFolders(user.id);
    return NextResponse.json({ success: true, tree, folders: flat });
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/folders error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 });
    }

    if (body.parentId) {
      const parent = BookmarkRepository.getFolderById(body.parentId, user.id);
      if (!parent) {
        return NextResponse.json({ success: false, error: "Parent folder not found" }, { status: 404 });
      }
    }

    const folder = BookmarkRepository.createFolder({
      id: body.id || undefined,
      name: body.name.trim(),
      parentId: body.parentId || null,
      icon: body.icon || "📁",
      color: body.color || "gray",
      userId: user.id,
    });

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/folders error:", error);
    return NextResponse.json({ success: false, error: "Failed to create folder" }, { status: 500 });
  }
}