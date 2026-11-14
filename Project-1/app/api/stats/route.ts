import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";

    const cleanFolderId = folderId === "null" || folderId === "" ? null : folderId;
    if (cleanFolderId) {
      const folder = BookmarkRepository.getFolderById(cleanFolderId, user.id);
      if (!folder) {
        return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
      }
    }

    const stats = BookmarkRepository.getDashboardStats(
      user.id,
      cleanFolderId,
      includeSubfolders
    );

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}