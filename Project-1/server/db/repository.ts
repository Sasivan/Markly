import { db, sqlite } from "./client";
import { folders, bookmarks, tags, bookmarkTags, users, feedbacks, feedbackReplies, type Folder, type Bookmark, type Tag, type BookmarkWithDetails, type FolderTreeNode, type Feedback, type FeedbackReply, type FeedbackWithReplies } from "./schema";
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
      this.ensureUserStarterData(DEFAULT_USER_ID);
    } catch (e) {
      console.warn("ensureDefaultUser notice:", e);
    }
  }

  /**
   * Ensure user record exists in local DB
   */
  static ensureUser(userId: string, email?: string, displayName?: string, avatarUrl?: string, username?: string) {
    try {
      if (!userId || userId === DEFAULT_USER_ID) return;
      const user = db.select().from(users).where(eq(users.id, userId)).get();
      if (!user) {
        db.insert(users).values({
          id: userId,
          email: email || `${userId}@markly.app`,
          username: username || null,
          displayName: displayName || "Markly User",
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          createdAt: Date.now(),
        }).run();
      } else if (username && !user.username) {
        sqlite.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(username, userId);
      }
    } catch (e) {
      console.warn("ensureUser notice:", e);
    }
  }

  /**
   * Get user by username (case-insensitive)
   */
  static getUserByUsername(username: string) {
    try {
      if (!username) return null;
      return sqlite.prepare(`
        SELECT * FROM users WHERE LOWER(username) = LOWER(?)
      `).get(username.trim()) as any;
    } catch (e) {
      console.warn("getUserByUsername error:", e);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  static getUserById(id: string) {
    try {
      if (!id) return null;
      return sqlite.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(id.trim()) as any;
    } catch (e) {
      console.warn("getUserById error:", e);
      return null;
    }
  }

  /**
   * Record user login timestamp
   */
  static recordUserLogin(userId: string) {
    try {
      if (!userId) return;
      sqlite.prepare(`
        UPDATE users
        SET last_login_at = ?
        WHERE id = ?
      `).run(Date.now(), userId);
    } catch (e) {
      console.warn("recordUserLogin notice:", e);
    }
  }

  /**
   * Check if username is taken (case-insensitive)
   */
  static isUsernameTaken(username: string, excludeUserId?: string): boolean {
    try {
      if (!username) return false;
      const q = excludeUserId
        ? sqlite.prepare(`SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?`)
        : sqlite.prepare(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`);
      const row = excludeUserId ? q.get(username.trim(), excludeUserId) : q.get(username.trim());
      return Boolean(row);
    } catch {
      return false;
    }
  }

  /**
   * Update user profile credentials in SQLite
   */
  static updateUserProfile(userId: string, updates: { username?: string; email?: string; displayName?: string; avatarUrl?: string }) {
    try {
      const sets: string[] = [];
      const params: any[] = [];
      if (updates.username !== undefined) {
        sets.push("username = ?");
        params.push(updates.username.trim());
      }
      if (updates.email !== undefined) {
        sets.push("email = ?");
        params.push(updates.email.trim());
      }
      if (updates.displayName !== undefined) {
        sets.push("display_name = ?");
        params.push(updates.displayName.trim());
      }
      if (updates.avatarUrl !== undefined) {
        sets.push("avatar_url = ?");
        params.push(updates.avatarUrl.trim());
      }
      if (sets.length > 0) {
        params.push(userId);
        sqlite.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...params);
      }
    } catch (e) {
      console.warn("updateUserProfile notice:", e);
    }
  }

  /**
   * Ensure user has universal starter library: 1 root folder ("Folder") with 2 subfolders ("Development" & "Resources"), each containing 3 bookmarks.
   */
  static ensureUserStarterData(userId: string) {
    try {
      if (!userId) return;

      // Ensure user record exists in local DB
      sqlite.prepare(`
        INSERT OR IGNORE INTO users (id, email, display_name, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        userId === DEFAULT_USER_ID ? "demo@markly.app" : `${userId}@markly.app`,
        userId === DEFAULT_USER_ID ? "Markly Explorer" : "Markly User",
        `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        Date.now()
      );

      // Check if user already has active folders
      const existingFolders = sqlite
        .prepare(`SELECT id, name FROM folders WHERE user_id = ? AND (parent_id IS NULL OR parent_id != '__TRASH__') AND name NOT LIKE '__TRASH__:%' AND id NOT IN (SELECT id FROM deleted_folders)`)
        .all(userId) as { id: string; name: string }[];

      if (existingFolders.length > 0) {
        return;
      }

      const now = Date.now();
      const prefix = userId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 8);
      const rootFolderId = `fld_root_${prefix}`;
      const subFolder1Id = `fld_dev_${prefix}`;
      const subFolder2Id = `fld_res_${prefix}`;

      // 1. Parent Root Folder ("Folder")
      sqlite.prepare(`
        INSERT OR REPLACE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
        VALUES (?, ?, NULL, 'Folder', '📁', '#3b82f6', 0, ?, ?)
      `).run(rootFolderId, userId, now, now);

      // 2. Subfolder 1 ("Development")
      sqlite.prepare(`
        INSERT OR REPLACE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
        VALUES (?, ?, ?, 'Development', '💻', '#6366f1', 0, ?, ?)
      `).run(subFolder1Id, userId, rootFolderId, now + 1, now + 1);

      // 3. Subfolder 2 ("Resources")
      sqlite.prepare(`
        INSERT OR REPLACE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
        VALUES (?, ?, ?, 'Resources', '🎨', '#10b981', 1, ?, ?)
      `).run(subFolder2Id, userId, rootFolderId, now + 2, now + 2);

      // 4. Ensure Unsorted system folder exists with persistent custom properties
    this.ensureUnsortedFolder(userId);

    const devBookmarks = [
        {
          id: `bm_gh_${subFolder1Id}`,
          url: "https://github.com",
          canonicalUrl: "https://github.com",
          title: "GitHub: Let's build from here",
          domain: "github.com",
          description: "GitHub is where over 100 million developers shape the future of software.",
          iconUrl: "https://github.githubassets.com/favicons/favicon.svg",
          tags: ["developer", "tools"],
        },
        {
          id: `bm_nxt_${subFolder1Id}`,
          url: "https://nextjs.org",
          canonicalUrl: "https://nextjs.org",
          title: "Next.js by Vercel - The React Framework",
          domain: "nextjs.org",
          description: "Used by some of the world's largest companies to build full-stack React web applications.",
          iconUrl: "https://nextjs.org/favicon.ico",
          tags: ["framework", "react"],
        },
        {
          id: `bm_gg_${subFolder1Id}`,
          url: "https://www.google.com",
          canonicalUrl: "https://google.com",
          title: "Google Search",
          domain: "google.com",
          description: "Search the world's information, including webpages, images, videos and more.",
          iconUrl: "https://www.google.com/favicon.ico",
          tags: ["search", "tools"],
        },
      ];

      const resBookmarks = [
        {
          id: `bm_mdn_${subFolder2Id}`,
          url: "https://developer.mozilla.org",
          canonicalUrl: "https://developer.mozilla.org",
          title: "MDN Web Docs",
          domain: "developer.mozilla.org",
          description: "Resources for developers, by developers. Documenting web standards.",
          iconUrl: "https://developer.mozilla.org/favicon-48x48.png",
          tags: ["docs", "web"],
        },
        {
          id: `bm_tw_${subFolder2Id}`,
          url: "https://tailwindcss.com",
          canonicalUrl: "https://tailwindcss.com",
          title: "Tailwind CSS - Rapidly build modern websites",
          domain: "tailwindcss.com",
          description: "A utility-first CSS framework packed with classes that can be composed directly in markup.",
          iconUrl: "https://tailwindcss.com/favicons/favicon-32x32.png",
          tags: ["design", "css"],
        },
        {
          id: `bm_vc_${subFolder2Id}`,
          url: "https://vercel.com",
          canonicalUrl: "https://vercel.com",
          title: "Vercel: Build and deploy the web",
          domain: "vercel.com",
          description: "Vercel provides developer tools and cloud infrastructure to build and deploy web apps.",
          iconUrl: "https://vercel.com/favicon.ico",
          tags: ["cloud", "deploy"],
        },
      ];

      const insertBm = sqlite.prepare(`
        INSERT OR REPLACE INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, domain, is_favorite, is_archived, status, visit_count, created_at, search_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'alive', 1, ?, ?)
      `);

      for (const b of devBookmarks) {
        insertBm.run(b.id, userId, subFolder1Id, b.url, b.canonicalUrl, b.title, b.description, b.iconUrl, b.domain, now, `${b.title} ${b.description} ${b.domain}`.toLowerCase());
        for (const tName of b.tags) {
          const existingTag = sqlite.prepare(`SELECT id FROM tags WHERE user_id = ? AND name = ?`).get(userId, tName) as { id: string } | undefined;
          const tagId = existingTag ? existingTag.id : `tag_${tName}_${prefix}`;
          if (!existingTag) {
            sqlite.prepare(`INSERT OR IGNORE INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, '#3b82f6', ?)`).run(tagId, userId, tName, now);
          }
          sqlite.prepare(`INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)`).run(b.id, tagId);
        }
      }

      for (const b of resBookmarks) {
        insertBm.run(b.id, userId, subFolder2Id, b.url, b.canonicalUrl, b.title, b.description, b.iconUrl, b.domain, now + 5, `${b.title} ${b.description} ${b.domain}`.toLowerCase());
        for (const tName of b.tags) {
          const existingTag = sqlite.prepare(`SELECT id FROM tags WHERE user_id = ? AND name = ?`).get(userId, tName) as { id: string } | undefined;
          const tagId = existingTag ? existingTag.id : `tag_${tName}_${prefix}`;
          if (!existingTag) {
            sqlite.prepare(`INSERT OR IGNORE INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, '#10b981', ?)`).run(tagId, userId, tName, now);
          }
          sqlite.prepare(`INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)`).run(b.id, tagId);
        }
      }

      // Also sync to Supabase cloud DB directly
      const client = SupabaseManager.getClient();
      if (client) {
        Promise.all([
          client.from("folders").upsert([
            { id: rootFolderId, user_id: userId, parent_id: null, name: "Folder", icon: "📁", color: "#3b82f6", position: 0, created_at: now, updated_at: now },
            { id: subFolder1Id, user_id: userId, parent_id: rootFolderId, name: "Development", icon: "💻", color: "#6366f1", position: 0, created_at: now + 1, updated_at: now + 1 },
            { id: subFolder2Id, user_id: userId, parent_id: rootFolderId, name: "Resources", icon: "🎨", color: "#10b981", position: 1, created_at: now + 2, updated_at: now + 2 },
          ]),
          client.from("bookmarks").upsert([
            ...devBookmarks.map(b => ({ id: b.id, user_id: userId, folder_id: subFolder1Id, url: b.url, canonical_url: b.canonicalUrl, title: b.title, description: b.description, icon_url: b.iconUrl, domain: b.domain, is_favorite: true, is_archived: false, status: "alive", visit_count: 1, created_at: now, search_text: `${b.title} ${b.description} ${b.domain}`.toLowerCase() })),
            ...resBookmarks.map(b => ({ id: b.id, user_id: userId, folder_id: subFolder2Id, url: b.url, canonical_url: b.canonicalUrl, title: b.title, description: b.description, icon_url: b.iconUrl, domain: b.domain, is_favorite: true, is_archived: false, status: "alive", visit_count: 1, created_at: now + 5, search_text: `${b.title} ${b.description} ${b.domain}`.toLowerCase() })),
          ]),
        ]).catch(() => {});
      }
    } catch (e) {
      console.warn("ensureUserStarterData notice:", e);
    }
  }

  /**
   * Ensure permanent customizable Unsorted system folder exists with unique ID
   */
  static ensureUnsortedFolder(userId: string): Folder {
    try {
      const unsortedId = `fld_unsorted_${userId}`;
      const now = Date.now();
      let row = sqlite.prepare(`
        SELECT * FROM folders WHERE id = ? OR (user_id = ? AND id = '__UNSORTED__')
      `).get(unsortedId, userId) as any;

      if (!row) {
        sqlite.prepare(`
          INSERT OR IGNORE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
          VALUES (?, ?, NULL, 'Inbox / Needs Organization', '📥', '#8b5cf6', -9999, ?, ?)
        `).run(unsortedId, userId, now, now);
        row = sqlite.prepare(`SELECT * FROM folders WHERE id = ?`).get(unsortedId) as any;
      }

      if (row) {
        return {
          id: row.id,
          userId: row.user_id,
          parentId: row.parent_id ?? null,
          name: row.name,
          icon: row.icon,
          color: row.color,
          position: row.position,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as Folder;
      }
    } catch (e) {
      console.warn("ensureUnsortedFolder notice:", e);
    }

    return {
      id: `fld_unsorted_${userId}`,
      userId,
      parentId: null,
      name: "Inbox / Needs Organization",
      icon: "📥",
      color: "#8b5cf6",
      position: -9999,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Folder;
  }

  /**
   * Get all folders for user, ordered by position
   */
  static getAllFolders(userId: string): Folder[] {
    this.ensureUnsortedFolder(userId);
    const rows = sqlite.prepare(`
      SELECT 
        id,
        user_id,
        parent_id,
        name,
        icon,
        color,
        position,
        created_at,
        updated_at
      FROM folders
      WHERE user_id = ?
        AND (parent_id IS NULL OR parent_id != '__TRASH__')
        AND name NOT LIKE '__TRASH__:%'
        AND id NOT IN (SELECT id FROM deleted_folders)
      ORDER BY position ASC, name ASC
    `).all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      parentId: r.parent_id !== undefined ? r.parent_id : null,
      name: r.name,
      icon: r.icon,
      color: r.color,
      position: r.position,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user_id: r.user_id,
      parent_id: r.parent_id !== undefined ? r.parent_id : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })) as Folder[];
  }

  /**
   * Get a single folder by ID ensuring ownership check
   */
  static getFolderById(id: string, userId: string): Folder | null {
    const r = sqlite.prepare(`
      SELECT * FROM folders 
      WHERE id = ? AND user_id = ?
        AND id NOT IN (SELECT id FROM deleted_folders)
    `).get(id, userId) as any;
    if (!r) return null;
    return {
      id: r.id,
      userId: r.user_id,
      parentId: r.parent_id !== undefined ? r.parent_id : null,
      name: r.name,
      icon: r.icon,
      color: r.color,
      position: r.position,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user_id: r.user_id,
      parent_id: r.parent_id !== undefined ? r.parent_id : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    } as Folder;
  }

  /**
   * Get all descendant folder IDs using Recursive CTE
   */
  static getDescendantFolderIds(folderId: string, userId: string): string[] {
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
  static getFolderPath(folderId: string | null, userId: string): string {
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
  static getFolderTree(userId: string): FolderTreeNode[] {
    const allFolders = this.getAllFolders(userId);

    // Get bookmark count per folder
    const countStmt = sqlite.prepare(`
      SELECT folder_id, COUNT(*) as count
      FROM bookmarks
      WHERE user_id = ? AND is_archived = 0 AND id NOT IN (SELECT id FROM deleted_bookmarks)
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
      const parentId = (f as any).parentId ?? (f as any).parent_id ?? null;
      nodeMap.set(f.id, {
        ...f,
        parentId,
        parent_id: parentId,
        children: [],
        bookmarkCount: countsMap.get(f.id) || 0,
        totalDescendantBookmarkCount: countsMap.get(f.id) || 0,
      } as FolderTreeNode);
    }

    const roots: FolderTreeNode[] = [];

    for (const node of nodeMap.values()) {
      // Exclude permanent Unsorted system folder from standard tree roots
      if (node.id === "__UNSORTED__" || node.id.startsWith("fld_unsorted_")) {
        continue;
      }
      const pid = (node as any).parentId ?? (node as any).parent_id ?? null;
      if (pid && nodeMap.has(pid)) {
        nodeMap.get(pid)!.children.push(node);
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
    userId: string;
  }): Folder {
    const userId = data.userId;
    if (!userId) throw new Error("userId is required");
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
    SupabaseManager.invalidateUserSyncCache(userId);
    return created;
  }

  /**
   * Update folder (name, icon, color, position, parentId) with user ownership check
   */
  static async updateFolder(
    id: string,
    userId: string,
    updates: Partial<{
      name: string;
      parentId: string | null;
      icon: string;
      color: string;
      position: number;
    }>
  ): Promise<Folder | null> {
    const existing = sqlite
      .prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`)
      .get(id, userId);
    if (!existing) return null;

    db.update(folders)
      .set({
        ...updates,
        updatedAt: Date.now(),
      })
      .where(and(eq(folders.id, id), eq(folders.userId, userId)))
      .run();

    const updated = db.select().from(folders).where(and(eq(folders.id, id), eq(folders.userId, userId))).get();
    if (updated) {
      try {
        await SupabaseManager.syncFolder(updated, "upsert");
        SupabaseManager.invalidateUserSyncCache(userId);
      } catch (syncErr) {
        console.warn("Supabase updateFolder sync notice:", syncErr);
      }
    }
    return updated || null;
  }

  /**
   * Deep copy a folder and all its descendant subfolders and bookmarks into targetParentId (or root if null)
   */
  static async copyFolder(
    folderId: string,
    targetParentId: string | null,
    userId: string,
    customName?: string
  ): Promise<Folder> {
    const sourceFolder = this.getFolderById(folderId, userId);
    if (!sourceFolder) {
      throw new Error("Source folder not found or unauthorized");
    }

    // If targetParentId provided, ensure target exists, belongs to user, and is NOT inside source's descendant tree
    if (targetParentId) {
      const targetFolder = this.getFolderById(targetParentId, userId);
      if (!targetFolder) {
        throw new Error("Target destination folder not found");
      }
      const descendantIds = this.getDescendantFolderIds(folderId, userId);
      if (targetParentId === folderId || descendantIds.includes(targetParentId)) {
        throw new Error("Cannot copy a folder inside itself or one of its subfolders");
      }
    }

    // Determine copy name
    let newName = customName?.trim();
    if (!newName) {
      if (sourceFolder.parentId === targetParentId) {
        newName = `${sourceFolder.name} (Copy)`;
      } else {
        newName = sourceFolder.name;
      }
    }

    // 1. Create root copy folder
    const copiedFolder = this.createFolder({
      name: newName,
      parentId: targetParentId,
      icon: sourceFolder.icon,
      color: sourceFolder.color,
      userId,
    });

    // Helper: copy all bookmarks directly in srcFolderId to destFolderId
    const copyDirectBookmarks = (srcFolderId: string, destFolderId: string) => {
      const rawBms = sqlite
        .prepare(`SELECT id FROM bookmarks WHERE folder_id = ? AND user_id = ? AND is_archived = 0`)
        .all(srcFolderId, userId) as { id: string }[];

      for (const row of rawBms) {
        const fullBm = this.getBookmarkById(row.id, userId);
        if (!fullBm) continue;
        this.createBookmark({
          userId,
          folderId: destFolderId,
          url: fullBm.url,
          title: fullBm.title,
          description: fullBm.description || undefined,
          iconUrl: fullBm.iconUrl || undefined,
          imageUrl: fullBm.imageUrl || undefined,
          domain: fullBm.domain,
          isFavorite: fullBm.isFavorite,
          status: fullBm.status,
          tagNames: fullBm.tags.map((t) => t.name),
        });
      }
    };

    // Helper: recursively copy subfolder hierarchy
    const copySubfoldersRecursive = (srcParentId: string, destParentId: string) => {
      const children = sqlite
        .prepare(`SELECT * FROM folders WHERE parent_id = ? AND user_id = ? ORDER BY position ASC, created_at ASC`)
        .all(srcParentId, userId) as Folder[];

      for (const child of children) {
        const childCopy = this.createFolder({
          name: child.name,
          parentId: destParentId,
          icon: child.icon,
          color: child.color,
          userId,
        });
        copyDirectBookmarks(child.id, childCopy.id);
        copySubfoldersRecursive(child.id, childCopy.id);
      }
    };

    // Copy direct bookmarks in root folder
    copyDirectBookmarks(sourceFolder.id, copiedFolder.id);

    // Recursively copy subfolder hierarchy
    copySubfoldersRecursive(sourceFolder.id, copiedFolder.id);

    SupabaseManager.invalidateUserSyncCache(userId);
    return copiedFolder;
  }

  /**
   * Copy a bookmark to a target folder
   */
  static copyBookmark(
    bookmarkId: string,
    targetFolderId: string | null,
    userId: string,
    customTitle?: string
  ): BookmarkWithDetails {
    const sourceBm = this.getBookmarkById(bookmarkId, userId);
    if (!sourceBm) {
      throw new Error("Bookmark not found or unauthorized");
    }

    if (targetFolderId) {
      const targetFolder = this.getFolderById(targetFolderId, userId);
      if (!targetFolder) {
        throw new Error("Target folder not found");
      }
    }

    const created = this.createBookmark({
      userId,
      folderId: targetFolderId,
      url: sourceBm.url,
      title: customTitle?.trim() || sourceBm.title,
      description: sourceBm.description || undefined,
      iconUrl: sourceBm.iconUrl || undefined,
      imageUrl: sourceBm.imageUrl || undefined,
      domain: sourceBm.domain,
      isFavorite: sourceBm.isFavorite,
      status: sourceBm.status,
      tagNames: sourceBm.tags.map((t) => t.name),
    });

    SupabaseManager.invalidateUserSyncCache(userId);
    return created;
  }

  /**
   * Bulk copy bookmarks to a target folder
   */
  static bulkCopyBookmarks(
    bookmarkIds: string[],
    targetFolderId: string | null,
    userId: string
  ): { copiedCount: number } {
    if (targetFolderId) {
      const targetFolder = this.getFolderById(targetFolderId, userId);
      if (!targetFolder) {
        throw new Error("Target folder not found");
      }
    }

    let copiedCount = 0;
    for (const id of bookmarkIds) {
      try {
        this.copyBookmark(id, targetFolderId, userId);
        copiedCount++;
      } catch (e) {
        console.warn(`Failed to copy bookmark ${id}:`, e);
      }
    }

    SupabaseManager.invalidateUserSyncCache(userId);
    return { copiedCount };
  }

  /**
   * Delete folder with user ownership check
   */
  static async deleteFolder(
    id: string,
    userId: string,
    mode: "move_up" | "delete_all" = "delete_all"
  ): Promise<boolean> {
    const targetFolder = sqlite.prepare(`SELECT * FROM folders WHERE id = ? AND user_id = ?`).get(id, userId) as any;
    if (!targetFolder) {
      return false;
    }

    const retentionDays = this.getRecycleBinRetentionDays(userId);

    // Get all descendant folders (including sub-subfolders)
    const descendantIds = this.getDescendantFolderIds(id, userId);
    const allFolderIdsToDelete = [id, ...descendantIds];
    const placeholders = allFolderIdsToDelete.map(() => "?").join(",");

    // 1. Fetch all bookmarks inside these folders before deleting them
    const bmsInside = sqlite.prepare(`
      SELECT * FROM bookmarks WHERE folder_id IN (${placeholders}) AND user_id = ?
    `).all(...allFolderIdsToDelete, userId) as any[];

    // 2. Fetch tags for bookmarks
    const bmTagsMap: Record<string, any[]> = {};
    for (const bm of bmsInside) {
      try {
        const tags = sqlite.prepare(`
          SELECT t.id, t.name, t.color FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = ? AND t.user_id = ?
        `).all(bm.id, userId);
        bmTagsMap[bm.id] = tags;
      } catch {}
    }

    // 3. Move each inside bookmark into Recycle Bin and record tombstones
    for (const bm of bmsInside) {
      sqlite.prepare(`
        INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
        VALUES (?, ?, 'bookmark', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `rb_bm_${bm.id}`,
        userId,
        bm.id,
        bm.title,
        bm.folder_id,
        bm.icon_url,
        null,
        JSON.stringify({ ...bm, tags: bmTagsMap[bm.id] || [] }),
        Date.now(),
        retentionDays
      );
    }

    // 4. Soft-delete all inside bookmarks in Supabase (status = 'trash')
    const client = SupabaseManager.getClient();
    if (client && bmsInside.length > 0) {
      try {
        const bmIds = bmsInside.map((b) => b.id);
        await client.from("bookmarks").update({ status: "trash" }).in("id", bmIds);
      } catch (err) {
        console.warn("Supabase batch soft-delete bookmarks error:", err);
      }
    }

    // 5. Delete the bookmarks from SQLite active table
    sqlite.prepare(`
      DELETE FROM bookmarks WHERE folder_id IN (${placeholders}) AND user_id = ?
    `).run(...allFolderIdsToDelete, userId);

    // 6. Save each folder to Recycle Bin (including snapshot of its contained bookmarks)
    for (const fId of allFolderIdsToDelete) {
      const f = sqlite.prepare(`SELECT * FROM folders WHERE id = ? AND user_id = ?`).get(fId, userId) as any;
      if (f) {
        const folderBookmarks = bmsInside.filter((b) => b.folder_id === f.id);
        sqlite.prepare(`
          INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
          VALUES (?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `rb_fld_${f.id}`,
          userId,
          f.id,
          f.name,
          f.parent_id,
          f.icon,
          f.color,
          JSON.stringify({ ...f, bookmarks: folderBookmarks }),
          Date.now(),
          retentionDays
        );

        // Soft-delete in Supabase so every lambda knows it is in trash
        if (client) {
          try {
            await client.from("folders").update({ parent_id: "__TRASH__", name: `__TRASH__:${f.name}` }).eq("id", f.id);
          } catch (sfErr) {
            console.warn("Supabase folder soft-delete notice:", sfErr);
          }
        }
      }
    }

    // 7. Delete folders from local SQLite active table
    sqlite.prepare(`
      DELETE FROM folders WHERE id IN (${placeholders}) AND user_id = ?
    `).run(...allFolderIdsToDelete, userId);

    SupabaseManager.invalidateUserSyncCache(userId);
    return true;
  }

  /**
   * Find duplicate bookmark by canonical URL
   */
  static findDuplicate(canonicalUrl: string, userId: string): (Bookmark & { folderName?: string }) | null {
    const item = db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.canonicalUrl, canonicalUrl))).get();
    if (!item) return null;

    let folderName = "Unsorted";
    if (item.folderId) {
      const folder = db.select().from(folders).where(and(eq(folders.id, item.folderId), eq(folders.userId, userId))).get();
      if (folder) folderName = folder.name;
    }

    return { ...item, folderName };
  }

  /**
   * Get filtered and enriched bookmarks
   */
  static getBookmarks(options: {
    userId: string;
    folderId?: string | null;
    includeSubfolders?: boolean;
    includeArchived?: boolean;
    view?: "all" | "favorites" | "recent" | "unsorted" | "archive" | "trash";
    domain?: string;
    status?: "alive" | "dead" | "pending";
    tag?: string;
    search?: string;
  }): BookmarkWithDetails[] {
    const userId = options.userId;
    if (!userId) throw new Error("userId is required");

    let query = `
      SELECT 
        b.id, b.user_id, b.folder_id, b.url, b.canonical_url, b.title, b.description,
        b.icon_url, b.image_url, b.domain, b.is_favorite, b.is_archived, b.status,
        b.visit_count, b.last_visited_at, b.last_clicked_at, b.created_at, b.search_text,
        f.name as folder_name
      FROM bookmarks b
      LEFT JOIN folders f ON b.folder_id = f.id
      WHERE b.user_id = ?
        AND (b.status IS NULL OR b.status != 'trash')
        AND b.id NOT IN (SELECT id FROM deleted_bookmarks)
    `;

    const params: (string | number)[] = [userId];

    // Filter by view type
    if (options.view === "favorites") {
      query += ` AND b.is_favorite = 1 AND b.is_archived = 0`;
    } else if (options.view === "recent") {
      query += ` AND b.is_archived = 0`;
    } else if (options.view === "unsorted") {
      query += ` AND (b.folder_id IS NULL OR b.folder_id = '' OR b.folder_id = '__UNSORTED__' OR b.folder_id LIKE 'fld_unsorted_%') AND b.is_archived = 0`;
    } else if (options.view === "archive") {
      query += ` AND b.is_archived = 1`;
    } else if (options.includeArchived) {
      // Include all bookmarks (both active and archived) for full workspace in-memory state
    } else {
      // Default: exclude archived unless in archive view or includeArchived requested
      query += ` AND b.is_archived = 0`;
    }

    // Folder filtering
    if (options.folderId !== undefined && options.folderId !== null && options.folderId !== "") {
      if (options.folderId === "__UNSORTED__" || options.folderId.startsWith("fld_unsorted_")) {
        query += ` AND (b.folder_id = ? OR b.folder_id = '__UNSORTED__' OR b.folder_id IS NULL OR b.folder_id = '')`;
        params.push(options.folderId);
      } else {
        const hasChildren = sqlite.prepare("SELECT 1 FROM folders WHERE parent_id = ? AND user_id = ?").get(options.folderId, userId);
        if (options.includeSubfolders || hasChildren) {
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
    canonicalUrl?: string;
    title: string;
    description?: string;
    iconUrl?: string;
    imageUrl?: string;
    domain: string;
    folderId?: string | null;
    isFavorite?: boolean;
    isArchived?: boolean;
    status?: "alive" | "dead" | "pending";
    tagNames?: string[];
    userId: string;
  }): BookmarkWithDetails {
    const userId = data.userId;
    if (!userId) throw new Error("userId is required");
    const id = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    let canonicalUrl = data.canonicalUrl;
    if (!canonicalUrl && data.url) {
      try {
        const u = new URL(data.url);
        canonicalUrl = `${u.origin}${u.pathname}`.replace(/\/$/, "");
      } catch {
        canonicalUrl = data.url;
      }
    }
    canonicalUrl = canonicalUrl || data.url;

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

    // Verify folderId exists and belongs to this user
    let validFolderId: string | null = null;
    if (data.folderId && typeof data.folderId === "string") {
      const cleanFid = data.folderId.trim();
      if (cleanFid !== "" && cleanFid !== "null" && cleanFid !== "undefined") {
        const found = sqlite.prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`).get(cleanFid, userId) as { id: string } | undefined;
        if (found) {
          validFolderId = found.id;
        }
      }
    }

    db.insert(bookmarks).values({
      id,
      userId,
      folderId: validFolderId,
      url: data.url,
      canonicalUrl,
      title: data.title,
      description: data.description || null,
      iconUrl: data.iconUrl || null,
      imageUrl: data.imageUrl || null,
      domain: data.domain,
      isFavorite: data.isFavorite ? true : false,
      isArchived: data.isArchived ? true : false,
      status: data.status || "alive",
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

    const created = this.getBookmarkById(id, userId);
    if (created) {
      SupabaseManager.syncBookmark(created, "upsert").catch(() => {});
      SupabaseManager.invalidateUserSyncCache(userId);
    }
    return created!;
  }

  /**
   * Attach tags helper
   */
  static attachTagsToBookmark(bookmarkId: string, tagNames: string[], userId: string) {
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
   * Update bookmark with user ownership check
   */
  static updateBookmark(
    id: string,
    userId: string,
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
    }>
  ): BookmarkWithDetails | null {
    const existing = sqlite.prepare(`SELECT id FROM bookmarks WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!existing) return null;

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

    if (bmUpdates.folderId !== undefined) {
      if (bmUpdates.folderId && typeof bmUpdates.folderId === "string") {
        const cleanFid = bmUpdates.folderId.trim();
        if (cleanFid !== "" && cleanFid !== "null" && cleanFid !== "undefined") {
          const found = sqlite.prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`).get(cleanFid, userId) as { id: string } | undefined;
          bmUpdates.folderId = found ? found.id : null;
        } else {
          bmUpdates.folderId = null;
        }
      } else {
        bmUpdates.folderId = null;
      }
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

    const updated = this.getBookmarkById(id, userId);
    if (updated) {
      const tagStr = (updated.tags || []).map((t) => t.name).join(" ");
      const combinedSearch = [updated.title, updated.url, updated.description || "", tagStr].join(" ").toLowerCase();
      try {
        sqlite.prepare(`UPDATE bookmarks SET search_text = ? WHERE id = ?`).run(combinedSearch, id);
      } catch {}
      SupabaseManager.syncBookmark(updated, "upsert").catch(() => {});
      SupabaseManager.invalidateUserSyncCache(userId);
    }
    return updated || null;
  }

  /**
   * Delete single bookmark and move to Recycle Bin with user ownership check
   */
  static async deleteBookmark(id: string, userId: string): Promise<boolean> {
    try {
      const b = sqlite.prepare(`SELECT * FROM bookmarks WHERE id = ? AND user_id = ?`).get(id, userId) as any;
      if (!b) return false;

      const retentionDays = this.getRecycleBinRetentionDays(userId);
      const client = SupabaseManager.getClient();

      // Fetch attached tags
      const tagRows = sqlite.prepare(`
        SELECT t.id, t.name, t.color
        FROM bookmark_tags bt
        JOIN tags t ON bt.tag_id = t.id
        WHERE bt.bookmark_id = ? AND t.user_id = ?
      `).all(id, userId);

      // 1. Move to Recycle Bin with full restore snapshot
      sqlite.prepare(`
        INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
        VALUES (?, ?, 'bookmark', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `rb_bm_${id}`,
        userId,
        id,
        b.title,
        b.folder_id,
        b.icon_url,
        null,
        JSON.stringify({ ...b, tags: tagRows }),
        Date.now(),
        retentionDays
      );

      // 2. Remove from active SQLite bookmarks
      sqlite.prepare(`DELETE FROM bookmarks WHERE id = ? AND user_id = ?`).run(id, userId);

      // 3. Soft-delete in Supabase by setting status = 'trash'
      if (client) {
        try {
          await client.from("bookmarks").update({ status: "trash" }).eq("id", id).eq("user_id", userId);
        } catch (sErr) {
          console.warn("Supabase soft-delete bookmark notice:", sErr);
        }
      }
      SupabaseManager.invalidateUserSyncCache(userId);
      return true;
    } catch (e) {
      console.error("deleteBookmark error:", e);
      return false;
    }
  }

  /**
   * Get retention setting in days (0 for permanent/never, 1, 7, 15, or 30 days - default 30)
   */
  static getRecycleBinRetentionDays(userId?: string): number {
    try {
      if (userId) {
        const userRow = sqlite
          .prepare(`SELECT value FROM app_settings WHERE key = ?`)
          .get(`recycle_bin_retention_days_${userId}`) as { value: string } | undefined;
        if (userRow?.value !== undefined) {
          const parsed = parseInt(userRow.value, 10);
          if ([0, 1, 7, 15, 30].includes(parsed)) return parsed;
        }
      }
      const row = sqlite
        .prepare(`SELECT value FROM app_settings WHERE key = 'recycle_bin_retention_days'`)
        .get() as { value: string } | undefined;
      if (row?.value !== undefined) {
        const parsed = parseInt(row.value, 10);
        if ([0, 1, 7, 15, 30].includes(parsed)) return parsed;
      }
    } catch {}
    return 30;
  }

  /**
   * Set retention setting in days (0 for permanent/never, 1, 7, 15, 30)
   */
  static setRecycleBinRetentionDays(days: number, userId?: string): void {
    const validDays = [0, 1, 7, 15, 30].includes(days) ? days : 30;
    try {
      sqlite
        .prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES ('recycle_bin_retention_days', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `)
        .run(String(validDays), Date.now());

      if (userId) {
        sqlite
          .prepare(`
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
          `)
          .run(`recycle_bin_retention_days_${userId}`, String(validDays), Date.now());

        sqlite.prepare(`UPDATE recycle_bin SET retention_days = ? WHERE user_id = ?`).run(validDays, userId);
      } else {
        sqlite.prepare(`UPDATE recycle_bin SET retention_days = ?`).run(validDays);
      }
    } catch (e) {
      console.warn("Failed to update recycle bin retention:", e);
    }
  }

  /**
   * Fetch all recycle bin items for a user, purging any expired items
   */
  static async getRecycleBinItems(userId: string): Promise<any[]> {
    try {
      // 1. Purge expired items automatically (if not set to permanent / 0 days)
      const retentionDays = this.getRecycleBinRetentionDays(userId);
      if (retentionDays > 0) {
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionMs;
        sqlite.prepare(`DELETE FROM recycle_bin WHERE user_id = ? AND deleted_at < ?`).run(userId, cutoff);
      }

      // 2. Multi-instance cloud reconciliation: always hydrate soft-deleted bookmarks & folders from Supabase
      if (userId) {
        try {
          const client = SupabaseManager.getClient();
          if (client) {
            const [trashBmsRes, trashFoldersRes] = await Promise.all([
              client.from("bookmarks").select("*").eq("user_id", userId).eq("status", "trash"),
              client.from("folders").select("*").eq("user_id", userId).or("parent_id.eq.__TRASH__,name.like.__TRASH__:%"),
            ]);

            if (trashBmsRes.data && trashBmsRes.data.length > 0) {
              for (const b of trashBmsRes.data) {
                sqlite.prepare(`
                  INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
                  VALUES (?, ?, 'bookmark', ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  `rb_bm_${b.id}`,
                  userId,
                  b.id,
                  b.title || "Untitled",
                  b.folder_id,
                  b.icon_url,
                  null,
                  JSON.stringify(b),
                  b.last_clicked_at || b.created_at || Date.now(),
                  retentionDays
                );
              }
            }

            if (trashFoldersRes.data && trashFoldersRes.data.length > 0) {
              for (const f of trashFoldersRes.data) {
                const cleanTitle = f.name.replace(/^__TRASH__:\s*/, "");
                sqlite.prepare(`
                  INSERT OR REPLACE INTO recycle_bin (id, user_id, item_type, item_id, title, original_folder_id, icon, color, item_data, deleted_at, retention_days)
                  VALUES (?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  `rb_fld_${f.id}`,
                  userId,
                  f.id,
                  cleanTitle,
                  null,
                  f.icon || "📁",
                  f.color || "gray",
                  JSON.stringify({ ...f, name: cleanTitle }),
                  f.updated_at || Date.now(),
                  retentionDays
                );
              }
            }
          }
        } catch (cloudErr) {
          console.warn("Recycle bin cloud hydration notice:", cloudErr);
        }
      }

      // 3. Query all recycle bin items for this user
      const rows = sqlite
        .prepare(`SELECT * FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC`)
        .all(userId) as any[];

      const now = Date.now();
      return rows.map((r) => {
        const effectiveDays = retentionDays;
        let expiresInDays = 9999;
        let expiresInHours = 99999;
        if (effectiveDays > 0) {
          const itemRetentionMs = effectiveDays * 24 * 60 * 60 * 1000;
          const expiresAt = r.deleted_at + itemRetentionMs;
          const remainingMs = Math.max(0, expiresAt - now);
          expiresInDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          expiresInHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
        }

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
          retentionDays: effectiveDays,
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
   * Restore an item from Recycle Bin with user ownership check
   */
  static async restoreRecycleBinItem(id: string, userId: string) {
    const item = sqlite.prepare(`SELECT * FROM recycle_bin WHERE (id = ? OR item_id = ?) AND user_id = ?`).get(id, id, userId) as any;
    if (!item) return { success: false, error: "Item not found in Recycle Bin" };

    const data = JSON.parse(item.item_data);
    const client = SupabaseManager.getClient();

    if (item.item_type === "folder") {
      // Check if parent still exists and belongs to this user
      let parentId = data.parentId || null;
      if (parentId) {
        const parentExists = sqlite.prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`).get(parentId, userId);
        if (!parentExists) parentId = null;
      }

      // Re-insert into folders
      sqlite.prepare(`
        INSERT OR REPLACE INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        userId,
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
              userId,
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
              "alive",
              b.visit_count || b.visitCount || 0,
              b.last_visited_at || b.lastVisitedAt || null,
              b.last_clicked_at || b.lastClickedAt || null,
              b.created_at || b.createdAt || Date.now(),
              b.search_text || b.searchText || null
            );
            sqlite.prepare(`DELETE FROM deleted_bookmarks WHERE id = ? AND user_id = ?`).run(b.id, userId);
            sqlite.prepare(`DELETE FROM recycle_bin WHERE item_id = ? AND item_type = 'bookmark' AND user_id = ?`).run(b.id, userId);
          } catch (bmRestoreErr) {
            console.warn("Restore folder child bookmark error:", bmRestoreErr);
          }
        }
      }

      // Remove from tombstones
      sqlite.prepare(`DELETE FROM deleted_folders WHERE id = ? AND user_id = ?`).run(data.id, userId);
      sqlite.prepare(`DELETE FROM recycle_bin WHERE id = ? AND user_id = ?`).run(id, userId);

      // Sync restore to Supabase
      if (client) {
        try {
          await client.from("folders").update({ name: data.name, parent_id: parentId }).eq("id", data.id).eq("user_id", userId);
          if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
            const bIds = data.bookmarks.map((b: any) => b.id);
            await client.from("bookmarks").update({ status: "alive" }).in("id", bIds).eq("user_id", userId);
          }
        } catch (sfErr) {
          console.warn("Supabase folder restore notice:", sfErr);
        }
      }

      const restored = this.getFolderById(data.id, userId);
      SupabaseManager.invalidateUserSyncCache(userId);
      return { success: true, item: restored, type: "folder" };
    } else {
      // Bookmark restore: check if original folder exists, otherwise restore to Unsorted (Inbox)
      let folderId = data.folderId || null;
      if (folderId) {
        const folderExists = sqlite.prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`).get(folderId, userId);
        if (!folderExists) folderId = null;
      }

      sqlite.prepare(`
        INSERT OR REPLACE INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, image_url, domain, is_favorite, is_archived, status, visit_count, last_visited_at, last_clicked_at, created_at, search_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        userId,
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
        "alive",
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
          `).run(t.id, userId, t.name, t.color || "#3b82f6", Date.now());

          sqlite.prepare(`
            INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
            VALUES (?, ?)
          `).run(data.id, t.id);
        }
      }

      // Remove from tombstones
      sqlite.prepare(`DELETE FROM deleted_bookmarks WHERE id = ? AND user_id = ?`).run(data.id, userId);
      sqlite.prepare(`DELETE FROM recycle_bin WHERE id = ? AND user_id = ?`).run(id, userId);

      if (client) {
        try {
          await client.from("bookmarks").update({ status: "alive", folder_id: folderId }).eq("id", data.id).eq("user_id", userId);
        } catch {}
      }

      const restored = this.getBookmarkById(data.id, userId);
      SupabaseManager.invalidateUserSyncCache(userId);
      return { success: true, item: restored, type: "bookmark" };
    }
  }

  /**
   * Permanently delete a single item from Recycle Bin with user ownership check
   */
  static async permanentlyDeleteRecycleBinItem(id: string, userId: string): Promise<boolean> {
    const item = sqlite.prepare(`SELECT * FROM recycle_bin WHERE (id = ? OR item_id = ?) AND user_id = ?`).get(id, id, userId) as any;
    if (!item) return false;

    const client = SupabaseManager.getClient();
    const isFolder = item.item_type === "folder";
    const rawId = item.item_id || id.replace(/^rb_(bm|fld)_/, "");

    if (isFolder) {
      sqlite.prepare(`INSERT OR REPLACE INTO deleted_folders (id, user_id, deleted_at) VALUES (?, ?, ?)`).run(rawId, userId, Date.now());
      sqlite.prepare(`DELETE FROM recycle_bin WHERE (original_folder_id = ? OR id = ? OR item_id = ?) AND user_id = ?`).run(rawId, id, rawId, userId);
      if (client) {
        try {
          await client.from("folders").delete().eq("id", rawId).eq("user_id", userId);
          await client.from("bookmarks").delete().eq("folder_id", rawId).eq("user_id", userId);
        } catch {}
      }
    } else {
      sqlite.prepare(`INSERT OR REPLACE INTO deleted_bookmarks (id, user_id, deleted_at) VALUES (?, ?, ?)`).run(rawId, userId, Date.now());
      sqlite.prepare(`DELETE FROM recycle_bin WHERE (id = ? OR item_id = ?) AND user_id = ?`).run(id, rawId, userId);
      if (client) {
        try {
          await client.from("bookmarks").delete().eq("id", rawId).eq("user_id", userId);
        } catch {}
      }
    }

    SupabaseManager.invalidateUserSyncCache(userId);
    return true;
  }

  /**
   * Empty entire recycle bin for a specific user
   */
  static async emptyRecycleBin(userId: string): Promise<void> {
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
        await client.from("bookmarks").delete().eq("user_id", userId).eq("status", "trash");
        await client.from("folders").delete().eq("user_id", userId).eq("parent_id", "__TRASH__");
        await client.from("folders").delete().eq("user_id", userId).like("name", "__TRASH__:%");
      } catch {}
    }

    sqlite.prepare(`DELETE FROM recycle_bin WHERE user_id = ?`).run(userId);
    SupabaseManager.invalidateUserSyncCache(userId);
  }

  /**
   * Bulk actions on bookmarks with user ownership check
   */
  static async bulkUpdate(
    ids: string[],
    updates: Partial<{
      folderId: string | null;
      isFavorite: boolean;
      isArchived: boolean;
      status: "alive" | "dead";
    }>,
    userId: string
  ): Promise<void> {
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

    params.push(...ids, userId);

    const query = `
      UPDATE bookmarks
      SET ${setClauses.join(", ")}
      WHERE id IN (${placeholders}) AND user_id = ?
    `;

    sqlite.prepare(query).run(...params);

    // Direct atomic batch update to Supabase
    const client = SupabaseManager.getClient();
    if (client) {
      try {
        const supaPayload: any = {};
        if (updates.folderId !== undefined) supaPayload.folder_id = updates.folderId;
        if (updates.isFavorite !== undefined) supaPayload.is_favorite = updates.isFavorite;
        if (updates.isArchived !== undefined) supaPayload.is_archived = updates.isArchived;
        if (updates.status !== undefined) supaPayload.status = updates.status;

        await client.from("bookmarks").update(supaPayload).in("id", ids).eq("user_id", userId);
      } catch (err) {
        console.warn("bulkUpdate Supabase error:", err);
      }
    }

    SupabaseManager.invalidateUserSyncCache(userId);
  }

  static async bulkDelete(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await this.deleteBookmark(id, userId);
    }
    SupabaseManager.invalidateUserSyncCache(userId);
  }

  /**
   * Analytics & Dashboard statistics
   */
  static getDashboardStats(userId: string, folderId?: string | null, includeSubfolders: boolean = false) {
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
      SELECT COUNT(*) as count FROM bookmarks b WHERE b.user_id = ? AND b.is_archived = 0 AND b.id NOT IN (SELECT id FROM deleted_bookmarks) ${folderFilter}
    `).get(...filterParams) as { count: number };

    // Total folders
    const totalFolders = db.select().from(folders).where(eq(folders.userId, userId)).all().length;

    // Added this week (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekParams = [userId, sevenDaysAgo, ...(folderIds.length > 0 ? folderIds : [])];
    const weekRow = sqlite.prepare(`
      SELECT COUNT(*) as count FROM bookmarks b
      WHERE b.user_id = ? AND b.created_at >= ? AND b.is_archived = 0 AND b.id NOT IN (SELECT id FROM deleted_bookmarks) ${folderFilter}
    `).get(...weekParams) as { count: number };

    // Dead links count
    const deadRow = sqlite.prepare(`
      SELECT COUNT(*) as count FROM bookmarks b
      WHERE b.user_id = ? AND b.status = 'dead' AND b.is_archived = 0 AND b.id NOT IN (SELECT id FROM deleted_bookmarks) ${folderFilter}
    `).get(...filterParams) as { count: number };

    // Top domains
    const topDomains = sqlite.prepare(`
      SELECT b.domain, COUNT(*) as count
      FROM bookmarks b
      WHERE b.user_id = ? AND b.is_archived = 0 AND b.id NOT IN (SELECT id FROM deleted_bookmarks) ${folderFilter}
      GROUP BY b.domain
      ORDER BY count DESC
      LIMIT 8
    `).all(...filterParams) as { domain: string; count: number }[];

    // Folder counts for Treemap / Sunburst
    const folderBreakdown = sqlite.prepare(`
      SELECT f.id, f.name, f.parent_id, COUNT(b.id) as count
      FROM folders f
      LEFT JOIN bookmarks b ON f.id = b.folder_id AND b.is_archived = 0 AND b.id NOT IN (SELECT id FROM deleted_bookmarks)
      WHERE f.user_id = ?
      GROUP BY f.id
    `).all(userId) as { id: string; name: string; parent_id: string | null; count: number }[];

    // Activity timeline (past 30 days)
    const timeline = sqlite.prepare(`
      SELECT strftime('%Y-%m-%d', datetime(b.created_at / 1000, 'unixepoch')) as date, COUNT(*) as count
      FROM bookmarks b
      WHERE b.user_id = ? AND b.is_archived = 0 AND b.id NOT IN (SELECT id FROM deleted_bookmarks) ${folderFilter}
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
  static getDomainStats(domain: string, userId: string) {
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
   * Get a single bookmark with tags by its ID ensuring user ownership
   */
  static getBookmarkById(bookmarkId: string, userId: string): BookmarkWithDetails | undefined {
    const r = sqlite.prepare(`
      SELECT 
        b.id, b.user_id, b.folder_id, b.url, b.canonical_url, b.title, b.description,
        b.icon_url, b.image_url, b.domain, b.is_favorite, b.is_archived, b.status,
        b.visit_count, b.last_visited_at, b.last_clicked_at, b.created_at, b.search_text,
        f.name as folder_name
      FROM bookmarks b
      LEFT JOIN folders f ON b.folder_id = f.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(bookmarkId, userId) as any;

    if (!r) return undefined;

    const tagRows = sqlite.prepare(`
      SELECT t.id, t.user_id, t.name, t.color, t.created_at
      FROM bookmark_tags bt
      JOIN tags t ON bt.tag_id = t.id
      WHERE bt.bookmark_id = ? AND t.user_id = ?
    `).all(bookmarkId, userId) as any[];

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
   * Record a bookmark visit (increments visitCount, sets lastVisitedAt and lastClickedAt) with user ownership check
   */
  static async recordVisit(bookmarkId: string, userId: string): Promise<boolean> {
    const existing = sqlite.prepare(`SELECT id, visit_count FROM bookmarks WHERE id = ? AND user_id = ?`).get(bookmarkId, userId) as any;
    if (!existing) return false;

    const now = Date.now();
    const info = sqlite
      .prepare(`UPDATE bookmarks SET visit_count = COALESCE(visit_count, 0) + 1, last_visited_at = ?, last_clicked_at = ? WHERE id = ? AND user_id = ?`)
      .run(now, now, bookmarkId, userId);

    const currentCount = (existing.visit_count || 0) + 1;

    const client = SupabaseManager.getClient();
    if (client) {
      try {
        await client
          .from("bookmarks")
          .update({
            visit_count: currentCount,
            last_visited_at: now,
            last_clicked_at: now,
          })
          .eq("id", bookmarkId)
          .eq("user_id", userId);
      } catch (err) {
        console.warn("recordVisit Supabase update notice:", err);
      }
    }

    SupabaseManager.invalidateUserSyncCache(userId);
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
    userId: string;
  }) {
    const userId = options.userId;
    const depth = options.depth || 1;

    const flatFolders = this.getAllFolders(userId);
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
  static getTags(userId: string): Tag[] {
    return db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name)).all();
  }

  /**
   * Feedback System
   */
  static createFeedback(data: {
    userId: string;
    userEmail?: string | null;
    userName?: string | null;
    userAvatar?: string | null;
    title: string;
    message: string;
    category?: string;
  }): FeedbackWithReplies {
    const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const category = data.category || "feedback";
    const status = "received";

    sqlite.prepare(`
      INSERT INTO feedbacks (id, user_id, user_email, user_name, user_avatar, title, message, category, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.userEmail || null,
      data.userName || null,
      data.userAvatar || null,
      data.title.trim(),
      data.message.trim(),
      category,
      status,
      now,
      now
    );

    // Sync to Supabase in background
    try {
      const client = SupabaseManager.getClient();
      if (client) {
        client.from("feedbacks").insert({
          id,
          user_id: data.userId,
          user_email: data.userEmail || null,
          user_name: data.userName || null,
          user_avatar: data.userAvatar || null,
          title: data.title.trim(),
          message: data.message.trim(),
          category,
          status,
          created_at: now,
          updated_at: now,
        }).then(() => {});
      }
    } catch {}

    return {
      id,
      userId: data.userId,
      userEmail: data.userEmail || null,
      userName: data.userName || null,
      userAvatar: data.userAvatar || null,
      title: data.title.trim(),
      message: data.message.trim(),
      category,
      status,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };
  }

  static getFeedbacks(userId?: string): FeedbackWithReplies[] {
    let rows: any[] = [];
    if (userId) {
      rows = sqlite.prepare(`SELECT * FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as any[];
    } else {
      rows = sqlite.prepare(`SELECT * FROM feedbacks ORDER BY created_at DESC`).all() as any[];
    }

    const feedbackIds = rows.map((r) => r.id);
    const replyMap = new Map<string, FeedbackReply[]>();

    if (feedbackIds.length > 0) {
      const placeholders = feedbackIds.map(() => "?").join(",");
      const replyRows = sqlite.prepare(`
        SELECT * FROM feedback_replies WHERE feedback_id IN (${placeholders}) ORDER BY created_at ASC
      `).all(...feedbackIds) as any[];

      for (const r of replyRows) {
        if (!replyMap.has(r.feedback_id)) {
          replyMap.set(r.feedback_id, []);
        }
        replyMap.get(r.feedback_id)!.push({
          id: r.id,
          feedbackId: r.feedback_id,
          userId: r.user_id,
          userEmail: r.user_email,
          userName: r.user_name,
          userAvatar: r.user_avatar,
          isAdmin: Boolean(r.is_admin),
          message: r.message,
          createdAt: r.created_at,
        });
      }
    }

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      userName: r.user_name,
      userAvatar: r.user_avatar,
      title: r.title,
      message: r.message,
      category: r.category,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      replies: replyMap.get(r.id) || [],
    }));
  }

  static addFeedbackReply(data: {
    feedbackId: string;
    userId: string;
    userEmail?: string | null;
    userName?: string | null;
    userAvatar?: string | null;
    isAdmin: boolean;
    message: string;
  }): FeedbackReply | null {
    const feedback = sqlite.prepare(`SELECT id FROM feedbacks WHERE id = ?`).get(data.feedbackId);
    if (!feedback) return null;

    const id = `fbr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    sqlite.prepare(`
      INSERT INTO feedback_replies (id, feedback_id, user_id, user_email, user_name, user_avatar, is_admin, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.feedbackId,
      data.userId,
      data.userEmail || null,
      data.userName || null,
      data.userAvatar || null,
      data.isAdmin ? 1 : 0,
      data.message.trim(),
      now
    );

    sqlite.prepare(`UPDATE feedbacks SET updated_at = ? WHERE id = ?`).run(now, data.feedbackId);

    try {
      const client = SupabaseManager.getClient();
      if (client) {
        client.from("feedback_replies").insert({
          id,
          feedback_id: data.feedbackId,
          user_id: data.userId,
          user_email: data.userEmail || null,
          user_name: data.userName || null,
          user_avatar: data.userAvatar || null,
          is_admin: data.isAdmin,
          message: data.message.trim(),
          created_at: now,
        }).then(() => {});
        client.from("feedbacks").update({ updated_at: now }).eq("id", data.feedbackId).then(() => {});
      }
    } catch {}

    return {
      id,
      feedbackId: data.feedbackId,
      userId: data.userId,
      userEmail: data.userEmail || null,
      userName: data.userName || null,
      userAvatar: data.userAvatar || null,
      isAdmin: data.isAdmin,
      message: data.message.trim(),
      createdAt: now,
    };
  }

  static updateFeedbackStatus(feedbackId: string, status: string): boolean {
    const validStatuses = ["received", "under_review", "processing", "fixed", "planned", "closed"];
    if (!validStatuses.includes(status)) return false;

    const now = Date.now();
    const res = sqlite.prepare(`UPDATE feedbacks SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, feedbackId);
    if (res.changes > 0) {
      try {
        const client = SupabaseManager.getClient();
        if (client) {
          client.from("feedbacks").update({ status, updated_at: now }).eq("id", feedbackId).then(() => {});
        }
      } catch {}
      return true;
    }
    return false;
  }

  static deleteFeedback(feedbackId: string): boolean {
    try {
      sqlite.prepare(`DELETE FROM feedback_replies WHERE feedback_id = ?`).run(feedbackId);
      const res = sqlite.prepare(`DELETE FROM feedbacks WHERE id = ?`).run(feedbackId);

      try {
        const client = SupabaseManager.getClient();
        if (client) {
          client.from("feedback_replies").delete().eq("feedback_id", feedbackId).then(() => {});
          client.from("feedbacks").delete().eq("id", feedbackId).then(() => {});
        }
      } catch {}

      return res.changes > 0;
    } catch (e) {
      console.error("deleteFeedback error:", e);
      return false;
    }
  }
}

export const FolderRepository = BookmarkRepository;
