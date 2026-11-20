"use client";

import * as React from "react";
import {
  Folder,
  Tag,
  Layers,
  Calendar,
  BookOpen,
  Folders,
  MousePointerClick,
  PlusCircle,
  Globe,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Folder as FolderType, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

interface GlobalHomepageAnalyticsProps {
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectDomain?: (domain: string) => void;
  initialViewMode?: "velocity" | "domains" | "categories" | "radar" | "tags";
}

const CATEGORY_PALETTE = [
  { stroke: "#2563eb", fill: "#2563eb", gradId: "catGrad1" }, // Primary Blue
  { stroke: "#475569", fill: "#475569", gradId: "catGrad2" }, // Slate
  { stroke: "#0d9488", fill: "#0d9488", gradId: "catGrad3" }, // Teal
  { stroke: "#6366f1", fill: "#6366f1", gradId: "catGrad4" }, // Indigo
  { stroke: "#78716c", fill: "#78716c", gradId: "catGrad5" }, // Warm Stone
];

const TAG_PALETTE = [
  "#2563eb",
  "#475569",
  "#0d9488",
  "#6366f1",
  "#64748b",
  "#d97706",
  "#0284c7",
  "#78716c",
];

export function GlobalHomepageAnalytics({
  bookmarks,
  folders,
  folderTree,
  onSelectFolder,
  onSelectTag,
  onSelectDomain,
  initialViewMode,
}: GlobalHomepageAnalyticsProps) {
  // Activity metric toggle: 'created' vs 'clicked'
  const [activityMetric, setActivityMetric] = React.useState<"visited" | "created">("visited");
  const [chartViewMode, setChartViewMode] = React.useState<"velocity" | "domains" | "categories">(
    initialViewMode === "velocity" || initialViewMode === "domains" || initialViewMode === "categories"
      ? initialViewMode
      : "velocity"
  );

  // 1. Identify Top Parent Folders (Root Categories) using real folder tree & descendant counts
  const parentCategories = React.useMemo(() => {
    // Collect root folders (folders without parentId)
    const rootNodes = folderTree.length > 0
      ? folderTree
      : folders.filter((f) => !(f.parentId ?? (f as any).parent_id)).map((f) => ({ id: f.id, name: f.name, children: [] }));

    // Helper to get all descendant IDs recursively
    const getDescendants = (nodeId: string): string[] => {
      const ids: string[] = [nodeId];
      const findChildren = (parentId: string) => {
        const directChildren = folders.filter((f) => (f.parentId ?? (f as any).parent_id) === parentId);
        for (const child of directChildren) {
          ids.push(child.id);
          findChildren(child.id);
        }
      };
      findChildren(nodeId);
      return ids;
    };

    const categories = rootNodes.map((root) => {
      const allSubIds = getDescendants(root.id);
      const count = bookmarks.filter((b) => !b.isArchived && b.folderId && allSubIds.includes(b.folderId)).length;
      return {
        id: root.id,
        name: root.name,
        allFolderIds: allSubIds,
        count,
      };
    }).sort((a, b) => b.count - a.count);

    // Unsorted count
    const unsortedCount = bookmarks.filter((b) => !b.isArchived && !b.folderId).length;
    if (unsortedCount > 0) {
      categories.push({
        id: "unsorted",
        name: "Inbox / Unsorted",
        allFolderIds: [],
        count: unsortedCount,
      });
    }

    return categories.slice(0, 5);
  }, [folderTree, folders, bookmarks]);

  // 2. Real Monthly Bookmarking Activity by Category (Stacked Area based on inside site visits)
  const monthlyActivityData = React.useMemo(() => {
    if (bookmarks.length === 0 || parentCategories.length === 0) return [];

    // Map timestamps to month string "YYYY-MM"
    const monthSet = new Set<string>();
    const bookmarkDataList = bookmarks
      .filter((b) => !b.isArchived)
      .map((b) => {
        const ts = activityMetric === "created" 
          ? b.createdAt 
          : (b.lastClickedAt || b.lastVisitedAt || b.createdAt);
        const d = new Date(ts);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthSet.add(monthKey);
        
        // Number of times the site was visited
        const visitCount = activityMetric === "visited" 
          ? Math.max(b.visitCount || 0, 1) 
          : 1;

        return {
          monthKey,
          folderId: b.folderId,
          visitCount,
        };
      });

    // Ensure at least past 6 months are present in chronological order
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}`;
      monthSet.add(mStr);
    }

    const sortedMonths = Array.from(monthSet).sort();

    return sortedMonths.map((m) => {
      const row: Record<string, any> = { month: m };
      let monthTotal = 0;

      parentCategories.forEach((cat) => {
        let categoryVolume = 0;
        if (cat.id === "unsorted") {
          categoryVolume = bookmarkDataList
            .filter((b) => b.monthKey === m && !b.folderId)
            .reduce((sum, b) => sum + b.visitCount, 0);
        } else {
          categoryVolume = bookmarkDataList
            .filter((b) => b.monthKey === m && b.folderId && cat.allFolderIds.includes(b.folderId))
            .reduce((sum, b) => sum + b.visitCount, 0);
        }
        row[cat.name] = categoryVolume;
        monthTotal += categoryVolume;
      });

      row.total = monthTotal;
      return row;
    });
  }, [bookmarks, parentCategories, activityMetric]);

  // 2.5: Main Chart Mode: "velocity" (Activity Velocity), "domains" (Top Ecosystems), "categories" (Folder Categories)
  // initialized at component top

  const velocityData = React.useMemo(() => {
    if (bookmarks.length === 0) return [];
    const monthSet = new Set<string>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSet.add(`${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}`);
    }

    const map = new Map<string, { month: string; visits: number; created: number; uniqueSites: Set<string> }>();
    for (const m of monthSet) {
      map.set(m, { month: m, visits: 0, created: 0, uniqueSites: new Set() });
    }

    bookmarks.forEach((b) => {
      if (b.isArchived) return;
      const createdDate = new Date(b.createdAt);
      const createdKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
      if (map.has(createdKey)) {
        map.get(createdKey)!.created += 1;
      }

      const visitTs = b.lastClickedAt || b.lastVisitedAt;
      if (visitTs) {
        const visitDate = new Date(visitTs);
        const visitKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, "0")}`;
        if (map.has(visitKey)) {
          const entry = map.get(visitKey)!;
          entry.visits += Math.max(b.visitCount || 0, 1);
          entry.uniqueSites.add(b.id);
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        month: row.month,
        "Total Visits": row.visits,
        "New Bookmarks": row.created,
        "Active Sites": row.uniqueSites.size,
      }));
  }, [bookmarks]);

  const domainTimeline = React.useMemo(() => {
    if (bookmarks.length === 0) return { data: [], topDomains: [] };
    const domainCounts = new Map<string, number>();
    bookmarks.forEach((b) => {
      if (!b.isArchived && b.domain) {
        domainCounts.set(b.domain, (domainCounts.get(b.domain) || 0) + (b.visitCount || 1));
      }
    });

    const topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);

    const monthSet = new Set<string>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSet.add(`${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}`);
    }

    const sortedMonths = Array.from(monthSet).sort();
    const data = sortedMonths.map((m) => {
      const row: Record<string, any> = { month: m };
      topDomains.forEach((dom) => {
        const count = bookmarks
          .filter((b) => {
            if (b.isArchived || b.domain !== dom) return false;
            const ts = b.lastClickedAt || b.lastVisitedAt || b.createdAt;
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === m;
          })
          .reduce((sum, b) => sum + (b.visitCount || 1), 0);
        row[dom] = count;
      });
      return row;
    });

    return { data, topDomains };
  }, [bookmarks]);

  // 3. Category Fingerprint using REAL Parent Folders
  const categoryFingerprint = React.useMemo(() => {
    const list: { category: string; count: number }[] = [];

    // Calculate real counts for root/parent folders
    const rootFolders = folders.filter((f) => !(f.parentId ?? (f as any).parent_id));
    for (const rf of rootFolders) {
      // Find all subfolder IDs
      const subIds: string[] = [rf.id];
      const traverse = (pId: string) => {
        for (const child of folders.filter((x) => (x.parentId ?? (x as any).parent_id) === pId)) {
          subIds.push(child.id);
          traverse(child.id);
        }
      };
      traverse(rf.id);

      const count = bookmarks.filter((b) => !b.isArchived && b.folderId && subIds.includes(b.folderId)).length;
      list.push({ category: rf.name, count });
    }

    // Include unsorted if needed
    const unsortedCount = bookmarks.filter((b) => !b.isArchived && !b.folderId).length;
    if (unsortedCount > 0) {
      list.push({ category: "Inbox", count: unsortedCount });
    }

    // Sort by count desc
    list.sort((a, b) => b.count - a.count);

    // Radar charts need at least 3 points to form a polygon
    if (list.length < 3) {
      const topTags = new Map<string, number>();
      for (const b of bookmarks) {
        for (const t of b.tags || []) {
          topTags.set(t.name, (topTags.get(t.name) || 0) + 1);
        }
      }
      for (const [tName, tCount] of topTags.entries()) {
        if (list.length < 6 && !list.some((x) => x.category.toLowerCase() === tName.toLowerCase())) {
          list.push({ category: `#${tName}`, count: tCount });
        }
      }
    }

    return list.slice(0, 6);
  }, [folders, bookmarks]);

  // 4. Tag Distribution Donut Chart using REAL Tags
  const tagDistribution = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      if (bm.isArchived) continue;
      for (const t of bm.tags || []) {
        map.set(t.name, (map.get(t.name) || 0) + 1);
      }
    }

    const sorted = Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const total = sorted.reduce((sum, item) => sum + item.count, 0) || 1;

    return sorted.map((item, idx) => ({
      ...item,
      color: TAG_PALETTE[idx % TAG_PALETTE.length],
      percentage: ((item.count / total) * 100).toFixed(1),
    }));
  }, [bookmarks]);

  // Standalone Modular Widget 1: Radar Chart
  if (initialViewMode === "radar") {
    return (
      <div className="space-y-3 flex flex-col justify-between py-1">
        <div className="h-64 w-full flex items-center justify-center py-2">
          {categoryFingerprint.length < 3 ? (
            <div className="text-xs text-muted-foreground text-center p-4">
              Create at least 3 folders or tags to render your category fingerprint.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={categoryFingerprint}
                outerRadius="75%"
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const cat = e.activePayload[0].payload?.category?.replace(/^#/, "");
                    const foundFolder = folders.find((f) => f.name.toLowerCase() === cat?.toLowerCase());
                    if (foundFolder) {
                      onSelectFolder(foundFolder.id);
                    } else if (cat && onSelectTag) {
                      onSelectTag(cat);
                    }
                  }
                }}
              >
                <PolarGrid stroke="currentColor" opacity={0.1} />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "currentColor", fontSize: 11, cursor: "pointer" }}
                  onClick={(entry: any) => {
                    const cat = entry?.value?.replace(/^#/, "");
                    const foundFolder = folders.find((f) => f.name.toLowerCase() === cat?.toLowerCase());
                    if (foundFolder) {
                      onSelectFolder(foundFolder.id);
                    } else if (cat && onSelectTag) {
                      onSelectTag(cat);
                    }
                  }}
                />
                <PolarRadiusAxis stroke="currentColor" strokeOpacity={0.15} tick={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-card p-2.5 shadow-raised text-xs text-card-foreground">
                          <span className="font-medium block text-foreground">{d.category}</span>
                          <span className="text-muted-foreground font-mono tabular-nums text-xs">
                            {d.count} {d.count === 1 ? "bookmark" : "bookmarks"}
                          </span>
                          <span className="text-3xs text-primary block mt-1">Click to open folder</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="Bookmarks"
                  dataKey="count"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  cursor="pointer"
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Clickable Category Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-border">
          {categoryFingerprint.map((item) => {
            const cleanName = item.category.replace(/^#/, "");
            const folder = folders.find((f) => f.name.toLowerCase() === cleanName.toLowerCase());
            return (
              <button
                type="button"
                key={`radar-chip-${item.category}`}
                onClick={() => {
                  if (folder) onSelectFolder(folder.id);
                  else if (onSelectTag) onSelectTag(cleanName);
                }}
                className="px-2 py-0.5 rounded-md bg-secondary hover:bg-muted border border-border text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors outline-none focus:outline-none"
                title={`Open ${item.category}`}
              >
                <span>{item.category}: </span>
                <span className="font-semibold text-foreground">{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Standalone Modular Widget 2: Tag Distribution Donut
  if (initialViewMode === "tags") {
    return (
      <div className="space-y-4 flex flex-col justify-between py-1">
        {tagDistribution.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-xs text-muted-foreground text-center">
            No tags found on your bookmarks yet. Tag items to visualize their distribution here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center min-h-52">
            <div className="h-52 w-full flex items-center justify-center">
              <PieChart width={200} height={200} style={{ outline: "none" }}>
                <Pie
                  isAnimationActive={false}
                  data={tagDistribution}
                  dataKey="count"
                  nameKey="tag"
                  cx={100}
                  cy={100}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  cursor="pointer"
                  onClick={(entry: any) => onSelectTag && entry?.tag && onSelectTag(entry.tag)}
                  style={{ outline: "none" }}
                >
                  {tagDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.tag}-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-card p-2 shadow-raised text-xs text-card-foreground">
                          <span className="font-medium block text-foreground">#{data.tag}</span>
                          <span className="text-muted-foreground font-mono tabular-nums text-xs">
                            {data.count} ({data.percentage}%)
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {tagDistribution.map((item) => (
                <button
                  type="button"
                  key={`tag-legend-${item.tag}`}
                  onClick={() => onSelectTag && onSelectTag(item.tag)}
                  className="flex items-center justify-between text-xs hover:bg-secondary/60 p-1.5 rounded-md cursor-pointer transition-colors group outline-none"
                  title={`Filter by tag #${item.tag}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground group-hover:text-foreground font-medium truncate">
                      #{item.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-xs text-muted-foreground">
                    <span className="tabular-nums font-semibold text-foreground">{item.count}</span>
                    <span className="text-3xs">({item.percentage}%)</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standalone Modular Widget 3 & 4: Velocity or Domains Area Charts
  if (initialViewMode === "velocity" || initialViewMode === "domains" || initialViewMode === "categories") {
    return (
      <div className="space-y-3 py-1">
        <div className="h-64 w-full pt-1">
          {chartViewMode === "velocity" && (
            velocityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No bookmark history recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velVisitsStandalone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="velCreatedStandalone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-border bg-card p-3 shadow-raised text-xs space-y-2 min-w-44 text-card-foreground">
                            <div className="font-medium border-b border-border pb-1 font-mono text-xs text-muted-foreground">
                              Month: {label}
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={`v-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.stroke }} />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono tabular-nums font-semibold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="Total Visits" stroke="#2563eb" strokeWidth={2} fill="url(#velVisitsStandalone)" />
                  <Area type="monotone" dataKey="New Bookmarks" stroke="#0d9488" strokeWidth={2} fill="url(#velCreatedStandalone)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          )}

          {chartViewMode === "domains" && (
            domainTimeline.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No domain activity recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={domainTimeline.data}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      const topDomainEntry = e.activePayload[0];
                      if (topDomainEntry && topDomainEntry.name && onSelectDomain) {
                        onSelectDomain(topDomainEntry.name);
                      }
                    }
                  }}
                >
                  <defs>
                    {CATEGORY_PALETTE.map((pal) => (
                      <linearGradient key={`standalone_dom_${pal.gradId}`} id={`standalone_dom_${pal.gradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pal.fill} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={pal.fill} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-border bg-card p-3 shadow-raised text-xs space-y-2 min-w-44 text-card-foreground">
                            <div className="font-medium border-b border-border pb-1 font-mono text-xs text-muted-foreground flex items-center justify-between">
                              <span>Month: {label}</span>
                              <span className="text-3xs text-teal-600">Click to filter</span>
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={`dom-tip-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.stroke }} />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono tabular-nums font-semibold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {domainTimeline.topDomains.map((dom, idx) => {
                    const pal = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    return (
                      <Area
                        key={dom}
                        type="monotone"
                        dataKey={dom}
                        stackId="1"
                        stroke={pal.stroke}
                        strokeWidth={1.5}
                        fill={`url(#standalone_dom_${pal.gradId})`}
                        cursor="pointer"
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )
          )}
        </div>

        {/* Dynamic Legend Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted-foreground pt-2 border-t border-border">
          {chartViewMode === "velocity" && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-primary" />
                <span>Total Visits</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-primary" />
                <span>New Bookmarks Added</span>
              </div>
            </>
          )}

          {chartViewMode === "domains" && (
            domainTimeline.topDomains.map((dom, idx) => (
              <button
                key={dom}
                type="button"
                onClick={() => onSelectDomain?.(dom)}
                className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors outline-none"
              >
                <span
                  className="h-2.5 w-2.5 rounded-xs flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length].stroke }}
                />
                <span>{dom}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6 pt-2 mk-fade-in select-text">
      {/* 1. TOP FULL-WIDTH CHART: Actionable Knowledge & Interaction Analytics */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm tracking-tight text-foreground">
                {chartViewMode === "velocity" && "Research Velocity & Knowledge Activity Momentum"}
                {chartViewMode === "domains" && "Top Web Ecosystems & Platform Activity Over Time"}
                {chartViewMode === "categories" && "Folder Category Distribution Over Time (Stacked)"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {chartViewMode === "velocity" && "Chronological site interaction momentum — compare verified visits with new additions"}
              {chartViewMode === "domains" && "Activity trajectories across your most frequented developer tools, platforms, and services"}
              {chartViewMode === "categories" && "Monthly site visit volume broken down by top parent folder and collection"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Selector: Velocity vs Domains vs Categories */}
            <div className="flex items-center gap-0.5 bg-secondary p-0.5 rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => setChartViewMode("velocity")}
                className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium transition-colors ${
                  chartViewMode === "velocity"
                    ? "bg-card text-foreground shadow-surface"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Activity Velocity: Visits vs Bookmarks"
              >
                <TrendingUp className="h-3 w-3" />
                <span>Velocity</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("domains")}
                className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium transition-colors ${
                  chartViewMode === "domains"
                    ? "bg-card text-foreground shadow-surface"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Top Domains Activity"
              >
                <Globe className="h-3 w-3" />
                <span>Domains</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("categories")}
                className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium transition-colors ${
                  chartViewMode === "categories"
                    ? "bg-card text-foreground shadow-surface"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Folder Breakdown"
              >
                <Folders className="h-3 w-3" />
                <span>Folders</span>
              </button>
            </div>

            {/* Metric Toggle: Visited Sites vs Created (for Categories mode) */}
            {chartViewMode === "categories" && (
              <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setActivityMetric("visited")}
                  className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium transition-colors ${
                    activityMetric === "visited"
                      ? "bg-card text-foreground shadow-surface"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MousePointerClick className="h-3 w-3" />
                  <span>Visits</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivityMetric("created")}
                  className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium transition-colors ${
                    activityMetric === "created"
                      ? "bg-card text-foreground shadow-surface"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Created</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Area Chart based on chartViewMode */}
        <div className="h-64 w-full pt-1">
          {chartViewMode === "velocity" && (
            velocityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No activity recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="velCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-border bg-card p-3 shadow-raised text-xs space-y-2 min-w-44 text-card-foreground">
                            <div className="font-medium border-b border-border pb-1 font-mono text-xs text-muted-foreground">
                              Month: {label}
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={`v-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.stroke }} />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono tabular-nums font-semibold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="Total Visits" stroke="#2563eb" strokeWidth={2} fill="url(#velVisits)" />
                  <Area type="monotone" dataKey="New Bookmarks" stroke="#0d9488" strokeWidth={2} fill="url(#velCreated)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          )}

          {chartViewMode === "domains" && (
            domainTimeline.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No domain activity recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={domainTimeline.data}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      const domainName = e.activePayload[0].name;
                      onSelectDomain?.(domainName);
                    }
                  }}
                >
                  <defs>
                    {CATEGORY_PALETTE.map((pal) => (
                      <linearGradient key={pal.gradId} id={`dom_${pal.gradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pal.fill} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={pal.fill} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-border bg-card p-3 shadow-raised text-xs space-y-2 min-w-44 text-card-foreground">
                            <div className="font-medium border-b border-border pb-1 font-mono text-xs text-muted-foreground flex items-center justify-between">
                              <span>Month: {label}</span>
                              <span className="text-3xs text-primary">Click to filter</span>
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={`d-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.stroke }} />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono tabular-nums font-semibold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {domainTimeline.topDomains.map((dom, idx) => {
                    const pal = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    return (
                      <Area
                        key={dom}
                        type="monotone"
                        dataKey={dom}
                        stackId="1"
                        stroke={pal.stroke}
                        strokeWidth={1.5}
                        fill={`url(#dom_${pal.gradId})`}
                        cursor="pointer"
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )
          )}

          {chartViewMode === "categories" && (
            monthlyActivityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No activity recorded for this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyActivityData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      const topCategoryEntry = e.activePayload[0];
                      const catName = topCategoryEntry.name;
                      const foundCat = parentCategories.find((c) => c.name === catName);
                      if (foundCat && foundCat.id !== "unsorted") {
                        onSelectFolder(foundCat.id);
                      }
                    }
                  }}
                >
                  <defs>
                    {CATEGORY_PALETTE.map((pal) => (
                      <linearGradient key={pal.gradId} id={pal.gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pal.fill} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={pal.fill} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.15} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-border bg-card p-3 shadow-raised text-xs space-y-2 min-w-44 text-card-foreground">
                            <div className="font-medium border-b border-border pb-1.5 font-mono text-xs text-muted-foreground flex items-center justify-between">
                              <span>Month: {label}</span>
                              <span className="text-3xs text-primary">Click to open folder</span>
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={`tip-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.stroke }} />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono tabular-nums font-semibold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {parentCategories.map((cat, idx) => {
                    const pal = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    return (
                      <Area
                        key={cat.id}
                        type="monotone"
                        dataKey={cat.name}
                        stackId="1"
                        stroke={pal.stroke}
                        strokeWidth={1.5}
                        fill={`url(#${pal.gradId})`}
                        cursor="pointer"
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )
          )}
        </div>

        {/* Dynamic Legend Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted-foreground pt-2 border-t border-border">
          {chartViewMode === "velocity" && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-primary" />
                <span>Total Visits</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-primary" />
                <span>New Bookmarks Added</span>
              </div>
            </>
          )}

          {chartViewMode === "domains" && (
            domainTimeline.topDomains.map((dom, idx) => (
              <button
                key={dom}
                type="button"
                onClick={() => onSelectDomain?.(dom)}
                className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors outline-none"
              >
                <span
                  className="h-2.5 w-2.5 rounded-xs flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length].stroke }}
                />
                <span>{dom}</span>
              </button>
            ))
          )}

          {chartViewMode === "categories" && (
            parentCategories.map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => cat.id !== "unsorted" && onSelectFolder(cat.id)}
                className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors outline-none focus:outline-none"
              >
                <span
                  className="h-2.5 w-2.5 rounded-xs flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length].stroke }}
                />
                <span>{cat.name}</span>
                <span className="font-mono tabular-nums text-xs text-muted-foreground">({cat.count})</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. BOTTOM ROW: Category Fingerprint (Parent Folders) & Tag Distribution (Real Tags) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Category Fingerprint (Radar Chart with Parent Folders) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-surface space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Folders className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm tracking-tight text-foreground">
                Category fingerprint
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Parent categories by total bookmark volume — click any category to open collection
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center py-2">
            {categoryFingerprint.length < 3 ? (
              <div className="text-xs text-muted-foreground text-center p-4">
                Create at least 3 folders or tags to render your category fingerprint.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={categoryFingerprint}
                  outerRadius="75%"
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      const cat = e.activePayload[0].payload?.category?.replace(/^#/, "");
                      const foundFolder = folders.find((f) => f.name.toLowerCase() === cat?.toLowerCase());
                      if (foundFolder) {
                        onSelectFolder(foundFolder.id);
                      } else if (cat && onSelectTag) {
                        onSelectTag(cat);
                      }
                    }
                  }}
                >
                  <PolarGrid stroke="currentColor" opacity={0.1} />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "currentColor", fontSize: 11, cursor: "pointer" }}
                    onClick={(entry: any) => {
                      const cat = entry?.value?.replace(/^#/, "");
                      const foundFolder = folders.find((f) => f.name.toLowerCase() === cat?.toLowerCase());
                      if (foundFolder) {
                        onSelectFolder(foundFolder.id);
                      } else if (cat && onSelectTag) {
                        onSelectTag(cat);
                      }
                    }}
                  />
                  <PolarRadiusAxis stroke="currentColor" strokeOpacity={0.15} tick={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card p-2.5 shadow-raised text-xs text-card-foreground">
                            <span className="font-medium block text-foreground">{d.category}</span>
                            <span className="text-muted-foreground font-mono tabular-nums text-xs">
                              {d.count} {d.count === 1 ? "bookmark" : "bookmarks"}
                            </span>
                            <span className="text-3xs text-primary block mt-1">Click to open folder</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Radar
                    name="Bookmarks"
                    dataKey="count"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                    cursor="pointer"
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Clickable Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-border">
            {categoryFingerprint.map((item) => {
              const cleanName = item.category.replace(/^#/, "");
              const folder = folders.find((f) => f.name.toLowerCase() === cleanName.toLowerCase());
              return (
                <button
                  type="button"
                  key={`radar-chip-${item.category}`}
                  onClick={() => {
                    if (folder) onSelectFolder(folder.id);
                    else if (onSelectTag) onSelectTag(cleanName);
                  }}
                  className="px-2 py-0.5 rounded-md bg-secondary hover:bg-muted border border-border text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors outline-none focus:outline-none"
                  title={`Open ${item.category}`}
                >
                  <span>{item.category}: </span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Tag Distribution (Donut Chart using Real Tags) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-surface space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm tracking-tight text-foreground">
                  Tag distribution
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Share of collection across your top active tags
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border tabular-nums">
              {tagDistribution.length} tags
            </span>
          </div>

          {/* Donut Chart + Right Legend */}
          {tagDistribution.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-muted-foreground text-center">
              No tags found on your bookmarks yet. Tag items to visualize their distribution here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center min-h-52">
              {/* Center Donut */}
              <div className="h-52 w-full flex items-center justify-center">
                <PieChart width={200} height={200} style={{ outline: "none" }}>
                  <Pie
                    isAnimationActive={false}
                    data={tagDistribution}
                    dataKey="count"
                    nameKey="tag"
                    cx={100}
                    cy={100}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(entry: any) => onSelectTag && entry?.tag && onSelectTag(entry.tag)}
                    style={{ outline: "none" }}
                  >
                    {tagDistribution.map((item, index) => (
                      <Cell key={`tag-donut-${index}`} fill={item.color} style={{ outline: "none" }} cursor="pointer" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card p-2.5 shadow-raised text-xs text-card-foreground">
                            <span className="font-medium block text-foreground">#{item.tag}</span>
                            <span className="text-muted-foreground font-mono tabular-nums text-xs">
                              {item.count} {item.count === 1 ? "bookmark" : "bookmarks"} ({item.percentage}%)
                            </span>
                            <span className="text-3xs text-primary block mt-1">Click to filter by #{item.tag}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </div>

              {/* Right Legend Labels with Percentages */}
              <div className="space-y-1.5 text-xs pr-1">
                {tagDistribution.map((item) => (
                  <button
                    type="button"
                    key={item.tag}
                    onClick={() => onSelectTag?.(item.tag)}
                    className="w-full flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-xs flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-foreground font-medium group-hover:text-primary transition-colors">
                        #{item.tag}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-muted-foreground text-xs ml-2 flex-shrink-0">
                      {item.percentage}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Pills with Tag & Counts */}
          {tagDistribution.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border text-xs font-mono tabular-nums">
              {tagDistribution.map((item) => (
                <button
                  type="button"
                  key={`pill-tag-${item.tag}`}
                  onClick={() => onSelectTag?.(item.tag)}
                  className="px-2 py-0.5 rounded-md bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <span>#{item.tag}: </span>
                  <span className="font-medium text-foreground">{item.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
