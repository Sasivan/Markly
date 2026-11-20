import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import type { ObservablePlotConfig, ObservablePlotType, ObservableCurveType } from "@/components/viz/observable-plot-view";

export type PlotDimension =
  | "domain"
  | "folder"
  | "status"
  | "favorite"
  | "archived"
  | "month"
  | "week"
  | "dayOfWeek"
  | "year"
  | "protocol"
  | "tld"
  | "tag"
  | "hasNotes"
  | "urlDepth"
  | "recency"
  | "visitBucket";

export type PlotMeasure =
  | "count"
  | "sum_visits"
  | "avg_visits"
  | "max_visits"
  | "median_visits"
  | "stale_days"
  | "tag_count"
  | "title_length";

export type PlotTransform = "raw" | "percentage" | "cumulative" | "log";
export type PlotSortOrder = "desc" | "asc" | "alpha" | "chrono";

export interface PlotFilterConstraints {
  folderId?: string | "all";
  onlyFavorites?: boolean;
  onlyAlive?: boolean;
  excludeArchived?: boolean;
  minVisits?: number;
  protocol?: "all" | "https" | "http";
  searchQuery?: string;
}

export interface ComprehensivePlotConfig {
  type: ObservablePlotType;
  dimension: PlotDimension;
  measure: PlotMeasure;
  group?: PlotDimension | "none";
  transform?: PlotTransform;
  sortOrder?: PlotSortOrder;
  limit?: number | "all";
  filters?: PlotFilterConstraints;
  colorScheme?: string;
  curve?: ObservableCurveType;
  showGrid?: boolean;
  showTip?: boolean;
  showLegend?: boolean;
  crosshair?: boolean;
}

export interface ComputedPlotRow {
  dimension: string;
  group: string;
  value: number;
  count: number;
  x: any;
  y: any;
  z?: string;
}

