"use client";

import * as React from "react";
import {
  BarChart3,
  PieChart,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Sparkles,
  Activity,
  PanelTop,
  Tag as TagIcon,
  TrendingUp,
  LayoutGrid,
  Layers,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Compass,
  Star,
  History,
  Folder as FolderIcon,
  Globe,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Pie } from "recharts";
import { Button } from "@/components/ui/button";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { VizChart } from "@/components/viz/viz-chart";
import { UniversalVisualBuilderModal, type UniversalVisualConfig, type VisualCategory } from "@/components/viz/universal-visual-builder-modal";
import { ObservablePlotView } from "@/components/viz/observable-plot-view";
import { computePlotData } from "@/lib/viz/plot-engine";
import { DashboardWidgetBox, BookmarkItemsView, type WidgetItemLimit, type WidgetViewMode } from "@/components/home/dashboard-widget-box";
import type { VizConfig, VizChartType } from "@/lib/viz";
import { ObservablePlotStudioBox } from "@/components/viz/observable-plot-studio-box";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export interface FolderFilter {
  type: "domain" | "status" | "tag" | "folder";
  value: string;
}

export type VisualKind = "chart" | "tags" | "engagement" | "wall" | "graph" | "plot" | "plot_studio" | "sites";

export interface TabVisual {
  id: string;
  title: string;
  kind?: VisualKind;
  chartConfig?: VizConfig;
  plotConfig?: any;
  intelConfig?: any;
  colSpan?: WidgetColSpan;
  rowSpan?: 1 | 2;
  siteFilter?: "all" | "favorites" | "recent";
  graphDepth?: number;
  chartType?: VizChartType;
  dimension?: any;
  measure?: any;
}

interface Tab {
  id: string;
  label: string;
  visuals: TabVisual[];
}

interface FolderVisualAnalyticsProps {
  folderId: string;
  folderName: string;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  activeFilter: FolderFilter | null;
  onFilterChange: (filter: FolderFilter | null) => void;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: ((bm: BookmarkWithDetails) => void) | ((id: string, title?: string) => void);
}

const DEFAULT_TAB_LABEL = "Overview";

function makeDefaultVisuals(folderId: string, isCustom = false): TabVisual[] {
  const isUniv = !isCustom || folderId === "universal";
  const idPrefix = isUniv ? "univ" : `fld_${folderId}`;
  return [
    {
      id: `${idPrefix}_domain`,
      title: "Domain Breakdown",
      kind: "chart",
      colSpan: 4,
      chartConfig: {
        version: 1,
        id: `${idPrefix}_domain`,
        title: "Domain Breakdown",
        chartType: "bar",
        dimension: "domain",
        measure: "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: 8,
        otherBucket: true,
      },
    },
    {
      id: `${idPrefix}_tags`,
      title: "Tag Frequency & Cloud",
      kind: "tags",
      colSpan: 4,
    },
    {
      id: `${idPrefix}_status`,
      title: "Link Health Status",
      kind: "chart",
      colSpan: 4,
      chartConfig: {
        version: 1,
        id: `${idPrefix}_status`,
        title: "Link Health Status",
        chartType: "donut",
        dimension: "status",
        measure: "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: 4,
        otherBucket: false,
      },
    },
  ];
}

