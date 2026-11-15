import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import type { VizConfig, VizDimension, VizSplitByDimension, VizMeasure } from "./schema";
import {
  formatZonedDay,
  formatZonedWeek,
  formatZonedMonth,
  formatZonedYear,
  formatRecencyBucket,
  formatVisitCountBucket,
} from "./date-utils";

export interface RunVizOptions {
  now?: number; // Defaults to Date.now()
  timeZone?: string; // Defaults to "UTC"
  weekStart?: "sunday" | "monday"; // Defaults to "monday"
  folders?: Folder[]; // Folder hierarchy to resolve top/leaf folders and subfolder filters
}

export interface VizRow {
  dimension: string;
  value: number;
  formattedValue: string;
  count: number;
  isOther?: boolean;
  seriesValues?: Record<string, number>;
}

export interface VizResult {
  rows: VizRow[];
  series: string[];
  totalCount: number;
  grandTotalMeasure: number;
  isMultiValued: boolean;
  emptyReason?: string;
}

interface BucketAccumulator {
  count: number;
  sumVisits: number;
  maxVisits: number;
  domains: Set<string>;
  splitMap: Map<string, { count: number; sumVisits: number; maxVisits: number; domains: Set<string> }>;
}

/**
 * Builds a folder lookup map and a subfolder descendant resolver.
 */
function buildFolderHelpers(folders: Folder[] = []) {
  const folderMap = new Map<string, Folder>();
  const childrenMap = new Map<string, string[]>();

  for (const f of folders) {
    folderMap.set(f.id, f);
    if (f.parentId) {
      const existing = childrenMap.get(f.parentId) || [];
      existing.push(f.id);
      childrenMap.set(f.parentId, existing);
    }
  }

  function getDescendantIds(folderId: string): Set<string> {
    const ids = new Set<string>([folderId]);
    const queue = [folderId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = childrenMap.get(curr);
      if (children) {
        for (const childId of children) {
          if (!ids.has(childId)) {
            ids.add(childId);
            queue.push(childId);
          }
        }
      }
    }
    return ids;
  }

  function getTopLevelFolderName(folderId: string | null | undefined): string {
    if (!folderId || folderId === "__UNSORTED__" || folderId.startsWith("fld_unsorted_")) {
      return "Unsorted";
    }
    let curr = folderMap.get(folderId);
    if (!curr) return "Unsorted";

    const visited = new Set<string>();
    while (curr.parentId && folderMap.has(curr.parentId)) {
      if (visited.has(curr.id)) break; // cycle protection
      visited.add(curr.id);
      curr = folderMap.get(curr.parentId)!;
    }
    return curr.name || "Unsorted";
  }

  function getLeafFolderName(folderId: string | null | undefined, fallbackName?: string | null): string {
    if (!folderId || folderId === "__UNSORTED__" || folderId.startsWith("fld_unsorted_")) {
      return "Unsorted";
    }
    const f = folderMap.get(folderId);
    return f?.name || fallbackName || "Unsorted";
  }

  return { folderMap, getDescendantIds, getTopLevelFolderName, getLeafFolderName };
}

/**
 * Extracts dimension values for a bookmark. Returns string[] because tags are multi-valued.
 */
