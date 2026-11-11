"use client";

import * as React from "react";
import {
  Compass,
  Folder as FolderIcon,
  Clock,
  Star,
  Inbox,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Plus,
  CheckCircle2,
  Tag,
  Hash,
  ShieldCheck,
  TrendingUp,
  Bookmark,
  Layers,
  Search,
  Ghost,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { GlobalHomepageAnalytics } from "./global-homepage-analytics";
import type { Folder, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

interface WorkspaceHomeProps {
  bookmarks: BookmarkWithDetails[];
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "database") => void;
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string | null) => void;
  onOpenAddModal: () => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onRefreshData?: () => void;
}

export function WorkspaceHome({
  bookmarks,
  folders,
  folderTree,
  onSelectFolder,
  onSelectView,
  onSelectDomain,
  onSelectTag,
  onOpenAddModal,
  onEditBookmark,
  onToggleFavorite,
  onRefreshData,
}: WorkspaceHomeProps) {
  // Realtime visit handler
  const handleSiteVisit = async (bm: BookmarkWithDetails) => {
    try {
      bm.visitCount = (bm.visitCount || 0) + 1;
      const now = Date.now();
      bm.lastVisitedAt = now;
      bm.lastClickedAt = now;
      await fetch(`/api/bookmarks/${bm.id}/visit`, { method: "POST", keepalive: true });
      onRefreshData?.();
    } catch (e) {
      console.error("Visit error:", e);
    }
  };
  // 1. Quick Access: Top visited & active bookmarks
  const quickAccessList = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived)
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0) || b.createdAt - a.createdAt)
      .slice(0, 6);
  }, [bookmarks]);

  // 2. Folder Collections: Root level folder collections
  const collections = React.useMemo(() => {
    return folderTree.map((treeNode) => {
      const folderEntity = folders.find((f) => f.id === treeNode.id);
      const childCount = treeNode.children?.length || 0;
      const count = treeNode.totalDescendantBookmarkCount || treeNode.bookmarkCount || 0;
      return {
        id: treeNode.id,
        name: treeNode.name,
        icon: treeNode.icon || "📁",
        color: treeNode.color || "#3b82f6",
        bookmarkCount: count,
        childFolderCount: childCount,
      };
    });
  }, [folderTree, folders]);

  // 3. Recently Visited (sorted by lastClickedAt or lastVisitedAt desc)
  const recentlyVisited = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived)
      .sort((a, b) => {
        const timeA = a.lastClickedAt || a.lastVisitedAt || 0;
        const timeB = b.lastClickedAt || b.lastVisitedAt || 0;
        if (timeA && timeB) return timeB - timeA;
        if (timeA) return -1;
        if (timeB) return 1;
        return (b.visitCount || 0) - (a.visitCount || 0);
      })
      .slice(0, 6);
  }, [bookmarks]);

  // 4. Favorites
  const favorites = React.useMemo(() => {
    return bookmarks.filter((b) => b.isFavorite && !b.isArchived).slice(0, 6);
  }, [bookmarks]);

  // 5. Inbox / Needs Organization (no folder or no tags)
  const unorganized = React.useMemo(() => {
    return bookmarks
      .filter((b) => !b.isArchived && (!b.folderId || !b.tags || b.tags.length === 0))
      .slice(0, 6);
  }, [bookmarks]);

  // 6. Topic & Tags Cloud
  const topTags = React.useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const bm of bookmarks) {
      if (bm.isArchived) continue;
      for (const t of bm.tags || []) {
        const existing = map.get(t.name) || { count: 0, color: t.color || "#3b82f6" };
        map.set(t.name, { count: existing.count + 1, color: t.color || "#3b82f6" });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [bookmarks]);

  // 7. Forgotten Bookmarks State: 1 to 90 Days Slider & Spot Hover
  const [inactiveThreshold, setInactiveThreshold] = React.useState<number>(30);
  const [hoveredSpot, setHoveredSpot] = React.useState<{
    bookmark: BookmarkWithDetails;
    x: number;
    y: number;
    daysAgo: number;
    timeAgoLabel?: string;
  } | null>(null);

  // Dot Palette for distinct sites (modern, vibrant, high-contrast)
  const DOT_PALETTE = [
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#0ea5e9", // Sky
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#a855f7", // Purple
    "#38bdf8", // Light Blue
    "#14b8a6", // Teal
    "#f43f5e", // Rose
    "#64748b", // Slate
  ];

  // Compute Area Dot Spectrum data mapped dynamically across Hours (1 day) or Days (N days)
  const spectrumData = React.useMemo(() => {
    // Quantize now to the current hour to guarantee deterministic coordinates across SSR & client hydration
    const now = Math.floor(Date.now() / 3600000) * 3600000;
    const unarchived = bookmarks.filter((b) => !b.isArchived);

    // Check if threshold is 1 day (divide by hours) or N days (divide by days)
    const isHourly = inactiveThreshold === 1;

    let timeMarkers: { val: number; label: string; xPercent: number }[] = [];
    let gridLines: { xPercent: number; isMajor: boolean }[] = [];

    if (isHourly) {
      // 24 hours mode (1 day)
      // Major markers: 0h (Now), 4h, 8h, 12h, 16h, 20h, 24h+
      const hourlyIntervals = [0, 4, 8, 12, 16, 20, 24];
      timeMarkers = hourlyIntervals.map((h) => ({
        val: h,
        label: h === 0 ? "Now (0h)" : h === 24 ? "24h+ (Dormant)" : `${h}h`,
        xPercent: (h / 24) * 100,
      }));

      // Grid lines every 2 hours
      for (let h = 0; h <= 24; h += 2) {
        gridLines.push({
          xPercent: (h / 24) * 100,
          isMajor: h % 4 === 0,
        });
      }
    } else {
      // N days mode (e.g. 7, 14, 30, 60, 90 days)
      const N = Math.max(2, inactiveThreshold);
      let step = 1;
      if (N > 60) step = 15;
      else if (N > 30) step = 10;
      else if (N > 14) step = 5;
      else if (N > 7) step = 2;
      else step = 1;

      const markers: number[] = [1];
      for (let d = step; d < N; d += step) {
        if (d > 1 && !markers.includes(d)) markers.push(d);
      }
      if (!markers.includes(N)) markers.push(N);

      timeMarkers = markers.map((d) => ({
        val: d,
        label: d === 1 ? "Day 1" : d === N ? `${d}d+ (Dormant)` : `${d}d`,
        xPercent: ((d - 1) / Math.max(1, N - 1)) * 100,
      }));

      // Dynamic grid divisions: divide row into days
      const gridStep = N <= 14 ? 1 : N <= 30 ? 2 : N <= 60 ? 5 : 10;
      for (let d = 1; d <= N; d += gridStep) {
        gridLines.push({
          xPercent: ((d - 1) / Math.max(1, N - 1)) * 100,
          isMajor: markers.includes(d),
        });
      }
    }

    const dots: {
      bookmark: BookmarkWithDetails;
      x: number; // 0..1000 in SVG viewBox
      y: number; // 0..200 in SVG viewBox
      color: string;
      timeAgoLabel: string;
      daysAgo: number;
      isInactive: boolean;
    }[] = [];

    unarchived.forEach((bm, idx) => {
      const lastTime = bm.lastClickedAt || bm.lastVisitedAt;
      const diffMs = lastTime ? Math.max(0, now - lastTime) : Infinity;
      const hoursAgo = diffMs / (1000 * 60 * 60);
      const daysAgo = diffMs / (1000 * 60 * 60 * 24);

      let normX = 0; // 0 to 1
      let isInactive = false;
      let timeAgoLabel = "";

      if (isHourly) {
        if (!lastTime || hoursAgo >= 24) {
          normX = 0.94 + ((idx * 7) % 45) / 1000;
          isInactive = true;
          timeAgoLabel = !lastTime ? "Never clicked" : `${Math.floor(hoursAgo)}h ago (>24h)`;
        } else {
          normX = Math.max(0.04, Math.min(0.94, hoursAgo / 24));
          isInactive = hoursAgo >= 24;
          timeAgoLabel = hoursAgo < 1 ? "< 1h ago" : `${Math.floor(hoursAgo)}h ago`;
        }
      } else {
        const N = inactiveThreshold;
        if (!lastTime || daysAgo >= N) {
          normX = 0.93 + ((idx * 11) % 50) / 1000;
          isInactive = true;
          timeAgoLabel = !lastTime ? "Never clicked" : `${Math.floor(daysAgo)}d ago (≥${N}d)`;
        } else {
          normX = Math.max(0.04, Math.min(0.93, (daysAgo - 1) / Math.max(1, N - 1)));
          isInactive = daysAgo >= N;
          timeAgoLabel = daysAgo < 1 ? "Today" : `${Math.floor(daysAgo)}d ago`;
        }
      }

      // Map to SVG coordinates (viewBox 0 0 1000 200) with fixed precision
      const jitterX = ((idx * 17) % 18) - 9;
      const x = Number(Math.min(960, Math.max(40, 50 + normX * 880 + jitterX)).toFixed(2));
      // Vertical curve distribution (40 to 150 px)
      const y = Number((40 + ((idx * 31 + Math.floor(normX * 100) * 11) % 110)).toFixed(2));

      const color = DOT_PALETTE[idx % DOT_PALETTE.length];

      dots.push({
        bookmark: bm,
        x,
        y,
        color,
        timeAgoLabel,
        daysAgo: lastTime ? Math.floor(daysAgo) : 999,
        isInactive,
      });
    });

    const inactiveCount = dots.filter((d) => d.isInactive).length;

    return { isHourly, timeMarkers, gridLines, dots, inactiveCount };
  }, [bookmarks, inactiveThreshold]);

  // Workspace summary calculations
  const totalCount = bookmarks.filter((b) => !b.isArchived).length;
  const reachableCount = bookmarks.filter((b) => !b.isArchived && b.status !== "dead").length;
  const healthPercent = totalCount > 0 ? Math.round((reachableCount / totalCount) * 100) : 100;

  // Helper to format relative time
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Helper to get parent folder name
  const getParentName = (bm: BookmarkWithDetails) => {
    if (!bm.folderId) return "Unsorted";
    const current = folders.find((f) => f.id === bm.folderId);
    if (!current) return bm.folderName || "Unsorted";
    if (current.parentId) {
      const parent = folders.find((f) => f.id === current.parentId);
      if (parent) return parent.name;
    }
    return current.name;
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Workspace Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Workspace Home
              </span>
              <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Markly Workspace
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Your centralized bookmark hub. Jump into collections, review recent discoveries, or organize pending items. Open any folder to unlock deep visual analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 h-8.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Bookmark</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("all");
              }}
              className="text-xs h-8.5 px-3 rounded-lg border-slate-300 dark:border-neutral-700 cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Browse All ({totalCount})</span>
            </Button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{totalCount}</div>
              <div className="text-[11px] text-muted-foreground">Active Bookmarks</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FolderIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{folders.length}</div>
              <div className="text-[11px] text-muted-foreground">Folder Collections</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{healthPercent}%</div>
              <div className="text-[11px] text-muted-foreground">Reachable & Healthy</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{favorites.length}</div>
              <div className="text-[11px] text-muted-foreground">Starred Favorites</div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Database State Banner */}
      {bookmarks.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <Bookmark className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Cloud Database is Ready & Clean</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are signed in with a fresh personal database synced with Supabase. Add your first bookmark or import existing bookmarks to get started!
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4 cursor-pointer shadow-xs gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Bookmark</span>
            </Button>
          </div>
        </div>
      )}

      {/* 1. Quick Access Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick Access</h2>
            <span className="text-[10px] text-muted-foreground font-mono">Most visited & frequent</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickAccessList.map((bm) => (
            <div
              key={bm.id}
              className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs hover:border-blue-400 dark:hover:border-blue-700 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 truncate min-w-0">
                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-6 w-6 rounded object-contain bg-background flex-shrink-0 border border-border/40"
                />
                <div className="truncate">
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleSiteVisit(bm)}
                    className="text-xs font-semibold hover:underline text-slate-900 dark:text-white truncate block"
                  >
                    {bm.title}
                  </a>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="truncate max-w-[110px]">{bm.domain}</span>
                    <span>•</span>
                    <span className="font-mono">{bm.visitCount || 0} visits</span>
                  </div>
                </div>
              </div>

              <a
                href={bm.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleSiteVisit(bm)}
                className="h-7 w-7 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 transition-colors"
                title="Launch Site"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Folder Collections Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Folder Collections</h2>
            <span className="text-[10px] text-muted-foreground font-mono">Organized Workspaces</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">{collections.length} Collections</span>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("collections");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>View all Collections</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {collections.map((coll) => (
            <div
              key={coll.id}
              onClick={() => onSelectFolder(coll.id, true)}
              className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-4 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shadow-2xs"
                    style={{ backgroundColor: `${coll.color}20` }}
                  >
                    <FolderIconRenderer icon={coll.icon} color={coll.color} className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono font-medium px-2 py-0.5">
                    {coll.bookmarkCount} {coll.bookmarkCount === 1 ? "site" : "sites"}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {coll.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {coll.childFolderCount > 0
                      ? `Includes ${coll.childFolderCount} subfolders`
                      : "Direct collection"}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open Collection with Analytics
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid: 3. Recently Visited & 4. Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Recently Visited */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <History className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recently Visited</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("all");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
            >
              View Activity →
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] shadow-xs divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden">
            {recentlyVisited.map((bm) => {
              const lastTime = bm.lastClickedAt || bm.lastVisitedAt;
              return (
                <div key={bm.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <div className="truncate">
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleSiteVisit(bm)}
                        className="text-xs font-semibold hover:underline text-slate-900 dark:text-white truncate block"
                      >
                        {bm.title}
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                          {lastTime ? `Visited ${formatTimeAgo(lastTime)}` : "Not visited yet"}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{getParentName(bm)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleSiteVisit(bm)}
                      className="h-6 w-6 rounded bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Open link"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Favorites */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Starred Favorites</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("favorites");
              }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-medium"
            >
              View Favorites →
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] shadow-xs divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden">
            {favorites.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No favorites starred yet. Click the star on any bookmark to pin it here.
              </div>
            ) : (
              favorites.map((bm) => (
                <div key={bm.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <div className="truncate">
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleSiteVisit(bm)}
                        className="text-xs font-semibold hover:underline text-slate-900 dark:text-white truncate block"
                      >
                        {bm.title}
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span className="truncate max-w-[110px]">{bm.domain}</span>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">{getParentName(bm)}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleSiteVisit(bm)}
                    className="h-6 w-6 rounded bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-amber-600 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 5. Inbox / Needs Organization Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Inbox className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inbox / Needs Organization</h2>
            <span className="text-[10px] text-muted-foreground font-mono">Unsorted or missing tags</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("unsorted");
            }}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-medium"
          >
            Open Inbox View →
          </button>
        </div>

        {unorganized.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/40 p-6 text-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
            <div className="text-xs font-semibold text-slate-900 dark:text-white">Inbox Zero!</div>
            <p className="text-[11px] text-muted-foreground">
              All bookmarks in your workspace are properly filed into folders and tagged.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unorganized.map((bm) => (
              <div
                key={bm.id}
                onClick={() => onEditBookmark?.(bm)}
                className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#1a1a1a] p-3.5 shadow-xs flex flex-col justify-between gap-3 cursor-pointer hover:border-rose-400 dark:hover:border-rose-600 transition-all hover:shadow-sm group"
                title="Click to organize folder & tags"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      {!bm.folderId ? "No Folder" : "No Tags"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {bm.title}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{bm.domain}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                    Organize Now →
                  </span>
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSiteVisit(bm);
                    }}
                    className="text-muted-foreground hover:text-foreground p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded"
                    title="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Forgotten Bookmarks Section with Dynamic Hourly/Daily Slider Divisions & Site Dots */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Ghost className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Forgotten Bookmarks</h2>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono px-2 py-0.5 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
                  {spectrumData.isHourly ? "24-Hour Activity Division" : `${inactiveThreshold}-Day Dynamic Division`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Hover any site dot to inspect its exact last clicked time • Click dot to visit & record realtime
              </p>
            </div>
          </div>

          {/* Range Slider: 1 Day (Hourly) to 90 Days */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-neutral-300">
              <span className="text-muted-foreground text-[11px]">Threshold:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {inactiveThreshold === 1 ? "1 Day (24 Hours)" : `${inactiveThreshold} Days`}
              </span>
              <span className="text-[10px] text-muted-foreground">({spectrumData.inactiveCount} dormant)</span>
            </div>
            <input
              type="range"
              min="1"
              max="90"
              value={inactiveThreshold}
              onChange={(e) => setInactiveThreshold(Number(e.target.value))}
              className="w-28 sm:w-36 accent-indigo-600 cursor-pointer"
              title={`Adjust threshold (1 day = hourly division, >1 = dynamic daily division)`}
            />
            <div className="flex items-center gap-1">
              {[1, 7, 14, 30, 60, 90].map((d) => (
                <button
                  type="button"
                  key={`preset-${d}`}
                  onClick={() => setInactiveThreshold(d)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    inactiveThreshold === d
                      ? "bg-indigo-600 text-white font-bold shadow-2xs"
                      : "bg-slate-200/80 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-foreground"
                  }`}
                >
                  {d === 1 ? "1d (24h)" : `${d}d`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* INTERACTIVE AREA SPECTRUM WITH DYNAMIC HOURLY / DAILY GRID DIVISIONS */}
        <div className="relative rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-sm overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>
              {spectrumData.isHourly
                ? "Hourly Activity Division (0h to 24h)"
                : `Daily Grid Division across ${inactiveThreshold} Days (Day 1 to ${inactiveThreshold}d+)`}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
              ● {spectrumData.dots.length} total sites • Inactive / Dormant: {spectrumData.inactiveCount}
            </span>
          </div>

          <div className="relative w-full h-56 select-none">
            {/* SVG Area Background Curve & Dynamic Grid Lines */}
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1000 200"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="forgottenIndigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Guidelines */}
              <line x1="40" y1="40" x2="960" y2="40" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
              <line x1="40" y1="100" x2="960" y2="100" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
              <line x1="40" y1="160" x2="960" y2="160" stroke="currentColor" strokeOpacity="0.12" />

              {/* Dynamic Vertical Grid Division Lines */}
              {spectrumData.gridLines.map((gl, i) => {
                const gx = 50 + (gl.xPercent / 100) * 880;
                return (
                  <line
                    key={`gl-${i}`}
                    x1={gx}
                    y1={gl.isMajor ? 28 : 38}
                    x2={gx}
                    y2={160}
                    stroke="currentColor"
                    strokeOpacity={gl.isMajor ? "0.14" : "0.05"}
                    strokeDasharray={gl.isMajor ? undefined : "2 2"}
                  />
                );
              })}

              {/* Area Background Shape */}
              <path
                d="M 40,160 Q 250,65 500,90 T 800,60 T 960,45 L 960,160 L 40,160 Z"
                fill="url(#forgottenIndigoGrad)"
              />
              {/* Area Top Boundary Stroke */}
              <path
                d="M 40,160 Q 250,65 500,90 T 800,60 T 960,45"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />

              {/* Small, Crisp, Interactive Dots for Each Site */}
              {spectrumData.dots.map((dot, idx) => {
                const isHovered = hoveredSpot?.bookmark.id === dot.bookmark.id;
                return (
                  <g
                    key={`dot-${dot.bookmark.id}-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredSpot({
                        bookmark: dot.bookmark,
                        x: (dot.x / 1000) * 100,
                        y: (dot.y / 200) * 100,
                        daysAgo: dot.daysAgo,
                        timeAgoLabel: dot.timeAgoLabel,
                      });
                    }}
                    onMouseLeave={() => setHoveredSpot(null)}
                    onClick={() => {
                      handleSiteVisit(dot.bookmark);
                      window.open(dot.bookmark.url, "_blank");
                    }}
                  >
                    {isHovered && (
                      <circle
                        suppressHydrationWarning
                        cx={dot.x}
                        cy={dot.y}
                        r="6.5"
                        fill="none"
                        stroke={dot.color}
                        strokeWidth="1.5"
                        className="animate-ping opacity-75"
                      />
                    )}
                    <circle
                      suppressHydrationWarning
                      cx={dot.x}
                      cy={dot.y}
                      r={isHovered ? "4.5" : dot.isInactive ? "2.6" : "3.2"}
                      fill={dot.color}
                      fillOpacity={dot.isInactive ? 0.35 : 0.95}
                      stroke={isHovered ? "#ffffff" : dot.isInactive ? "currentColor" : "#ffffff"}
                      strokeOpacity={dot.isInactive ? 0.3 : 0.85}
                      strokeWidth={isHovered ? "1.5" : "0.75"}
                      className="transition-all duration-150 drop-shadow-xs"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Dynamic Bottom Time Axis */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-neutral-400 pt-1.5 border-t border-slate-200/80 dark:border-neutral-800 px-3">
              {spectrumData.timeMarkers.map((m, i) => (
                <div key={`tm-${i}`} className="text-center" style={{ width: `${100 / spectrumData.timeMarkers.length}%` }}>
                  <span className="font-semibold text-slate-700 dark:text-neutral-300">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Tooltip Over the Spot (Last Time Clicked) */}
            {hoveredSpot && (
              <div
                className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-56"
                style={{
                  left: `${Math.min(88, Math.max(12, hoveredSpot.x))}%`,
                  top: `${Math.min(75, Math.max(15, hoveredSpot.y))}%`,
                }}
              >
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-1.5">
                  <BookmarkIcon
                    src={hoveredSpot.bookmark.iconUrl}
                    domain={hoveredSpot.bookmark.domain}
                    className="h-4 w-4 rounded object-contain flex-shrink-0"
                  />
                  <div className="truncate font-bold text-slate-900 dark:text-white">
                    {hoveredSpot.bookmark.title}
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Domain:</span>
                    <span className="font-mono text-slate-700 dark:text-neutral-300">
                      {hoveredSpot.bookmark.domain}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Category:</span>
                    <span className="text-slate-700 dark:text-neutral-300">
                      {getParentName(hoveredSpot.bookmark)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-semibold pt-0.5 border-t border-slate-100 dark:border-neutral-800/80">
                    <span>Last Time Clicked:</span>
                    <span className="font-mono">
                      {hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt
                        ? `${new Date(hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })} (${hoveredSpot.timeAgoLabel || `${hoveredSpot.daysAgo}d ago`})`
                        : `Never Clicked (Added ${new Date(hoveredSpot.bookmark.createdAt).toLocaleDateString()})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Total Visits:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {hoveredSpot.bookmark.visitCount || 0}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-center text-indigo-600 dark:text-indigo-400 font-medium pt-1 border-t border-slate-100 dark:border-neutral-800">
                  Click dot to visit site ↗
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Global Homepage Visual Analytics: 3 Exact Charts from Reference (Stacked Area, Radar Fingerprint, Donut) */}
      <GlobalHomepageAnalytics
        bookmarks={bookmarks}
        folders={folders}
        folderTree={folderTree}
        onSelectFolder={(fId) => onSelectFolder(fId)}
        onSelectDomain={onSelectDomain}
      />

      {/* 6. Tags & Categories Explorer */}
      {topTags.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Topics & Tags</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {topTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => {
                  onSelectTag?.(tag.name);
                  onSelectFolder(null);
                  onSelectView("all");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] hover:border-purple-400 transition-all cursor-pointer shadow-2xs group"
              >
                <Hash className="h-3 w-3 text-purple-500" />
                <span className="text-slate-800 dark:text-neutral-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {tag.name}
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-neutral-800 text-muted-foreground px-1.5 py-0.2 rounded font-mono">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
