import * as cheerio from "cheerio";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";

/**
 * Generates standard Netscape Bookmark HTML file format
 * Supported by Chrome, Firefox, Safari, Edge, Arc, Brave, etc.
 */
export function exportToNetscapeHtml(bookmarks: BookmarkWithDetails[], folders: Folder[]): string {
  const folderMap = new Map<string, Folder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  // Group bookmarks by folderId
  const byFolder = new Map<string | null, BookmarkWithDetails[]>();
  for (const b of bookmarks) {
    const fid = b.folderId || null;
    if (!byFolder.has(fid)) byFolder.set(fid, []);
    byFolder.get(fid)!.push(b);
  }

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Root bookmarks (no folder)
  const rootBookmarks = byFolder.get(null) || [];
  for (const b of rootBookmarks) {
    const addDate = Math.floor(b.createdAt / 1000);
    const tagsAttr = b.tags && b.tags.length > 0 ? ` TAGS="${b.tags.map((t) => t.name).join(",")}"` : "";
    html += `    <DT><A HREF="${escapeXml(b.url)}" ADD_DATE="${addDate}"${tagsAttr}>${escapeXml(b.title)}</A>\n`;
    if (b.description) {
      html += `    <DD>${escapeXml(b.description)}\n`;
    }
  }

  // Folders with bookmarks
  for (const f of folders) {
    const fBookmarks = byFolder.get(f.id) || [];
    if (fBookmarks.length === 0) continue;

    html += `    <DT><H3 ADD_DATE="${Math.floor(f.createdAt / 1000)}">${escapeXml(f.name)}</H3>\n`;
    html += `    <DL><p>\n`;

    for (const b of fBookmarks) {
      const addDate = Math.floor(b.createdAt / 1000);
      const tagsAttr = b.tags && b.tags.length > 0 ? ` TAGS="${b.tags.map((t) => t.name).join(",")}"` : "";
      html += `        <DT><A HREF="${escapeXml(b.url)}" ADD_DATE="${addDate}"${tagsAttr}>${escapeXml(b.title)}</A>\n`;
      if (b.description) {
        html += `        <DD>${escapeXml(b.description)}\n`;
      }
    }

    html += `    </DL><p>\n`;
  }

  html += `</DL><p>\n`;
  return html;
}

/**
 * Parses a Netscape Bookmark HTML file into structured bookmarks and folders
 */
export function parseNetscapeHtml(html: string): {
  folders: string[];
  bookmarks: Array<{
    url: string;
    title: string;
    folderName?: string;
    addDate?: number;
    tags?: string[];
  }>;
} {
  const $ = cheerio.load(html);
  const foundFolders = new Set<string>();
  const parsedBookmarks: Array<{
    url: string;
    title: string;
    folderName?: string;
    addDate?: number;
    tags?: string[];
  }> = [];

  // Traverse DL and DT elements
  $("dl").each((_, dl) => {
    // Check if this DL is inside a folder header
    let currentFolderName: string | undefined = undefined;
    const prevH3 = $(dl).prev("h3");
    if (prevH3.length > 0) {
      currentFolderName = prevH3.text().trim();
      if (currentFolderName) foundFolders.add(currentFolderName);
    }

    $(dl).find("> dt > a, > p > dt > a").each((_, a) => {
      const url = $(a).attr("href");
      const title = $(a).text().trim();
      const addDateAttr = $(a).attr("add_date");
      const tagsAttr = $(a).attr("tags");

      if (url && title) {
        parsedBookmarks.push({
          url,
          title,
          folderName: currentFolderName,
          addDate: addDateAttr ? parseInt(addDateAttr, 10) * 1000 : undefined,
          tags: tagsAttr ? tagsAttr.split(",").map((t) => t.trim().toLowerCase()) : [],
        });
      }
    });
  });

  return {
    folders: Array.from(foundFolders),
    bookmarks: parsedBookmarks,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

