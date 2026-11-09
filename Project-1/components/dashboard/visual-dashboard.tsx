"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Activity,
  LayoutGrid,
  X,
  Filter,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import type { Folder, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

interface VisualDashboardProps {
  folderTree: FolderTreeNode[];
  folders: Folder[];
  bookmarks: BookmarkWithDetails[];
  stats: {
    totalBookmarks: number;
    totalFolders: number;
    topDomains: { domain: string; count: number }[];
    tagDistribution: { name: string; color: string; count: number }[];
    timeline: { date: string; count: number }[];
  };
  onSelectFolder: (folderId: string) => void;
  activeDomainFilter: string | null;
  onSelectDomain: (domain: string | null) => void;
  activeTagFilter: string | null;
  onSelectTag: (tag: string | null) => void;
}

const PALETTE = [
  "#3b82f6",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function VisualDashboard({
  bookmarks,
  activeDomainFilter,
  onSelectDomain,
  activeTagFilter,
  onSelectTag,
}: VisualDashboardProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"domains" | "tags" | "timeline" | "health" | "wall">("domains");

  // 1. Domains computed strictly from active bookmarks
  const domainData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      const d = bm.domain || "other";
      map.set(d, (map.get(d) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([domain, count]) => ({
        domain,
        count,
        percentage: bookmarks.length > 0 ? Math.round((count / bookmarks.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [bookmarks]);

  // 2. Tags computed strictly from active bookmarks
  const tagData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      for (const t of bm.tags || []) {
        map.set(t.name, (map.get(t.name) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name: `#${name}`,
        rawName: name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bookmarks]);

  // 3. Timeline velocity computed strictly from active bookmarks
  const timelineData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      const d = new Date(bm.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    const sorted = Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return [];

    let runningTotal = 0;
    return sorted.map((item) => {
      runningTotal += item.count;
      return {
        ...item,
        total: runningTotal,
        displayDate: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    });
  }, [bookmarks]);

  // 4. Health & Reachability computed strictly from active bookmarks
  const healthData = React.useMemo(() => {
    let alive = 0;
    let dead = 0;
    let favorites = 0;
    for (const bm of bookmarks) {
      if (bm.status === "dead") dead++;
      else alive++;
      if (bm.isFavorite) favorites++;
    }
    const total = bookmarks.length;
    const alivePercent = total > 0 ? Math.round((alive / total) * 100) : 100;

    return {
      alive,
      dead,
      favorites,
      alivePercent,
      chartData: [
        { name: "Reachable (Alive)", count: alive, color: "#10b981" },
        { name: "Broken (Dead)", count: dead, color: "#ef4444" },
      ],
    };
  }, [bookmarks]);

  return (
    <div className={`rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-3.5 shadow-xs transition-all ${collapsed ? "" : "space-y-3.5"}`}>
      {/* Dashboard Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 ${collapsed ? "" : "border-b border-slate-100 dark:border-neutral-800 pb-3"}`}>
        {/* Left Side: Title & Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-neutral-100">
            <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Visual Analytics & Intelligence</span>
          </div>

          {/* Real-time sync badge */}
          <span className="text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
            {bookmarks.length} active {bookmarks.length === 1 ? "site" : "sites"}
          </span>

          {/* Active Chart Filter Badges */}
          {(activeDomainFilter || activeTagFilter) && (
            <div className="flex items-center gap-1.5 ml-1">
              {activeDomainFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white shadow-2xs">
                  <Filter className="h-2.5 w-2.5" />
                  Domain: {activeDomainFilter}
                  <button type="button" onClick={() => onSelectDomain(null)} className="hover:text-slate-200 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeTagFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-600 text-white shadow-2xs">
                  <Filter className="h-2.5 w-2.5" />
                  Tag: #{activeTagFilter}
                  <button type="button" onClick={() => onSelectTag(null)} className="hover:text-purple-200 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Chart Tabs (when open) + Dedicated Hide/Show Button on the Right */}
        <div className="flex items-center gap-2 ml-auto">
          {/* 5 Influential Chart Tabs */}
          {!collapsed && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-xl text-xs border border-slate-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setActiveTab("domains")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "domains"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <PieIcon className="h-3 w-3" />
                <span>Domains</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tags")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "tags"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <BarChart3 className="h-3 w-3" />
                <span>Topics & Tags</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "timeline"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                <span>Velocity</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("health")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "health"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Link Health</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wall")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "wall"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3 w-3" />
                <span>Favicon Wall</span>
              </button>
            </div>
          )}

          {/* Toggle Button on the Right with Good Icon */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 hover:bg-slate-200 dark:hover:bg-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600 shadow-2xs"
            title={collapsed ? "Show Visual Analytics" : "Hide Visual Analytics"}
          >
            {collapsed ? (
              <>
                <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Show Analytics</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400" />
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400" />
                <span>Hide Analytics</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Analytics Viewport */}
      {!collapsed && (
        <div className="pt-1">
          {/* 1. TOP DOMAINS & TRAFFIC SHARE */}
          {activeTab === "domains" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center min-h-56">
              <div className="h-56 w-full flex items-center justify-center">
                <PieChart width={280} height={220}>
                  <Pie
                    isAnimationActive={false}
                    data={domainData}
                    dataKey="count"
                    nameKey="domain"
                    cx={140}
                    cy={110}
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(entry: any) => onSelectDomain && entry?.domain && onSelectDomain(entry.domain)}
                  >
                    {domainData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 shadow-xl text-xs">
                            <span className="font-bold text-slate-900 dark:text-white block">{item.domain}</span>
                            <span className="text-slate-500 text-[11px]">
                              {item.count} {item.count === 1 ? "bookmark" : "bookmarks"} ({item.percentage}% share)
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </div>

              {/* Ranked Domain List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Active Domain Breakdown (Click to filter)
                </div>
                {domainData.map((d, idx) => (
                  <button
                    type="button"
                    key={d.domain}
                    onClick={() => onSelectDomain(activeDomainFilter === d.domain ? null : d.domain)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      activeDomainFilter === d.domain
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "bg-slate-50 dark:bg-neutral-800/60 hover:bg-slate-100 dark:hover:bg-neutral-700/60 text-slate-700 dark:text-neutral-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                      <span className="truncate font-medium">{d.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono flex-shrink-0">
                      <span>{d.count}</span>
                      <span className="opacity-60">({d.percentage}%)</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. TOPICS & TAGS INTELLIGENCE */}
          {activeTab === "tags" && (
            <div className="min-h-56 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                Topic & Tag Distribution in Current View (Click bar to cross-filter)
              </div>
              {tagData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No tags associated with currently displayed bookmarks.
                </div>
              ) : (
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={tagData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-xl text-xs">
                                <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
                                <span className="text-slate-500 block">{d.count} bookmarks</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#8b5cf6"
                        radius={[0, 6, 6, 0]}
                        cursor="pointer"
                        onClick={(entry: any) => onSelectTag && onSelectTag(entry.rawName)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* 3. VELOCITY & ADDITION TIMELINE */}
          {activeTab === "timeline" && (
            <div className="min-h-56 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                Cumulative Bookmark Velocity Over Time
              </div>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 shadow-xl text-xs">
                              <span className="font-bold text-slate-900 dark:text-white block">{d.date}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                {d.total} total bookmarks
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#velocityGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 4. LINK HEALTH & STATUS GAUGE */}
          {activeTab === "health" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center min-h-56">
              <div className="h-56 w-full flex items-center justify-center">
                <PieChart width={280} height={220}>
                  <Pie
                    isAnimationActive={false}
                    data={healthData.chartData}
                    dataKey="count"
                    nameKey="name"
                    cx={140}
                    cy={110}
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {healthData.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                  Link Health & Reachability Overview
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                        {healthData.alivePercent}% Reachable
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {healthData.alive} bookmarks verified active & alive
                      </div>
                    </div>
                  </div>
                </div>

                {healthData.dead > 0 ? (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <div className="font-bold text-sm text-rose-900 dark:text-rose-200">
                        {healthData.dead} Broken Links
                      </div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-400">
                        Flagged as 404 or unreachable
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/40 text-xs text-slate-600 dark:text-neutral-400">
                    Zero broken links detected in the current view!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. FAVICON WALL MATRIX */}
          {activeTab === "wall" && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                Visual Favicon Wall ({bookmarks.length} sites in current view)
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 max-h-56 overflow-y-auto p-1">
                {bookmarks.map((bm) => (
                  <a
                    key={bm.id}
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-800/40 hover:bg-blue-50 dark:hover:bg-neutral-700 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 group cursor-pointer"
                    title={`${bm.title} (${bm.domain})`}
                  >
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-8 w-8 rounded-lg object-contain bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 p-0.5"
                    />
                    <span className="text-[10px] text-slate-600 dark:text-neutral-400 group-hover:text-blue-600 font-medium truncate w-full text-center">
                      {bm.domain.split(".")[0]}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
