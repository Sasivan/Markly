import { describe, it, expect, beforeEach } from "vitest";
import { BookmarkRepository } from "@/server/db/repository";
import { sqlite } from "@/server/db/client";

describe("Folder and Bookmark Copy Operations", () => {
  const userA = "user_copy_test_a";
  const userB = "user_copy_test_b";

  beforeEach(() => {
    // Clean up test data
    sqlite.prepare("DELETE FROM bookmarks WHERE user_id IN (?, ?)").run(userA, userB);
    sqlite.prepare("DELETE FROM folders WHERE user_id IN (?, ?)").run(userA, userB);
    sqlite.prepare("DELETE FROM tags WHERE user_id IN (?, ?)").run(userA, userB);
  });

  it("recursively copies a folder, its subfolders, and its bookmarks with tags", async () => {
    // 1. Create parent folder and subfolder
    const parent = BookmarkRepository.createFolder({
      name: "Project Source",
      userId: userA,
      icon: "💼",
      color: "#3b82f6",
    });

    const sub = BookmarkRepository.createFolder({
      name: "Sub Docs",
      parentId: parent.id,
      userId: userA,
      icon: "📄",
      color: "#10b981",
    });

    // 2. Create bookmarks inside parent and subfolder
    const b1 = BookmarkRepository.createBookmark({
      userId: userA,
      folderId: parent.id,
      url: "https://example.com/project",
      title: "Project Root Site",
      description: "Root site description",
      domain: "example.com",
      tagNames: ["project", "source"],
    });

    const b2 = BookmarkRepository.createBookmark({
      userId: userA,
      folderId: sub.id,
      url: "https://docs.example.com/api",
      title: "API Docs",
      description: "API documentation",
      domain: "example.com",
      tagNames: ["docs", "api"],
    });

    // 3. Create target project container folder
    const targetProject = BookmarkRepository.createFolder({
      name: "Work Projects 2026",
      userId: userA,
      icon: "📂",
      color: "#8b5cf6",
    });

    // 4. Copy parent folder into targetProject
    const copiedParent = await BookmarkRepository.copyFolder(
      parent.id,
      targetProject.id,
      userA
    );

    expect(copiedParent).toBeDefined();
    expect(copiedParent.id).not.toBe(parent.id);
    expect(copiedParent.name).toBe("Project Source");
    expect(copiedParent.parentId).toBe(targetProject.id);

    // 5. Verify subfolders copied
    const copiedSubfolders = sqlite
      .prepare("SELECT * FROM folders WHERE parent_id = ? AND user_id = ?")
      .all(copiedParent.id, userA) as any[];

    expect(copiedSubfolders.length).toBe(1);
    expect(copiedSubfolders[0].name).toBe("Sub Docs");
    expect(copiedSubfolders[0].id).not.toBe(sub.id);

    // 6. Verify bookmarks copied with tags
    const parentBookmarks = sqlite
      .prepare("SELECT * FROM bookmarks WHERE folder_id = ? AND user_id = ?")
      .all(copiedParent.id, userA) as any[];
    expect(parentBookmarks.length).toBe(1);
    expect(parentBookmarks[0].title).toBe("Project Root Site");
    expect(parentBookmarks[0].id).not.toBe(b1.id);

    const fullB1 = BookmarkRepository.getBookmarkById(parentBookmarks[0].id, userA);
    expect(fullB1?.tags.map((t) => t.name).sort()).toEqual(["project", "source"].sort());

    const subBookmarks = sqlite
      .prepare("SELECT * FROM bookmarks WHERE folder_id = ? AND user_id = ?")
      .all(copiedSubfolders[0].id, userA) as any[];
    expect(subBookmarks.length).toBe(1);
    expect(subBookmarks[0].title).toBe("API Docs");
    expect(subBookmarks[0].id).not.toBe(b2.id);

    const fullB2 = BookmarkRepository.getBookmarkById(subBookmarks[0].id, userA);
    expect(fullB2?.tags.map((t) => t.name).sort()).toEqual(["api", "docs"].sort());
  });

  it("prevents copying a folder into itself or its own descendant subfolder", async () => {
    const parent = BookmarkRepository.createFolder({
      name: "Root Folder",
      userId: userA,
    });

    const child = BookmarkRepository.createFolder({
      name: "Child Folder",
      parentId: parent.id,
      userId: userA,
    });

    await expect(
      BookmarkRepository.copyFolder(parent.id, parent.id, userA)
    ).rejects.toThrow("Cannot copy a folder inside itself");

    await expect(
      BookmarkRepository.copyFolder(parent.id, child.id, userA)
    ).rejects.toThrow("Cannot copy a folder inside itself");
  });

  it("copies single and bulk bookmarks into target folder", () => {
    const target = BookmarkRepository.createFolder({
      name: "Destination Folder",
      userId: userA,
    });

    const bm1 = BookmarkRepository.createBookmark({
      userId: userA,
      url: "https://site1.com",
      title: "Site One",
      domain: "site1.com",
      tagNames: ["one", "tag"],
    });

    const bm2 = BookmarkRepository.createBookmark({
      userId: userA,
      url: "https://site2.com",
      title: "Site Two",
      domain: "site2.com",
      tagNames: ["two"],
    });

    // Copy single bookmark
    const copiedBm = BookmarkRepository.copyBookmark(bm1.id, target.id, userA);
    expect(copiedBm.id).not.toBe(bm1.id);
    expect(copiedBm.folderId).toBe(target.id);
    expect(copiedBm.tags.map((t) => t.name)).toContain("one");

    // Bulk copy
    const bulkRes = BookmarkRepository.bulkCopyBookmarks([bm1.id, bm2.id], target.id, userA);
    expect(bulkRes.copiedCount).toBe(2);

    const targetBms = sqlite
      .prepare("SELECT * FROM bookmarks WHERE folder_id = ? AND user_id = ?")
      .all(target.id, userA);
    expect(targetBms.length).toBe(3); // 1 single + 2 bulk

    // Copy to Unsorted (null folder)
    const unsortedCopy = BookmarkRepository.copyBookmark(bm2.id, null, userA, "Site Two in Inbox");
    expect(unsortedCopy.folderId).toBeNull();
    expect(unsortedCopy.title).toBe("Site Two in Inbox");
    expect(unsortedCopy.tags.map((t) => t.name)).toContain("two");
  });
});
