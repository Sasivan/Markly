import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") as "global" | "folder" | "domain") || "global";
    const folderId = searchParams.get("folderId");
    const domain = searchParams.get("domain");
    const depth = parseInt(searchParams.get("depth") || "1", 10);

    const cleanFolderId = folderId === "null" || !folderId ? null : folderId;
    if (cleanFolderId) {
      const folder = BookmarkRepository.getFolderById(cleanFolderId, user.id);
      if (!folder) {
        return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
      }
    }

    const graphData = BookmarkRepository.getGraphData({
      mode,
      folderId: cleanFolderId,
      domain: domain === "null" || !domain ? null : domain,
      depth,
      userId: user.id,
    });

    return NextResponse.json({ success: true, graph: graphData });
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/graph error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate graph data" }, { status: 500 });
  }
}