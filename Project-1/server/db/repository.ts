import { db, sqlite } from "./client";
import { folders, bookmarks, tags, bookmarkTags, users, type Folder, type Bookmark, type Tag, type BookmarkWithDetails, type FolderTreeNode } from "./schema";
import { eq, and, desc, asc, isNull, inArray, like, or, sql } from "drizzle-orm";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const DEFAULT_USER_ID = "usr_default_markly";

export class BookmarkRepository {
  /**
   * Ensure default user exists
   */
  static ensureDefaultUser() {
    try {
      const user = db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).get();
      if (!user) {
        db.insert(users).values({
          id: DEFAULT_USER_ID,
          email: "demo@markly.app",
          displayName: "Markly Explorer",
          avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Markly",
          createdAt: Date.now(),
        }).run();
      }
    } catch (e) {
      console.warn("ensureDefaultUser notice:", e);
    }
  }

  /**
   * Ensure user record exists in local DB
   */
  static ensureUser(userId: string, email?: string, displayName?: string, avatarUrl?: string) {
    try {
      if (!userId || userId === DEFAULT_USER_ID) return;
      const user = db.select().from(users).where(eq(users.id, userId)).get();
      if (!user) {
        db.insert(users).values({
          id: userId,
          email: email || `${userId}@markly.app`,
          displayName: displayName || "Markly User",
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          createdAt: Date.now(),
        }).run();
      }
    } catch (e) {
      console.warn("ensureUser notice:", e);
    }
  }

  /**
   * Ensure user has a clean, minimal starter library (1 folder, 3 essential bookmarks)
   */
  static ensureUserStarterData(userId: string) {
    try {
      if (!userId || userId === DEFAULT_USER_ID) return;

      // Ensure user record exists in local DB
      const user = db.select().from(users).where(eq(users.id, userId)).get();
      if (user) {
        // User already initialized in DB! Never re-create starter data if user deleted it.
        return;
      }

      db.insert(users).values({
        id: userId,
        email: `${userId}@markly.app`,
        displayName: "Markly User",
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        createdAt: Date.now(),
      }).run();

      const existingCount = sqlite
        .prepare(`SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?`)
        .get(userId) as { count: number };

      if (existingCount.count === 0) {
        // 1. Create a minimal starter folder
        const folderId = `fld_start_${Date.now().toString(36)}`;
        sqlite.prepare(`
          INSERT OR IGNORE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
          VALUES (?, ?, NULL, ?, ?, ?, 0, ?, ?)
        `).run(
          folderId,
          userId,
          "⭐ Quick Access & Favorites",
          "⭐",
          "#3b82f6",
          Date.now(),
          Date.now()
        );

        // 2. Insert 3 minimal, clean starter bookmarks
        const starterBookmarks = [
          {
            id: `bm_start_1_${Date.now().toString(36)}`,
            url: "https://github.com/Sasivan/Markly",
            canonicalUrl: "https://github.com/Sasivan/Markly",
            title: "Markly Workspace & Documentation",
            domain: "github.com",
            description: "Markly project repository, visual analytics, and feature documentation.",
            iconUrl: "https://github.githubassets.com/favicons/favicon.svg",
            tags: ["markly", "docs"],
          },
          {
            id: `bm_start_2_${Date.now().toString(36)}`,
            url: "https://github.com",
            canonicalUrl: "https://github.com",
            title: "GitHub: Let's build from here",
            domain: "github.com",
            description: "GitHub is where over 100 million developers shape the future of software.",
            iconUrl: "https://github.githubassets.com/favicons/favicon.svg",
            tags: ["developer", "tools"],
          },
          {
            id: `bm_start_3_${Date.now().toString(36)}`,
            url: "https://www.google.com",
            canonicalUrl: "https://google.com",
            title: "Google Search",
            domain: "google.com",
            description: "Search the world's information, including webpages, images, videos and more.",
            iconUrl: "https://www.google.com/favicon.ico",
            tags: ["search", "tools"],
          },
        ];

        const insertBm = sqlite.prepare(`
          INSERT OR IGNORE INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, domain, is_favorite, is_archived, status, visit_count, created_at, search_text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'alive', 1, ?, ?)
        `);

        for (const b of starterBookmarks) {
          const now = Date.now();
          insertBm.run(
            b.id,
            userId,
            folderId,
            b.url,
            b.canonicalUrl,
            b.title,
            b.description,
            b.iconUrl,
            b.domain,
            now,
            `${b.title} ${b.description} ${b.domain}`.toLowerCase()
          );

          // Add tags
          for (const tName of b.tags) {
            const tagId = `tag_${tName}`;
            sqlite.prepare(`
              INSERT OR IGNORE INTO tags (id, user_id, name, color, created_at)
              VALUES (?, ?, ?, '#3b82f6', ?)
            `).run(tagId, userId, tName, now);

            sqlite.prepare(`
              INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
              VALUES (?, ?)
            `).run(b.id, tagId);
          }
        }

        // Push starter data to Supabase in the background
        SupabaseManager.syncLocalToSupabase().catch(() => {});
      }
    } catch (e) {
      console.warn("ensureUserStarterData notice:", e);
    }
  }

  /**
   * Get all folders for user, ordered by position
   */
  static getAllFolders(userId: string = DEFAULT_USER_ID): Folder[] {
    return db.select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(asc(folders.position), asc(folders.name))
      .all();
  }

  /**
   * Get all descendant folder IDs using Recursive CTE
   */
  static getDescendantFolderIds(folderId: string, userId: string = DEFAULT_USER_ID): string[] {
    const stmt = sqlite.prepare(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM folders WHERE id = ? AND user_id = ?
        UNION ALL
        SELECT f.id FROM folders f
        INNER JOIN descendants d ON f.parent_id = d.id
        WHERE f.user_id = ?
      )
      SELECT id FROM descendants;
    `);

    const rows = stmt.all(folderId, userId, userId) as { id: string }[];
    return rows.map((r) => r.id);
  }

  /**
   * Get full folder breadcrumb path (e.g. "Engineering / Frontend / React")
   */
  static getFolderPath(folderId: string | null, userId: string = DEFAULT_USER_ID): string {
    if (!folderId) return "Unsorted";

    const stmt = sqlite.prepare(`
      WITH RECURSIVE path_cte AS (
        SELECT id, parent_id, name, 1 as lvl FROM folders WHERE id = ? AND user_id = ?
        UNION ALL
        SELECT f.id, f.parent_id, f.name, p.lvl + 1
        FROM folders f
        JOIN path_cte p ON f.id = p.parent_id
        WHERE f.user_id = ?
      )
      SELECT name FROM path_cte ORDER BY lvl DESC;
    `);

    const rows = stmt.all(folderId, userId, userId) as { name: string }[];
    return rows.map((r) => r.name).join(" / ");
  }

  /**
   * Build complete folder tree with counts
   */
  static getFolderTree(userId: string = DEFAULT_USER_ID): FolderTreeNode[] {
    const allFolders = this.getAllFolders(userId);

    // Get bookmark count per folder
    const countStmt = sqlite.prepare(`
      SELECT folder_id, COUNT(*) as count
      FROM bookmarks
      WHERE user_id = ? AND is_archived = 0
      GROUP BY folder_id
    `);
    const countRows = countStmt.all(userId) as { folder_id: string | null; count: number }[];
    const countsMap = new Map<string, number>();
    for (const row of countRows) {
      if (row.folder_id) countsMap.set(row.folder_id, row.count);
    }

    // Map into tree node structure
    const nodeMap = new Map<string, FolderTreeNode>();
    for (const f of allFolders) {
      nodeMap.set(f.id, {
        ...f,
        children: [],
        bookmarkCount: countsMap.get(f.id) || 0,
        totalDescendantBookmarkCount: countsMap.get(f.id) || 0,
      });
    }

    const roots: FolderTreeNode[] = [];

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Calculate total descendants recursively
    function computeDescendants(n: FolderTreeNode): number {
      let total = n.bookmarkCount;
      for (const child of n.children) {
        total += computeDescendants(child);
      }
      n.totalDescendantBookmarkCount = total;
      return total;
    }

    for (const r of roots) {
      computeDescendants(r);
    }

    return roots;
  }

  /**
   * Create folder
   */
  static createFolder(data: {
    id?: string;
    name: string;
    parentId?: string | null;
    icon?: string;
    color?: string;
    userId?: string;
  }): Folder {
    const userId = data.userId || DEFAULT_USER_ID;
    const id = data.id || `fld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // Determine position: append to end of siblings
    const maxPos = sqlite.prepare(`
      SELECT MAX(position) as max_p FROM folders WHERE user_id = ? AND (parent_id = ? OR (? IS NULL AND parent_id IS NULL))
    `).get(userId, data.parentId || null, data.parentId || null) as { max_p: number | null };

    const position = (maxPos?.max_p ?? -1) + 1;

    db.insert(folders).values({
      id,
      userId,
      parentId: data.parentId || null,
      name: data.name,
      icon: data.icon || "📁",
      color: data.color || "gray",
      position,
      createdAt: now,
      updatedAt: now,
    }).run();

    try {
      sqlite.prepare(`DELETE FROM deleted_folders WHERE id = ?`).run(id);
    } catch {}

    const created = db.select().from(folders).where(eq(folders.id, id)).get()!;
    SupabaseManager.syncFolder(created, "upsert").catch(() => {});
    return created;
  }

  /**
   * Update folder (name, icon, color, position, parentId)
   */
  static updateFolder(id: string, updates: Partial<{
    name: string;
    parentId: string | null;
    icon: string;
    color: string;
    position: number;
  }>): Folder {
    db.update(folders)
      .set({
        ...updates,
        updatedAt: Date.now(),
      })
      .where(eq(folders.id, id))
      .run();

    const updated = db.select().from(folders).where(eq(folders.id, id)).get()!;
    if (updated) {
      SupabaseManager.syncFolder(updated, "upsert").catch(() => {});
    }
    return updated;
  }

  /**
   * Delete folder
   * mode: "move_up" (move bookmarks to parent folder) | "delete_all" (delete bookmarks and subfolders)
   */
  static async deleteFolder(id: string, mode: "move_up" | "delete_all" = "move_up", userId?: string) {
    const targetFolder = db.select().from(folders).where(eq(folders.id, id)).get();
    const effectiveUserId = targetFolder?.userId || userId || DEFAULT_USER_ID;

    // 1. Immediately insert tombstone so remote sync NEVER resurrects this folder
    try {
      sqlite.prepare(`
        INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)
      `).run(id, effectiveUserId, Date.now());
      if (userId && userId !== effectiveUserId) {
        sqlite.prepare(`
          INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)
        `).run(id, userId, Date.now());
      }
    } catch (e) {
      console.warn("Tombstone insert warning:", e);
    }

    if (!targetFolder) {
      // Even if already deleted locally, ensure Supabase deletion
      await SupabaseManager.syncFolder(
        { id, userId: effectiveUserId },
        "delete",
        { mode }
      );
      return;
    }

    const retentionDays = this.getRecycleBinRetentionDays(effectiveUserId);

    // Get all descendant folders (including sub-subfolders)
    const descendantIds = this.getDescendantFolderIds(id, effectiveUserId);
    const allFolderIdsToDelete = [id, ...descendantIds];
    const placeholders = allFolderIdsToDelete.map(() => "?").join(",");

    // 1. Fetch all bookmarks inside these folders before deleting them
    const bmsInside = sqlite.prepare(`
      SELECT * FROM bookmarks WHERE folder_id IN (${placeholders})
    `).all(...allFolderIdsToDelete) as any[];

    // 2. Fetch tags for bookmarks
    const bmTagsMap: Record<string, any[]> = {};
    for (const bm of bmsInside) {
      try {
        const tags = sqlite.prepare(`
          SELECT t.id, t.name, t.color FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = ?
        `).all(bm.id);
        bmTagsMap[bm.id] = tags;
      } catch {}
    }

    // 3. Move each inside bookmark into Recycle Bin and record tombstones
    for (const bm of bmsInside) {
      sqlite.prepare(`
        INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
        VALUES (?, ?, 'bookmark', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `rb_bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        effectiveUserId,
        bm.id,
        bm.title,
        bm.folder_id,
        bm.icon_url,
        null,
        JSON.stringify({ ...bm, tags: bmTagsMap[bm.id] || [] }),
        Date.now(),
        retentionDays
      );

      sqlite.prepare(`
        INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)
      `).run(bm.id, effectiveUserId, Date.now());

      if (userId && userId !== effectiveUserId) {
        sqlite.prepare(`
          INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)
        `).run(bm.id, userId, Date.now());
      }
    }

    // 4. Batch delete all inside bookmarks from Supabase (awaited!)
    const client = SupabaseManager.getClient();
    if (client && bmsInside.length > 0) {
      try {
        const bmIds = bmsInside.map((b) => b.id);
        await client.from("bookmarks").delete().in("id", bmIds);
      } catch (err) {
        console.warn("Supabase batch delete bookmarks error:", err);
      }
    }

    // 5. Delete the bookmarks from SQLite
    sqlite.prepare(`
      DELETE FROM bookmarks WHERE folder_id IN (${placeholders})
    `).run(...allFolderIdsToDelete);

    // 6. Save each folder to Recycle Bin (including snapshot of its contained bookmarks)
    for (const fId of allFolderIdsToDelete) {
      const f = db.select().from(folders).where(eq(folders.id, fId)).get();
      if (f) {
        const folderBookmarks = bmsInside.filter((b) => b.folder_id === f.id);
        sqlite.prepare(`
          INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
          VALUES (?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `rb_fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          effectiveUserId,
          f.id,
          f.name,
          f.parentId,
          f.icon,
          f.color,
          JSON.stringify({ ...f, bookmarks: folderBookmarks }),
          Date.now(),
          retentionDays
        );

        sqlite.prepare(`
          INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)
        `).run(f.id, effectiveUserId, Date.now());

        if (userId && userId !== effectiveUserId) {
          sqlite.prepare(`
            INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)
          `).run(f.id, userId, Date.now());
        }
      }
    }

    // 7. Batch delete all folders from Supabase (awaited!)
    if (client && allFolderIdsToDelete.length > 0) {
      try {
        await client.from("folders").delete().in("id", allFolderIdsToDelete);
      } catch (err) {
        console.warn("Supabase batch delete folders error:", err);
      }
    }

    // 8. Delete folders from SQLite
    sqlite.prepare(`
      DELETE FROM folders WHERE id IN (${placeholders})
    `).run(...allFolderIdsToDelete);

    return;
  }

  /**
   * Find duplicate bookmark by canonical URL
   */
  static findDuplicate(canonicalUrl: string, userId: string = DEFAULT_USER_ID): (Bookmark & { folderName?: string }) | null {
    const item = db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.canonicalUrl, canonicalUrl))).get();
    if (!item) return null;

    let folderName = "Unsorted";
    if (item.folderId) {
      const folder = db.select().from(folders).where(eq(folders.id, item.folderId)).get();
      if (folder) folderName = folder.name;
    }

    return { ...item, folderName };
  }

  /**
   * Get filtered and enriched bookmarks
   */
  static getBookmarks(options: {
    userId?: string;
    folderId?: string | null;
    includeSubfolders?: boolean;
    view?: "all" | "favorites" | "recent" | "unsorted" | "archive" | "trash";
    domain?: string;
    status?: "alive" | "dead" | "pending";
    tag?: string;
    search?: string;
  } = {}): BookmarkWithDetails[] {
    const userId = options.userId || DEFAULT_USER_ID;

    let query = `
      SELECT 
        b.id, b.user_id, b.folder_id, b.url, b.canonical_url, b.title, b.description,
        b.icon_url, b.image_url, b.domain, b.is_favorite, b.is_archived, b.status,
        b.visit_count, b.last_visited_at, b.last_clicked_at, b.created_at, b.search_text,
        f.name as folder_name
      FROM bookmarks b
      LEFT JOIN folders f ON b.folder_id = f.id
      WHERE b.user_id = ?
    `;

    const params: (string | number)[] = [userId];

    // Filter by view type
    if (options.view === "favorites") {
      query += ` AND b.is_favorite = 1 AND b.is_archived = 0`;
    } else if (options.view === "recent") {
      query += ` AND b.is_archived = 0`;
    } else if (options.view === "unsorted") {
      query += ` AND b.folder_id IS NULL AND b.is_archived = 0`;
    } else if (options.view === "archive") {
      query += ` AND b.is_archived = 1`;
    } else {
      // Default: exclude archived unless in archive view
      query += ` AND b.is_archived = 0`;
    }

    // Folder filtering
    if (options.folderId !== undefined && options.folderId !== null && options.folderId !== "") {
      if (options.includeSubfolders) {
        const folderIds = this.getDescendantFolderIds(options.folderId, userId);
        if (folderIds.length > 0) {
          const placeholders = folderIds.map(() => "?").join(",");
          query += ` AND b.folder_id IN (${placeholders})`;
          params.push(...folderIds);
        } else {
          query += ` AND b.folder_id = ?`;
          params.push(options.folderId);
        }
      } else {
        query += ` AND b.folder_id = ?`;
        params.push(options.folderId);
      }
    }

    // Domain filter
    if (options.domain) {
      query += ` AND b.domain = ?`;
      params.push(options.domain);
    }

    // Status filter
    if (options.status) {
      query += ` AND b.status = ?`;
      params.push(options.status);
    }

    // Tag filter
    if (options.tag) {
      query += ` AND b.id IN (
        SELECT bt.bookmark_id FROM bookmark_tags bt
        JOIN tags t ON bt.tag_id = t.id
        WHERE t.name = ? AND t.user_id = ?
      )`;
      params.push(options.tag, userId);
    }

    // Full-text / fuzzy search
    if (options.search && options.search.trim() !== "") {
      const term = `%${options.search.trim().toLowerCase()}%`;
      query += ` AND (
        LOWER(b.title) LIKE ? OR
        LOWER(b.description) LIKE ? OR
        LOWER(b.domain) LIKE ? OR
        LOWER(b.url) LIKE ? OR
        LOWER(b.search_text) LIKE ?
      )`;
      params.push(term, term, term, term, term);
    }

    // Default sorting
    if (options.view === "recent") {
      query += ` ORDER BY COALESCE(b.last_clicked_at, b.last_visited_at, b.created_at) DESC LIMIT 50`;
    } else {
      query += ` ORDER BY b.created_at DESC`;
    }

    interface RawBookmarkRow {
      id: string;
      user_id: string;
      folder_id: string | null;
      url: string;
      canonical_url: string;
      title: string;
      description: string | null;
      icon_url: string | null;
      image_url: string | null;
      domain: string;
      is_favorite: number;
      is_archived: number;
      status: string;
      visit_count: number;
      last_visited_at: number | null;
      last_clicked_at?: number | null;
      created_at: number;
      search_text: string | null;
      folder_name: string | null;
    }

    interface RawTagRow {
      id: string;
      user_id: string;
      name: string;
      color: string;
      created_at: number;
      bookmark_id: string;
    }

    const rows = sqlite.prepare(query).all(...params) as RawBookmarkRow[];

    // Fetch tags for these bookmarks
    const bookmarkIds = rows.map((r) => r.id);
    const tagMap = new Map<string, Tag[]>();

    if (bookmarkIds.length > 0) {
      const placeholders = bookmarkIds.map(() => "?").join(",");
      const tagRows = sqlite.prepare(`
        SELECT bt.bookmark_id, t.id, t.user_id, t.name, t.color, t.created_at
        FROM bookmark_tags bt
        JOIN tags t ON bt.tag_id = t.id
        WHERE bt.bookmark_id IN (${placeholders})
      `).all(...bookmarkIds) as RawTagRow[];

      for (const tr of tagRows) {
        if (!tagMap.has(tr.bookmark_id)) {
          tagMap.set(tr.bookmark_id, []);
        }
        tagMap.get(tr.bookmark_id)!.push({
          id: tr.id,
          userId: tr.user_id,
          name: tr.name,
          color: tr.color,
          createdAt: tr.created_at,
        });
      }
    }

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      folderId: r.folder_id,
      url: r.url,
      canonicalUrl: r.canonical_url,
      title: r.title,
      description: r.description,
      iconUrl: r.icon_url,
      imageUrl: r.image_url,
      domain: r.domain,
      isFavorite: Boolean(r.is_favorite),
      isArchived: Boolean(r.is_archived),
      status: r.status as "alive" | "dead" | "pending",
      visitCount: r.visit_count,
      lastVisitedAt: r.last_visited_at,
      lastClickedAt: r.last_clicked_at ?? r.last_visited_at ?? null,
      createdAt: r.created_at,
      searchText: r.search_text,
      folderName: r.folder_name,
      tags: tagMap.get(r.id) || [],
    }));
  }

  /**
   * Create new bookmark with tags
   */
  static createBookmark(data: {
    url: string;
    canonicalUrl: string;
    title: string;
    description?: string;
    iconUrl?: string;
    imageUrl?: string;
    domain: string;
    folderId?: string | null;
    isFavorite?: boolean;
    tagNames?: string[];
    userId?: string;
  }): BookmarkWithDetails {
    const userId = data.userId || DEFAULT_USER_ID;
    const id = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    let canonicalUrl = data.canonicalUrl;
    const existing = db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.canonicalUrl, canonicalUrl))).get();
    if (existing) {
      canonicalUrl = `${canonicalUrl}#copy_${Date.now().toString(36)}`;
    }

    const searchText = [
      data.title,
      data.description || "",
      data.domain,
      data.url,
      (data.tagNames || []).join(" "),
    ].join(" ").toLowerCase();

    db.insert(bookmarks).values({
      id,
      userId,
      folderId: data.folderId || null,
      url: data.url,
      canonicalUrl,
      title: data.title,
      description: data.description || null,
      iconUrl: data.iconUrl || null,
      imageUrl: data.imageUrl || null,
      domain: data.domain,
      isFavorite: data.isFavorite ? true : false,
      isArchived: false,
      status: "alive",
      visitCount: 0,
      lastVisitedAt: null,
      lastClickedAt: null,
      createdAt: now,
      searchText,
    }).run();

    try {
      sqlite.prepare(`DELETE FROM deleted_bookmarks WHERE id = ?`).run(id);
    } catch {}

    // Attach tags
    if (data.tagNames && data.tagNames.length > 0) {
      this.attachTagsToBookmark(id, data.tagNames, userId);
    }

    const created = this.getBookmarkById(id);
    if (created) {
      SupabaseManager.syncBookmark(created, "upsert").catch(() => {});
    }
    return created!;
  }

  /**
   * Attach tags helper
   */
  static attachTagsToBookmark(bookmarkId: string, tagNames: string[], userId: string = DEFAULT_USER_ID) {
    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

    for (let i = 0; i < tagNames.length; i++) {
      const rawName = tagNames[i].trim().toLowerCase();
      if (!rawName) continue;

      let tag = db.select().from(tags).where(and(eq(tags.userId, userId), eq(tags.name, rawName))).get();
      if (!tag) {
        const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.insert(tags).values({
          id: tagId,
          userId,
          name: rawName,
          color: colors[i % colors.length],
          createdAt: Date.now(),
        }).run();
        tag = db.select().from(tags).where(eq(tags.id, tagId)).get();
      }

      if (tag) {
        sqlite.prepare(`
          INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)
        `).run(bookmarkId, tag.id);
      }
    }
  }

  /**
   * Update bookmark
   */
  static updateBookmark(
    id: string,
    updates: Partial<{
      title: string;
      description: string | null;
      url: string;
      domain: string;
      imageUrl: string | null;
      iconUrl: string | null;
      canonicalUrl: string;
      folderId: string | null;
      isFavorite: boolean;
      isArchived: boolean;
      status: "alive" | "dead" | "pending";
      visitCount: number;
      lastVisitedAt: number | null;
      tagNames: string[];
    }>,
    userId: string = DEFAULT_USER_ID
  ) {
    const { tagNames, ...bmUpdates } = updates;

    if (bmUpdates.url) {
      try {
        let fullUrl = bmUpdates.url.trim();
        if (!/^https?:\/\//i.test(fullUrl)) {
          fullUrl = `https://${fullUrl}`;
        }
        bmUpdates.url = fullUrl;
        const u = new URL(fullUrl);
        bmUpdates.domain = u.hostname.replace(/^www\./, "");
        bmUpdates.canonicalUrl = `${u.origin}${u.pathname}`.replace(/\/$/, "");
      } catch {}
    }

    if (Object.keys(bmUpdates).length > 0) {
      db.update(bookmarks)
        .set(bmUpdates)
        .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
        .run();
    }

    if (tagNames !== undefined) {
      // Clear existing tags and re-attach
      db.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, id)).run();
      if (tagNames.length > 0) {
        this.attachTagsToBookmark(id, tagNames, userId);
      }
    }

    const updated = this.getBookmarkById(id);
    if (updated) {
      SupabaseManager.syncBookmark(updated, "upsert").catch(() => {});
    }
  }

  /**
   * Delete single bookmark and move to Recycle Bin
   */
  static async deleteBookmark(id: string, userId?: string) {
    try {
      const b = db.select().from(bookmarks).where(eq(bookmarks.id, id)).get();
      if (!b) return;
      const effectiveUserId = b.userId || userId || DEFAULT_USER_ID;

      // Fetch attached tags
      const tagRows = sqlite.prepare(`
        SELECT t.id, t.name, t.color
        FROM bookmark_tags bt
        JOIN tags t ON bt.tag_id = t.id
        WHERE bt.bookmark_id = ?
      `).all(id);

      const retentionDays = this.getRecycleBinRetentionDays(effectiveUserId);

      // 1. Move to Recycle Bin with full restore snapshot
      sqlite.prepare(`
        INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
        VALUES (?, ?, 'bookmark', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `rb_bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        effectiveUserId,
        id,
        b.title,
        b.folderId,
        b.iconUrl,
        null,
        JSON.stringify({ ...b, tags: tagRows }),
        Date.now(),
        retentionDays
      );

      // 2. Record tombstone
      sqlite.prepare(`
        INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)
      `).run(id, effectiveUserId, Date.now());

      if (userId && userId !== effectiveUserId) {
        sqlite.prepare(`
          INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)
        `).run(id, userId, Date.now());
      }

      // 3. Remove from active bookmarks and Supabase (awaited!)
      await SupabaseManager.syncBookmark({ id }, "delete");
      db.delete(bookmarks).where(eq(bookmarks.id, id)).run();
    } catch (e) {
      console.error("deleteBookmark error:", e);
    }
  }

  /**
   * Get retention setting in days (1, 7, 15, or 30 days - default 30)
   */
  static getRecycleBinRetentionDays(userId: string = DEFAULT_USER_ID): number {
    try {
      const row = sqlite
        .prepare(`SELECT value FROM app_settings WHERE key = 'recycle_bin_retention_days'`)
        .get() as { value: string } | undefined;
      if (row?.value) {
        const parsed = parseInt(row.value, 10);
        if ([1, 7, 15, 30].includes(parsed)) return parsed;
      }
    } catch {}
    return 30;
  }

  /**
   * Set retention setting in days (1, 7, 15, 30)
   */
  static setRecycleBinRetentionDays(days: number): void {
    const validDays = [1, 7, 15, 30].includes(days) ? days : 30;
    try {
      sqlite
        .prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES ('recycle_bin_retention_days', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `)
        .run(String(validDays), Date.now());
    } catch (e) {
      console.warn("Failed to update recycle bin retention:", e);
    }
  }

  /**
   * Fetch all recycle bin items for a user, purging any expired items
   */
  static getRecycleBinItems(userId: string = DEFAULT_USER_ID): any[] {
    try {
      // 1. Purge expired items automatically
      const retentionDays = this.getRecycleBinRetentionDays(userId);
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - retentionMs;
      sqlite.prepare(`DELETE FROM recycle_bin WHERE user_id = ? AND deleted_at < ?`).run(userId, cutoff);

      // 2. Query active recycle bin items
      const rows = sqlite
        .prepare(`SELECT * FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC`)
        .all(userId) as any[];

      const now = Date.now();
      return rows.map((r) => {
        const itemRetentionMs = (r.retention_days || retentionDays) * 24 * 60 * 60 * 1000;
        const expiresAt = r.deleted_at + itemRetentionMs;
        const remainingMs = Math.max(0, expiresAt - now);
        const expiresInDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        const expiresInHours = Math.ceil(remainingMs / (60 * 60 * 1000));

        return {
          id: r.id,
          userId: r.user_id,
          itemType: r.item_type,
          itemId: r.item_id,
          title: r.title,
          originalFolderId: r.original_folder_id,
          originalFolderName: r.original_folder_name,
          icon: r.icon,
          color: r.color,
          itemData: r.item_data,
          deletedAt: r.deleted_at,
          retentionDays: r.retention_days,
          expiresInDays,
          expiresInHours,
        };
      });
    } catch (e) {
      console.error("getRecycleBinItems error:", e);
      return [];
    }
  }

  /**
   * Restore an item from Recycle Bin
   */
  static async restoreRecycleBinItem(id: string, userId: string = DEFAULT_USER_ID) {
    const item = sqlite.prepare(`SELECT * FROM recycle_bin WHERE id = ?`).get(id) as any;
    if (!item) return { success: false, error: "Item not found in Recycle Bin" };

    const data = JSON.parse(item.item_data);

    if (item.item_type === "folder") {
      // Check if parent still exists
      let parentId = data.parentId || null;
      if (parentId) {
        const parentExists = db.select({ id: folders.id }).from(folders).where(eq(folders.id, parentId)).get();
        if (!parentExists) parentId = null;
      }

      // Re-insert into folders
      sqlite.prepare(`
        INSERT OR REPLACE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        item.user_id,
        parentId,
        data.name,
        data.icon || "📁",
        data.color || "gray",
        data.position || 0,
        data.createdAt || Date.now(),
        Date.now()
      );

      // Restore all bookmarks that were inside this folder if present
      if (Array.isArray(data.bookmarks)) {
        for (const b of data.bookmarks) {
          try {
            sqlite.prepare(`
              INSERT OR REPLACE INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, image_url, domain, is_favorite, is_archived, status, visit_count, last_visited_at, last_clicked_at, created_at, search_text)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              b.id,
              item.user_id,
              data.id,
              b.url,
              b.canonical_url || b.canonicalUrl || b.url,
              b.title,
              b.description || null,
              b.icon_url || b.iconUrl || null,
              b.image_url || b.imageUrl || null,
              b.domain,
              b.is_favorite || b.isFavorite ? 1 : 0,
              b.is_archived || b.isArchived ? 1 : 0,
              b.status || "alive",
              b.visit_count || b.visitCount || 0,
              b.last_visited_at || b.lastVisitedAt || null,
              b.last_clicked_at || b.lastClickedAt || null,
              b.created_at || b.createdAt || Date.now(),
              b.search_text || b.searchText || null
            );
            sqlite.prepare(`DELETE FROM deleted_bookmarks WHERE id = ?`).run(b.id);
            sqlite.prepare(`DELETE FROM recycle_bin WHERE item_id = ? AND item_type = 'bookmark'`).run(b.id);
            const restoredBm = this.getBookmarkById(b.id);
            if (restoredBm) {
              SupabaseManager.syncBookmark(restoredBm, "upsert").catch(() => {});
            }
          } catch (bmRestoreErr) {
            console.warn("Restore folder child bookmark error:", bmRestoreErr);
          }
        }
      }

      // Remove from tombstones
      sqlite.prepare(`DELETE FROM deleted_folders WHERE id = ?`).run(data.id);
      sqlite.prepare(`DELETE FROM recycle_bin WHERE id = ?`).run(id);

      // Sync restore to Supabase
      const restored = db.select().from(folders).where(eq(folders.id, data.id)).get();
      if (restored) {
        await SupabaseManager.syncFolder(restored, "upsert");
      }
      return { success: true, item: restored, type: "folder" };
    } else {
      // Bookmark restore: check if original folder exists, otherwise restore to Unsorted (Inbox)
      let folderId = data.folderId || null;
      if (folderId) {
        const folderExists = db.select({ id: folders.id }).from(folders).where(eq(folders.id, folderId)).get();
        if (!folderExists) folderId = null;
      }

      sqlite.prepare(`
        INSERT OR REPLACE INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, image_url, domain, is_favorite, is_archived, status, visit_count, last_visited_at, last_clicked_at, created_at, search_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        item.user_id,
        folderId,
        data.url,
        data.canonicalUrl || data.url,
        data.title,
        data.description || null,
        data.iconUrl || null,
        data.imageUrl || null,
        data.domain,
        data.isFavorite ? 1 : 0,
        data.isArchived ? 1 : 0,
        data.status || "alive",
        data.visitCount || 0,
        data.lastVisitedAt || null,
        data.lastClickedAt || null,
        data.createdAt || Date.now(),
        data.searchText || null
      );

      // Restore tags if present
      if (Array.isArray(data.tags)) {
        for (const t of data.tags) {
          sqlite.prepare(`
            INSERT OR IGNORE INTO tags (id, user_id, name, color, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(t.id, item.user_id, t.name, t.color || "#3b82f6", Date.now());

          sqlite.prepare(`
            INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
            VALUES (?, ?)
          `).run(data.id, t.id);
        }
      }

      // Remove from tombstones
      sqlite.prepare(`DELETE FROM deleted_bookmarks WHERE id = ?`).run(data.id);
      sqlite.prepare(`DELETE FROM recycle_bin WHERE id = ?`).run(id);

      const restored = this.getBookmarkById(data.id);
      if (restored) {
        await SupabaseManager.syncBookmark(restored, "upsert");
      }
      return { success: true, item: restored, type: "bookmark" };
    }
  }

  /**
   * Permanently delete a single item from Recycle Bin
   */
  static async permanentlyDeleteRecycleBinItem(id: string, userId: string = DEFAULT_USER_ID) {
    const item = sqlite.prepare(`SELECT * FROM recycle_bin WHERE id = ?`).get(id) as any;
    if (!item) return;

    const client = SupabaseManager.getClient();

    if (item.item_type === "folder") {
      sqlite.prepare(`INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)`).run(item.item_id, item.user_id, Date.now());
      sqlite.prepare(`DELETE FROM recycle_bin WHERE original_folder_id = ?`).run(item.item_id);
      if (client) {
        try {
          await client.from("folders").delete().eq("id", item.item_id);
          await client.from("bookmarks").delete().eq("folder_id", item.item_id);
        } catch {}
      }
    } else {
      sqlite.prepare(`INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)`).run(item.item_id, item.user_id, Date.now());
      if (client) {
        try {
          await client.from("bookmarks").delete().eq("id", item.item_id);
        } catch {}
      }
    }

    sqlite.prepare(`DELETE FROM recycle_bin WHERE id = ?`).run(id);
  }

  /**
   * Empty entire recycle bin
   */
  static async emptyRecycleBin(userId: string = DEFAULT_USER_ID) {
    const items = sqlite.prepare(`SELECT * FROM recycle_bin WHERE user_id = ?`).all(userId) as any[];
    const client = SupabaseManager.getClient();
    const folderIds: string[] = [];
    const bmIds: string[] = [];

    for (const item of items) {
      if (item.item_type === "folder") {
        folderIds.push(item.item_id);
        sqlite.prepare(`INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)`).run(item.item_id, item.user_id, Date.now());
      } else {
        bmIds.push(item.item_id);
        sqlite.prepare(`INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)`).run(item.item_id, item.user_id, Date.now());
      }
    }

    if (client) {
      try {
        if (bmIds.length > 0) {
          await client.from("bookmarks").delete().in("id", bmIds);
        }
        if (folderIds.length > 0) {
          await client.from("folders").delete().in("id", folderIds);
        }
      } catch {}
    }

    sqlite.prepare(`DELETE FROM recycle_bin WHERE user_id = ?`).run(userId);
  }

  /**
   * Bulk actions on bookmarks
   */
  static bulkUpdate(ids: string[], updates: Partial<{
    folderId: string | null;
    isFavorite: boolean;
    isArchived: boolean;
    status: "alive" | "dead";
  }>, userId: string = DEFAULT_USER_ID) {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");

    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.folderId !== undefined) {
      setClauses.push("folder_id = ?");
      params.push(updates.folderId);
    }
    if (updates.isFavorite !== undefined) {
      setClauses.push("is_favorite = ?");
      params.push(updates.isFavorite ? 1 : 0);
    }
    if (updates.isArchived !== undefined) {
      setClauses.push("is_archived = ?");
      params.push(updates.isArchived ? 1 : 0);
    }
    if (updates.status !== undefined) {
      setClauses.push("status = ?");
      params.push(updates.status);
    }

    if (setClauses.length === 0) return;

    params.push(userId, ...ids);

    const query = `
      UPDATE bookmarks
      SET ${setClauses.join(", ")}
      WHERE user_id = ? AND id IN (${placeholders})
    `;

    sqlite.prepare(query).run(...params);
  }

  static async bulkDelete(ids: string[], userId: string = DEFAULT_USER_ID) {
    if (ids.length === 0) return;
    for (const id of ids) {
      await this.deleteBookmark(id, userId);
    }
  }

  /**
   * Analytics & Dashboard statistics
   */
  static getDashboardStats(userId: string = DEFAULT_USER_ID, folderId?: string | null, includeSubfolders: boolean = false) {
    let folderIds: string[] = [];
    if (folderId) {
      folderIds = includeSubfolders ? this.getDescendantFolderIds(folderId, userId) : [folderId];
    }

    let folderFilter = "";
    const filterParams: (string | number)[] = [userId];

    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      folderFilter = `AND b.folder_id IN (${placeholders})`;
      filterParams.push(...folderIds);
    }

    // Total active bookmarks
    const totalRow = sqlite.prepare(`
      SELECT COUNT(*) as count FROM bookmarks b WHERE b.user_id = ? AND b.is_archived = 0 ${folderFilter}
    `).get(...filterParams) as { count: number };

    // Total folders
    const totalFolders = db.select().from(folders).where(eq(folders.userId, userId)).all().length;

    // Added this week (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekParams = [userId, sevenDaysAgo, ...(folderIds.length > 0 ? folderIds : [])];
    const weekRow = sqlite.prepare(`
      SELECT COUNT(*) as count FROM bookmarks b
      WHERE b.user_id = ? AND b.created_at >= ? AND b.is_archived = 0 ${folderFilter}
    `).get(...weekParams) as { count: number };

    // Dead links count
    const deadRow = sqlite.prepare(`
      SELECT COUNT(*) as count FROM bookmarks b
      WHERE b.user_id = ? AND b.status = 'dead' AND b.is_archived = 0 ${folderFilter}
    `).get(...filterParams) as { count: number };

    // Top domains
    const topDomains = sqlite.prepare(`
      SELECT b.domain, COUNT(*) as count
      FROM bookmarks b
      WHERE b.user_id = ? AND b.is_archived = 0 ${folderFilter}
      GROUP BY b.domain
      ORDER BY count DESC
      LIMIT 8
    `).all(...filterParams) as { domain: string; count: number }[];

    // Folder counts for Treemap / Sunburst
    const folderBreakdown = sqlite.prepare(`
      SELECT f.id, f.name, f.parent_id, COUNT(b.id) as count
      FROM folders f
      LEFT JOIN bookmarks b ON f.id = b.folder_id AND b.is_archived = 0
      WHERE f.user_id = ?
      GROUP BY f.id
    `).all(userId) as { id: string; name: string; parent_id: string | null; count: number }[];

    // Activity timeline (past 30 days)
    const timeline = sqlite.prepare(`
      SELECT strftime('%Y-%m-%d', datetime(b.created_at / 1000, 'unixepoch')) as date, COUNT(*) as count
      FROM bookmarks b
      WHERE b.user_id = ? AND b.is_archived = 0 ${folderFilter}
      GROUP BY date
      ORDER BY date ASC
    `).all(...filterParams) as { date: string; count: number }[];

    // Tags distribution
    const tagDistribution = sqlite.prepare(`
      SELECT t.name, t.color, COUNT(bt.bookmark_id) as count
      FROM tags t
      JOIN bookmark_tags bt ON t.id = bt.tag_id
      JOIN bookmarks b ON bt.bookmark_id = b.id
      WHERE t.user_id = ? AND b.is_archived = 0 ${folderFilter}
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 8
    `).all(...filterParams) as { name: string; color: string; count: number }[];

    return {
      totalBookmarks: totalRow?.count || 0,
      totalFolders,
      addedThisWeek: weekRow?.count || 0,
      deadLinks: deadRow?.count || 0,
      topDomain: topDomains[0]?.domain || "N/A",
      topDomains,
      folderBreakdown,
      timeline,
      tagDistribution,
    };
  }

  /**
   * Domain-specific analytics for Website Insights
   */
  static getDomainStats(domain: string, userId: string = DEFAULT_USER_ID) {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, "");
    const allBookmarks = this.getBookmarks({ userId, domain: cleanDomain });

    const totalBookmarks = allBookmarks.length;
    const totalVisits = allBookmarks.reduce((sum, b) => sum + (b.visitCount || 0), 0);
    const lastVisitedAt = allBookmarks.reduce((latest, b) => Math.max(latest, b.lastVisitedAt || 0), 0);

    const folderCountMap = new Map<string, { id: string; name: string; count: number }>();
    for (const b of allBookmarks) {
      const fId = b.folderId || "unsorted";
      const fName = b.folderName || "Unsorted";
      if (!folderCountMap.has(fId)) {
        folderCountMap.set(fId, { id: fId, name: fName, count: 0 });
      }
      folderCountMap.get(fId)!.count++;
    }
    const folderDistribution = Array.from(folderCountMap.values());

    const healthCounts = {
      alive: allBookmarks.filter((b) => b.status === "alive").length,
      dead: allBookmarks.filter((b) => b.status === "dead").length,
      pending: allBookmarks.filter((b) => b.status === "pending").length,
    };

    const tagCountMap = new Map<string, { name: string; color: string; count: number }>();
    for (const b of allBookmarks) {
      for (const t of b.tags) {
        if (!tagCountMap.has(t.name)) {
          tagCountMap.set(t.name, { name: t.name, color: t.color, count: 0 });
        }
        tagCountMap.get(t.name)!.count++;
      }
    }
    const tagDistribution = Array.from(tagCountMap.values()).sort((a, b) => b.count - a.count);

    const mostAccessed = [...allBookmarks].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)).slice(0, 10);
    const recentlyAdded = [...allBookmarks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

    const timeline = sqlite.prepare(`
      SELECT strftime('%Y-%m-%d', datetime(b.created_at / 1000, 'unixepoch')) as date, COUNT(*) as count
      FROM bookmarks b
      WHERE b.user_id = ? AND b.domain = ? AND b.is_archived = 0
      GROUP BY date
      ORDER BY date ASC
    `).all(userId, cleanDomain) as { date: string; count: number }[];

    return {
      domain: cleanDomain,
      iconUrl: allBookmarks[0]?.iconUrl || null,
      totalBookmarks,
      totalVisits,
      lastVisitedAt: lastVisitedAt > 0 ? lastVisitedAt : null,
      foldersCount: folderDistribution.length,
      folderDistribution,
      healthCounts,
      tagDistribution,
      mostAccessed,
      recentlyAdded,
      timeline,
      bookmarks: allBookmarks,
    };
  }

  /**
   * Get a single bookmark with tags by its ID (across any user)
   */
  static getBookmarkById(bookmarkId: string): BookmarkWithDetails | undefined {
    const r = sqlite.prepare(`
      SELECT 
        b.id, b.user_id, b.folder_id, b.url, b.canonical_url, b.title, b.description,
        b.icon_url, b.image_url, b.domain, b.is_favorite, b.is_archived, b.status,
        b.visit_count, b.last_visited_at, b.last_clicked_at, b.created_at, b.search_text,
        f.name as folder_name
      FROM bookmarks b
      LEFT JOIN folders f ON b.folder_id = f.id
      WHERE b.id = ?
    `).get(bookmarkId) as any;

    if (!r) return undefined;

    const tagRows = sqlite.prepare(`
      SELECT t.id, t.user_id, t.name, t.color, t.created_at
      FROM bookmark_tags bt
      JOIN tags t ON bt.tag_id = t.id
      WHERE bt.bookmark_id = ?
    `).all(bookmarkId) as any[];

    const tags: Tag[] = tagRows.map((tr) => ({
      id: tr.id,
      userId: tr.user_id,
      name: tr.name,
      color: tr.color,
      createdAt: tr.created_at,
    }));

    return {
      id: r.id,
      userId: r.user_id,
      folderId: r.folder_id,
      url: r.url,
      canonicalUrl: r.canonical_url,
      title: r.title,
      description: r.description,
      iconUrl: r.icon_url,
      imageUrl: r.image_url,
      domain: r.domain,
      isFavorite: Boolean(r.is_favorite),
      isArchived: Boolean(r.is_archived),
      status: r.status as "alive" | "dead" | "pending",
      visitCount: r.visit_count || 0,
      lastVisitedAt: r.last_visited_at,
      lastClickedAt: r.last_clicked_at ?? r.last_visited_at ?? null,
      createdAt: r.created_at,
      searchText: r.search_text,
      folderName: r.folder_name || (r.folder_id ? "Unknown Folder" : "Unsorted"),
      tags,
    };
  }

  /**
   * Record a bookmark visit (increments visitCount, sets lastVisitedAt and lastClickedAt)
   */
  static recordVisit(bookmarkId: string): boolean {
    const now = Date.now();
    const info = sqlite
      .prepare(`UPDATE bookmarks SET visit_count = COALESCE(visit_count, 0) + 1, last_visited_at = ?, last_clicked_at = ? WHERE id = ?`)
      .run(now, now, bookmarkId);

    if (info.changes > 0) {
      try {
        const bm = this.getBookmarkById(bookmarkId);
        if (bm) {
          SupabaseManager.syncBookmark(bm, "upsert").catch((e) => console.warn("Supabase recordVisit sync notice:", e));
        }
      } catch (err) {
        console.warn("recordVisit sync notice:", err);
      }
    }

    return info.changes > 0;
  }

  /**
   * Interactive Knowledge Graph data generation
   */
  static getGraphData(options: {
    mode: "global" | "folder" | "domain";
    folderId?: string | null;
    domain?: string | null;
    depth?: number;
    userId?: string;
  }) {
    const userId = options.userId || DEFAULT_USER_ID;
    const depth = options.depth || 1;

    const flatFolders = db.select().from(folders).where(eq(folders.userId, userId)).all();
    const allBookmarks = this.getBookmarks({ userId });

    interface GraphNode {
      id: string;
      label: string;
      type: "domain" | "folder" | "bookmark" | "tag";
      color: string;
      size: number;
      data?: any;
    }

    interface GraphEdge {
      id: string;
      source: string;
      target: string;
      type: string;
      color: string;
    }

    let targetBookmarks = allBookmarks;

    if (options.mode === "domain" && options.domain) {
      const cleanDom = options.domain.toLowerCase().replace(/^www\./, "");
      targetBookmarks = allBookmarks.filter((b) => b.domain.toLowerCase().replace(/^www\./, "") === cleanDom);
    } else if (options.mode === "folder" && options.folderId) {
      if (depth === 1) {
        targetBookmarks = allBookmarks.filter((b) => b.folderId === options.folderId);
      } else {
        const descendantIds = this.getDescendantFolderIds(options.folderId, userId);
        targetBookmarks = allBookmarks.filter((b) => b.folderId && descendantIds.includes(b.folderId));
      }
    }

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    const addEdge = (source: string, target: string, type: string, color: string = "rgba(100, 116, 139, 0.35)") => {
      const edgeId = `${source}->${target}`;
      if (!edgeMap.has(edgeId) && source !== target) {
        edgeMap.set(edgeId, { id: edgeId, source, target, type, color });
      }
    };

    if (options.mode === "folder" && options.folderId) {
      const descendantIds = this.getDescendantFolderIds(options.folderId, userId);
      for (const dId of descendantIds) {
        const subFolder = flatFolders.find((x) => x.id === dId);
        if (subFolder) {
          const subId = `fld_${subFolder.id}`;
          if (!nodeMap.has(subId)) {
            nodeMap.set(subId, {
              id: subId,
              label: subFolder.name,
              type: "folder",
              color: "#7963E9",
              size: subFolder.id === options.folderId ? 18 : 13,
              data: { ...subFolder, bookmarkCount: targetBookmarks.filter((b) => b.folderId === subFolder.id).length },
            });
          }
          if (subFolder.parentId && (subFolder.parentId === options.folderId || descendantIds.includes(subFolder.parentId))) {
            addEdge(`fld_${subFolder.parentId}`, subId, "folder-child-folder", "rgba(121, 99, 233, 0.65)");
          }
        }
      }
    }

    if (options.mode === "domain" && options.domain) {
      const dom = options.domain.toLowerCase().replace(/^www\./, "");
      nodeMap.set(`dom_${dom}`, {
        id: `dom_${dom}`,
        label: dom,
        type: "domain",
        color: "#4AA8E8",
        size: 20,
        data: { domain: dom, bookmarkCount: targetBookmarks.length },
      });
    }

    for (const bm of targetBookmarks) {
      const bmNodeId = `bm_${bm.id}`;
      const bmSize = Math.min(14, Math.max(6, 6 + Math.log2((bm.visitCount || 0) + 1) * 2));
      nodeMap.set(bmNodeId, {
        id: bmNodeId,
        label: bm.title,
        type: "bookmark",
        color: bm.isFavorite ? "#E8B75B" : "#A78BFA",
        size: bmSize,
        data: bm,
      });

      const domId = `dom_${bm.domain.toLowerCase().replace(/^www\./, "")}`;
      if (!nodeMap.has(domId)) {
        nodeMap.set(domId, {
          id: domId,
          label: bm.domain,
          type: "domain",
          color: "#4AA8E8",
          size: 10,
          data: { domain: bm.domain },
        });
      }
      addEdge(domId, bmNodeId, "domain-has-bookmark", "rgba(74, 168, 232, 0.45)");

      if (bm.folderId) {
        const fldId = `fld_${bm.folderId}`;
        if (!nodeMap.has(fldId)) {
          const f = flatFolders.find((x) => x.id === bm.folderId);
          nodeMap.set(fldId, {
            id: fldId,
            label: f ? f.name : (bm.folderName || "Folder"),
            type: "folder",
            color: "#7963E9",
            size: 12,
            data: f,
          });
        }
        addEdge(fldId, bmNodeId, "folder-contains-bookmark", "rgba(121, 99, 233, 0.45)");
      }

      for (const t of bm.tags) {
        const tagId = `tag_${t.name.toLowerCase()}`;
        if (!nodeMap.has(tagId)) {
          nodeMap.set(tagId, {
            id: tagId,
            label: `#${t.name}`,
            type: "tag",
            color: "#42C99A",
            size: 8,
            data: t,
          });
        }
        addEdge(bmNodeId, tagId, "bookmark-has-tag", "rgba(66, 201, 154, 0.35)");
      }
    }

    for (const f of flatFolders) {
      if (f.parentId && nodeMap.has(`fld_${f.parentId}`) && nodeMap.has(`fld_${f.id}`)) {
        addEdge(`fld_${f.parentId}`, `fld_${f.id}`, "parent-child-folder", "rgba(121, 99, 233, 0.6)");
      }
    }

    if (depth >= 2 && options.mode === "domain") {
      const currentTags = new Set(targetBookmarks.flatMap((b) => b.tags.map((t) => t.name.toLowerCase())));
      const otherBookmarks = allBookmarks.filter((b) => b.domain.toLowerCase().replace(/^www\./, "") !== options.domain);
      for (const ob of otherBookmarks) {
        const shared = ob.tags.filter((t) => currentTags.has(t.name.toLowerCase()));
        if (shared.length > 0) {
          const relDomId = `dom_${ob.domain.toLowerCase().replace(/^www\./, "")}`;
          if (!nodeMap.has(relDomId)) {
            nodeMap.set(relDomId, {
              id: relDomId,
              label: ob.domain,
              type: "domain",
              color: "#38bdf8",
              size: 8,
              data: { domain: ob.domain, related: true },
            });
          }
          for (const s of shared) {
            addEdge(relDomId, `tag_${s.name.toLowerCase()}`, "related-tag", "rgba(56, 189, 248, 0.25)");
          }
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
      summary: {
        totalNodes: nodeMap.size,
        totalEdges: edgeMap.size,
        domains: Array.from(nodeMap.values()).filter((n) => n.type === "domain").length,
        folders: Array.from(nodeMap.values()).filter((n) => n.type === "folder").length,
        bookmarks: Array.from(nodeMap.values()).filter((n) => n.type === "bookmark").length,
        tags: Array.from(nodeMap.values()).filter((n) => n.type === "tag").length,
      },
    };
  }

  /**
   * Get all tags for user
   */
  static getTags(userId: string = DEFAULT_USER_ID): Tag[] {
    return db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name)).all();
  }
}

export const FolderRepository = BookmarkRepository;
