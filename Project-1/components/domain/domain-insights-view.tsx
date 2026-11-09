"use client";

import * as React from "react";
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Folder as FolderIcon,
  Tag as TagIcon,
  Clock,
  TrendingUp,
  Bookmark,
  Share2,
  Calendar,
  Layers,
  Star,
  Activity,
  BarChart3,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { BookmarkWithDetails } from "@/server/db/schema";
import { formatDateTime } from "@/lib/utils";

interface DomainInsightsViewProps {
  domain: string;
  onBack: () => void;
  onSelectFolder: (folderId: string) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
}

const HEALTH_COLORS = {
  alive: "#10b981",
  dead: "#ef4444",
  pending: "#f59e0b",
};

export function DomainInsightsView({
  domain,
  onBack,
  onSelectFolder,
  onEditBookmark,
  onToggleFavorite,
}: DomainInsightsViewProps) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"overview" | "graph" | "bookmarks">("overview");

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/domain/${encodeURIComponent(domain)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setData(json.domainStats);
        }
      })
      .catch((err) => console.error("Error fetching domain stats:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [domain]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-500">
        Loading insights for {domain}...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <p className="text-sm text-slate-500">No bookmarks found for {domain}</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const healthScore =
    data.totalBookmarks > 0
      ? Math.round(((data.healthCounts.alive || 0) / data.totalBookmarks) * 100)
      : 100;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onBack}
            className="h-8 px-2.5 text-xs text-slate-600 dark:text-neutral-300"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>

          <BookmarkIcon
            src={data.iconUrl}
            domain={data.domain}
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-neutral-700 p-1 bg-white dark:bg-neutral-800 shadow-xs"
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {data.domain}
              </h1>
              <a
                href={`https://${data.domain}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-blue-500 transition-colors"
                title="Open domain homepage"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Complete website analytics across all library folders
            </p>
          </div>
        </div>

        {/* Tab View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              activeTab === "overview"
                ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-foreground"
            }`}
          >
            Overview & Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              activeTab === "graph"
                ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-purple-500" />
            <span>Domain Graph</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bookmarks")}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              activeTab === "bookmarks"
                ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:text-foreground"
            }`}
          >
            Saved Pages ({data.totalBookmarks})
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Saved Pages</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.totalBookmarks}</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Total Visits</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{data.totalVisits}</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Folders Stored In</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{data.foldersCount}</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Link Health</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{healthScore}%</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Distinct Tags</div>
          <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">{data.tagDistribution?.length || 0}</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Last Visited</div>
          <div className="text-xs font-mono font-medium text-slate-700 dark:text-neutral-200 mt-2 truncate">
            {data.lastVisitedAt ? formatDateTime(data.lastVisitedAt) : "Never"}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Folder Distribution */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-purple-500" />
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">Folder Distribution</h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Pages per folder</span>
              </div>

              {data.folderDistribution.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">No folder data</div>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.folderDistribution}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-xs shadow-xl">
                                <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
                                <span className="text-purple-600 block">{d.count} saved pages</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#7963E9"
                        radius={[0, 6, 6, 0]}
                        cursor="pointer"
                        onClick={(entry: any) => entry?.id && entry.id !== "unsorted" && onSelectFolder(entry.id)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 2. Addition Timeline */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">Addition History</h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Bookmarks added over time</span>
              </div>

              {data.timeline.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">No timeline data</div>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="domainTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-xs shadow-xl">
                                <span className="font-bold text-slate-900 dark:text-white block">{d.date}</span>
                                <span className="text-blue-600 font-semibold">{d.count} added</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#domainTimelineGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Most Accessed Pages & Associated Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Accessed Pages */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">Most Accessed Pages</h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Ranked by visits</span>
              </div>

              <div className="space-y-2">
                {data.mostAccessed.slice(0, 5).map((bm: BookmarkWithDetails) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/40 text-xs hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <BookmarkIcon src={bm.iconUrl} domain={bm.domain} className="h-4 w-4 rounded" />
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium hover:underline text-slate-900 dark:text-white"
                      >
                        {bm.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="font-mono text-[11px] text-slate-500">{bm.visitCount || 0} visits</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditBookmark?.(bm)}
                        className="h-6 w-6 p-0"
                        title="Edit bookmark"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tag Distribution */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-teal-500" />
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">Tags & Categories</h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Topics associated with {domain}</span>
              </div>

              {data.tagDistribution.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                  No tags added to bookmarks from this domain yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {data.tagDistribution.map((t: { name: string; color: string; count: number }) => (
                    <span
                      key={t.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/40 shadow-2xs"
                      style={{ backgroundColor: `${t.color}15`, color: t.color }}
                    >
                      <span>#{t.name}</span>
                      <span className="font-mono text-[10px] opacity-75">({t.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Graph Tab */}
      {activeTab === "graph" && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            Interactive knowledge network centered on <strong>{domain}</strong> connecting its pages, folders, and shared tags.
          </div>
          <KnowledgeGraph
            mode="domain"
            domain={domain}
            onSelectFolder={onSelectFolder}
            onEditBookmark={onEditBookmark}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      )}

      {/* Bookmarks Tab */}
      {activeTab === "bookmarks" && (
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">
              All Saved Bookmarks for {domain}
            </h3>
            <span className="text-xs font-mono text-muted-foreground">{data.bookmarks.length} total</span>
          </div>

          <div className="space-y-2">
            {data.bookmarks.map((bm: BookmarkWithDetails) => (
              <div
                key={bm.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                  <BookmarkIcon src={bm.iconUrl} domain={bm.domain} className="h-5 w-5 rounded flex-shrink-0" />
                  <div className="truncate">
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline text-slate-900 dark:text-white text-xs block truncate"
                    >
                      {bm.title}
                    </a>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                      <span>📁 {bm.folderName || "Unsorted"}</span>
                      <span>·</span>
                      <span>{formatDateTime(bm.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleFavorite?.(bm)}
                    className="h-7 w-7 p-0"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        bm.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-400"
                      }`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditBookmark?.(bm)}
                    className="text-xs h-7 px-2"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