function normalizeVisual(v: any): TabVisual {
  if (v.kind) return v;
  if (v.id?.startsWith("plot_") || v.chartType === "plot") {
    return { id: v.id, title: v.title || "Observable Plot", kind: "plot", plotConfig: v.plotConfig, colSpan: v.colSpan || 6 };
  }
  if (v.id?.startsWith("tags_") || v.chartType === "tags") {
    return { id: v.id, title: v.title || "Tag Frequency", kind: "tags", colSpan: v.colSpan || 6 };
  }
  if (v.id?.startsWith("engagement_") || v.chartType === "engagement") {
    return { id: v.id, title: v.title || "Engagement Spectrum", kind: "engagement", colSpan: v.colSpan || 6 };
  }
  if (v.id?.startsWith("wall_") || v.chartType === "wall") {
    return { id: v.id, title: v.title || "Favicon Wall", kind: "wall", colSpan: v.colSpan || 12 };
  }
  if (v.id?.startsWith("graph_") || v.chartType === "graph") {
    return { id: v.id, title: v.title || "Knowledge Graph", kind: "graph", colSpan: v.colSpan || 12 };
  }
  if (v.id?.startsWith("sites_") || v.kind === "sites") {
    return { id: v.id, title: v.title || "Quick Access Sites", kind: "sites", siteFilter: v.siteFilter || "all", colSpan: v.colSpan || 6 };
  }
  return {
    id: v.id || `viz_${Date.now()}`,
    title: v.title || "Visual Chart",
    kind: "chart",
    chartConfig: v.chartConfig || v,
    colSpan: v.colSpan || 6,
  };
}

function loadTabs(folderId: string, defaultVisuals: TabVisual[], isCustomScope = false): Tab[] {
  if (typeof window === "undefined") {
    return [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: defaultVisuals }];
  }
  const storageKey = isCustomScope ? `markly_folder_tabs_${folderId}` : "markly_universal_folder_tabs";
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t: any) => ({
          ...t,
          visuals: (t.visuals || []).map(normalizeVisual),
        }));
      }
    }
    // Legacy: check old flat list
    const legacy = localStorage.getItem(`markly_folder_visuals_${folderId}`);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        return [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: parsed.map(normalizeVisual) }];
      }
    }
  } catch {}
  return [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: defaultVisuals }];
}

function persistTabs(folderId: string, tabs: Tab[], isCustomScope = false) {
  if (typeof window === "undefined") return;
  const storageKey = isCustomScope ? `markly_folder_tabs_${folderId}` : "markly_universal_folder_tabs";
  try {
    localStorage.setItem(storageKey, JSON.stringify(tabs));
    if (!isCustomScope) {
      window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: tabs }));
    }
    window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
  } catch {}
}

