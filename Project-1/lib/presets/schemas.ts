/**
 * Markly Unified Preset System — Zod Validation Schemas
 * Validates complete snapshots without data loss or arbitrary defaults.
 */

import { z } from "zod";
import { vizConfigSchema } from "@/lib/viz/schema";

export const presetCategorySchema = z.enum(["home", "folder", "visuals", "search", "box"]);
export const presetKindSchema = z.enum([
  "home-layout",
  "visuals-page-layout",
  "folder-tabs-layout",
  "folder-tab-layout",
  "visual-box",
  "search-query",
]);

export const presetSourceContextSchema = z.object({
  surface: z.enum(["home", "visuals", "folder", "search", "box"]),
  folderId: z.string().nullable().optional(),
  folderName: z.string().optional(),
  folderScope: z.enum(["universal", "custom", "not-applicable"]).optional(),
  tabId: z.string().optional(),
  tabLabel: z.string().optional(),
  visualId: z.string().optional(),
  capturedAt: z.number().int(),
});

// -------------------------------------------------------------
// 1. Home Layout Schemas
// -------------------------------------------------------------

export const homeWidgetSnapshotSchema = z.object({
  id: z.string().min(1).max(128),
  label: z.string().min(1).max(128),
  visible: z.boolean().default(true),
  kind: z.enum(["builtin", "custom", "studio"]).optional(),
  category: z.string().optional(),
  colSpan: z.number().optional(),
  rowSpan: z.union([z.literal(1), z.literal(2)]).optional(),
  boxHeight: z.number().nullable().optional(),
  itemLimit: z.union([z.number(), z.literal("all"), z.literal("auto")]).optional(),
  viewMode: z.enum(["cards", "grid", "list", "compact", "table"]).optional(),
  coverStyle: z.enum(["thumbnail", "monogram", "icon"]).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  chartConfig: z.any().optional(),
  plotConfig: z.any().optional(),
  intelConfig: z.any().optional(),
  siteConfig: z.any().optional(),
  vizConfig: vizConfigSchema.optional(),
});

export const homeLayoutSnapshotSchema = z.object({
  version: z.literal(2).default(2),
  kind: z.literal("home-layout"),
  widgets: z.array(homeWidgetSnapshotSchema),
  grid: z.object({ columns: z.literal(12) }).default({ columns: 12 }),
  captureIncludes: z.object({
    widgetOrder: z.literal(true),
    visibility: z.literal(true),
    visualConfiguration: z.literal(true),
    boxDimensions: z.literal(true),
    itemLimits: z.literal(true),
    viewModes: z.literal(true),
  }),
});

// -------------------------------------------------------------
// 2. Visuals Page Schemas
// -------------------------------------------------------------

export const visualsPageSnapshotSchema = z.object({
  version: z.literal(2).default(2),
  kind: z.literal("visuals-page-layout"),
  coreVisuals: z.array(vizConfigSchema),
  hiddenStudioUnitIds: z.array(z.string()),
  studioLayout: z.record(
    z.string(),
    z.object({
      colSpan: z.number(),
      rowSpan: z.union([z.literal(1), z.literal(2)]).optional(),
    })
  ),
  studioSettings: z.record(z.string(), z.unknown()).optional(),
  customVisualReferences: z.array(z.string()).optional(),
});

// -------------------------------------------------------------
// 3. Visual Box Schemas
// -------------------------------------------------------------

export const visualBoxSnapshotSchema = z.object({
  sourceVisualId: z.string().optional(),
  title: z.string().min(1).max(128),
  kind: z.string().min(1).max(64),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  colSpan: z.number().optional(),
  rowSpan: z.union([z.literal(1), z.literal(2)]).optional(),
  boxHeight: z.number().nullable().optional(),
  presentation: z
    .object({
      itemLimit: z.union([z.number(), z.literal("all"), z.literal("auto")]).optional(),
      viewMode: z.enum(["cards", "grid", "list", "compact", "table"]).optional(),
      coverStyle: z.enum(["thumbnail", "monogram", "icon"]).optional(),
    })
    .optional(),
  siteConfig: z.any().optional(),
  plotConfig: z.any().optional(),
  chartConfig: z.any().optional(),
  intelConfig: z.any().optional(),
});

// -------------------------------------------------------------
// 4. Folder Tabs & Tab Schemas
// -------------------------------------------------------------

export const folderTabSnapshotSchema = z.object({
  version: z.literal(2).default(2),
  kind: z.literal("folder-tab-layout"),
  tab: z.object({
    id: z.string(),
    label: z.string(),
    visuals: z.array(visualBoxSnapshotSchema),
  }),
  scopeAtCapture: z.enum(["universal", "custom", "not-applicable"]),
});

export const folderTabsSnapshotSchema = z.object({
  version: z.literal(2).default(2),
  kind: z.literal("folder-tabs-layout"),
  tabs: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      visuals: z.array(visualBoxSnapshotSchema),
    })
  ),
  activeTabId: z.string().optional(),
  scopeAtCapture: z.enum(["universal", "custom", "not-applicable"]),
  captureMode: z.enum(["all_tabs", "active_tab"]),
});

// -------------------------------------------------------------
// 5. Search Query Schemas
// -------------------------------------------------------------

export const searchQuerySnapshotSchema = z.object({
  version: z.literal(2).default(2),
  kind: z.literal("search-query"),
  query: z.string().min(1).max(256),
  filters: z
    .object({
      folderId: z.string().nullable().optional(),
      domain: z.string().nullable().optional(),
      tag: z.string().nullable().optional(),
      status: z.string().optional(),
      onlyFavorites: z.boolean().optional(),
      includeArchived: z.boolean().optional(),
    })
    .optional(),
  presentation: z
    .object({
      viewMode: z.enum(["cards", "grid", "list", "compact", "table"]).optional(),
      coverStyle: z.enum(["thumbnail", "monogram", "icon"]).optional(),
      sortBy: z.enum(["recent", "created", "visits", "title"]).optional(),
    })
    .optional(),
  visuals: z
    .object({
      showAnalytics: z.boolean().optional(),
      showFacets: z.boolean().optional(),
    })
    .optional(),
});

// -------------------------------------------------------------
// Discriminated Snapshot Union
// -------------------------------------------------------------

export const presetSnapshotSchema = z.discriminatedUnion("kind", [
  homeLayoutSnapshotSchema,
  visualsPageSnapshotSchema,
  folderTabsSnapshotSchema,
  folderTabSnapshotSchema,
  visualBoxSnapshotSchema,
  searchQuerySnapshotSchema,
]);

// -------------------------------------------------------------
// Full Canonical Preset Record Schema
// -------------------------------------------------------------

export const presetRecordSchema = z.object({
  id: z.string().min(1).max(128),
  schemaVersion: z.literal(2).default(2),
  kind: presetKindSchema,
  category: presetCategorySchema,
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  tags: z.array(z.string().max(30)).default([]),
  ownership: z.enum(["user", "system"]).default("user"),
  ownerUserId: z.string().optional(),
  isDefault: z.boolean().default(false).optional(),
  isBuiltIn: z.boolean().default(false).optional(),
  source: presetSourceContextSchema,
  snapshot: z.any(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  version: z.number().int().default(1),
});
