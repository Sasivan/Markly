import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Detect serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let dbPath: string;
if (process.env.DATABASE_SQLITE_PATH) {
  dbPath = process.env.DATABASE_SQLITE_PATH;
} else if (isServerless) {
  // In Vercel / serverless lambda, ONLY /tmp is writable
  dbPath = path.join(os.tmpdir(), "markly.db");
} else {
  dbPath = path.join(process.cwd(), "data", "markly.db");
}

const dbDir = path.dirname(dbPath);

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch {
  // If filesystem is read-only, switch to os.tmpdir
  dbPath = path.join(os.tmpdir(), "markly.db");
}

// Single database connection instance with safe in-memory fallback
let sqlite: Database.Database;

try {
  sqlite = new Database(dbPath);
  try {
    sqlite.pragma("journal_mode = WAL");
  } catch {}
  try {
    sqlite.pragma("foreign_keys = ON");
  } catch {}
} catch (error) {
  console.warn("Failed to open SQLite database at:", dbPath, "falling back to in-memory:", error);
  try {
    sqlite = new Database(":memory:");
  } catch (memErr) {
    console.error("Critical: SQLite memory fallback failed:", memErr);
    sqlite = {} as any;
  }
}

// Initialize tables if they don't exist
export function initDbSchema() {
  try {
    if (!sqlite || typeof sqlite.exec !== "function") return;

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
        last_clicked_at INTEGER,
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

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deleted_folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        deleted_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deleted_bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        deleted_at INTEGER NOT NULL
      );
    `);
  } catch (schemaErr) {
    console.warn("Schema initialization warning:", schemaErr);
  }
}

// Run schema initialization safely
initDbSchema();

export const db = drizzle(sqlite, { schema });
export { sqlite };
