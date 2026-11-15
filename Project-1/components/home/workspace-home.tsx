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
  SlidersHorizontal,
  Columns2,
  Rows3,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { GlobalHomepageAnalytics } from "./global-homepage-analytics";
import { ActivityHeatmap365 } from "./activity-heatmap-365";
import { ScratchpadWidget } from "./scratchpad-widget";
import {
  HomeLayoutModal,
  DEFAULT_HOME_WIDGETS,
  type HomeWidgetConfig,
  type HomeWidgetKey,
} from "./home-layout-modal";
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
  onSearchJump?: (query: string) => void;
  onOpenCleanupWizard?: () => void;
  onOpenShortcuts?: () => void;
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
  onSearchJump,
  onOpenCleanupWizard,
  onOpenShortcuts,
}: WorkspaceHomeProps) {
  const { user } = useAuth();

  // 1.2: Homepage Widgets Ordering & Visibility state (persisted in localStorage)
  const [homeWidgets, setHomeWidgets] = React.useState<HomeWidgetConfig[]>(DEFAULT_HOME_WIDGETS);
  const [layoutModalOpen, setLayoutModalOpen] = React.useState(false);

  // 1-Col vs 2-Col layout state with persistence (default 2-col dashboard grid)
  const [homeColumns, setHomeColumns] = React.useState<"1" | "2">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_home_columns");
        if (stored === "1" || stored === "2") return stored;
      } catch {}
    }
    return "2";
  });

  const handleSetColumns = (cols: "1" | "2") => {
    setHomeColumns(cols);
    try {
      localStorage.setItem("markly_home_columns", cols);
    } catch {}
  };

  // Instant global search on homepage
  const [homeSearch, setHomeSearch] = React.useState("");

  const homeSearchResults = React.useMemo(() => {
    const q = homeSearch.toLowerCase().trim();
    if (!q) return [];
    return bookmarks
      .filter((bm) => !bm.isArchived)
      .filter((bm) => {
        const matchText = [
          bm.title || "",
          bm.domain || "",
          bm.url || "",
          bm.description || "",
          (bm as any).notes || "",
          ...(bm.tags || []).map((t: any) => (typeof t === "string" ? t : t.name)),
        ]
          .join(" ")
          .toLowerCase();
        return matchText.includes(q);
      });
  }, [bookmarks, homeSearch]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("markly_home_widgets");
      if (saved) {
        const parsed = JSON.parse(saved) as HomeWidgetConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged: HomeWidgetConfig[] = [];
          for (const p of parsed) {
            const def = DEFAULT_HOME_WIDGETS.find((d) => d.id === p.id);
            if (def) merged.push({ ...def, visible: p.visible ?? true });
          }
          for (const def of DEFAULT_HOME_WIDGETS) {
            if (!merged.some((m) => m.id === def.id)) merged.push(def);
          }
          setHomeWidgets(merged);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveWidgets = (newWidgets: HomeWidgetConfig[]) => {
    setHomeWidgets(newWidgets);
    try {
      localStorage.setItem("markly_home_widgets", JSON.stringify(newWidgets));
    } catch {
      // ignore
    }
  };

  const handleResetWidgets = () => {
    setHomeWidgets(DEFAULT_HOME_WIDGETS);
    try {
      localStorage.removeItem("markly_home_widgets");
    } catch {
      // ignore
    }
  };

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

  const renderQuickAccessFolders = () => (
    <section key="folders" className="space-y-3">
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
                <span className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer">
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
  );

  const renderRecentlyVisited = () => (
    <section key="recent" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-secondary text-muted-foreground flex items-center justify-center">
            <History className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Recently Visited</h2>
          <span className="text-xs text-muted-foreground font-mono">Last opened links</span>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectFolder(null);
            onSelectView("recent");
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium flex items-center gap-1"
        >
          <span>View History</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border overflow-hidden">
        {recentlyVisited.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No recently visited links recorded. Click any bookmark to start building history.
          </div>
        ) : (
          recentlyVisited.map((bm) => {
            const timeAgo = formatTimeAgo(bm.lastClickedAt || bm.lastVisitedAt || bm.createdAt);
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
                    <span className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer">
                      {bm.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="truncate max-w-28 font-mono">{bm.domain}</span>
                      <span>•</span>
                      <span className="truncate max-w-28">{getParentName(bm)}</span>
                      <span>•</span>
                      <span className="font-mono">{timeAgo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(bm)}
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                        bm.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={bm.isFavorite ? "Remove favorite" : "Add to favorites"}
                    >
                      <Star className={`h-3 w-3 ${bm.isFavorite ? "fill-amber-500" : ""}`} />
                    </button>
                  )}
                  {onToggleArchive && (
                    <button
                      type="button"
                      onClick={() => onToggleArchive(bm)}
                      className="h-6 w-6 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Archive bookmark"
                    >
                      <Archive className="h-3.5 w-3.5" />
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
      {/* Homepage Layout Customizer Modal (1.2) */}
      <HomeLayoutModal
        open={layoutModalOpen}
        onOpenChange={setLayoutModalOpen}
        widgets={homeWidgets}
        onSaveWidgets={handleSaveWidgets}
        onResetDefaults={handleResetWidgets}
      />

              </div>
            );
          })
        )}
      </div>
    </section>
  );

  const renderStarredFavorites = () => (
    <section key="favorites" className="space-y-3">
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
                  <span className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer">
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
                    <Archive className="h-3.5 w-3.5" />
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
  );

  const renderUnsortedInbox = () => (
    <section key="unsorted" className="space-y-3">
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
  );

  const renderDotSpectrum = () => (
    <section key="spectrum" className="space-y-3">
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

          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={90}
              step={1}
              value={inactiveThreshold}
              onChange={(e) => setInactiveThreshold(Number(e.target.value))}
              className="w-32 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary border border-border"
              aria-label="Adjust Inactivity Timeline Threshold"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              {[
                { label: "1D", val: 1 },
                { label: "7D", val: 7 },
                { label: "14D", val: 14 },
                { label: "30D", val: 30 },
                { label: "90D", val: 90 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setInactiveThreshold(preset.val)}
                  className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                    inactiveThreshold === preset.val
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
        {/* Dynamic Continuous Multi-Line Coordinate Matrix Container */}
        <div className="relative w-full h-44 rounded-lg bg-secondary/30 border border-border overflow-hidden select-none">
          <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <pattern id="spectrum-grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/30" />
              </pattern>
            </defs>

            <rect width="1000" height="200" fill="url(#spectrum-grid)" />

            {/* Dynamic Division Grid Lines */}
            {spectrumData.gridLines.map((line, i) => (
              <line
                key={`grid-${i}`}
                x1={line.xPercent * 10}
                y1={0}
                x2={line.xPercent * 10}
                y2={200}
                stroke="currentColor"
                strokeWidth={line.isMajor ? "1" : "0.5"}
                strokeDasharray={line.isMajor ? "none" : "2 2"}
                className={line.isMajor ? "text-border" : "text-border/40"}
              />
            ))}

            {/* Inactive Dormant Threshold Barrier Line */}
            <line
              x1={940}
              y1={0}
              x2={940}
              y2={200}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="text-muted-foreground"
            />

            {/* Render Bookmark Dots */}
            {spectrumData.dots.map((dot) => {
              const isHovered = hoveredSpot?.bookmark.id === dot.bookmark.id;
              return (
                <g key={dot.bookmark.id} className="cursor-pointer">
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={isHovered ? 6 : 4}
                    fill={dot.color}
                    className="stroke-card transition-all duration-150"
                    strokeWidth={isHovered ? 2 : 1}
                    onMouseEnter={() =>
                      setHoveredSpot({
                        bookmark: dot.bookmark,
                        x: (dot.x / 1000) * 100,
                        y: (dot.y / 200) * 100,
                        timeAgoLabel: dot.timeAgoLabel,
                        daysAgo: dot.daysAgo,
                      })
                    }
                    onMouseLeave={() => setHoveredSpot(null)}
                    onClick={() => {
                      if (onOpenPreview) {
                        onOpenPreview(dot.bookmark);
                      } else {
                        handleSiteVisit(dot.bookmark);
                        window.open(dot.bookmark.url, "_blank");
                      }
                    }}
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
                  <span>URL Domain:</span>
                  <span className="font-mono text-foreground truncate max-w-36">
                    {hoveredSpot.bookmark.domain}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Folder Group:</span>
                  <span className="truncate max-w-36 text-foreground font-medium">
                    {getParentName(hoveredSpot.bookmark)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Last Clicked:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt
                      ? `${new Date(hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })} (${hoveredSpot.timeAgoLabel || `${hoveredSpot.daysAgo}d ago`})`
                      : `Never (Added ${new Date(hoveredSpot.bookmark.createdAt).toLocaleDateString()})`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
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
  );

  const renderAnalytics = () => (
    <div key="analytics">
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
    </div>
  );

  const renderWidget = (id: HomeWidgetKey) => {
    switch (id) {
      case "heatmap":
        return <ActivityHeatmap365 key="heatmap" bookmarks={bookmarks} onOpenPreview={onOpenPreview} />;
      case "scratchpad":
        return <ScratchpadWidget key="scratchpad" />;
      case "folders":
        return renderQuickAccessFolders();
      case "recent":
        return renderRecentlyVisited();
      case "favorites":
        return renderStarredFavorites();
      case "unsorted":
        return renderUnsortedInbox();
      case "spectrum":
        return renderDotSpectrum();
      case "analytics":
        return renderAnalytics();
      default:
        return null;
    }
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
            <Button
              variant="outline"
              onClick={() => setLayoutModalOpen(true)}
              className="text-xs h-8 px-2.5 rounded-lg border-border cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              title="Customize widget order and visibility"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Layout</span>
            </Button>

            {/* 1-Col vs 2-Col Dashboard Switcher */}
            <div className="flex items-center bg-secondary p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => handleSetColumns("1")}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  homeColumns === "1"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="1 Column View (Single Stream)"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetColumns("2")}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  homeColumns === "2"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="2 Columns View (Dashboard Grid)"
              >
                <Columns2 className="h-3.5 w-3.5" />
              </button>
            </div>
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

        {/* Instant Entire DB Search Bar */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="markly-home-search-input"
              type="text"
              value={homeSearch}
              onChange={(e) => setHomeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && homeSearch.trim()) {
                  if (onSearchJump) {
                    onSearchJump(homeSearch.trim());
                  } else {
                    onSelectFolder(null);
                    onSelectView("all");
                  }
                }
              }}
              placeholder={`Search entire library (${bookmarks.length} bookmarks, tags, URLs, notes... Press Enter to view in table or / to focus)`}
              className="w-full pl-9 pr-28 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground shadow-2xs"
            />
            {homeSearch.trim() && (
              <button
                type="button"
                onClick={() => {
                  if (onSearchJump) {
                    onSearchJump(homeSearch.trim());
                  } else {
                    onSelectFolder(null);
                    onSelectView("all");
                  }
                }}
                className="absolute right-1.5 top-1.5 px-2.5 py-1 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
              >
                <span>Search All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Instant Matches Dropdown Preview */}
          {homeSearchResults.length > 0 && (
            <div className="mt-2 p-2 rounded-xl border border-border bg-card shadow-lg space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground flex items-center justify-between border-b border-border/60 pb-1">
                <span>Matching bookmarks across database ({homeSearchResults.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchJump) {
                      onSearchJump(homeSearch.trim());
                    } else {
                      onSelectFolder(null);
                      onSelectView("all");
                    }
                  }}
                  className="text-primary hover:underline cursor-pointer font-medium text-[11px]"
                >
                  View all results in Table →
                </button>
              </div>
              {homeSearchResults.slice(0, 5).map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookmarkIcon src={bm.iconUrl} domain={bm.domain} alt={bm.title} className="h-4 w-4 rounded flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-foreground truncate hover:text-primary">{bm.title}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{bm.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {bm.tags?.slice(0, 2).map((t) => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                        #{t.name}
                      </span>
                    ))}
                    <ExternalLink
                      className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSiteVisit(bm);
                        window.open(bm.url, "_blank");
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Dynamic User-Customizable Homepage Widgets (1.1, 1.2, 1.3: 1-Col or 2-Col Dashboard Grid) */}
      {homeColumns === "2" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {homeWidgets.map((widget) => {
            if (!widget.visible) return null;
            const isWide =
              widget.id === "heatmap" ||
              widget.id === "spectrum" ||
              widget.id === "analytics";
            return (
              <div
                key={widget.id}
                className={isWide ? "lg:col-span-2" : "lg:col-span-1 h-full"}
              >
                {renderWidget(widget.id)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {homeWidgets.map((widget) => {
            if (!widget.visible) return null;
            return (
              <React.Fragment key={widget.id}>
                {renderWidget(widget.id)}
              </React.Fragment>
            );
          })}
        </div>
      )}


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
