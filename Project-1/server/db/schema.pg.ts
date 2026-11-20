import { pgTable, text, timestamp, boolean, integer, uuid, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const pgUsers = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pgFolders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("📁"),
    color: text("color").notNull().default("gray"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pg_folders_user_parent_idx").on(table.userId, table.parentId),
    index("pg_folders_user_pos_idx").on(table.userId, table.position),
  ]
);

export const pgBookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    folderId: uuid("folder_id"),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    imageUrl: text("image_url"),
    domain: text("domain").notNull(),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    status: text("status").notNull().default("alive"),
    visitCount: integer("visit_count").notNull().default(0),
    lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    searchVector: text("search_vector"),
  },
  (table) => [
    index("pg_bookmarks_user_folder_idx").on(table.userId, table.folderId),
    index("pg_bookmarks_domain_idx").on(table.domain),
    uniqueIndex("pg_bookmarks_user_canonical_idx").on(table.userId, table.canonicalUrl),
  ]
);

export const pgTags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#3b82f6"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pg_tags_user_name_idx").on(table.userId, table.name),
  ]
);

export const pgBookmarkTags = pgTable(
  "bookmark_tags",
  {
    bookmarkId: uuid("bookmark_id").notNull(),
    tagId: uuid("tag_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bookmarkId, table.tagId] }),
  ]
);

