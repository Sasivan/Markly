"use client";

import * as React from "react";
import {
  Compass,
  Folder as FolderIcon,
  Clock,
  Star,
  Inbox,
  ArrowRight,
  ArrowUpRight,
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
  Trash2,
  Globe,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { GlobalHomepageAnalytics } from "./global-homepage-analytics";
import type { Folder, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";

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
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: (id: string, title?: string) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
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
  onRecordVisit,
  onDeleteBookmark,
  onToggleArchive,
  onOpenPreview,
}: WorkspaceHomeProps) {
  const { user } = useAuth();
  // Realtime visit handler
  const handleSiteVisit = async (bm: BookmarkWithDetails) => {
    if (onRecordVisit) {
      onRecordVisit(bm);
      return;
    }
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
  // Accurate synchronized metrics across workspace
  const folderCollectionsCount = React.useMemo(
    () => folders.filter((f) => f.id !== "__UNSORTED__" && !f.id.startsWith("fld_unsorted_")).length,
    [folders]
  );

  const totalFavoritesCount = React.useMemo(
    () => bookmarks.filter((b) => b.isFavorite && !b.isArchived).length,
    [bookmarks]
  );

  const totalVisitedCount = React.useMemo(
    () => bookmarks.filter((b) => !b.isArchived && Boolean(b.lastClickedAt || b.lastVisitedAt)).length,
    [bookmarks]
  );

  // 1. Quick Access: High-frequency daily drivers & pinned bookmarks
  const quickAccessList = React.useMemo(() => {
    const unarchived = bookmarks.filter((b) => !b.isArchived);
    // Prioritize high-visit sites and favorites
    const activeAndFavs = unarchived.filter((b) => (b.visitCount || 0) > 0 || b.isFavorite);
    if (activeAndFavs.length > 0) {
      return activeAndFavs
        .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0) || (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || b.createdAt - a.createdAt)
        .slice(0, 6);
    }
    // Fallback if no bookmarks have been visited yet: show newest additions
    return [...unarchived].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  }, [bookmarks]);

  // 2. Recently Visited: Strict chronological timeline of actual visits
  const recentlyVisited = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived && Boolean(b.lastClickedAt || b.lastVisitedAt))
      .sort((a, b) => {
        const timeA = Math.max(a.lastClickedAt || 0, a.lastVisitedAt || 0);
        const timeB = Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0);
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [bookmarks]);

  // 3. Favorites (Top 6)
  const favorites = React.useMemo(() => {
    return bookmarks.filter((b) => b.isFavorite && !b.isArchived).slice(0, 6);
  }, [bookmarks]);

  // 4. Unsorted / Inbox: Strictly unarchived bookmarks without any folder
  const unsortedBookmarks = React.useMemo(() => {
    return bookmarks.filter(
      (b) =>
        !b.isArchived &&
        (!b.folderId || b.folderId === "__UNSORTED__" || b.folderId.startsWith("fld_unsorted_"))
    );
  }, [bookmarks]);

  const totalUnsortedCount = unsortedBookmarks.length;
  const unorganized = React.useMemo(() => unsortedBookmarks.slice(0, 6), [unsortedBookmarks]);

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

  // 7. Forgotten Bookmarks State: 1 to 90 Days Slider & Spot Hover (Persisted in localStorage)
  const [inactiveThreshold, setInactiveThresholdState] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_forgotten_threshold");
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 90) return parsed;
        }
      } catch {}
    }
    return 30;
  });

  const setInactiveThreshold = React.useCallback((val: number) => {
    setInactiveThresholdState(val);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("markly_forgotten_threshold", String(val));
      } catch {}
    }
  }, []);
  const [hoveredSpot, setHoveredSpot] = React.useState<{
    bookmark: BookmarkWithDetails;
    x: number;
    y: number;
    daysAgo: number;
    timeAgoLabel?: string;
  } | null>(null);

  // Calibrated archival dot palette for sites in spectrum
  const DOT_PALETTE = [
    "#2563eb", // Primary blue
    "#475569", // Slate
    "#0d9488", // Teal
    "#6366f1", // Indigo
    "#64748b", // Cool grey
    "#d97706", // Amber
    "#0284c7", // Sky
    "#4f46e5", // Iris
    "#059669", // Emerald
    "#78716c", // Warm stone
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
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
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
    const pid = current.parentId ?? (current as any).parent_id;
    if (pid) {
      const parent = folders.find((f) => f.id === pid);
      if (parent) return parent.name;
    }
    return current.name;
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Workspace Hero Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground border border-border inline-flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-muted-foreground" />
                Workspace Overview
              </span>
              <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Markly Workspace
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Centralized bookmark library. Jump into collections, review recent discoveries, or organize unfiled items.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              onClick={onOpenAddModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-3 h-8 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
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
              className="text-xs h-8 px-3 rounded-lg border-border cursor-pointer flex items-center gap-1.5"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Browse All Sites ({totalCount})</span>
            </Button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="View all active bookmarks"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-primary transition-colors">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Active bookmarks</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("collections");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="Browse folder collections"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <FolderIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-primary transition-colors">{folderCollectionsCount}</div>
              <div className="text-xs text-muted-foreground">Folder collections</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="Inspect link health"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-emerald-500 transition-colors">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-emerald-500 transition-colors">{healthPercent}%</div>
              <div className="text-xs text-muted-foreground">Reachable & healthy</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("favorites");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="Open starred favorites"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-amber-500 transition-colors">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-amber-500 transition-colors">{totalFavoritesCount}</div>
              <div className="text-xs text-muted-foreground">Starred favorites</div>
            </div>
          </button>
        </div>
      </div>

      {/* Empty Database State Banner */}
      {bookmarks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground shadow-xs">
            <Bookmark className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {user ? "Your Cloud Database is Ready & Clean" : "Welcome to Markly"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {user
                ? "You are signed in with a fresh personal database synced with Supabase. Add your first bookmark or import existing bookmarks to get started!"
                : "You are browsing in guest mode. Add bookmarks to test locally, or sign in to sync your library across devices permanently."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={onOpenAddModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-8 px-3 rounded-lg cursor-pointer shadow-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Bookmark</span>
            </Button>
          </div>
        </div>
      )}

      {/* 1. Quick Access Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-secondary text-muted-foreground flex items-center justify-center">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Quick Access</h2>
            <span className="text-xs text-muted-foreground font-mono">Frequent & daily drivers (top 6)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>View All Sites</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickAccessList.map((bm) => (
            <div
              key={bm.id}
              onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
              className="rounded-xl border border-border bg-card p-3 shadow-xs hover:border-border-hover transition-colors flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate min-w-0">
                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-6 w-6 rounded object-contain bg-background flex-shrink-0 border border-border/40"
                />
                <div className="truncate">
                  <span
                    className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer"
                  >
                    {bm.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span className="truncate max-w-28 font-mono">{bm.domain}</span>
                    <span>•</span>
                    <span className="font-mono tabular-nums">{bm.visitCount || 0} visits</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {onToggleArchive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleArchive(bm);
                    }}
                    className="h-7 w-7 rounded-md bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center flex-shrink-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Archive bookmark"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDeleteBookmark && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteBookmark(bm.id, bm.title);
                    }}
                    className="h-7 w-7 rounded-md bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center flex-shrink-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete bookmark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleSiteVisit(bm)}
                  className="h-7 w-7 rounded-md bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Launch Site"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid: 2. Recently Visited & 3. Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Recently Visited */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-secondary text-muted-foreground flex items-center justify-center">
                <History className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Recently Visited</h2>
              {totalVisitedCount > 0 && (
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {totalVisitedCount} {totalVisitedCount === 1 ? "site" : "sites"}
                </span>
              )}
            </div>
            {/* Clean View All Navigation Link */}
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("recent");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {recentlyVisited.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-xl border border-dashed border-border">
              <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No visit activity recorded yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click or launch any bookmark to track it in your chronological activity stream.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border overflow-hidden">
              {recentlyVisited.map((bm) => {
                const lastTime = bm.lastClickedAt || bm.lastVisitedAt;
                return (
                  <div
                    key={bm.id}
                    onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookmarkIcon
                        src={bm.iconUrl}
                        alt={bm.title}
                        domain={bm.domain}
                        className="h-5 w-5 rounded object-contain flex-shrink-0"
                      />
                      <div className="truncate">
                        <span
                          className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer"
                        >
                          {bm.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono tabular-nums text-muted-foreground font-medium">
                            {lastTime ? `Visited ${formatTimeAgo(lastTime)}` : "Not visited yet"}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-32">{getParentName(bm)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {onDeleteBookmark && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteBookmark(bm.id, bm.title);
                          }}
                          className="h-6 w-6 rounded bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-opacity duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete bookmark"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleSiteVisit(bm)}
                        className="h-6 w-6 rounded bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Open link"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Favorites */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-secondary text-amber-500 flex items-center justify-center">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Starred Favorites</h2>
              {totalFavoritesCount > 0 && (
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {totalFavoritesCount} {totalFavoritesCount === 1 ? "site" : "sites"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("favorites");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium flex items-center gap-1"
            >
              <span>View Favorites</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border overflow-hidden">
            {favorites.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No favorites starred yet. Click the star on any bookmark to pin it here.
              </div>
            ) : (
              favorites.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <div className="truncate">
                      <span
                        className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer"
                      >
                        {bm.title}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span className="truncate max-w-28 font-mono">{bm.domain}</span>
                        <span>•</span>
                        <span className="truncate max-w-28">{getParentName(bm)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {onToggleArchive && (
                      <button
                        type="button"
                        onClick={() => onToggleArchive(bm)}
                        className="h-6 w-6 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                        title="Archive bookmark"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                    )}
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleSiteVisit(bm)}
                      className="h-6 w-6 rounded bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                      title="Launch site"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 5. Inbox / Unsorted Sites Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-secondary text-muted-foreground flex items-center justify-center">
              <Inbox className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Inbox / Unsorted Sites</h2>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {totalUnsortedCount === 0 ? "Inbox Zero" : `${totalUnsortedCount} unfiled`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("unsorted");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium flex items-center gap-1"
          >
            <span>Open Inbox ({totalUnsortedCount})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {totalUnsortedCount === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground mx-auto" />
            <div className="text-xs font-semibold text-foreground">Inbox Zero</div>
            <p className="text-xs text-muted-foreground">
              All bookmarks in your workspace are filed into folder collections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unorganized.map((bm) => (
              <div
                key={bm.id}
                onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
                className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col justify-between gap-3 cursor-pointer hover:border-border-hover transition-colors group"
                title="Click to view details and preview"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      Unfiled
                    </span>
                  </div>
                  <div className="text-xs font-medium text-foreground line-clamp-1 block group-hover:text-primary transition-colors">
                    {bm.title}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{bm.domain}</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground flex items-center gap-1 transition-colors">
                    <span>Organize</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSiteVisit(bm);
                    }}
                    className="text-muted-foreground hover:text-foreground p-1 hover:bg-secondary rounded transition-colors"
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
            <div className="h-6 w-6 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center flex-shrink-0">
              <Ghost className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Activity Spectrum</h2>
                <span className="text-xs bg-secondary text-muted-foreground font-mono px-2 py-0.5 rounded-md font-medium border border-border">
                  {spectrumData.isHourly ? "24-Hour Activity Division" : `${inactiveThreshold}-Day Dynamic Division`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Inspect last visited timestamp • Click dot to launch site
              </p>
            </div>
          </div>

          {/* Range Slider: 1 Day (Hourly) to 90 Days */}
          <div className="flex flex-wrap items-center gap-2.5 bg-secondary/40 p-2 rounded-xl border border-border text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="text-muted-foreground text-xs">Threshold:</span>
              <span className="font-medium font-mono tabular-nums">
                {inactiveThreshold === 1 ? "1 Day (24 Hours)" : `${inactiveThreshold} Days`}
              </span>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">({spectrumData.inactiveCount} dormant)</span>
            </div>
            <input
              type="range"
              min="1"
              max="90"
              value={inactiveThreshold}
              onChange={(e) => setInactiveThreshold(Number(e.target.value))}
              className="w-28 sm:w-36 accent-foreground cursor-pointer"
              title="Adjust threshold (1 day = hourly division, >1 = dynamic daily division)"
            />
            <div className="flex items-center gap-1">
              {[1, 7, 14, 30, 60, 90].map((d) => (
                <button
                  type="button"
                  key={`preset-${d}`}
                  onClick={() => setInactiveThreshold(d)}
                  className={`px-2 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                    inactiveThreshold === d
                      ? "bg-foreground text-background font-medium"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d === 1 ? "1d (24h)" : `${d}d`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* INTERACTIVE AREA SPECTRUM WITH DYNAMIC HOURLY / DAILY GRID DIVISIONS */}
        <div className="relative rounded-xl border border-border bg-card p-4 shadow-xs overflow-hidden">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
            <span>
              {spectrumData.isHourly
                ? "Hourly activity division (0h to 24h)"
                : `Daily grid division across ${inactiveThreshold} days (Day 1 to ${inactiveThreshold}d+)`}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {spectrumData.dots.length} sites • {spectrumData.inactiveCount} dormant
            </span>
          </div>

          <div className="relative w-full h-56 select-none">
            {/* SVG Area Background Curve & Dynamic Grid Lines */}
            <svg
              className="w-full h-full overflow-visible outline-none focus:outline-none"
              style={{ outline: "none" }}
              tabIndex={-1}
              viewBox="0 0 1000 200"
              preserveAspectRatio="none"
            >
              {/* Horizontal Guidelines */}
              <line x1="40" y1="40" x2="960" y2="40" stroke="currentColor" strokeOpacity={0.06} strokeDasharray="3 3" />
              <line x1="40" y1="100" x2="960" y2="100" stroke="currentColor" strokeOpacity={0.06} strokeDasharray="3 3" />
              <line x1="40" y1="160" x2="960" y2="160" stroke="currentColor" strokeOpacity={0.12} />

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
                    strokeOpacity={gl.isMajor ? "0.12" : "0.04"}
                    strokeDasharray={gl.isMajor ? undefined : "2 2"}
                  />
                );
              })}

              {/* Area Background Shape */}
              <path
                d="M 40,160 Q 250,65 500,90 T 800,60 T 960,45 L 960,160 L 40,160 Z"
                fill="currentColor"
                fillOpacity={0.03}
              />
              {/* Area Top Boundary Stroke */}
              <path
                d="M 40,160 Q 250,65 500,90 T 800,60 T 960,45"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.25"
              />

              {/* Small, Crisp, Interactive Dots for Each Site */}
              {spectrumData.dots.map((dot, idx) => {
                const isHovered = hoveredSpot?.bookmark.id === dot.bookmark.id;
                return (
                  <g
                    key={`dot-${dot.bookmark.id}-${idx}`}
                    className="cursor-pointer outline-none focus:outline-none"
                    style={{ outline: "none" }}
                    tabIndex={-1}
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
                      if (onOpenPreview) {
                        onOpenPreview(dot.bookmark);
                      } else {
                        handleSiteVisit(dot.bookmark);
                        window.open(dot.bookmark.url, "_blank");
                      }
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
                        strokeOpacity="0.4"
                      />
                    )}
                    <circle
                      suppressHydrationWarning
                      cx={dot.x}
                      cy={dot.y}
                      r={isHovered ? "4.5" : dot.isInactive ? "2.6" : "3.2"}
                      fill={dot.color}
                      fillOpacity={dot.isInactive ? 0.35 : 0.95}
                      stroke={isHovered ? dot.color : dot.isInactive ? "currentColor" : "transparent"}
                      strokeOpacity={dot.isInactive ? 0.3 : 0.85}
                      strokeWidth={isHovered ? "1.5" : "0.75"}
                      className="transition-opacity duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Dynamic Bottom Time Axis */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-xs font-mono text-muted-foreground pt-1.5 border-t border-border px-3">
              {spectrumData.timeMarkers.map((m, i) => (
                <div key={`tm-${i}`} className="text-center" style={{ width: `${100 / spectrumData.timeMarkers.length}%` }}>
                  <span className="font-medium text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Tooltip Over the Spot (Last Time Clicked) */}
            {hoveredSpot && (
              <div
                className="absolute z-30 cursor-pointer pointer-events-auto transform -translate-x-1/2 -translate-y-full mb-3 bg-card border border-border p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-56 text-card-foreground hover:border-primary/50 transition-colors"
                style={{
                  left: `${Math.min(88, Math.max(12, hoveredSpot.x))}%`,
                  top: `${Math.min(75, Math.max(15, hoveredSpot.y))}%`,
                }}
                onClick={() => {
                  if (onOpenPreview) {
                    onOpenPreview(hoveredSpot.bookmark);
                  } else {
                    handleSiteVisit(hoveredSpot.bookmark);
                    window.open(hoveredSpot.bookmark.url, "_blank");
                  }
                }}
              >
                <div className="flex items-center gap-2 border-b border-border pb-1.5 font-medium">
                  <BookmarkIcon
                    src={hoveredSpot.bookmark.iconUrl}
                    domain={hoveredSpot.bookmark.domain}
                    className="h-4 w-4 rounded object-contain flex-shrink-0"
                  />
                  <div className="truncate text-foreground font-semibold">
                    {hoveredSpot.bookmark.title}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Domain:</span>
                    <span className="font-mono text-foreground">
                      {hoveredSpot.bookmark.domain}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Category:</span>
                    <span className="text-foreground">
                      {getParentName(hoveredSpot.bookmark)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-medium pt-0.5 border-t border-border">
                    <span className="text-muted-foreground">Last clicked:</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt
                        ? `${new Date(hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })} (${hoveredSpot.timeAgoLabel || `${hoveredSpot.daysAgo}d ago`})`
                        : `Never (Added ${new Date(hoveredSpot.bookmark.createdAt).toLocaleDateString()})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total visits:</span>
                    <span className="font-mono tabular-nums font-semibold text-foreground">
                      {hoveredSpot.bookmark.visitCount || 0}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-center text-primary font-medium pt-1 border-t border-border flex items-center justify-center gap-1">
                  <span>Open preview & details</span>
                  <ArrowUpRight className="h-3 w-3" />
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
        onSelectTag={(tag) => {
          onSelectTag?.(tag);
          onSelectFolder(null);
          onSelectView("all");
        }}
        onSelectDomain={onSelectDomain}
      />

      {/* 6. Tags & Categories Explorer */}
      {topTags.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-secondary text-muted-foreground flex items-center justify-center">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Workspace Topics & Tags</h2>
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:border-border-hover hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <Hash className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {tag.name}
                </span>
                <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono tabular-nums">
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
