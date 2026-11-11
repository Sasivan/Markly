import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";

    const cookieStore = await cookies();
    const queryUserId = searchParams.get("userId");
    const userId = queryUserId || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    const stats = BookmarkRepository.getDashboardStats(
      userId,
      folderId === "null" || folderId === "" ? null : folderId,
      includeSubfolders
    );

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}