function extractDimensionValues(
  bm: BookmarkWithDetails,
  dim: VizDimension | VizSplitByDimension,
  options: {
    now: number;
    timeZone: string;
    weekStart: "sunday" | "monday";
    getLeafFolderName: (fId?: string | null, fb?: string | null) => string;
    getTopLevelFolderName: (fId?: string | null) => string;
  }
): string[] {
  switch (dim) {
    case "folder_leaf":
      return [options.getLeafFolderName(bm.folderId, bm.folderName)];

    case "folder_top":
      return [options.getTopLevelFolderName(bm.folderId)];

    case "tag": {
      if (!bm.tags || bm.tags.length === 0) {
        return ["Untagged"];
      }
      return bm.tags.map((t) => t.name.trim()).filter(Boolean);
    }

    case "domain":
      return [bm.domain ? bm.domain.toLowerCase() : "Unknown"];

    case "status": {
      const s = (bm.status as string) || "alive";
      if (s === "alive") return ["Healthy"];
      if (s === "dead") return ["Broken"];
      if (s === "pending") return ["Pending"];
      return [s.charAt(0).toUpperCase() + s.slice(1)];
    }

    case "favorite":
      return [bm.isFavorite ? "Starred" : "Not starred"];

    case "has_notes":
      return [bm.notes && bm.notes.trim().length > 0 ? "Has notes" : "No notes"];

    case "created_day":
      return [formatZonedDay(bm.createdAt, options.timeZone)];

    case "created_week":
      return [formatZonedWeek(bm.createdAt, options.timeZone, options.weekStart)];

    case "created_month":
      return [formatZonedMonth(bm.createdAt, options.timeZone)];

    case "created_year":
      return [formatZonedYear(bm.createdAt, options.timeZone)];

    case "last_opened_date": {
      const time = bm.lastClickedAt || bm.lastVisitedAt;
      return [time && time > 0 ? formatZonedDay(time, options.timeZone) : "Never opened"];
    }

    case "last_opened_bucket":
      return [formatRecencyBucket(bm.lastClickedAt || bm.lastVisitedAt, options.now)];

    case "visit_count_bucket":
      return [formatVisitCountBucket(bm.visitCount)];

    default:
      return ["Unknown"];
  }
}

/**
 * Calculates scalar measure for an accumulator.
 */
function calculateMeasureValue(
  acc: { count: number; sumVisits: number; maxVisits: number; domains: Set<string> },
  measure: VizMeasure,
  grandTotalFilteredCount: number
): number {
  switch (measure) {
    case "count":
      return acc.count;
    case "sum_visits":
      return acc.sumVisits;
    case "avg_visits":
      return acc.count > 0 ? Number((acc.sumVisits / acc.count).toFixed(1)) : 0;
    case "max_visits":
      return acc.maxVisits;
    case "distinct_domains":
      return acc.domains.size;
    case "percent_of_total":
      return grandTotalFilteredCount > 0
        ? Number(((acc.count / grandTotalFilteredCount) * 100).toFixed(1))
        : 0;
    default:
      return acc.count;
  }
}

function formatValue(val: number, measure: VizMeasure, prefix = "", suffix = ""): string {
  if (measure === "percent_of_total") {
    return `${val.toLocaleString("en-US")}%`;
  }
  return `${prefix}${val.toLocaleString("en-US")}${suffix}`;
}

/**
 * Pure TypeScript Query Engine for Markly Visual Builder.
 * Executes filters, group by (dimensions), split by (series), measures, sorting, limit and "Other" bucket.
 */
