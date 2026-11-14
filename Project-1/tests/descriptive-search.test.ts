import { describe, it, expect } from "vitest";

// Tokenized search matcher logic as implemented in BookmarkTable & CommandPalette
function matchBookmark(
  bm: {
    title: string;
    domain: string;
    url: string;
    description?: string | null;
    tags?: { id: string; name: string }[];
    folderName?: string | null;
  },
  query: string
): boolean {
  const q = (query || "").toLowerCase().trim();
  if (!q) return true;
  const searchTokens = q.split(/\s+/).filter(Boolean);
  const searchable = [
    bm.title || "",
    bm.domain || "",
    bm.url || "",
    bm.description || "",
    ...(bm.tags || []).map((t) => t.name),
    bm.folderName || "",
  ]
    .join(" ")
    .toLowerCase();
  return searchTokens.every((token) => searchable.includes(token));
}

describe("Tokenized Multi-Word Descriptive Website Search", () => {
  const mockBookmarks = [
    {
      title: "Supabase: The Open Source Firebase Alternative",
      domain: "supabase.com",
      url: "https://supabase.com",
      description: "Build production apps with an enterprise Postgres database, instant APIs, Edge Functions, Realtime subscriptions, and built-in vector search embeddings.",
      tags: [{ id: "t1", name: "database" }, { id: "t2", name: "backend" }],
      folderName: "Developer Tools",
    },
    {
      title: "Notion – Your connected workspace for wiki, docs & projects",
      domain: "notion.so",
      url: "https://notion.so",
      description: "A collaborative workspace tool with flexible kanban boards, rich markdown documents, relational databases, and team wikis.",
      tags: [{ id: "t3", name: "productivity" }, { id: "t4", name: "notes" }],
      folderName: "Work & Docs",
    },
    {
      title: "Zustand - Bear necessities for state management in React",
      domain: "zustand-demo.pmnd.rs",
      url: "https://github.com/pmndrs/zustand",
      description: "A small, fast and scalable bearbones state-management solution using simplified flux principles. Has a comfy API based on hooks, isn't boilerplatey or opinionated.",
      tags: [{ id: "t5", name: "react" }, { id: "t6", name: "javascript" }],
      folderName: "Frontend",
    },
  ];

  it("matches site by describing its technology or topic across description", () => {
    // "vector embeddings postgres" matches Supabase's description even though the words are not adjacent
    const matches = mockBookmarks.filter((bm) => matchBookmark(bm, "vector embeddings postgres"));
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toContain("Supabase");
  });

  it("matches multi-word descriptive phrases across title, description, and tags", () => {
    // "react state hooks" matches Zustand (title: React, desc: state/hooks, tags: react)
    const matches = mockBookmarks.filter((bm) => matchBookmark(bm, "react state hooks"));
    expect(matches).toHaveLength(1);
    expect(matches[0].domain).toBe("zustand-demo.pmnd.rs");
  });

  it("matches Kanban and wiki keywords from Notion description", () => {
    const matches = mockBookmarks.filter((bm) => matchBookmark(bm, "kanban team wiki"));
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toContain("Notion");
  });

  it("returns all bookmarks on empty or whitespace search", () => {
    expect(mockBookmarks.filter((bm) => matchBookmark(bm, ""))).toHaveLength(3);
    expect(mockBookmarks.filter((bm) => matchBookmark(bm, "   "))).toHaveLength(3);
  });

  it("handles case-insensitivity and multiple whitespace tokens cleanly", () => {
    const matches = mockBookmarks.filter((bm) => matchBookmark(bm, "  POSTGRES   DATABASE   EDGE "));
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toContain("Supabase");
  });

  it("returns zero results when an unrelated keyword is included", () => {
    // "supabase" matches, but "cryptocurrency" is nowhere in any bookmark
    const matches = mockBookmarks.filter((bm) => matchBookmark(bm, "supabase cryptocurrency"));
    expect(matches).toHaveLength(0);
  });
});

