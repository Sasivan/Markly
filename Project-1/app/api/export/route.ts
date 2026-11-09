import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { exportToNetscapeHtml } from "@/server/import-export/netscape";
import { exportToCsv } from "@/server/import-export/csv";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const bookmarks = BookmarkRepository.getBookmarks();
    const folders = BookmarkRepository.getAllFolders();

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
    console.error("GET /api/export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

