import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const includeSubfolders = searchParams.get("includeSubfolders") === "true";

    const stats = BookmarkRepository.getDashboardStats(
      undefined,
      folderId === "null" || folderId === "" ? null : folderId,
      includeSubfolders
    );

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}

