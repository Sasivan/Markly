import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

// Ensure data folder exists
const dbPath = process.env.DATABASE_SQLITE_PATH || path.join(process.cwd(), "data", "markly.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Single database connection instance
let sqlite: Database.Database;

try {
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
} catch (error) {
  console.warn("Failed to open SQLite database at:", dbPath, error);
  sqlite = new Database(":memory:");
}

// Initialize tables if they don't exist
export function initDbSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      avatar_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📁',
      color TEXT NOT NULL DEFAULT 'gray',
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS folders_user_parent_idx ON folders(user_id, parent_id);
    CREATE INDEX IF NOT EXISTS folders_user_pos_idx ON folders(user_id, position);

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      folder_id TEXT,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      image_url TEXT,
      domain TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'alive',
      visit_count INTEGER NOT NULL DEFAULT 0,
      last_visited_at INTEGER,
      created_at INTEGER NOT NULL,
      search_text TEXT,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS bookmarks_user_folder_idx ON bookmarks(user_id, folder_id);
    CREATE INDEX IF NOT EXISTS bookmarks_domain_idx ON bookmarks(domain);
    CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_canonical_idx ON bookmarks(user_id, canonical_url);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_idx ON tags(user_id, name);

    CREATE TABLE IF NOT EXISTS bookmark_tags (
      bookmark_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (bookmark_id, tag_id),
      FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS bookmark_tags_tag_idx ON bookmark_tags(tag_id);
  `);
}

// Run schema initialization
initDbSchema();

export const db = drizzle(sqlite, { schema });
export { sqlite };

