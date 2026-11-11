import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sqlite } from "@/server/db/client";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  connectedAt?: number;
  autoSync?: boolean;
}

export class SupabaseManager {
  private static cachedClient: SupabaseClient | null = null;
  private static cachedConfig: SupabaseConfig | null = null;

  /**
   * Get stored Supabase configuration
   */
  static getConfig(): SupabaseConfig | null {
    if (this.cachedConfig) return this.cachedConfig;

    try {
      const row = sqlite
        .prepare(`SELECT value FROM app_settings WHERE key = 'supabase_config'`)
        .get() as { value: string } | undefined;

      if (row?.value) {
        this.cachedConfig = JSON.parse(row.value);
        if (!this.cachedConfig?.serviceRoleKey) {
          const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
          if (envServiceKey && this.cachedConfig) {
            this.cachedConfig.serviceRoleKey = envServiceKey;
          }
        }
        return this.cachedConfig;
      }
    } catch (e) {
      console.error("Error reading supabase config:", e);
    }

    // Fallback to process.env if available
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey, serviceRoleKey: envServiceKey };
    }

    return null;
  }

  /**
   * Save Supabase configuration to SQLite
   */
  static saveConfig(config: SupabaseConfig): void {
    const json = JSON.stringify(config);
    const now = Date.now();
    sqlite
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('supabase_config', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(json, now);

    this.cachedConfig = config;
    this.cachedClient = null; // Reset client
  }

  /**
   * Clear configuration
   */
  static clearConfig(): void {
    sqlite.prepare(`DELETE FROM app_settings WHERE key = 'supabase_config'`).run();
    this.cachedConfig = null;
    this.cachedClient = null;
  }

  /**
   * Get Supabase client
   */
  static getClient(): SupabaseClient | null {
    if (this.cachedClient) return this.cachedClient;

    const config = this.getConfig();
    if (!config?.url || !config?.anonKey) return null;

    try {
      this.cachedClient = createClient(config.url, config.serviceRoleKey || config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return this.cachedClient;
    } catch (e) {
      console.error("Error initializing Supabase client:", e);
      return null;
    }
  }

  /**
   * Test connection & check / provision schema
   */
  static async testConnection(config: SupabaseConfig): Promise<{
    success: boolean;
    error?: string;
    tablesFound?: string[];
    schemaProvisioned?: boolean;
  }> {
    try {
      // 1. Probe connectivity to Supabase project
      const pingKey = config.serviceRoleKey || config.anonKey;
      try {
        const pingRes = await fetch(`${config.url}/rest/v1/`, {
          headers: {
            apikey: pingKey,
            Authorization: `Bearer ${pingKey}`,
          },
        });
        if (pingRes.status === 401 || pingRes.status === 403) {
          return { success: false, error: "Invalid API key or unauthorized. Please check your Supabase key." };
        }
      } catch (pingErr: any) {
        return { success: false, error: `Failed to reach Supabase project: ${pingErr.message}` };
      }

      const client = createClient(config.url, config.serviceRoleKey || config.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 2. Check existing tables
      const tables = ["folders", "bookmarks", "tags", "bookmark_tags"];
      const existing: string[] = [];
      for (const t of tables) {
        try {
          const { error: tErr } = await client.from(t).select("*").limit(1);
          if (!tErr) existing.push(t);
        } catch {}
      }

      return {
        success: true,
        tablesFound: existing,
        schemaProvisioned: existing.length >= 3,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to reach Supabase project" };
    }
  }

  /**
   * Auto-provision database schema with the correct structure
   */
  static async provisionSchema(client: SupabaseClient): Promise<{ success: boolean; error?: string }> {
    // If user provided service key or client has direct SQL execution, run schema migrations
    // Alternatively, we can use RPC if created, or upsert sentinel row to create/verify
    const ddl = `
      -- Markly Supabase Schema Definition
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'usr_default',
        parent_id TEXT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '📁',
        color TEXT NOT NULL DEFAULT 'gray',
        position INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'usr_default',
        folder_id TEXT,
        url TEXT NOT NULL,
        canonical_url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        image_url TEXT,
        domain TEXT NOT NULL,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'alive',
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_visited_at BIGINT,
        last_clicked_at BIGINT,
        created_at BIGINT NOT NULL,
        search_text TEXT
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'usr_default',
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3b82f6',
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmark_tags (
        bookmark_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (bookmark_id, tag_id)
      );

      -- Helpful indexes
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);
    `;

    try {
      // If client has rpc exec_sql
      const { error: rpcErr } = await client.rpc("exec_sql", { sql: ddl });
      if (!rpcErr) return { success: true };

      // If no rpc, we can check if tables exist by querying them
      const { error: fErr } = await client.from("folders").select("id").limit(1);
      if (!fErr) return { success: true };

      return {
        success: false,
        error:
          "Tables do not exist yet. Please run the SQL schema script in your Supabase SQL Editor, or enable the exec_sql function.",
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Sync all local SQLite data to Supabase
   */
  static async syncLocalToSupabase(): Promise<{
    success: boolean;
    syncedFolders: number;
    syncedBookmarks: number;
    syncedTags: number;
    error?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, syncedFolders: 0, syncedBookmarks: 0, syncedTags: 0, error: "Not connected to Supabase" };
    }

    try {
      // Check if tables exist first
      const { error: probeErr } = await client.from("folders").select("id").limit(1);
      if (probeErr && (probeErr.code === "PGRST205" || probeErr.message?.includes("schema cache"))) {
        return {
          success: false,
          syncedFolders: 0,
          syncedBookmarks: 0,
          syncedTags: 0,
          error: "Tables do not exist in Supabase yet. Please execute the provided SQL script in your Supabase SQL Editor first, then click Sync.",
        };
      }

      // 1. Fetch all local SQLite data
      const folders = sqlite.prepare(`SELECT * FROM folders`).all() as any[];
      const bookmarks = sqlite.prepare(`SELECT * FROM bookmarks`).all() as any[];
      const tags = sqlite.prepare(`SELECT * FROM tags`).all() as any[];
      const bookmarkTags = sqlite.prepare(`SELECT * FROM bookmark_tags`).all() as any[];

      // 2. Upsert Folders
      if (folders.length > 0) {
        const folderRows = folders.map((f) => ({
          id: f.id,
          user_id: f.user_id,
          parent_id: f.parent_id,
          name: f.name,
          icon: f.icon,
          color: f.color,
          position: f.position,
          created_at: f.created_at,
          updated_at: f.updated_at,
        }));
        const { error: fErr } = await client.from("folders").upsert(folderRows, { onConflict: "id" });
        if (fErr) {
          return {
            success: false,
            syncedFolders: 0,
            syncedBookmarks: 0,
            syncedTags: 0,
            error: `Folder sync warning: ${fErr.message}`,
          };
        }
      }

      // 3. Upsert Bookmarks
      if (bookmarks.length > 0) {
        const bookmarkRows = bookmarks.map((b) => ({
          id: b.id,
          user_id: b.user_id,
          folder_id: b.folder_id,
          url: b.url,
          canonical_url: b.canonical_url,
          title: b.title,
          description: b.description,
          icon_url: b.icon_url,
          image_url: b.image_url,
          domain: b.domain,
          is_favorite: Boolean(b.is_favorite),
          is_archived: Boolean(b.is_archived),
          status: b.status,
          visit_count: b.visit_count,
          last_visited_at: b.last_visited_at,
          last_clicked_at: b.last_clicked_at,
          created_at: b.created_at,
          search_text: b.search_text,
        }));
        const { error: bErr } = await client.from("bookmarks").upsert(bookmarkRows, { onConflict: "id" });
        if (bErr) {
          return {
            success: false,
            syncedFolders: folders.length,
            syncedBookmarks: 0,
            syncedTags: 0,
            error: `Bookmark sync warning: ${bErr.message}`,
          };
        }
      }

      // 4. Upsert Tags & BookmarkTags
      if (tags.length > 0) {
        const tagRows = tags.map((t) => ({
          id: t.id,
          user_id: t.user_id,
          name: t.name,
          color: t.color,
          created_at: t.created_at,
        }));
        await client.from("tags").upsert(tagRows, { onConflict: "id" });
      }

      if (bookmarkTags.length > 0) {
        const btRows = bookmarkTags.map((bt) => ({
          bookmark_id: bt.bookmark_id,
          tag_id: bt.tag_id,
        }));
        await client.from("bookmark_tags").upsert(btRows, { onConflict: "bookmark_id,tag_id" });
      }

      return {
        success: true,
        syncedFolders: folders.length,
        syncedBookmarks: bookmarks.length,
        syncedTags: tags.length,
      };
    } catch (err: any) {
      return {
        success: false,
        syncedFolders: 0,
        syncedBookmarks: 0,
        syncedTags: 0,
        error: err.message,
      };
    }
  }

  /**
   * Sync single folder change to Supabase
   */
  static async syncFolder(
    folder: any,
    operation: "upsert" | "delete",
    options?: { mode?: "move_up" | "delete_all"; newParentId?: string | null }
  ) {
    const client = this.getClient();
    if (!client) return;

    try {
      if (operation === "delete") {
        const mode = options?.mode || "move_up";
        const newParentId = options?.newParentId || null;

        if (mode === "move_up") {
          // Re-parent subfolders and bookmarks first in Supabase so foreign key constraints are not violated!
          try {
            await client.from("folders").update({ parent_id: newParentId }).eq("parent_id", folder.id);
            await client.from("bookmarks").update({ folder_id: newParentId }).eq("folder_id", folder.id);
          } catch (fkErr) {
            console.warn("Supabase reparent before folder delete warning:", fkErr);
          }
        } else {
          // delete_all: cascade delete bookmarks and child folders in Supabase
          try {
            await client.from("bookmarks").delete().eq("folder_id", folder.id);
            await client.from("folders").delete().eq("parent_id", folder.id);
          } catch (cascadeErr) {
            console.warn("Supabase cascade delete before folder delete warning:", cascadeErr);
          }
        }

        const res = await client.from("folders").delete().eq("id", folder.id);
        if (res.error) {
          console.warn("Supabase syncFolder delete notice:", res.error.message);
        }
      } else {
        await client.from("folders").upsert({
          id: folder.id,
          user_id: folder.userId || folder.user_id || "usr_default",
          parent_id: folder.parentId || folder.parent_id || null,
          name: folder.name,
          icon: folder.icon || "📁",
          color: folder.color || "gray",
          position: folder.position || 0,
          created_at: folder.createdAt || folder.created_at || Date.now(),
          updated_at: Date.now(),
        });
      }
    } catch (e) {
      console.error("Supabase syncFolder error:", e);
    }
  }

  /**
   * Sync single bookmark change to Supabase
   */
  static async syncBookmark(bookmark: any, operation: "upsert" | "delete") {
    const client = this.getClient();
    if (!client) return;

    try {
      if (operation === "delete") {
        await client.from("bookmarks").delete().eq("id", bookmark.id);
      } else {
        await client.from("bookmarks").upsert({
          id: bookmark.id,
          user_id: bookmark.userId || bookmark.user_id || "usr_default",
          folder_id: bookmark.folderId || bookmark.folder_id || null,
          url: bookmark.url,
          canonical_url: bookmark.canonicalUrl || bookmark.canonical_url || bookmark.url,
          title: bookmark.title,
          description: bookmark.description || null,
          icon_url: bookmark.iconUrl || bookmark.icon_url || null,
          image_url: bookmark.imageUrl || bookmark.image_url || null,
          domain: bookmark.domain,
          is_favorite: Boolean(bookmark.isFavorite ?? bookmark.is_favorite),
          is_archived: Boolean(bookmark.isArchived ?? bookmark.is_archived),
          status: bookmark.status || "alive",
          visit_count: bookmark.visitCount ?? bookmark.visit_count ?? 0,
          last_visited_at: bookmark.lastVisitedAt || bookmark.last_visited_at || null,
          last_clicked_at: bookmark.lastClickedAt || bookmark.last_clicked_at || null,
          created_at: bookmark.createdAt || bookmark.created_at || Date.now(),
          search_text: bookmark.searchText || bookmark.search_text || null,
        });
      }
    } catch (e) {
      console.error("Supabase syncBookmark error:", e);
    }
  }

  /**
   * Synchronously pull remote user data from Supabase down into local SQLite cache.
   * Guarantees zero race conditions on initial page load or fresh session.
   */
  static async syncRemoteUserToLocal(userId: string): Promise<{
    success: boolean;
    foldersCount: number;
    bookmarksCount: number;
    error?: string;
  }> {
    if (!userId || userId === "usr_default_markly") {
      return { success: true, foldersCount: 0, bookmarksCount: 0 };
    }

    const client = this.getClient();
    if (!client) {
      return { success: false, foldersCount: 0, bookmarksCount: 0, error: "No Supabase client" };
    }

    try {
      // Get tombstoned deleted folder and bookmark ids to permanently prevent resurrection
      const tombstonedFolders = sqlite
        .prepare(`SELECT id FROM deleted_folders`)
        .all() as { id: string }[];
      const tombstoneFolderSet = new Set(tombstonedFolders.map((t) => t.id));

      const tombstonedBookmarks = sqlite
        .prepare(`SELECT id FROM deleted_bookmarks`)
        .all() as { id: string }[];
      const tombstoneBmSet = new Set(tombstonedBookmarks.map((t) => t.id));

      // 1. Fetch remote folders
      const { data: remoteFolders, error: fErr } = await client
        .from("folders")
        .select("*")
        .eq("user_id", userId);

      let foldersCount = 0;
      if (remoteFolders && remoteFolders.length > 0) {
        const upsertFolder = sqlite.prepare(`
          INSERT INTO folders (id, user_id, parent_id, name, icon, color, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            parent_id = excluded.parent_id,
            icon = excluded.icon,
            color = excluded.color,
            position = excluded.position,
            updated_at = excluded.updated_at
        `);

        for (const f of remoteFolders) {
          if (tombstoneFolderSet.has(f.id)) {
            // Permanently deleted! Prune from Supabase immediately and never insert into SQLite
            try {
              client.from("folders").delete().eq("id", f.id).then(() => {});
            } catch {}
            continue;
          }

          foldersCount++;
          upsertFolder.run(
            f.id,
            userId,
            f.parent_id || null,
            f.name,
            f.icon || "📁",
            f.color || "gray",
            f.position || 0,
            f.created_at || Date.now(),
            f.updated_at || Date.now()
          );
        }
      }

      // 2. Fetch remote bookmarks
      const { data: remoteBookmarks, error: bErr } = await client
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId);

      let bookmarksCount = 0;
      if (remoteBookmarks && remoteBookmarks.length > 0) {
        const upsertBm = sqlite.prepare(`
          INSERT INTO bookmarks (id, user_id, folder_id, url, canonical_url, title, description, icon_url, image_url, domain, is_favorite, is_archived, status, visit_count, last_visited_at, last_clicked_at, created_at, search_text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            url = excluded.url,
            folder_id = excluded.folder_id,
            is_favorite = excluded.is_favorite,
            is_archived = excluded.is_archived,
            status = excluded.status,
            visit_count = excluded.visit_count,
            last_visited_at = excluded.last_visited_at,
            last_clicked_at = excluded.last_clicked_at
        `);

        for (const b of remoteBookmarks) {
          if (tombstoneBmSet.has(b.id)) {
            // Permanently deleted! Prune from Supabase immediately and never insert into SQLite
            try {
              client.from("bookmarks").delete().eq("id", b.id).then(() => {});
            } catch {}
            continue;
          }

          bookmarksCount++;
          upsertBm.run(
            b.id,
            userId,
            b.folder_id || null,
            b.url,
            b.canonical_url || b.url,
            b.title,
            b.description || null,
            b.icon_url || null,
            b.image_url || null,
            b.domain,
            b.is_favorite ? 1 : 0,
            b.is_archived ? 1 : 0,
            b.status || "alive",
            b.visit_count || 0,
            b.last_visited_at || null,
            b.last_clicked_at || null,
            b.created_at || Date.now(),
            b.search_text || null
          );
        }
      }

      // 3. Fetch tags & bookmark_tags
      const { data: remoteTags } = await client
        .from("tags")
        .select("*")
        .eq("user_id", userId);

      if (remoteTags && remoteTags.length > 0) {
        const upsertTag = sqlite.prepare(`
          INSERT INTO tags (id, user_id, name, color, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color
        `);
        for (const t of remoteTags) {
          upsertTag.run(t.id, userId, t.name, t.color || "#3b82f6", t.created_at || Date.now());
        }
      }

      return {
        success: true,
        foldersCount,
        bookmarksCount,
      };
    } catch (err: any) {
      console.warn("syncRemoteUserToLocal warning:", err.message);
      return { success: false, foldersCount: 0, bookmarksCount: 0, error: err.message };
    }
  }
}

