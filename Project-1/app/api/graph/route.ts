import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository } from "@/server/db/repository";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") as "global" | "folder" | "domain") || "global";
    const folderId = searchParams.get("folderId");
    const domain = searchParams.get("domain");
    const depth = parseInt(searchParams.get("depth") || "1", 10);

    const cookieStore = await cookies();
    const userId = cookieStore.get("markly_user_id")?.value || "usr_default_markly";

    const graphData = BookmarkRepository.getGraphData({
      mode,
      folderId: folderId === "null" || !folderId ? null : folderId,
      domain: domain === "null" || !domain ? null : domain,
      depth,
      userId,
    });

    return NextResponse.json({ success: true, graph: graphData });
  } catch (error) {
    console.error("GET /api/graph error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate graph data" }, { status: 500 });
  }
}

