import type { BookmarkWithDetails, Folder } from "@/server/db/schema";

export function exportToMarkdown(bookmarks: BookmarkWithDetails[], folders: Folder[]): string {
  const folderMap = new Map<string, string>();
  for (const f of folders) {
    folderMap.set(f.id, f.name);
  }

  // Group by folder
  const grouped = new Map<string, BookmarkWithDetails[]>();
  for (const bm of bookmarks) {
    const folderName =
      bm.folderId && folderMap.has(bm.folderId) ? folderMap.get(bm.folderId)! : "Unsorted";
    if (!grouped.has(folderName)) {
      grouped.set(folderName, []);
    }
    grouped.get(folderName)!.push(bm);
  }

  const lines: string[] = [];
  lines.push("# Markly Bookmarks");
  lines.push(`*Exported on ${new Date().toISOString().slice(0, 10)} • Total ${bookmarks.length} links*\n`);

  for (const [folderName, items] of grouped.entries()) {
    lines.push(`## ${folderName}`);
    lines.push("");
    for (const b of items) {
      const tagStr =
        b.tags && b.tags.length > 0 ? ` \`${b.tags.map((t) => `#${t.name}`).join(" ")}\`` : "";
      const desc = b.description ? `\n  > ${b.description.replace(/\n+/g, " ")}` : "";
      lines.push(`- [${b.title || b.domain}](${b.url})${tagStr}${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

