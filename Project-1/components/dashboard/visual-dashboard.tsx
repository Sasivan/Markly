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
  Layers,
  Share2,
  Tag as TagIcon,
  MousePointerClick,
  Sparkles,
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
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
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
  activeFolderId?: string | null;
  includeSubfolders?: boolean;
  onToggleIncludeSubfolders?: (val: boolean) => void;
  activeDomainFilter: string | null;
  onSelectDomain: (domain: string | null) => void;
  activeTagFilter: string | null;
  onSelectTag: (tag: string | null) => void;
  onOpenDomainInsights?: (domain: string) => void;
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
  activeFolderId,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onOpenDomainInsights,
}: VisualDashboardProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"tags" | "engagement" | "health" | "wall" | "graph">("tags");

  // 1. Tags computed strictly for all bookmarks present on this specific page (including nested subfolders)
  const tagData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      for (const t of bm.tags || []) {
        map.set(t.name, (map.get(t.name) || 0) + 1);
      }
    }
    const totalBookmarks = bookmarks.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({
        tag: `#${name}`,
        rawName: name,
        count,
        percentage: Math.round((count / totalBookmarks) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  // 2. Engagement & Interaction Spectrum computed strictly from active bookmarks
  const engagementData = React.useMemo(() => {
    let frequent = 0; // >= 5 visits
    let active = 0; // 2 - 4 visits
    let occasional = 0; // 1 visit
    let dormant = 0; // 0 visits
    let totalVisits = 0;
    let mostVisitedSite: BookmarkWithDetails | null = null;

    for (const bm of bookmarks) {
      const v = bm.visitCount || 0;
      totalVisits += v;
      if (v >= 5) frequent++;
      else if (v >= 2) active++;
      else if (v === 1) occasional++;
      else dormant++;

      if (!mostVisitedSite || v > (mostVisitedSite.visitCount || 0)) {
        mostVisitedSite = bm;
      }
    }

    const total = bookmarks.length || 1;
    const avgVisits = (totalVisits / total).toFixed(1);

    const tiers = [
      { tier: "Frequent (≥5)", count: frequent, percentage: Math.round((frequent / total) * 100), color: "#10b981", desc: "Regularly visited" },
      { tier: "Active (2-4)", count: active, percentage: Math.round((active / total) * 100), color: "#3b82f6", desc: "Frequently used" },
      { tier: "Occasional (1)", count: occasional, percentage: Math.round((occasional / total) * 100), color: "#f59e0b", desc: "Accessed once" },
      { tier: "Dormant (0)", count: dormant, percentage: Math.round((dormant / total) * 100), color: "#8b5cf6", desc: "Never opened" },
    ];

    return {
      tiers,
      totalVisits,
      avgVisits,
      dormantCount: dormant,
      frequentCount: frequent,
      mostVisitedSite,
    };
  }, [bookmarks]);

  // 3. Health & Reachability computed strictly from active bookmarks
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
                onClick={() => setActiveTab("tags")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "tags"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <TagIcon className="h-3 w-3 text-purple-500" />
                <span>Tags ({tagData.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("engagement")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "engagement"
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>Engagement</span>
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

              <button
                type="button"
                onClick={() => setActiveTab("graph")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium ${
                  activeTab === "graph"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>{activeFolderId ? "Nested Knowledge Graph" : "Local Graph"}</span>
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
          {/* 1. ALL TAGS IN VIEW: AREA / LINE GRAPH & INTERACTIVE TAG CHIPS */}
          {activeTab === "tags" && (
            <div className="space-y-4 min-h-56">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Tag Frequency & Distribution ({tagData.length} unique tags in view)
                </div>
                {activeTagFilter && (
                  <button
                    type="button"
                    onClick={() => onSelectTag(null)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {tagData.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                  <TagIcon className="h-5 w-5 text-slate-300 dark:text-neutral-600 mb-1" />
                  <span>No tags found in the current folder or subfolder sites.</span>
                  <span className="text-[11px] text-muted-foreground">Add tags to bookmarks to unlock tag analytics.</span>
                </div>
              ) : (
                <>
                  {/* Area Graph Representing Tags */}
                  <div className="h-48 w-full bg-slate-50/50 dark:bg-neutral-900/40 rounded-xl p-2.5 border border-slate-200/70 dark:border-neutral-800/80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={tagData.slice(0, 16)}
                        margin={{ top: 8, right: 15, left: -20, bottom: 0 }}
                        onClick={(e: any) => {
                          if (e && e.activePayload && e.activePayload.length) {
                            const d = e.activePayload[0].payload;
                            onSelectTag(activeTagFilter === d.rawName ? null : d.rawName);
                          }
                        }}
                      >
                        <defs>
                          <linearGradient id="tagAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                        <XAxis
                          dataKey="tag"
                          tick={{ fontSize: 10 }}
                          stroke="#94a3b8"
                          tickFormatter={(val) => (val.length > 12 ? `${val.slice(0, 10)}…` : val)}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 shadow-xl text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                                    <TagIcon className="h-3.5 w-3.5" />
                                    <span>{d.tag}</span>
                                  </div>
                                  <div className="text-slate-900 dark:text-white font-semibold text-[11px]">
                                    {d.count} {d.count === 1 ? "bookmark" : "bookmarks"} ({d.percentage}% of folder)
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">Click to filter bookmarks below</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#8b5cf6"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#tagAreaGrad)"
                          activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Interactive Tag Chips Matrix (Click to filter table below) */}
                  <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto pt-1">
                    {tagData.map((t) => {
                      const isSelected = activeTagFilter === t.rawName;
                      return (
                        <button
                          type="button"
                          key={t.rawName}
                          onClick={() => onSelectTag(isSelected ? null : t.rawName)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs ring-1 ring-purple-500"
                              : "border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          }`}
                        >
                          <span>{t.tag}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? "bg-purple-700 text-white" : "bg-slate-200 dark:bg-neutral-800 text-muted-foreground"}`}>
                            {t.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 2. ENGAGEMENT & INTERACTION SPECTRUM (Replaces Velocity) */}
          {activeTab === "engagement" && (
            <div className="space-y-4 min-h-56">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Bookmark Engagement & Visit Frequency Tiers
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {engagementData.totalVisits} total visits • {engagementData.avgVisits} avg/site
                </div>
              </div>

              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Visits</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {engagementData.totalVisits}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Avg / Site</span>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {engagementData.avgVisits}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Active (≥2)</span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {engagementData.tiers[0].count + engagementData.tiers[1].count}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Dormant (0)</span>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono">
                    {engagementData.dormantCount}
                  </div>
                </div>
              </div>

              {/* Bar Chart Representing Interaction Tiers */}
              <div className="h-44 w-full bg-slate-50/50 dark:bg-neutral-900/40 rounded-xl p-2.5 border border-slate-200/70 dark:border-neutral-800/80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementData.tiers} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="tier" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 shadow-xl text-xs space-y-1">
                              <span className="font-bold text-slate-900 dark:text-white block">{d.tier}</span>
                              <div className="font-semibold" style={{ color: d.color }}>
                                {d.count} sites ({d.percentage}%)
                              </div>
                              <span className="text-[10px] text-muted-foreground">{d.desc}</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {engagementData.tiers.map((entry, idx) => (
                        <Cell key={`tier-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
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

          {/* 6. LOCAL KNOWLEDGE GRAPH WITHOUT SETTINGS PANEL */}
          {activeTab === "graph" && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                <span>{activeFolderId ? "Nested Folder & Site Local Graph" : "Current View Local Graph"}</span>
                <span className="text-[10px] text-muted-foreground font-mono">Shows folder, child folders & sites as nodes (No settings clutter)</span>
              </div>
              <div className="h-[360px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-[#fbfbfa] dark:bg-[#111318]">
                <KnowledgeGraph
                  mode={activeFolderId ? "folder" : "global"}
                  folderId={activeFolderId}
                  depth={3}
                  showControls={false}
                  onSelectDomain={onOpenDomainInsights}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
