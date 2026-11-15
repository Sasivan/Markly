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
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onFilterByStatus?: (status: "alive" | "dead" | null) => void;
  activeStatusFilter?: "alive" | "dead" | null;
  onOpenCleanupWizard?: () => void;
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
  onOpenPreview,
  onFilterByStatus,
  activeStatusFilter,
  onOpenCleanupWizard,
}: VisualDashboardProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"tags" | "engagement" | "health" | "wall" | "graph">("tags");
  const [isScanningHealth, setIsScanningHealth] = React.useState(false);
  const [healthScanMsg, setHealthScanMsg] = React.useState<string | null>(null);

  const handleRunHealthScan = async () => {
    setIsScanningHealth(true);
    setHealthScanMsg(null);
    try {
      const res = await fetch("/api/health-check", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setHealthScanMsg(json.message || "Health scan complete.");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } else {
        setHealthScanMsg(json.error || "Health check failed.");
      }
    } catch {
      setHealthScanMsg("Unable to run health scan.");
    } finally {
      setIsScanningHealth(false);
    }
  };

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
    <div className={`rounded-lg border border-border bg-card p-3.5 ${collapsed ? "" : "space-y-3.5"}`}>
      {/* Dashboard Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 ${collapsed ? "" : "border-b border-border/60 pb-3"}`}>
        {/* Left Side: Title & Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="flex items-center gap-2 font-medium text-xs text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>Visual Analytics & Intelligence</span>
          </div>

          {/* Real-time sync badge */}
          <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md border border-border">
            {bookmarks.length} active {bookmarks.length === 1 ? "site" : "sites"}
          </span>

          {/* Active Chart Filter Badges */}
          {(activeDomainFilter || activeTagFilter || activeStatusFilter) && (
            <div className="flex items-center gap-1.5 ml-1">
              {activeDomainFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-primary text-primary-foreground">
                  <Filter className="h-2.5 w-2.5" />
                  Domain: {activeDomainFilter}
                  <button type="button" onClick={() => onSelectDomain(null)} className="hover:opacity-80 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeTagFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-primary text-primary-foreground">
                  <Filter className="h-2.5 w-2.5" />
                  Tag: #{activeTagFilter}
                  <button type="button" onClick={() => onSelectTag(null)} className="hover:opacity-80 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeStatusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-primary text-primary-foreground">
                  <Filter className="h-2.5 w-2.5" />
                  Status: {activeStatusFilter === "dead" ? "Broken Links" : "Reachable"}
                  <button type="button" onClick={() => onFilterByStatus?.(null)} className="hover:opacity-80 cursor-pointer">
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
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md text-xs border border-border">
              <button
                type="button"
                onClick={() => setActiveTab("tags")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-sm cursor-pointer transition-colors font-medium ${
                  activeTab === "tags"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TagIcon className="h-3 w-3 text-muted-foreground" />
                <span>Tags ({tagData.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("engagement")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-sm cursor-pointer transition-colors font-medium ${
                  activeTab === "engagement"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span>Engagement</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("health")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-sm cursor-pointer transition-colors font-medium ${
                  activeTab === "health"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Link Health</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wall")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-sm cursor-pointer transition-colors font-medium ${
                  activeTab === "wall"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3 w-3" />
                <span>Favicon Wall</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("graph")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm cursor-pointer transition-colors font-medium ${
                  activeTab === "graph"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>{activeFolderId ? "Nested Knowledge Graph" : "Local Graph"}</span>
              </button>
            </div>
          )}

          {/* Toggle Button on the Right */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
            title={collapsed ? "Show Visual Analytics" : "Hide Visual Analytics"}
          >
            {collapsed ? (
              <>
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span>Show Analytics</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
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
                <div className="text-xs font-mono text-muted-foreground">
                  Tag Frequency & Distribution ({tagData.length} unique tags in view)
                </div>
                {activeTagFilter && (
                  <button
                    type="button"
                    onClick={() => onSelectTag(null)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {tagData.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-1">
                  <TagIcon className="h-5 w-5 text-muted-foreground/50 mb-1" />
                  <span>No tags found in the current folder or subfolder sites.</span>
                  <span className="text-xs text-muted-foreground">Add tags to bookmarks to unlock tag analytics.</span>
                </div>
              ) : (
                <>
                  {/* Area Graph Representing Tags */}
                  <div className="h-48 w-full bg-card rounded-md p-2.5 border border-border">
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
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
                        <XAxis
                          dataKey="tag"
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                          tickFormatter={(val) => (val.length > 12 ? `${val.slice(0, 10)}…` : val)}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-md border border-border bg-popover p-2.5 shadow-sm text-xs space-y-1 text-popover-foreground">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <TagIcon className="h-3.5 w-3.5" />
                                    <span>{d.tag}</span>
                                  </div>
                                  <div className="font-mono text-xs">
                                    {d.count} {d.count === 1 ? "bookmark" : "bookmarks"} ({d.percentage}% of folder)
                                  </div>
                                  <div className="text-xs text-muted-foreground">Click to filter bookmarks below</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="var(--primary)"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#tagAreaGrad)"
                          activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
                          }`}
                        >
                          <span>{t.tag}</span>
                          <span className={`text-xs font-mono px-1.5 py-0.2 rounded-sm ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
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
                <div className="text-xs font-mono text-muted-foreground">
                  Bookmark Engagement & Visit Frequency Tiers
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {engagementData.totalVisits} total visits • {engagementData.avgVisits} avg/site
                </div>
              </div>

              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-md border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">Total Visits</span>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {engagementData.totalVisits}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">Avg / Site</span>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {engagementData.avgVisits}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">Active (≥2)</span>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {engagementData.tiers[0].count + engagementData.tiers[1].count}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">Dormant (0)</span>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {engagementData.dormantCount}
                  </div>
                </div>
              </div>

              {/* Bar Chart Representing Interaction Tiers */}
              <div className="h-44 w-full bg-card rounded-md p-2.5 border border-border">
                <ResponsiveContainer width="100%" height="100%" style={{ outline: "none" }}>
                  <BarChart data={engagementData.tiers} margin={{ top: 10, right: 15, left: -15, bottom: 0 }} style={{ outline: "none" }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
                    <XAxis dataKey="tier" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-md border border-border bg-popover p-2.5 shadow-sm text-xs space-y-1 text-popover-foreground">
                              <span className="font-medium text-foreground block">{d.tier}</span>
                              <div className="font-mono text-xs">
                                {d.count} sites ({d.percentage}%)
                              </div>
                              <span className="text-xs text-muted-foreground">{d.desc}</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" style={{ outline: "none" }}>
                      {engagementData.tiers.map((entry, idx) => (
                        <Cell key={`tier-${idx}`} fill={entry.color} cursor="pointer" style={{ outline: "none" }} />
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
                <PieChart width={280} height={220} style={{ outline: "none" }}>
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
                    cursor="pointer"
                    style={{ outline: "none" }}
                    onClick={(entry: any) => {
                      if (onFilterByStatus) {
                        const target = entry?.name?.includes("Broken") ? "dead" : "alive";
                        onFilterByStatus(activeStatusFilter === target ? null : target);
                      }
                    }}
                  >
                    {healthData.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" style={{ outline: "none" }} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-sm text-popover-foreground">
                            <span className="font-medium block text-foreground">{d.name}</span>
                            <span className="font-mono text-xs">{d.count} sites</span>
                            <span className="text-[10px] text-primary block mt-1">Click to filter</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                  <span>Link Health & Reachability Overview</span>
                  {activeStatusFilter && (
                    <button
                      type="button"
                      onClick={() => onFilterByStatus?.(null)}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Clear Status Filter
                    </button>
                  )}
                </div>

                <div
                  onClick={() => onFilterByStatus?.(activeStatusFilter === "alive" ? null : "alive")}
                  className={`p-3.5 rounded-md border transition-colors cursor-pointer flex items-center justify-between ${
                    activeStatusFilter === "alive"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border bg-card hover:border-emerald-500/40"
                  }`}
                  title="Filter to reachable sites"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {healthData.alivePercent}% Reachable
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {healthData.alive} bookmarks verified active & alive • Click to filter
                      </div>
                    </div>
                  </div>
                </div>

                {healthData.dead > 0 ? (
                  <div
                    onClick={() => onFilterByStatus?.(activeStatusFilter === "dead" ? null : "dead")}
                    className={`p-3.5 rounded-md border transition-colors cursor-pointer flex items-center gap-2.5 ${
                      activeStatusFilter === "dead"
                        ? "border-rose-500 bg-rose-500/10"
                        : "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50"
                    }`}
                    title="Filter to broken sites"
                  >
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {healthData.dead} Broken Links
                      </div>
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-mono">
                        Flagged as 404 or unreachable • Click to filter
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-md border border-border bg-card text-xs text-muted-foreground">
                    Zero broken links detected in the current view.
                  </div>
                )}

                {/* 6.2: Link Rot Monitor & 6.1: Cleanup Wizard Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isScanningHealth}
                    onClick={handleRunHealthScan}
                    className="text-xs h-8 gap-1.5 flex-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanningHealth ? "animate-spin" : ""}`} />
                    <span>{isScanningHealth ? "Scanning Links..." : "Scan Links Now"}</span>
                  </Button>

                  {onOpenCleanupWizard && (
                    <Button
                      size="sm"
                      onClick={onOpenCleanupWizard}
                      className="text-xs h-8 gap-1.5 flex-1 bg-primary text-primary-foreground cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Cleanup Wizard</span>
                    </Button>
                  )}
                </div>

                {healthScanMsg && (
                  <div className="text-[11px] font-mono text-muted-foreground p-2 rounded bg-muted/40 border border-border">
                    {healthScanMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. FAVICON WALL MATRIX */}
          {activeTab === "wall" && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                <span>Visual Favicon Wall ({bookmarks.length} sites in current view)</span>
                <span className="text-[11px] text-muted-foreground">Click any site to open preview popup</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 max-h-56 overflow-y-auto p-1">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => {
                      if (onOpenPreview) {
                        onOpenPreview(bm);
                      } else {
                        window.open(bm.url, "_blank");
                      }
                    }}
                    className="p-2.5 rounded-md border border-border bg-card hover:bg-secondary hover:border-primary/40 flex flex-col items-center justify-center gap-1.5 transition-colors group cursor-pointer relative outline-none focus:outline-none"
                    title={`${bm.title} (${bm.domain}) — Click to preview`}
                  >
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-8 w-8 rounded-md object-contain bg-background border border-border p-0.5 group-hover:scale-105 transition-transform"
                    />
                    <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground truncate w-full text-center">
                      {bm.domain.split(".")[0]}
                    </span>
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-1 right-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Open website directly in new tab"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. LOCAL KNOWLEDGE GRAPH */}
          {activeTab === "graph" && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                <span>{activeFolderId ? "Nested Folder & Site Local Graph" : "Current View Local Graph"}</span>
                <span className="text-xs text-muted-foreground font-mono">Folder, child folders & sites as nodes</span>
              </div>
              <div className="h-90 w-full rounded-md overflow-hidden border border-border bg-card">
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
