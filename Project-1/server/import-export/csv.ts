import type { BookmarkWithDetails } from "@/server/db/schema";

export function exportToCsv(bookmarks: BookmarkWithDetails[]): string {
  const headers = ["Title", "URL", "Folder", "Domain", "Tags", "Favorite", "Status", "Visits", "Created At"];
  const rows = bookmarks.map((b) => [
    escapeCsv(b.title),
    escapeCsv(b.url),
    escapeCsv(b.folderName || "Unsorted"),
    escapeCsv(b.domain),
    escapeCsv(b.tags.map((t) => t.name).join(",")),
    b.isFavorite ? "true" : "false",
    b.status,
    b.visitCount.toString(),
    new Date(b.createdAt).toISOString(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