export function FolderVisualAnalytics({
  folderId,
  folderName,
  bookmarks,
  folders,
  activeFilter,
  onFilterChange,
  onOpenPreview,
  onEditBookmark,
  onToggleFavorite,
  onToggleArchive,
  onDeleteBookmark,
}: FolderVisualAnalyticsProps) {
  // Collapsed / Expanded state
  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_viz_expanded_${folderId}`);
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return true;
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`markly_folder_viz_expanded_${folderId}`, String(next));
      } catch {}
      return next;
    });
  };

  // Visual limits and view modes persisted
  const [visualLimits, setVisualLimits] = React.useState<Record<string, WidgetItemLimit>>({});
  const [visualViewModes, setVisualViewModes] = React.useState<Record<string, WidgetViewMode>>({});

  const handleSetVisualLimit = (vizId: string, limit: WidgetItemLimit) => {
    setVisualLimits((prev) => ({ ...prev, [vizId]: limit }));
    try {
      localStorage.setItem(`markly_box_item_limit_${vizId}`, String(limit));
    } catch {}
  };

  const handleSetVisualViewMode = (vizId: string, mode: WidgetViewMode) => {
    setVisualViewModes((prev) => ({ ...prev, [vizId]: mode }));
    try {
      localStorage.setItem(`markly_widget_view_${vizId}`, mode);
    } catch {}
  };

  // Scope: Universal (Synced across folders) vs Folder Custom
  const [isCustomScope, setIsCustomScope] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_viz_is_custom_${folderId}`);
        return stored === "true";
      } catch {}
    }
    return false;
  });

  const toggleVisualScope = () => {
    setIsCustomScope((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`markly_folder_viz_is_custom_${folderId}`, String(next));
      } catch {}
      const loaded = loadTabs(folderId, makeDefaultVisuals(folderId, next), next);
      setTabs(loaded);
      setActiveTabId(loaded[0]?.id ?? "tab_default");
      return next;
    });
  };

  // Multi-Tab Visual System
  const [tabs, setTabs] = React.useState<Tab[]>(() => {
    const custom = typeof window !== "undefined" && localStorage.getItem(`markly_folder_viz_is_custom_${folderId}`) === "true";
    return loadTabs(folderId, makeDefaultVisuals(folderId, custom), custom);
  });
  const [activeTabId, setActiveTabId] = React.useState<string>(() => tabs[0]?.id ?? "tab_default");
  const [renamingTabId, setRenamingTabId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  React.useEffect(() => {
    const loaded = loadTabs(folderId, makeDefaultVisuals(folderId, isCustomScope), isCustomScope);
    setTabs(loaded);
    setActiveTabId(loaded[0]?.id ?? "tab_default");
  }, [folderId, isCustomScope]);

  // Synchronize Universal tabs in real-time across all views, folders, and windows
  React.useEffect(() => {
    const handleUniversalUpdate = (e?: Event) => {
      if (!isCustomScope) {
        const loaded = loadTabs(folderId, makeDefaultVisuals(folderId, false), false);
        setTabs(loaded);
      }
    };
    window.addEventListener("markly-universal-tabs-updated", handleUniversalUpdate);
    window.addEventListener("storage", handleUniversalUpdate);
    return () => {
      window.removeEventListener("markly-universal-tabs-updated", handleUniversalUpdate);
      window.removeEventListener("storage", handleUniversalUpdate);
    };
  }, [folderId, isCustomScope]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const updateTabs = (next: Tab[]) => {
    setTabs(next);
    persistTabs(folderId, next, isCustomScope);
  };

  const handleAddTab = () => {
    const newId = `tab_${Date.now()}`;
    const newTab: Tab = { id: newId, label: `Tab ${tabs.length + 1}`, visuals: [] };
    const next = [...tabs, newTab];
    updateTabs(next);
    setActiveTabId(newId);
  };

  const handleDeleteTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const next = tabs.filter((t) => t.id !== tabId);
    updateTabs(next);
    if (activeTabId === tabId) setActiveTabId(next[0]?.id ?? "");
  };

  const startRename = (tab: Tab) => {
    setRenamingTabId(tab.id);
    setRenameValue(tab.label);
  };

  const commitRename = () => {
    if (!renamingTabId) return;
    const next = tabs.map((t) =>
      t.id === renamingTabId ? { ...t, label: renameValue.trim() || t.label } : t
    );
    updateTabs(next);
    setRenamingTabId(null);
  };

  const setTabVisuals = (tabId: string, visuals: TabVisual[]) => {
    const next = tabs.map((t) => (t.id === tabId ? { ...t, visuals } : t));
    updateTabs(next);
  };

  const handleDeleteVisual = (vizId: string) => {
    if (!activeTab) return;
    setTabVisuals(activeTab.id, activeTab.visuals.filter((v) => v.id !== vizId));
  };

  const handleVisualColSpanChange = (vizId: string, colSpan: WidgetColSpan) => {
    if (!activeTab) return;
    setTabVisuals(
      activeTab.id,
      activeTab.visuals.map((v) => (v.id === vizId ? { ...v, colSpan } : v))
    );
  };

  // Universal Visual Builder & Editor State
  const [universalModalOpen, setUniversalModalOpen] = React.useState(false);
  const [editingUniversalConfig, setEditingUniversalConfig] = React.useState<UniversalVisualConfig | null>(null);

  const handleOpenUniversalBuilder = (visual?: TabVisual) => {
    if (visual) {
      let cat: VisualCategory = "chart";
      if (visual.kind === "sites") cat = "sites";
      else if (visual.kind === "plot") cat = "plot";
      else if (visual.kind === "tags" || visual.kind === "engagement" || visual.kind === "wall" || visual.kind === "graph") cat = "intel";

      setEditingUniversalConfig({
        id: visual.id,
        title: visual.title,
        category: cat,
        colSpan: visual.colSpan || 6,
        siteConfig: visual.kind === "sites" ? {
          source: visual.siteFilter || "all",
          limit: visualLimits[visual.id] ?? 8,
          viewMode: visualViewModes[visual.id] ?? "grid",
          sortBy: "recent",
        } : undefined,
        plotConfig: visual.plotConfig,
        chartConfig: visual.chartConfig,
        intelConfig: cat === "intel" ? { type: (visual.kind as any) || "tags" } : undefined,
      });
    } else {
      setEditingUniversalConfig(null);
    }
    setUniversalModalOpen(true);
  };

  const handleSaveUniversalVisual = (config: UniversalVisualConfig) => {
    if (!activeTab) return;
    const exists = activeTab.visuals.find((v) => v.id === config.id);

    let kind: VisualKind = "chart";
    if (config.category === "sites") kind = "sites";
    else if (config.category === "plot") kind = "plot";
    else if (config.category === "intel") {
      kind = (config.intelConfig?.type as any) || "tags";
    }

    const updatedTabVisual: TabVisual = {
      id: config.id,
      title: config.title,
      kind,
      colSpan: config.colSpan || 6,
      siteFilter: config.siteConfig?.source === "favorites" ? "favorites" : config.siteConfig?.source === "recent" ? "recent" : "all",
      plotConfig: config.plotConfig,
      chartConfig: config.chartConfig,
      intelConfig: config.intelConfig,
    };

    if (config.siteConfig) {
      if (config.siteConfig.limit) handleSetVisualLimit(config.id, config.siteConfig.limit);
      if (config.siteConfig.viewMode) handleSetVisualViewMode(config.id, config.siteConfig.viewMode);
    }

    if (exists) {
      setTabVisuals(
        activeTab.id,
        activeTab.visuals.map((v) => (v.id === config.id ? updatedTabVisual : v))
      );
    } else {
      setTabVisuals(activeTab.id, [...activeTab.visuals, updatedTabVisual]);
    }
  };

  // Click Filtering
  const handleSelectDomain = (domain: string) => {
    if (activeFilter?.type === "domain" && activeFilter.value.toLowerCase() === domain.toLowerCase()) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "domain", value: domain });
    }
  };

  const handleSelectTag = (tag: string) => {
    if (activeFilter?.type === "tag" && activeFilter.value.toLowerCase() === tag.toLowerCase()) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "tag", value: tag });
    }
  };

  const handleSelectStatus = (status: string) => {
    if (activeFilter?.type === "status" && activeFilter.value === status) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "status", value: status });
    }
  };

  // Compute Tags Data
  const tagData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      for (const t of bm.tags || []) {
        const name = typeof t === "string" ? t : t.name;
        map.set(name, (map.get(name) || 0) + 1);
      }
    }
    const total = bookmarks.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({
        tag: `#${name}`,
        rawName: name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  // Compute Engagement Data
  const engagementData = React.useMemo(() => {
    let frequent = 0;
    let active = 0;
    let occasional = 0;
    let dormant = 0;

    for (const bm of bookmarks) {
      const v = bm.visitCount || 0;
      if (v >= 5) frequent++;
      else if (v >= 2) active++;
      else if (v === 1) occasional++;
      else dormant++;
    }

    const total = bookmarks.length || 1;

    return {
      tiers: [
        { key: "frequent", tier: "Frequent (≥5)", count: frequent, percentage: Math.round((frequent / total) * 100), color: "#2563eb" },
        { key: "active", tier: "Active (2-4)", count: active, percentage: Math.round((active / total) * 100), color: "#0d9488" },
        { key: "occasional", tier: "Occasional (1)", count: occasional, percentage: Math.round((occasional / total) * 100), color: "#d97706" },
        { key: "dormant", tier: "Dormant (0)", count: dormant, percentage: Math.round((dormant / total) * 100), color: "#64748b" },
      ],
    };
  }, [bookmarks]);

  const [selectedEngagementTier, setSelectedEngagementTier] = React.useState<string | null>(null);

  const activeTierBookmarks = React.useMemo(() => {
    if (!selectedEngagementTier) return [];
    return bookmarks.filter((bm) => {
      const v = bm.visitCount || 0;
      if (selectedEngagementTier === "frequent") return v >= 5;
      if (selectedEngagementTier === "active") return v >= 2 && v < 5;
      if (selectedEngagementTier === "occasional") return v === 1;
      return v === 0;
    });
  }, [bookmarks, selectedEngagementTier]);

  const getVisualIcon = (kind?: VisualKind) => {
    switch (kind) {
      case "tags":
        return <TagIcon className="h-4 w-4 text-pink-500" />;
      case "engagement":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "wall":
        return <LayoutGrid className="h-4 w-4 text-amber-500" />;
      case "graph":
        return <Layers className="h-4 w-4 text-indigo-500" />;
      case "sites":
        return <Compass className="h-4 w-4 text-primary" />;
      case "plot":
        return <Activity className="h-4 w-4 text-cyan-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-primary" />;
    }
  };

  const getSitesListForVisual = (siteFilter?: "all" | "favorites" | "recent") => {
    if (siteFilter === "favorites") {
      return bookmarks.filter((b) => !b.isArchived && b.isFavorite);
    }
    if (siteFilter === "recent") {
      return [...bookmarks]
        .filter((b) => !b.isArchived && (b.lastVisitedAt || b.lastClickedAt || (b.visitCount || 0) > 0))
        .sort((a, b) => {
          const tA = new Date(a.lastClickedAt || a.lastVisitedAt || a.createdAt).getTime();
          const tB = new Date(b.lastClickedAt || b.lastVisitedAt || b.createdAt).getTime();
          return tB - tA;
        });
    }
    return bookmarks.filter((b) => !b.isArchived);
  };

  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getParentName = (bm: BookmarkWithDetails) => {
    if (!bm.folderId) return "Unsorted";
    return folders.find((f) => f.id === bm.folderId)?.name || "Folder";
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden mb-4 animate-in fade-in">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/30 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate">
            {folderName} Visual Intelligence & Tabs
          </span>
          <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary border border-border/60 hidden sm:inline">
            {bookmarks.length} sites
          </span>

          {/* Universal vs Folder Custom Scope Toggle Button */}
          <button
            type="button"
            onClick={toggleVisualScope}
            className={`h-6 px-2 rounded-md border flex items-center gap-1.5 cursor-pointer text-[10px] font-mono transition-colors ${
              isCustomScope
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 font-semibold"
            }`}
            title={
              isCustomScope
                ? "Folder Custom: Edits only affect this folder. Click to switch to Universal Synced mode."
                : "Universal (All Folders): Edits here automatically reflect across all folders and sites. Click to switch to Folder Custom."
            }
          >
            <Globe className="h-3 w-3" />
            <span className="hidden sm:inline">{isCustomScope ? "Custom (This Folder)" : "Universal (All Folders)"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Active Filter Pill */}
          {activeFilter && (
            <div className="flex items-center gap-1 bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-[11px] font-mono">
              <span className="capitalize">{activeFilter.type}:</span>
              <span className="font-semibold">{activeFilter.value}</span>
              <button
                type="button"
                onClick={() => onFilterChange(null)}
                className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer ml-0.5"
                title="Clear filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )}

          {/* Universal Add Visual Button (Opens Universal Visual Builder Modal without clipping off-screen) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenUniversalBuilder()}
            className="h-7 px-2.5 text-xs gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="font-medium">Add Visual</span>
          </Button>

          {/* Add Tab Button */}
          <button
            type="button"
            onClick={handleAddTab}
            className="h-7 w-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors border border-border/60"
            title="Add a new visual tab"
          >
            <PanelTop className="h-3.5 w-3.5" />
          </button>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={toggleExpanded}
            className="h-7 w-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
            title={isExpanded ? "Collapse Analytics" : "Expand Analytics"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      {isExpanded && tabs.length > 0 && (
        <div className="flex items-center gap-0.5 px-3 pt-2 border-b border-border/40 overflow-x-auto bg-card">
          {tabs.map((tab) => (
            <div key={tab.id} className="flex items-center group/tab shrink-0">
              {renamingTabId === tab.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingTabId(null);
                  }}
                  className="text-xs px-2 py-1 rounded border border-primary bg-background text-foreground w-24 outline-none mb-1"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                  className={`text-xs px-3 py-1.5 rounded-t-md font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                    activeTabId === tab.id
                      ? "border-primary text-foreground bg-secondary/60"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                  title="Double-click to rename"
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({tab.visuals.length})
                  </span>
                </button>
              )}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteTab(tab.id)}
                  className="ml-0.5 opacity-0 group-hover/tab:opacity-100 h-4 w-4 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-opacity mb-1"
                  title="Delete this tab"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddTab}
            className="ml-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded cursor-pointer hover:bg-secondary transition-colors shrink-0 mb-1"
            title="Add tab"
          >
            + Tab
          </button>
        </div>
      )}

      {/* Body: Visuals for Active Tab in Resizable Multi-Column Grid */}
      {isExpanded && activeTab && (
        <div className="p-3.5 bg-card">
          {activeTab.visuals.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground space-y-3">
              <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p>No visuals in &ldquo;{activeTab.label}&rdquo; yet.</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTabVisuals(activeTab.id, makeDefaultVisuals(folderId))}
                  className="text-xs cursor-pointer"
                >
                  Restore Default Charts
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenUniversalBuilder()}
                  className="text-xs cursor-pointer gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Visual
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {activeTab.visuals.map((viz) => {
                if (viz.id === "studio_observable_plot" || viz.kind === "plot_studio") {
                  return (
                    <ObservablePlotStudioBox
                      key={viz.id}
                      id={viz.id}
                      bookmarks={bookmarks}
                      folders={folders}
                      initialColSpan={viz.colSpan || 12}
                      rowSpan={viz.rowSpan || 2}
                      onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                      onDeleteWidget={() => handleDeleteVisual(viz.id)}
                    />
                  );
                }

                const currentSpan = viz.colSpan || (viz.kind === "graph" || viz.kind === "wall" ? 12 : 6);
                const sitesList = viz.kind === "sites" ? getSitesListForVisual(viz.siteFilter) : [];
                const activeLimit = visualLimits[viz.id] ?? "auto";

                return (
                  <DashboardWidgetBox
                    key={viz.id}
                    id={viz.id}
                    title={viz.title}
                    icon={getVisualIcon(viz.kind)}
                    initialColSpan={currentSpan}
                    onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                    minHeight={viz.kind === "graph" ? 340 : 250}
                    badgeText={String(viz.kind || "chart").toUpperCase()}
                    onEditWidget={() => handleOpenUniversalBuilder(viz)}
                    onDeleteWidget={() => handleDeleteVisual(viz.id)}
                    showItemLimitPicker={viz.kind === "sites" || viz.kind === "wall"}
                    itemLimit={activeLimit}
                    onItemLimitChange={(lim) => handleSetVisualLimit(viz.id, lim)}
                    viewMode={viz.kind === "sites" ? (visualViewModes[viz.id] ?? "grid") : undefined}
                    availableViews={viz.kind === "sites" ? ["grid", "list", "table", "compact"] : undefined}
                    onViewModeChange={viz.kind === "sites" ? (m) => handleSetVisualViewMode(viz.id, m) : undefined}
                  >
                    <div className="p-2 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                      {/* 1. SITES PRESET (Quick Access / Favorites / Recent) */}
                      {viz.kind === "sites" && (
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                          <BookmarkItemsView
                            items={sitesList}
                            mode={visualViewModes[viz.id] ?? "grid"}
                            limit={activeLimit}
                            emptyMessage={`No ${viz.title.toLowerCase()} recorded in this folder yet.`}
                            onOpenPreview={onOpenPreview}
                            onEditBookmark={onEditBookmark}
                            onToggleFavorite={onToggleFavorite}
                            onToggleArchive={onToggleArchive}
                            onDeleteBookmark={onDeleteBookmark}
                            handleSiteVisit={(bm) => {
                              window.open(bm.url, "_blank");
                            }}
                            formatTimeAgo={formatTimeAgo}
                            getParentName={getParentName}
                          />
                        </div>
                      )}

                      {/* 2. OBSERVABLE PLOT VIEW */}
                      {viz.kind === "plot" && (
                        <div className="h-56 w-full flex-1">
                          <ObservablePlotView
                            data={computePlotData(bookmarks, folders, {
                              type: (viz.plotConfig?.type as any) || "barX",
                              dimension: (viz.plotConfig?.dimension as any) || "domain",
                              measure: (viz.plotConfig?.measure as any) || "count",
                              group: (viz.plotConfig?.group as any) || "none",
                              transform: (viz.plotConfig?.transform as any) || "raw",
                              sortOrder: (viz.plotConfig?.sortOrder as any) || "desc",
                              limit: viz.plotConfig?.limit ?? 10,
                              colorScheme: viz.plotConfig?.colorScheme || "tableau10",
                              curve: (viz.plotConfig?.curve as any) || "natural",
                              showGrid: viz.plotConfig?.showGrid ?? true,
                              showTip: viz.plotConfig?.showTip ?? true,
                              showLegend: viz.plotConfig?.showLegend ?? false,
                              filters: viz.plotConfig?.filters,
                            })}
                            config={{
                              type: (viz.plotConfig?.type as any) || "barX",
                              x: (viz.plotConfig?.type === "barX" || viz.plotConfig?.type === "stackedBarX") ? "value" : "dimension",
                              y: (viz.plotConfig?.type === "barX" || viz.plotConfig?.type === "stackedBarX") ? "dimension" : "value",
                              z: viz.plotConfig?.group && viz.plotConfig?.group !== "none" ? "group" : undefined,
                              fill: "#3b82f6",
                              stroke: "#3b82f6",
                              colorScheme: viz.plotConfig?.colorScheme || "tableau10",
                              curve: (viz.plotConfig?.curve as any) || "natural",
                              grid: viz.plotConfig?.showGrid ?? true,
                              tip: viz.plotConfig?.showTip ?? true,
                              legend: viz.plotConfig?.showLegend ?? false,
                              crosshair: true,
                              height: 220,
                            }}
                          />
                        </div>
                      )}

                      {/* 3. TAGS VISUAL */}
                      {viz.kind === "tags" && (
                        <div className="space-y-3 flex-1">
                          <div className="h-36 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={tagData.slice(0, 14)}
                                margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                                onClick={(e: any) => {
                                  if (e?.activePayload?.[0]?.payload) {
                                    handleSelectTag(e.activePayload[0].payload.rawName);
                                  }
                                }}
                              >
                                <defs>
                                  <linearGradient id={`tagAreaGradFolder_${viz.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.02} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
                                <XAxis dataKey="tag" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload?.[0]) {
                                      const d = payload[0].payload;
                                      return (
                                        <div className="rounded border border-border bg-popover p-2 text-xs shadow text-popover-foreground">
                                          <div className="font-semibold">{d.tag}</div>
                                          <div>{d.count} sites ({d.percentage}%)</div>
                                          <div className="text-[10px] text-primary">Click to filter below</div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#ec4899" fill={`url(#tagAreaGradFolder_${viz.id})`} strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Interactive Tag Chips */}
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1">
                            {tagData.map((t) => {
                              const isSel = activeFilter?.type === "tag" && activeFilter.value.toLowerCase() === t.rawName.toLowerCase();
                              return (
                                <button
                                  key={t.rawName}
                                  type="button"
                                  onClick={() => handleSelectTag(t.rawName)}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                                    isSel
                                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60"
                                  }`}
                                >
                                  <span>#{t.rawName}</span>
                                  <span className="text-[10px] opacity-75">({t.count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. ENGAGEMENT SPECTRUM VISUAL */}
                      {viz.kind === "engagement" && (
                        <div className="space-y-3 flex-1">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {engagementData.tiers.map((tier) => (
                              <button
                                key={tier.key}
                                type="button"
                                onClick={() => setSelectedEngagementTier((prev) => (prev === tier.key ? null : tier.key))}
                                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                                  selectedEngagementTier === tier.key
                                    ? "border-primary bg-primary/10 shadow-2xs"
                                    : "border-border bg-card hover:border-primary/40"
                                }`}
                              >
                                <span className="text-[10px] text-muted-foreground block truncate">{tier.tier}</span>
                                <span className="text-sm font-bold text-foreground font-mono">{tier.count}</span>
                              </button>
                            ))}
                          </div>
                          <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={engagementData.tiers}
                                margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                                onClick={(e: any) => {
                                  if (e?.activePayload?.[0]?.payload) {
                                    setSelectedEngagementTier(e.activePayload[0].payload.key);
                                  }
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
                                <XAxis dataKey="tier" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <Tooltip />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                  {engagementData.tiers.map((entry, idx) => (
                                    <Cell key={`tier-${idx}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          {selectedEngagementTier && (
                            <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5 animate-in fade-in">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span>{selectedEngagementTier.toUpperCase()} Sites ({activeTierBookmarks.length})</span>
                                <button type="button" onClick={() => setSelectedEngagementTier(null)} className="text-muted-foreground hover:text-foreground">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {activeTierBookmarks.slice(0, 20).map((bm) => (
                                  <div key={bm.id} onClick={() => onOpenPreview?.(bm)} className="flex items-center justify-between p-1 rounded hover:bg-secondary cursor-pointer text-[11px]">
                                    <span className="truncate">{bm.title}</span>
                                    <span className="font-mono text-muted-foreground shrink-0">{bm.visitCount || 0} visits</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. FAVICON WALL MATRIX VISUAL */}
                      {viz.kind === "wall" && (
                        <div className="space-y-2 flex-1">
                          <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                            <span>Favicon Matrix ({bookmarks.length} sites)</span>
                            <span>Click icon to preview</span>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-56 overflow-y-auto p-1">
                            {(typeof activeLimit === "number" ? bookmarks.slice(0, activeLimit) : bookmarks).map((bm) => (
                              <div
                                key={bm.id}
                                onClick={() => (onOpenPreview ? onOpenPreview(bm) : window.open(bm.url, "_blank"))}
                                className="p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer"
                                title={`${bm.title} (${bm.domain})`}
                              >
                                <BookmarkIcon
                                  src={bm.iconUrl}
                                  alt={bm.title}
                                  domain={bm.domain}
                                  className="h-6 w-6 rounded object-contain"
                                />
                                <span className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                                  {bm.domain.split(".")[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. KNOWLEDGE GRAPH VISUAL */}
                      {viz.kind === "graph" && (
                        <div className="h-72 w-full rounded-lg overflow-hidden border border-border bg-card flex-1">
                          <KnowledgeGraph
                            mode={folderId.startsWith("page_") ? "global" : "folder"}
                            folderId={folderId.startsWith("page_") ? undefined : folderId}
                            depth={viz.intelConfig?.graphDepth ?? viz.graphDepth ?? 2}
                            showControls={false}
                            onSelectDomain={handleSelectDomain}
                          />
                        </div>
                      )}

                      {/* 7. STANDARD RECHARTS VIZCHART */}
                      {(!viz.kind || viz.kind === "chart") && (
                        <div className="flex-1">
                          <VizChart
                            config={viz.chartConfig || (viz as any)}
                            bookmarks={bookmarks}
                            folders={folders}
                            height={180}
                            onSelectDomain={handleSelectDomain}
                            onSelectTag={handleSelectTag}
                            onSelectFolder={(fId) => onFilterChange(fId ? { type: "folder", value: fId } : null)}
                            bare={true}
                          />
                        </div>
                      )}

                      {/* Visual Card Footer Info */}
                      <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/40 mt-2">
                        <span>Click visual to filter</span>
                        <span className="uppercase">{viz.kind || (viz.chartConfig?.chartType ?? "CHART")}</span>
                      </div>
                    </div>
                  </DashboardWidgetBox>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Universal Visual Studio Builder & Editor Modal */}
      <UniversalVisualBuilderModal
        open={universalModalOpen}
        onOpenChange={setUniversalModalOpen}
        initialConfig={editingUniversalConfig}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveUniversalVisual}
        destinationName={folderName}
      />
    </div>
  );
}
