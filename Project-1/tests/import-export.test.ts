import { describe, it, expect } from "vitest";
import { exportToNetscapeHtml, parseNetscapeHtml } from "../server/import-export/netscape";
import { exportToCsv, parseCsv } from "../server/import-export/csv";
import type { BookmarkWithDetails, Folder } from "../server/db/schema";

describe("Netscape Bookmark HTML Engine", () => {
  const mockFolder: Folder = {
    id: "fld_eng",
    userId: "usr_1",
    parentId: null,
    name: "Engineering",
    icon: "💻",
    color: "#3b82f6",
    position: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const mockBookmark: BookmarkWithDetails = {
    id: "bm_react",
    userId: "usr_1",
    folderId: "fld_eng",
    url: "https://react.dev",
    canonicalUrl: "https://react.dev",
    title: "React Documentation",
    description: "The library for web and native user interfaces",
    iconUrl: "/icons/react.webp",
    imageUrl: null,
    domain: "react.dev",
    isFavorite: true,
    isArchived: false,
    status: "alive",
    visitCount: 15,
    lastVisitedAt: null,
    createdAt: 1700000000000,
    searchText: "react docs",
    folderName: "Engineering",
    tags: [{ id: "t_1", userId: "usr_1", name: "react", color: "#3b82f6", createdAt: 1700000000000 }],
  };

  it("exports bookmarks to valid Netscape HTML format", () => {
    const html = exportToNetscapeHtml([mockBookmark], [mockFolder]);
    expect(html).toContain("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
    expect(html).toContain('<DT><H3 ADD_DATE="1700000000">Engineering</H3>');
    expect(html).toContain('<DT><A HREF="https://react.dev"');
    expect(html).toContain('TAGS="react"');
    expect(html).toContain("React Documentation</A>");
  });

  it("parses Netscape HTML back into structured bookmarks and folders", () => {
    const rawHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000">Engineering</H3>
    <DL><p>
        <DT><A HREF="https://react.dev" ADD_DATE="1700000000" TAGS="react,frontend">React Documentation</A>
        <DD>The library for web user interfaces
    </DL><p>
</DL><p>`;

    const parsed = parseNetscapeHtml(rawHtml);
    expect(parsed.folders).toContain("Engineering");
    expect(parsed.bookmarks.length).toBe(1);
    expect(parsed.bookmarks[0].url).toBe("https://react.dev");
    expect(parsed.bookmarks[0].title).toBe("React Documentation");
    expect(parsed.bookmarks[0].folderName).toBe("Engineering");
    expect(parsed.bookmarks[0].tags).toContain("react");
    expect(parsed.bookmarks[0].tags).toContain("frontend");
  });
});

describe("CSV Export Engine", () => {
  it("generates comma-separated values with headers and escaping", () => {
    const mockBookmark: BookmarkWithDetails = {
      id: "bm_1",
      userId: "usr_1",
      folderId: null,
      url: "https://example.com/test?a=1,2",
      canonicalUrl: "https://example.com/test",
      title: 'Title with "quotes" and, commas',
      description: null,
      iconUrl: null,
      imageUrl: null,
      domain: "example.com",
      isFavorite: false,
      isArchived: false,
      status: "alive",
      visitCount: 3,
      lastVisitedAt: null,
      createdAt: 1700000000000,
      searchText: null,
      tags: [],
    };

    const csv = exportToCsv([mockBookmark]);
    expect(csv).toContain("Title,URL,Folder,Domain,Tags,Favorite,Status,Visits,Created At");
    expect(csv).toContain('""quotes"" and, commas"');
  });

  it("parses CSV text back into structured bookmarks and folders", () => {
    const rawCsv = `Title,URL,Folder,Domain,Tags,Favorite,Status,Visits,Created At
"React Documentation","https://react.dev","Frontend","react.dev","react, docs","Yes","alive","10","2026-11-14"
"Vite Fast Bundler","https://vite.dev","Frontend","vite.dev","bundler, vite","No","alive","5","2026-11-14"`;

    const parsed = parseCsv(rawCsv);
    expect(parsed.length).toBe(2);
    expect(parsed[0].title).toBe("React Documentation");
    expect(parsed[0].url).toBe("https://react.dev");
    expect(parsed[0].folderName).toBe("Frontend");
    expect(parsed[0].tags).toEqual(["react", "docs"]);
    expect(parsed[0].isFavorite).toBe(true);

    expect(parsed[1].title).toBe("Vite Fast Bundler");
    expect(parsed[1].url).toBe("https://vite.dev");
    expect(parsed[1].isFavorite).toBe(false);
  });
});

