import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").notNull(),
});

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    parentId: text("parent_id"), // null if root folder
    name: text("name").notNull(),
    icon: text("icon").notNull().default("📁"),
    color: text("color").notNull().default("gray"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("folders_user_parent_idx").on(table.userId, table.parentId),
    index("folders_user_pos_idx").on(table.userId, table.position),
  ]
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    folderId: text("folder_id"), // null if unsorted / inbox
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    imageUrl: text("image_url"),
    domain: text("domain").notNull(),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["alive", "dead", "pending"] }).notNull().default("alive"),
    visitCount: integer("visit_count").notNull().default(0),
    lastVisitedAt: integer("last_visited_at"),
    lastClickedAt: integer("last_clicked_at"),
    createdAt: integer("created_at").notNull(),
    searchText: text("search_text"),
  },
  (table) => [
    index("bookmarks_user_folder_idx").on(table.userId, table.folderId),
    index("bookmarks_domain_idx").on(table.domain),
    uniqueIndex("bookmarks_user_canonical_idx").on(table.userId, table.canonicalUrl),
  ]
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#3b82f6"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("tags_user_name_idx").on(table.userId, table.name),
  ]
);

export const bookmarkTags = sqliteTable(
  "bookmark_tags",
  {
    bookmarkId: text("bookmark_id").notNull().references(() => bookmarks.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.bookmarkId, table.tagId] }),
    index("bookmark_tags_tag_idx").on(table.tagId),
  ]
);

// Tombstone tables to prevent resurrection of deleted entities during remote sync
export const deletedFolders = sqliteTable("deleted_folders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  deletedAt: integer("deleted_at").notNull(),
});

export const deletedBookmarks = sqliteTable("deleted_bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  deletedAt: integer("deleted_at").notNull(),
});

// Drizzle Relations
export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: "subfolders",
  }),
  subfolders: many(folders, {
    relationName: "subfolders",
  }),
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
  folder: one(folders, {
    fields: [bookmarks.folderId],
    references: [folders.id],
  }),
  bookmarkTags: many(bookmarkTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  bookmarkTags: many(bookmarkTags),
}));

export const bookmarkTagsRelations = relations(bookmarkTags, ({ one }) => ({
  bookmark: one(bookmarks, {
    fields: [bookmarkTags.bookmarkId],
    references: [bookmarks.id],
  }),
  tag: one(tags, {
    fields: [bookmarkTags.tagId],
    references: [tags.id],
  }),
}));

// Export inferred types
export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type BookmarkTag = typeof bookmarkTags.$inferSelect;

export type BookmarkWithDetails = Omit<Bookmark, "lastClickedAt"> & {
  lastClickedAt?: number | null;
  tags: Tag[];
  folderName?: string | null;
  folderPath?: string | null;
};

export type FolderTreeNode = Folder & {
  children: FolderTreeNode[];
  bookmarkCount: number;
  totalDescendantBookmarkCount: number;
};

