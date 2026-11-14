import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { exportToNetscapeHtml } from "@/server/import-export/netscape";
import { exportToCsv } from "@/server/import-export/csv";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const bookmarks = BookmarkRepository.getBookmarks({ userId: user.id, view: "all", includeArchived: true });
    const folders = BookmarkRepository.getAllFolders(user.id);

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "html") {
      const html = exportToNetscapeHtml(bookmarks, folders);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="markly-bookmarks-${timestamp}.html"`,
        },
      });
    }

    if (format === "csv") {
      const csv = exportToCsv(bookmarks);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="markly-bookmarks-${timestamp}.csv"`,
        },
      });
    }

    // Default: JSON
    return new NextResponse(JSON.stringify({ bookmarks, folders, exportedAt: new Date().toISOString() }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="markly-bookmarks-${timestamp}.json"`,
      },
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/export error:", error);
    return NextResponse.json({ success: false, error: "Failed to export data" }, { status: 500 });
  }
}