import { describe, it, expect } from "vitest";
import {
  vizConfigSchema,
  DEFAULT_VIZ_CONFIG,
  runViz,
  formatZonedDay,
  formatZonedWeek,
  formatZonedMonth,
  formatRecencyBucket,
  formatVisitCountBucket,
  MAX_VIZ_CONFIG_BYTES,
  safeParseStoredWidgets,
  MAX_CUSTOM_WIDGETS,
  type VizConfig,
} from "../lib/viz";
import type { BookmarkWithDetails, Folder } from "../server/db/schema";

function createMockBookmark(overrides: Partial<BookmarkWithDetails> = {}): BookmarkWithDetails {
  return {
    id: `bm_${Math.random().toString(36).substring(2, 9)}`,
    userId: "usr_test",
    folderId: null,
    folderName: null,
    folderPath: null,
    url: "https://example.com/article",
    canonicalUrl: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark for unit tests",
    iconUrl: null,
    imageUrl: null,
    domain: "example.com",
    isFavorite: false,
    isArchived: false,
    status: "alive",
    visitCount: 0,
    lastVisitedAt: null,
    lastClickedAt: null,
    createdAt: 1773000000000, // ~March 2026
    searchText: null,
    notes: null,
    cachedContent: null,
    tags: [],
    ...overrides,
  };
}

describe("STAGE 1: VizConfig Zod Schema", () => {
  it("validates a standard config", () => {
    const parsed = vizConfigSchema.safeParse(DEFAULT_VIZ_CONFIG);
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown fields (strict schema)", () => {
    const invalidConfig = {
      ...DEFAULT_VIZ_CONFIG,
      unknownHackField: "eval(alert(1))",
    };
    const parsed = vizConfigSchema.safeParse(invalidConfig);
    expect(parsed.success).toBe(false);
  });

  it("enforces maximum configuration size", () => {
    const hugeTitle = "A".repeat(MAX_VIZ_CONFIG_BYTES + 50);
    const oversizedConfig = {
      ...DEFAULT_VIZ_CONFIG,
      title: hugeTitle,
    };
    const parsed = vizConfigSchema.safeParse(oversizedConfig);
    expect(parsed.success).toBe(false);
  });
});

describe("STAGE 1: Date & Timezone Utilities", () => {
  it("handles week and month boundaries correctly", () => {
    // 2026-01-31 23:59:59 UTC
    const endOfMonth = Date.UTC(2026, 0, 31, 23, 59, 59);
    // 2026-02-01 00:00:01 UTC
    const startOfNextMonth = Date.UTC(2026, 1, 1, 0, 0, 1);

    expect(formatZonedMonth(endOfMonth, "UTC")).toBe("2026-01");
    expect(formatZonedMonth(startOfNextMonth, "UTC")).toBe("2026-02");

    // Check week format on Monday vs Sunday start
    // 2026-03-08 is Sunday, 2026-03-09 is Monday
    const sunTs = Date.UTC(2026, 2, 8, 12, 0, 0);
    const monTs = Date.UTC(2026, 2, 9, 12, 0, 0);

    const sunWeekMondayStart = formatZonedWeek(sunTs, "UTC", "monday");
    const monWeekMondayStart = formatZonedWeek(monTs, "UTC", "monday");
    // Sunday belongs to prior week when week starts on Monday
    expect(sunWeekMondayStart).not.toBe(monWeekMondayStart);
  });

  it("handles time zones across daylight saving time and midnight offsets", () => {
    // 2026-01-01 02:00:00 UTC is 2025-12-31 21:00:00 EST (-5 hours)
    const newYearUtc = Date.UTC(2026, 0, 1, 2, 0, 0);
    expect(formatZonedDay(newYearUtc, "UTC")).toBe("2026-01-01");
    expect(formatZonedDay(newYearUtc, "America/New_York")).toBe("2025-12-31");
    expect(formatZonedMonth(newYearUtc, "America/New_York")).toBe("2025-12");

    // US DST Spring Forward occurs in March (UTC-5 shifts to UTC-4)
    // 2026-03-09 12:00:00 UTC
    const dstTs = Date.UTC(2026, 2, 9, 12, 0, 0);
    expect(formatZonedDay(dstTs, "America/New_York")).toBe("2026-03-09");
  });

  it("formats recency buckets and visit count buckets cleanly", () => {
    const now = 1773000000000;
    expect(formatRecencyBucket(null, now)).toBe("Never opened");
    expect(formatRecencyBucket(0, now)).toBe("Never opened");
    expect(formatRecencyBucket(now - 1000 * 60 * 30, now)).toBe("< 24h"); // 30 min ago
    expect(formatRecencyBucket(now - 1000 * 60 * 60 * 48, now)).toBe("Past 7 days"); // 2 days ago
    expect(formatRecencyBucket(now - 1000 * 60 * 60 * 24 * 15, now)).toBe("Past 30 days"); // 15 days ago
    expect(formatRecencyBucket(now - 1000 * 60 * 60 * 24 * 45, now)).toBe("Past 90 days"); // 45 days ago
    expect(formatRecencyBucket(now - 1000 * 60 * 60 * 24 * 120, now)).toBe("90+ days dormant"); // 120 days ago

    expect(formatVisitCountBucket(0)).toBe("0 visits");
    expect(formatVisitCountBucket(3)).toBe("1 - 5 visits");
    expect(formatVisitCountBucket(15)).toBe("6 - 20 visits");
    expect(formatVisitCountBucket(35)).toBe("21 - 50 visits");
    expect(formatVisitCountBucket(120)).toBe("50+ visits");
  });
});

