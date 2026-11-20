import { z } from "zod";

export const VIZ_CHART_TYPES = [
  "bar",
  "horizontal_bar",
  "line",
  "area",
  "stacked_bar",
  "donut",
  "number",
  "table",
] as const;

export type VizChartType = (typeof VIZ_CHART_TYPES)[number];

export const VIZ_DIMENSIONS = [
  "folder_leaf",
  "folder_top",
  "tag",
  "domain",
  "status",
  "favorite",
  "has_notes",
  "created_day",
  "created_week",
  "created_month",
  "created_year",
  "last_opened_date",
  "last_opened_bucket",
  "visit_count_bucket",
] as const;

export type VizDimension = (typeof VIZ_DIMENSIONS)[number];

export const VIZ_SPLIT_BY_DIMENSIONS = [
  "folder_leaf",
  "folder_top",
  "tag",
  "domain",
  "status",
  "favorite",
  "has_notes",
  "last_opened_bucket",
  "visit_count_bucket",
] as const;

export type VizSplitByDimension = (typeof VIZ_SPLIT_BY_DIMENSIONS)[number];

export const VIZ_MEASURES = [
  "count",
  "sum_visits",
  "avg_visits",
  "max_visits",
  "distinct_domains",
  "percent_of_total",
] as const;

export type VizMeasure = (typeof VIZ_MEASURES)[number];

export const vizFiltersSchema = z
  .object({
    folderId: z.string().nullable().optional(),
    includeSubfolders: z.boolean().default(true).optional(),
    tagMode: z.enum(["any", "all"]).default("any").optional(),
    tags: z.array(z.string().max(50)).max(50).optional(),
    status: z.array(z.string().max(20)).max(10).optional(),
    favorite: z.boolean().optional(),
    dateRangeField: z.enum(["created", "opened"]).optional(),
    dateAfter: z.number().int().optional(),
    dateBefore: z.number().int().optional(),
    searchQuery: z.string().max(100).optional(),
    includeArchived: z.boolean().default(false).optional(),
  })
  .strict();

export type VizFilters = z.infer<typeof vizFiltersSchema>;

export const vizSortSchema = z
  .object({
    by: z.enum(["dimension", "measure"]).default("measure"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type VizSort = z.infer<typeof vizSortSchema>;

export const vizTableOptionsSchema = z
  .object({
    mode: z.enum(["summary", "list"]).default("summary").optional(),
    columns: z.array(z.string().max(50)).max(20).optional(),
    pageSize: z.number().int().min(1).max(100).default(10).optional(),
  })
  .strict();

export type VizTableOptions = z.infer<typeof vizTableOptionsSchema>;

export const vizDisplayOptionsSchema = z
  .object({
    showLegend: z.boolean().default(true).optional(),
    showGrid: z.boolean().default(true).optional(),
    colorAccent: z.string().max(30).optional(),
    unitLabel: z.string().max(30).optional(),
    valuePrefix: z.string().max(10).optional(),
    valueSuffix: z.string().max(10).optional(),
  })
  .strict();

export type VizDisplayOptions = z.infer<typeof vizDisplayOptionsSchema>;

// Max JSON config payload size (16 KB)
export const MAX_VIZ_CONFIG_BYTES = 16384;

export const vizConfigSchema = z
  .object({
    version: z.literal(1).default(1),
    id: z.string().min(1).max(64),
    title: z.string().min(1).max(120),
    chartType: z.enum(VIZ_CHART_TYPES),
    dimension: z.enum(VIZ_DIMENSIONS),
    splitBy: z.enum(VIZ_SPLIT_BY_DIMENSIONS).optional(),
    measure: z.enum(VIZ_MEASURES).default("count"),
    filters: vizFiltersSchema.default({}),
    sort: vizSortSchema.default({ by: "measure", direction: "desc" }),
    limit: z.number().int().min(1).max(100).default(10),
    otherBucket: z.boolean().default(true),
    tableOptions: vizTableOptionsSchema.optional(),
    displayOptions: vizDisplayOptionsSchema.optional(),
  })
  .strict()
  .refine(
    (cfg) => {
      try {
        return JSON.stringify(cfg).length <= MAX_VIZ_CONFIG_BYTES;
      } catch {
        return false;
      }
    },
    { message: `VizConfig exceeds maximum size limit of ${MAX_VIZ_CONFIG_BYTES} bytes` }
  );

export type VizConfig = z.infer<typeof vizConfigSchema>;

export const DEFAULT_VIZ_CONFIG: VizConfig = {
  version: 1,
  id: "viz_default_top_domains",
  title: "Top Web Domains",
  chartType: "bar",
  dimension: "domain",
  measure: "count",
  filters: {
    includeArchived: false,
    includeSubfolders: true,
  },
  sort: {
    by: "measure",
    direction: "desc",
  },
  limit: 8,
  otherBucket: true,
  displayOptions: {
    showLegend: true,
    showGrid: true,
  },
};

export const storedWidgetConfigSchema = z
  .object({
    id: z.string().min(1).max(128),
    label: z.string().min(1).max(128),
    visible: z.boolean().default(true),
    kind: z.enum(["builtin", "custom", "studio"]).default("builtin").optional(),
    category: z.string().optional(),
    vizConfig: vizConfigSchema.optional(),
    plotConfig: z.any().optional(),
    chartConfig: z.any().optional(),
    intelConfig: z.any().optional(),
    siteConfig: z.any().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    rowSpan: z.union([z.literal(1), z.literal(2)]).optional(),
    span: z.enum(["1", "2"]).optional(),
    colSpan: z
      .union([
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(6),
        z.literal(8),
        z.literal(9),
        z.literal(12),
      ])
      .optional(),
  })
  .passthrough();

export type StoredWidgetConfig = z.infer<typeof storedWidgetConfigSchema>;

export const MAX_CUSTOM_WIDGETS = 30;

export function safeParseStoredWidgets(raw: unknown): StoredWidgetConfig[] {
  if (!Array.isArray(raw)) return [];
  const valid: StoredWidgetConfig[] = [];
  let customCount = 0;

  for (const item of raw) {
    const result = storedWidgetConfigSchema.safeParse(item);
    if (result.success) {
      if (result.data.kind === "custom" || result.data.kind === "studio") {
        if (customCount >= MAX_CUSTOM_WIDGETS) continue; // Cap at 30 custom widgets
        customCount++;
      }
      valid.push(result.data);
    }
  }
  return valid;
}

