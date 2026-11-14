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

export interface ParsedCsvBookmark {
  title: string;
  url: string;
  folderName?: string;
  tags?: string[];
  isFavorite?: boolean;
}

/**
 * Robust CSV parser supporting standard quotes, commas inside fields, and column headers.
 */
export function parseCsv(csvText: string): ParsedCsvBookmark[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerLine = parseLine(lines[0]).map((h) => h.toLowerCase());
  const titleIdx = headerLine.findIndex((h) => h === "title");
  const urlIdx = headerLine.findIndex((h) => h === "url" || h === "link" || h === "href");
  const folderIdx = headerLine.findIndex((h) => h === "folder" || h === "collection" || h === "category");
  const tagsIdx = headerLine.findIndex((h) => h === "tags" || h === "tag");
  const favIdx = headerLine.findIndex((h) => h === "favorite" || h === "is_favorite");

  if (urlIdx === -1 && titleIdx === -1) {
    return [];
  }

  const effectiveUrlIdx = urlIdx !== -1 ? urlIdx : 1;
  const effectiveTitleIdx = titleIdx !== -1 ? titleIdx : 0;

  const results: ParsedCsvBookmark[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols[effectiveUrlIdx] && !cols[effectiveTitleIdx]) continue;

    const rawUrl = cols[effectiveUrlIdx] || "";
    const rawTitle = cols[effectiveTitleIdx] || rawUrl;
    const rawFolder = folderIdx !== -1 ? cols[folderIdx] : undefined;
    const rawTags = tagsIdx !== -1 && cols[tagsIdx] ? cols[tagsIdx].split(",").map((t) => t.trim()).filter(Boolean) : [];
    const isFav = favIdx !== -1 ? ["true", "yes", "1"].includes(cols[favIdx]?.toLowerCase()) : false;

    if (rawUrl) {
      results.push({
        url: rawUrl,
        title: rawTitle,
        folderName: rawFolder && rawFolder !== "Unsorted" ? rawFolder : undefined,
        tags: rawTags,
        isFavorite: isFav,
      });
    }
  }

  return results;
}