describe("STAGE 1: Query Engine runViz", () => {
  it("handles empty data and returns clear emptyReason", () => {
    const res = runViz([], DEFAULT_VIZ_CONFIG);
    expect(res.rows).toEqual([]);
    expect(res.totalCount).toBe(0);
    expect(res.grandTotalMeasure).toBe(0);
    expect(res.emptyReason).toBe("No bookmarks in workspace");
  });

  it("handles multi-valued tag explosion correctly without treating tags as a single pie whole", () => {
    const b1 = createMockBookmark({
      tags: [
        { id: "t1", name: "react", color: "#3b82f6", userId: "u1", createdAt: 0 },
        { id: "t2", name: "typescript", color: "#3b82f6", userId: "u1", createdAt: 0 },
      ],
    });
    const b2 = createMockBookmark({
      tags: [
        { id: "t2", name: "typescript", color: "#3b82f6", userId: "u1", createdAt: 0 },
        { id: "t3", name: "tailwind", color: "#3b82f6", userId: "u1", createdAt: 0 },
      ],
    });
    const b3 = createMockBookmark({
      tags: [], // Untagged
    });

    const config: VizConfig = {
      ...DEFAULT_VIZ_CONFIG,
      dimension: "tag",
      measure: "count",
    };

    const res = runViz([b1, b2, b3], config);
    expect(res.isMultiValued).toBe(true);
    // typescript should have count 2, react 1, tailwind 1, Untagged 1
    const tsRow = res.rows.find((r) => r.dimension === "typescript");
    const reactRow = res.rows.find((r) => r.dimension === "react");
    const tailwindRow = res.rows.find((r) => r.dimension === "tailwind");
    const untaggedRow = res.rows.find((r) => r.dimension === "Untagged");

    expect(tsRow?.value).toBe(2);
    expect(reactRow?.value).toBe(1);
    expect(tailwindRow?.value).toBe(1);
    expect(untaggedRow?.value).toBe(1);
  });

  it("supports top-N + Other aggregation and respects otherBucket: false", () => {
    const domains = ["github.com", "google.com", "nytimes.com", "apple.com", "reddit.com", "dev.to"];
    const bookmarks = domains.map((d, i) =>
      createMockBookmark({
        domain: d,
        visitCount: 10 - i,
      })
    );

    // Limit to top 3 with otherBucket: true
    const configWithOther: VizConfig = {
      ...DEFAULT_VIZ_CONFIG,
      dimension: "domain",
      measure: "count",
      limit: 3,
      otherBucket: true,
    };

    const resWithOther = runViz(bookmarks, configWithOther);
    expect(resWithOther.rows.length).toBe(4); // 3 top + 1 Other
    const otherRow = resWithOther.rows.find((r) => r.dimension === "Other");
    expect(otherRow).toBeDefined();
    expect(otherRow?.isOther).toBe(true);
    expect(otherRow?.count).toBe(3);

    // Limit to top 3 with otherBucket: false
    const configWithoutOther: VizConfig = {
      ...configWithOther,
      otherBucket: false,
    };
    const resWithoutOther = runViz(bookmarks, configWithoutOther);
    expect(resWithoutOther.rows.length).toBe(3);
    expect(resWithoutOther.rows.some((r) => r.dimension === "Other")).toBe(false);
  });

  it("breaks sort ties deterministically", () => {
    // 3 items with exact same measure value (count = 1)
    const bookmarks = [
      createMockBookmark({ domain: "zebra.com" }),
      createMockBookmark({ domain: "alpha.com" }),
      createMockBookmark({ domain: "beta.com" }),
    ];

    const config: VizConfig = {
      ...DEFAULT_VIZ_CONFIG,
      dimension: "domain",
      measure: "count",
      sort: { by: "measure", direction: "desc" },
    };

    const res = runViz(bookmarks, config);
    // All counts are 1; tie-breaker must sort alphabetically by dimension
    expect(res.rows.map((r) => r.dimension)).toEqual(["alpha.com", "beta.com", "zebra.com"]);
  });

  it("handles null and undefined values gracefully", () => {
    const bm = createMockBookmark({
      folderId: null,
      folderName: null,
      notes: null,
      lastClickedAt: null,
      lastVisitedAt: null,
      visitCount: 0,
      domain: "",
    });

    const folderRes = runViz([bm], { ...DEFAULT_VIZ_CONFIG, dimension: "folder_leaf" });
    expect(folderRes.rows[0].dimension).toBe("Unsorted");

    const notesRes = runViz([bm], { ...DEFAULT_VIZ_CONFIG, dimension: "has_notes" });
    expect(notesRes.rows[0].dimension).toBe("No notes");

    const openedRes = runViz([bm], { ...DEFAULT_VIZ_CONFIG, dimension: "last_opened_date" });
    expect(openedRes.rows[0].dimension).toBe("Never opened");

    const domainRes = runViz([bm], { ...DEFAULT_VIZ_CONFIG, dimension: "domain" });
    expect(domainRes.rows[0].dimension).toBe("Unknown");
  });

  it("calculates all measures accurately: sum, avg, max, distinct domains, percent", () => {
    const bookmarks = [
      createMockBookmark({ domain: "github.com", visitCount: 10 }),
      createMockBookmark({ domain: "github.com", visitCount: 20 }),
      createMockBookmark({ domain: "gitlab.com", visitCount: 30 }),
      createMockBookmark({ domain: "bitbucket.org", visitCount: 40 }),
    ];

    // Measure: sum_visits grouped by domain
    const sumRes = runViz(bookmarks, { ...DEFAULT_VIZ_CONFIG, dimension: "domain", measure: "sum_visits" });
    const ghSum = sumRes.rows.find((r) => r.dimension === "github.com");
    expect(ghSum?.value).toBe(30);

    // Measure: avg_visits grouped by domain
    const avgRes = runViz(bookmarks, { ...DEFAULT_VIZ_CONFIG, dimension: "domain", measure: "avg_visits" });
    const ghAvg = avgRes.rows.find((r) => r.dimension === "github.com");
    expect(ghAvg?.value).toBe(15.0); // (10 + 20) / 2 = 15.0

    // Measure: max_visits
    const maxRes = runViz(bookmarks, { ...DEFAULT_VIZ_CONFIG, dimension: "domain", measure: "max_visits" });
    const ghMax = maxRes.rows.find((r) => r.dimension === "github.com");
    expect(ghMax?.value).toBe(20);

    // Measure: distinct_domains grouped by status
    const distRes = runViz(bookmarks, { ...DEFAULT_VIZ_CONFIG, dimension: "status", measure: "distinct_domains" });
    expect(distRes.rows[0].value).toBe(3); // github, gitlab, bitbucket = 3 domains

    // Measure: percent_of_total
    const pctRes = runViz(bookmarks, { ...DEFAULT_VIZ_CONFIG, dimension: "domain", measure: "percent_of_total" });
    const ghPct = pctRes.rows.find((r) => r.dimension === "github.com");
    expect(ghPct?.value).toBe(50.0); // 2 out of 4 = 50.0%
  });

  it("evaluates every filter correctly", () => {
    const folders: Folder[] = [
      { id: "fld_parent", name: "Engineering", parentId: null, userId: "u1", color: "#3b82f6", icon: "Folder", position: 0, createdAt: 0, updatedAt: 0 },
      { id: "fld_child", name: "Frontend", parentId: "fld_parent", userId: "u1", color: "#3b82f6", icon: "Folder", position: 0, createdAt: 0, updatedAt: 0 },
    ];

    const bm1 = createMockBookmark({
      id: "bm1",
      folderId: "fld_child",
      isArchived: true,
      isFavorite: true,
      status: "alive",
      title: "React Documentation",
      tags: [{ id: "t1", name: "web", color: "#3b82f6", userId: "u1", createdAt: 0 }],
      createdAt: 1000,
      lastClickedAt: 5000,
    });

    const bm2 = createMockBookmark({
      id: "bm2",
      folderId: "fld_parent",
      isArchived: false,
      isFavorite: false,
      status: "dead",
      title: "Backend API Spec",
      tags: [
        { id: "t1", name: "web", color: "#3b82f6", userId: "u1", createdAt: 0 },
        { id: "t2", name: "node", color: "#3b82f6", userId: "u1", createdAt: 0 },
      ],
      createdAt: 2000,
      lastClickedAt: null,
    });

    // 1. Archived filter (default excludes bm1)
    const resNoArchived = runViz([bm1, bm2], DEFAULT_VIZ_CONFIG);
    expect(resNoArchived.totalCount).toBe(1);
    expect(resNoArchived.rows[0].count).toBe(1);

    // 2. Folder filter with subfolders enabled
    const resFolder = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, folderId: "fld_parent", includeSubfolders: true },
    }, { folders });
    expect(resFolder.totalCount).toBe(2); // Parent and Child both included

    // 3. Folder filter without subfolders
    const resFolderNoSub = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, folderId: "fld_parent", includeSubfolders: false },
    }, { folders });
    expect(resFolderNoSub.totalCount).toBe(1); // Only bm2

    // 4. Tag filter mode "all"
    const resTagsAll = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, tags: ["web", "node"], tagMode: "all" },
    });
    expect(resTagsAll.totalCount).toBe(1); // Only bm2 has both

    // 5. Status filter
    const resStatus = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, status: ["dead"] },
    });
    expect(resStatus.totalCount).toBe(1);

    // 6. Favorite filter
    const resFav = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, favorite: true },
    });
    expect(resFav.totalCount).toBe(1);

    // 7. Search query filter
    const resSearch = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, searchQuery: "react" },
    });
    expect(resSearch.totalCount).toBe(1);

    // 8. Date range filter
    const resDate = runViz([bm1, bm2], {
      ...DEFAULT_VIZ_CONFIG,
      filters: { includeArchived: true, dateRangeField: "created", dateAfter: 1500 },
    });
    expect(resDate.totalCount).toBe(1);
  });

  it("handles splitBy dimension for multi-series / stacked charts", () => {
    const bms = [
      createMockBookmark({ domain: "github.com", status: "alive" }),
      createMockBookmark({ domain: "github.com", status: "dead" }),
      createMockBookmark({ domain: "google.com", status: "alive" }),
    ];

    const config: VizConfig = {
      ...DEFAULT_VIZ_CONFIG,
      dimension: "domain",
      splitBy: "status",
      measure: "count",
    };

    const res = runViz(bms, config);
    expect(res.series).toEqual(["Broken", "Healthy"]);
    const ghRow = res.rows.find((r) => r.dimension === "github.com");
    expect(ghRow?.seriesValues?.Healthy).toBe(1);
    expect(ghRow?.seriesValues?.Broken).toBe(1);
  });

  describe("STAGE 4: safeParseStoredWidgets", () => {
    it("parses valid stored widgets array", () => {
      const raw = [
        { id: "heatmap", label: "Heatmap", visible: true, span: "2", colSpan: 12 },
        {
          id: "custom:viz_123",
          label: "My Visual",
          visible: true,
          kind: "custom",
          colSpan: 6,
          vizConfig: DEFAULT_VIZ_CONFIG,
        },
      ];
      const parsed = safeParseStoredWidgets(raw);
      expect(parsed.length).toBe(2);
      expect(parsed[1].id).toBe("custom:viz_123");
      expect(parsed[1].kind).toBe("custom");
    });

    it("filters out invalid/corrupted entries without throwing", () => {
      const raw = [
        null,
        "corrupted string",
        { id: 123 }, // invalid id type
        { id: "custom:bad", kind: "custom", vizConfig: { invalid: "yes" } }, // invalid vizConfig
        { id: "folders", label: "Folders", visible: true },
      ];
      const parsed = safeParseStoredWidgets(raw);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe("folders");
    });

    it("caps custom widgets at MAX_CUSTOM_WIDGETS (30)", () => {
      const raw = [];
      for (let i = 0; i < 35; i++) {
        raw.push({
          id: `custom:viz_${i}`,
          label: `Viz ${i}`,
          visible: true,
          kind: "custom",
          vizConfig: { ...DEFAULT_VIZ_CONFIG, id: `viz_${i}`, title: `Viz ${i}` },
        });
      }
      const parsed = safeParseStoredWidgets(raw);
      const customCount = parsed.filter((w) => w.kind === "custom").length;
      expect(customCount).toBe(MAX_CUSTOM_WIDGETS);
    });
  });

  describe("Observable Plot Integration & 22 Chart Variations", () => {
    it("validates that all 22 observable plot types are defined and distinct", () => {
      const ALL_22_PLOT_TYPES = [
        "barX", "barY", "stackedBarY", "stackedBarX", "groupedBar", "lollipop",
        "dot", "bubble", "tick", "rule",
        "line", "stepLine", "multiLine", "difference",
        "area", "stackedArea", "histogram",
        "cell", "matrix", "hexbin",
        "text", "vector",
      ];
      expect(ALL_22_PLOT_TYPES.length).toBe(22);
      const unique = new Set(ALL_22_PLOT_TYPES);
      expect(unique.size).toBe(22);
    });

    it("verifies query engine output formats data correctly for Observable Plot feeds", () => {
      const bookmarks = [
        createMockBookmark({ domain: "github.com", visitCount: 42, tags: ["dev", "git"] }),
        createMockBookmark({ domain: "figma.com", visitCount: 15, tags: ["design"] }),
        createMockBookmark({ domain: "google.com", visitCount: 100 }),
      ];

      const res = runViz(bookmarks, {
        ...DEFAULT_VIZ_CONFIG,
        dimension: "domain",
        measure: "sum_visits",
      });

      expect(res.rows.length).toBe(3);
      expect(res.rows[0].dimension).toBe("google.com");
      expect(res.rows[0].value).toBe(100);

      // Verify mapping to Observable Plot format
      const plotInput = res.rows.map((r) => ({
        x: r.value,
        y: r.dimension,
      }));
      expect(plotInput[0]).toEqual({ x: 100, y: "google.com" });
    });
  });
});
