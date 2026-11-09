import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository } from "@/server/db/repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";

    const cookieStore = await cookies();
    const userId = cookieStore.get("markly_user_id")?.value || "usr_default_markly";

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