export function runViz(
  bookmarks: BookmarkWithDetails[],
  config: VizConfig,
  options: RunVizOptions = {}
): VizResult {
  const now = options.now ?? Date.now();
  const timeZone = options.timeZone || "UTC";
  const weekStart = options.weekStart || "monday";
  const folders = options.folders || [];

  const { getDescendantIds, getTopLevelFolderName, getLeafFolderName } = buildFolderHelpers(folders);

  // 1. Filter phase
  const filters = config.filters || {};
  let targetFolderDescendants: Set<string> | null = null;
  if (filters.folderId) {
    if (filters.includeSubfolders !== false) {
      targetFolderDescendants = getDescendantIds(filters.folderId);
    } else {
      targetFolderDescendants = new Set([filters.folderId]);
    }
  }

  const queryLower = filters.searchQuery ? filters.searchQuery.toLowerCase().trim() : null;
  const tagListLower = filters.tags ? filters.tags.map((t) => t.toLowerCase().trim()) : null;

  const filteredBookmarks = bookmarks.filter((bm) => {
    // Archived filter (default off: do not include archived)
    if (!filters.includeArchived && bm.isArchived) {
      return false;
    }

    // Folder filter
    if (targetFolderDescendants) {
      if (!bm.folderId || !targetFolderDescendants.has(bm.folderId)) {
        return false;
      }
    }

    // Favorite filter
    if (filters.favorite !== undefined && bm.isFavorite !== filters.favorite) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(bm.status)) {
        return false;
      }
    }

    // Date range filter
    const dateField =
      filters.dateRangeField === "opened"
        ? bm.lastClickedAt || bm.lastVisitedAt || 0
        : bm.createdAt;

    if (filters.dateAfter !== undefined && dateField < filters.dateAfter) {
      return false;
    }
    if (filters.dateBefore !== undefined && dateField > filters.dateBefore) {
      return false;
    }

    // Tag filter
    if (tagListLower && tagListLower.length > 0) {
      const bmTags = (bm.tags || []).map((t) => t.name.toLowerCase());
      if (filters.tagMode === "all") {
        for (const reqTag of tagListLower) {
          if (!bmTags.includes(reqTag)) return false;
        }
      } else {
        const hasAny = tagListLower.some((t) => bmTags.includes(t));
        if (!hasAny) return false;
      }
    }

    // Search query filter (title, domain, url)
    if (queryLower) {
      const matchesTitle = bm.title && bm.title.toLowerCase().includes(queryLower);
      const matchesDomain = bm.domain && bm.domain.toLowerCase().includes(queryLower);
      const matchesUrl = bm.url && bm.url.toLowerCase().includes(queryLower);
      if (!matchesTitle && !matchesDomain && !matchesUrl) {
        return false;
      }
    }

    return true;
  });

  const totalFilteredCount = filteredBookmarks.length;

  if (totalFilteredCount === 0) {
    return {
      rows: [],
      series: [],
      totalCount: 0,
      grandTotalMeasure: 0,
      isMultiValued: config.dimension === "tag",
      emptyReason: bookmarks.length === 0 ? "No bookmarks in workspace" : "No bookmarks match the selected filters",
    };
  }

  // 2. Aggregation phase
  const isMultiValued = config.dimension === "tag";
  const buckets = new Map<string, BucketAccumulator>();
  const allSeriesSet = new Set<string>();

  const dimensionExtractorOptions = {
    now,
    timeZone,
    weekStart,
    getLeafFolderName,
    getTopLevelFolderName,
  };

  for (const bm of filteredBookmarks) {
    const dimValues = extractDimensionValues(bm, config.dimension, dimensionExtractorOptions);
    const splitValues = config.splitBy
      ? extractDimensionValues(bm, config.splitBy, dimensionExtractorOptions)
      : [null];

    const visits = bm.visitCount || 0;
    const domain = bm.domain ? bm.domain.toLowerCase() : "unknown";

    for (const dimVal of dimValues) {
      let bucket = buckets.get(dimVal);
      if (!bucket) {
        bucket = {
          count: 0,
          sumVisits: 0,
          maxVisits: 0,
          domains: new Set<string>(),
          splitMap: new Map(),
        };
        buckets.set(dimVal, bucket);
      }

      bucket.count += 1;
      bucket.sumVisits += visits;
      if (visits > bucket.maxVisits) bucket.maxVisits = visits;
      bucket.domains.add(domain);

      if (config.splitBy) {
        for (const splitVal of splitValues) {
          if (!splitVal) continue;
          allSeriesSet.add(splitVal);
          let splitEntry = bucket.splitMap.get(splitVal);
          if (!splitEntry) {
            splitEntry = { count: 0, sumVisits: 0, maxVisits: 0, domains: new Set<string>() };
            bucket.splitMap.set(splitVal, splitEntry);
          }
          splitEntry.count += 1;
          splitEntry.sumVisits += visits;
          if (visits > splitEntry.maxVisits) splitEntry.maxVisits = visits;
          splitEntry.domains.add(domain);
        }
      }
    }
  }

  const seriesList = Array.from(allSeriesSet).sort();

  // 3. Compute row values
  let calculatedRows: VizRow[] = [];
  const prefix = config.displayOptions?.valuePrefix || "";
  const suffix = config.displayOptions?.valueSuffix || "";

  for (const [dimKey, acc] of buckets.entries()) {
    const value = calculateMeasureValue(acc, config.measure, totalFilteredCount);

    let seriesValues: Record<string, number> | undefined;
    if (config.splitBy && seriesList.length > 0) {
      seriesValues = {};
      for (const s of seriesList) {
        const sAcc = acc.splitMap.get(s);
        seriesValues[s] = sAcc ? calculateMeasureValue(sAcc, config.measure, totalFilteredCount) : 0;
      }
    }

    calculatedRows.push({
      dimension: dimKey,
      value,
      formattedValue: formatValue(value, config.measure, prefix, suffix),
      count: acc.count,
      seriesValues,
    });
  }

  // 4. Sort rows
  const sortDirection = config.sort?.direction || "desc";
  const sortBy = config.sort?.by || "measure";

  calculatedRows.sort((a, b) => {
    if (sortBy === "measure") {
      const diff = sortDirection === "desc" ? b.value - a.value : a.value - b.value;
      if (diff !== 0) return diff;
      // Deterministic tie breaker: alphabetical by dimension label
      return a.dimension.localeCompare(b.dimension);
    } else {
      // Sort by dimension
      const cmp = a.dimension.localeCompare(b.dimension);
      return sortDirection === "desc" ? -cmp : cmp;
    }
  });

  // 5. Limit and "Other" bucket
  const limit = Math.max(1, config.limit || 10);
  let finalRows: VizRow[];

  if (calculatedRows.length > limit) {
    const topRows = calculatedRows.slice(0, limit);
    const overflowRows = calculatedRows.slice(limit);

    if (config.otherBucket) {
      let otherCount = 0;
      let otherSumVisits = 0;
      let otherMaxVisits = 0;
      const otherDomains = new Set<string>();
      const otherSplitMap = new Map<string, { count: number; sumVisits: number; maxVisits: number; domains: Set<string> }>();

      for (const r of overflowRows) {
        const acc = buckets.get(r.dimension);
        if (acc) {
          otherCount += acc.count;
          otherSumVisits += acc.sumVisits;
          if (acc.maxVisits > otherMaxVisits) otherMaxVisits = acc.maxVisits;
          for (const d of acc.domains) otherDomains.add(d);

          if (config.splitBy) {
            for (const [sKey, sEntry] of acc.splitMap) {
              let target = otherSplitMap.get(sKey);
              if (!target) {
                target = { count: 0, sumVisits: 0, maxVisits: 0, domains: new Set<string>() };
                otherSplitMap.set(sKey, target);
              }
              target.count += sEntry.count;
              target.sumVisits += sEntry.sumVisits;
              if (sEntry.maxVisits > target.maxVisits) target.maxVisits = sEntry.maxVisits;
              for (const d of sEntry.domains) target.domains.add(d);
            }
          }
        }
      }

      const otherValue = calculateMeasureValue(
        { count: otherCount, sumVisits: otherSumVisits, maxVisits: otherMaxVisits, domains: otherDomains },
        config.measure,
        totalFilteredCount
      );

      let otherSeriesValues: Record<string, number> | undefined;
      if (config.splitBy && seriesList.length > 0) {
        otherSeriesValues = {};
        for (const s of seriesList) {
          const sAcc = otherSplitMap.get(s);
          otherSeriesValues[s] = sAcc ? calculateMeasureValue(sAcc, config.measure, totalFilteredCount) : 0;
        }
      }

      const otherRow: VizRow = {
        dimension: "Other",
        value: otherValue,
        formattedValue: formatValue(otherValue, config.measure, prefix, suffix),
        count: otherCount,
        isOther: true,
        seriesValues: otherSeriesValues,
      };

      finalRows = [...topRows, otherRow];
    } else {
      finalRows = topRows;
    }
  } else {
    finalRows = calculatedRows;
  }

  // 6. Grand total measure
  let grandTotalMeasure = 0;
  if (config.measure === "count" || config.measure === "sum_visits") {
    grandTotalMeasure = finalRows.reduce((sum, r) => sum + r.value, 0);
  } else if (config.measure === "percent_of_total" && !isMultiValued) {
    grandTotalMeasure = Number(finalRows.reduce((sum, r) => sum + r.value, 0).toFixed(1));
  } else {
    grandTotalMeasure = calculateMeasureValue(
      {
        count: totalFilteredCount,
        sumVisits: filteredBookmarks.reduce((s, b) => s + (b.visitCount || 0), 0),
        maxVisits: filteredBookmarks.reduce((m, b) => Math.max(m, b.visitCount || 0), 0),
        domains: new Set(filteredBookmarks.map((b) => (b.domain ? b.domain.toLowerCase() : "unknown"))),
      },
      config.measure,
      totalFilteredCount
    );
  }

  return {
    rows: finalRows,
    series: seriesList,
    totalCount: totalFilteredCount,
    grandTotalMeasure,
    isMultiValued,
  };
}
