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

export function exportToNotionToggleList(bookmarks: BookmarkWithDetails[], folders: Folder[]): string {
  const folderMap = new Map<string, string>();
  for (const f of folders) {
    folderMap.set(f.id, f.name);
  }

  const grouped = new Map<string, BookmarkWithDetails[]>();
  for (const bm of bookmarks) {
    const folderName = bm.folderId && folderMap.has(bm.folderId) ? folderMap.get(bm.folderId)! : "Unsorted";
    if (!grouped.has(folderName)) grouped.set(folderName, []);
    grouped.get(folderName)!.push(bm);
  }

  const lines: string[] = [];
  lines.push("# Markly Bookmarks (Notion Toggle List)");
  lines.push(`*Exported on ${new Date().toISOString().slice(0, 10)} • ${bookmarks.length} links*\n`);

  for (const [folderName, items] of grouped.entries()) {
    lines.push(`> ▾ **${folderName} (${items.length})**`);
    for (const b of items) {
      const tags = b.tags && b.tags.length > 0 ? ` \`${b.tags.map((t) => `#${t.name}`).join(" ")}\`` : "";
      const desc = b.description ? ` — ${b.description}` : "";
      lines.push(`>   - [${b.title || b.domain}](${b.url})${desc}${tags}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportToObsidianCanvas(bookmarks: BookmarkWithDetails[], folders: Folder[]): string {
  const folderMap = new Map<string, string>();
  for (const f of folders) {
    folderMap.set(f.id, f.name);
  }

  const nodes: any[] = [];
  const edges: any[] = [];

  const grouped = new Map<string, BookmarkWithDetails[]>();
  for (const bm of bookmarks) {
    const fId = bm.folderId || "unsorted";
    if (!grouped.has(fId)) grouped.set(fId, []);
    grouped.get(fId)!.push(bm);
  }

  let colIndex = 0;
  for (const [folderId, items] of grouped.entries()) {
    const fName = folderMap.get(folderId) || (folderId === "unsorted" ? "Unsorted / Inbox" : "Collection");
    const groupNodeId = `grp_${folderId}`;
    const xBase = colIndex * 420;
    const yBase = 0;

    nodes.push({
      id: groupNodeId,
      type: "group",
      x: xBase,
      y: yBase,
      width: 360,
      height: 80 + items.length * 130,
      label: fName,
    });

    items.forEach((bm, i) => {
      const bmNodeId = `node_${bm.id}`;
      const itemY = yBase + 70 + i * 120;
      nodes.push({
        id: bmNodeId,
        type: "link",
        x: xBase + 30,
        y: itemY,
        width: 300,
        height: 100,
        url: bm.url,
      });

      edges.push({
        id: `edge_${groupNodeId}_${bmNodeId}`,
        fromNode: groupNodeId,
        fromSide: "bottom",
        toNode: bmNodeId,
        toSide: "top",
      });
    });

    colIndex++;
  }

  return JSON.stringify({ nodes, edges }, null, 2);
}


