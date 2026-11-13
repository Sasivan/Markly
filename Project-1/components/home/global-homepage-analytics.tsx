"use client";

import * as React from "react";
import {
  Folder,
  Tag,
  Layers,
  Calendar,
  Sparkles,
  MousePointerClick,
  PlusCircle,
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
}

const CATEGORY_PALETTE = [
  { stroke: "#3b82f6", fill: "#3b82f6", gradId: "catGrad1" }, // Blue
  { stroke: "#6366f1", fill: "#6366f1", gradId: "catGrad2" }, // Indigo
  { stroke: "#0ea5e9", fill: "#0ea5e9", gradId: "catGrad3" }, // Sky
  { stroke: "#8b5cf6", fill: "#8b5cf6", gradId: "catGrad4" }, // Purple
  { stroke: "#14b8a6", fill: "#14b8a6", gradId: "catGrad5" }, // Teal
];

const TAG_PALETTE = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#14b8a6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
];

export function GlobalHomepageAnalytics({
  bookmarks,
  folders,
  folderTree,
  onSelectFolder,
  onSelectTag,
}: GlobalHomepageAnalyticsProps) {
  // Activity metric toggle: 'created' vs 'clicked'
  const [activityMetric, setActivityMetric] = React.useState<"visited" | "created">("visited");

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

  return (
    <section className="space-y-6 pt-2 animate-in fade-in duration-300">
      {/* 1. TOP FULL-WIDTH CHART: Bookmarking Activity Over Time — Top 5 Categories (Stacked) */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">📚</span>
              <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Bookmarking Activity Over Time — Top Categories (Stacked)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Monthly site visit volume by category — see how often sites inside each folder and subfolder are accessed over time
            </p>
          </div>

          {/* Metric Toggle: Visited Sites vs Created */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActivityMetric("visited")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                activityMetric === "visited"
                  ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MousePointerClick className="h-3 w-3" />
              <span>Visited Sites</span>
            </button>
            <button
              type="button"
              onClick={() => setActivityMetric("created")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                activityMetric === "created"
                  ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <PlusCircle className="h-3 w-3" />
              <span>Created</span>
            </button>
          </div>
        </div>

        {/* Stacked Stream Area Chart */}
        <div className="h-68 w-full pt-1">
          {monthlyActivityData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No activity recorded for this period yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyActivityData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  {CATEGORY_PALETTE.map((pal) => (
                    <linearGradient key={pal.gradId} id={pal.gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={pal.fill} stopOpacity={0.65} />
                      <stop offset="95%" stopColor={pal.fill} stopOpacity={0.06} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-xl text-xs space-y-2 min-w-44 text-slate-900 dark:text-white">
                          <div className="font-bold border-b border-slate-100 dark:border-neutral-800 pb-1.5 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                            Month: {label}
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry: any, i: number) => (
                              <div key={`tip-${i}`} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.stroke }} />
                                  {entry.name}
                                </span>
                                <span className="font-mono font-semibold">{entry.value}</span>
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
                      strokeWidth={2}
                      fill={`url(#${pal.gradId})`}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 dark:text-neutral-400 pt-2 border-t border-slate-100 dark:border-neutral-800">
          {parentCategories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => cat.id !== "unsorted" && onSelectFolder(cat.id)}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              <span
                className="h-2.5 w-2.5 rounded-xs flex-shrink-0"
                style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length].stroke }}
              />
              <span>{cat.name}</span>
              <span className="font-mono text-[10px] text-slate-400">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. BOTTOM ROW: Category Fingerprint (Parent Folders) & Tag Distribution (Real Tags) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Category Fingerprint (Radar Chart with Parent Folders) */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">❄️</span>
              <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Category Fingerprint
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Parent categories by total bookmark volume — your library intellectual shape
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center py-2">
            {categoryFingerprint.length < 3 ? (
              <div className="text-xs text-slate-400 text-center p-4">
                Create at least 3 folders or tags to render your category fingerprint.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryFingerprint} outerRadius="75%">
                  <PolarGrid stroke="currentColor" opacity={0.15} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <PolarRadiusAxis stroke="#94a3b8" tick={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 shadow-xl text-xs text-slate-900 dark:text-white">
                            <span className="font-bold block">{d.category}</span>
                            <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                              {d.count} {d.count === 1 ? "bookmark" : "bookmarks"}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Radar
                    name="Bookmarks"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-neutral-400 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <span className="h-2 w-2 rounded-xs bg-[#3b82f6]" />
            <span>Parent Categories Volume</span>
          </div>
        </div>

        {/* Right: Tag Distribution (Donut Chart using Real Tags) */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  Tag Distribution
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Share of collection across your top active tags
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-slate-200 dark:border-neutral-700">
              {tagDistribution.length} tags
            </span>
          </div>

          {/* Donut Chart + Right Legend */}
          {tagDistribution.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400 text-center">
              No tags found on your bookmarks yet. Tag items to visualize their distribution here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center min-h-52">
              {/* Center Donut */}
              <div className="h-52 w-full flex items-center justify-center">
                <PieChart width={200} height={200}>
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
                  >
                    {tagDistribution.map((item, index) => (
                      <Cell key={`tag-donut-${index}`} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 shadow-xl text-xs text-slate-900 dark:text-white">
                            <span className="font-bold block">#{item.tag}</span>
                            <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                              {item.count} {item.count === 1 ? "bookmark" : "bookmarks"} ({item.percentage}%)
                            </span>
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
                    className="w-full flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-xs flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-slate-700 dark:text-neutral-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        #{item.tag}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px] ml-2 flex-shrink-0">
                      {item.percentage}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Pills with Tag & Counts */}
          {tagDistribution.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-neutral-800 text-[11px] font-mono">
              {tagDistribution.map((item) => (
                <button
                  type="button"
                  key={`pill-tag-${item.tag}`}
                  onClick={() => onSelectTag?.(item.tag)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 cursor-pointer transition-colors"
                >
                  <span>#{item.tag}: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