export function computePlotData(
  bookmarks: BookmarkWithDetails[],
  folders: Folder[],
  config: ComprehensivePlotConfig
): ComputedPlotRow[] {
  const {
    dimension = "domain",
    measure = "count",
    group = "none",
    transform = "raw",
    sortOrder = "desc",
    limit = 10,
    filters = {},
    type,
  } = config;

  // 1. Filter bookmarks according to database constraints
  let filtered = bookmarks.slice();

  if (filters.excludeArchived !== false) {
    filtered = filtered.filter((b) => !b.isArchived);
  }
  if (filters.onlyFavorites) {
    filtered = filtered.filter((b) => b.isFavorite);
  }
  if (filters.onlyAlive) {
    filtered = filtered.filter((b) => b.status === "alive");
  }
  if (filters.folderId && filters.folderId !== "all") {
    filtered = filtered.filter((b) => b.folderId === filters.folderId);
  }
  if (typeof filters.minVisits === "number" && filters.minVisits > 0) {
    const min = filters.minVisits;
    filtered = filtered.filter((b) => (b.visitCount || 0) >= min);
  }
  if (filters.protocol && filters.protocol !== "all") {
    const isHttps = filters.protocol === "https";
    filtered = filtered.filter((b) => (b.url || "").startsWith(isHttps ? "https" : "http"));
  }
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (b) =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.url || "").toLowerCase().includes(q) ||
        (b.domain || "").toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) return [];

  const now = Date.now();

  // Helper to extract dimension key from bookmark
  const getDimKey = (b: BookmarkWithDetails, dim: PlotDimension): string => {
    switch (dim) {
      case "domain":
        return b.domain || "Unknown";
      case "folder":
        return folders.find((f) => f.id === b.folderId)?.name || "Inbox / Unfiled";
      case "status":
        return b.status === "alive" ? "Alive (200)" : b.status === "dead" ? "Dead / Error" : "Pending";
      case "favorite":
        return b.isFavorite ? "Starred" : "Standard";
      case "archived":
        return b.isArchived ? "Archived" : "Active";
      case "month":
        return new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      case "week": {
        const d = new Date(b.createdAt);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        return `W${weekNum} '${String(d.getFullYear()).slice(2)}`;
      }
      case "dayOfWeek":
        return new Date(b.createdAt).toLocaleDateString("en-US", { weekday: "short" });
      case "year":
        return String(new Date(b.createdAt).getFullYear());
      case "protocol":
        return (b.url || "").startsWith("https") ? "HTTPS" : "HTTP";
      case "tld": {
        const parts = (b.domain || "").split(".");
        return parts.length > 1 ? `.${parts[parts.length - 1]}` : ".other";
      }
      case "tag": {
        const firstTag = (b.tags || [])[0];
        return firstTag ? (typeof firstTag === "string" ? firstTag : firstTag.name) : "Untagged";
      }
      case "hasNotes":
        return b.notes && b.notes.trim().length > 0 ? "With Notes" : "No Notes";
      case "urlDepth": {
        try {
          const path = new URL(b.url).pathname;
          const segments = path.split("/").filter(Boolean);
          if (segments.length === 0) return "Root (/)";
          if (segments.length === 1) return "1-Level (/a)";
          if (segments.length === 2) return "2-Levels (/a/b)";
          return "Deep (3+ Levels)";
        } catch {
          return "Root (/)";
        }
      }
      case "recency": {
        const ts = b.lastVisitedAt || b.lastClickedAt || b.createdAt;
        const diffDays = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) return "Past 24h";
        if (diffDays <= 7) return "Past 7 Days";
        if (diffDays <= 30) return "Past Month";
        return "Older (> 30d)";
      }
      case "visitBucket": {
        const v = b.visitCount || 0;
        if (v === 0) return "0 visits";
        if (v <= 5) return "1 – 5 visits";
        if (v <= 20) return "6 – 20 visits";
        if (v <= 50) return "21 – 50 visits";
        return "50+ Heavy";
      }
      default:
        return b.domain || "Unknown";
    }
  };

  // 2. Aggregate data
  type AggBucket = {
    count: number;
    sumVisits: number;
    maxVisits: number;
    visitsList: number[];
    staleDaysList: number[];
    tagCounts: number[];
    titleLengths: number[];
    group?: string;
  };

  const map = new Map<string, AggBucket>();

  filtered.forEach((b) => {
    const dimKey = getDimKey(b, dimension);
    const groupKey = group && group !== "none" ? getDimKey(b, group) : undefined;
    const compositeKey = groupKey ? `${dimKey}___${groupKey}` : dimKey;

    const visits = b.visitCount || 0;
    const ts = b.lastVisitedAt || b.lastClickedAt || b.createdAt;
    const staleDays = Math.max(0, Math.floor((now - ts) / (1000 * 60 * 60 * 24)));
    const tagCount = (b.tags || []).length;
    const titleLen = (b.title || "").length;

    const curr = map.get(compositeKey) || {
      count: 0,
      sumVisits: 0,
      maxVisits: 0,
      visitsList: [],
      staleDaysList: [],
      tagCounts: [],
      titleLengths: [],
      group: groupKey,
    };

    curr.count += 1;
    curr.sumVisits += visits;
    curr.maxVisits = Math.max(curr.maxVisits, visits);
    curr.visitsList.push(visits);
    curr.staleDaysList.push(staleDays);
    curr.tagCounts.push(tagCount);
    curr.titleLengths.push(titleLen);

    map.set(compositeKey, curr);
  });

  const computeMetric = (b: AggBucket): number => {
    switch (measure) {
      case "count":
        return b.count;
      case "sum_visits":
        return b.sumVisits;
      case "avg_visits":
        return Math.round((b.sumVisits / Math.max(b.count, 1)) * 10) / 10;
      case "max_visits":
        return b.maxVisits;
      case "median_visits": {
        const sorted = [...b.visitsList].sort((x, y) => x - y);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
      }
      case "stale_days": {
        const avg = b.staleDaysList.reduce((acc, v) => acc + v, 0) / Math.max(b.count, 1);
        return Math.round(avg * 10) / 10;
      }
      case "tag_count": {
        const avg = b.tagCounts.reduce((acc, v) => acc + v, 0) / Math.max(b.count, 1);
        return Math.round(avg * 10) / 10;
      }
      case "title_length": {
        const avg = b.titleLengths.reduce((acc, v) => acc + v, 0) / Math.max(b.count, 1);
        return Math.round(avg * 10) / 10;
      }
      default:
        return b.count;
    }
  };

  let totalMetric = 0;
  map.forEach((b) => {
    totalMetric += computeMetric(b);
  });

  const isHorizontal = type === "barX" || type === "stackedBarX";

  let result: ComputedPlotRow[] = Array.from(map.entries()).map(([compKey, b]) => {
    const [dimKey] = compKey.split("___");
    let val = computeMetric(b);

    if (transform === "percentage") {
      val = totalMetric > 0 ? Math.round((val / totalMetric) * 1000) / 10 : 0;
    } else if (transform === "log") {
      val = Math.round(Math.log10(Math.max(1, val)) * 100) / 100;
    }

    return {
      dimension: dimKey,
      group: b.group || dimKey,
      value: val,
      count: b.count,
      x: isHorizontal ? val : dimKey,
      y: isHorizontal ? dimKey : val,
      z: b.group,
    };
  });

  // 3. Sorting
  if (sortOrder === "desc") {
    result.sort((a, b) => b.value - a.value);
  } else if (sortOrder === "asc") {
    result.sort((a, b) => a.value - b.value);
  } else if (sortOrder === "alpha") {
    result.sort((a, b) => a.dimension.localeCompare(b.dimension));
  }

  // Cumulative running total if requested
  if (transform === "cumulative") {
    let run = 0;
    result = result.map((r) => {
      run += r.value;
      const finalVal = Math.round(run * 10) / 10;
      return {
        ...r,
        value: finalVal,
        x: isHorizontal ? finalVal : r.dimension,
        y: isHorizontal ? r.dimension : finalVal,
      };
    });
  }

  // 4. Limit / Top N
  if (limit !== "all" && typeof limit === "number") {
    result = result.slice(0, limit);
  }

  return result;
}
