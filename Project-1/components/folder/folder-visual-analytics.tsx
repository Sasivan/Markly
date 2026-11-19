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
  BookmarkPlus,
  Compass,
  Star,
  History,
  Folder as FolderIcon,
  Globe,
  BookmarkCheck,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { UniversalPresetHub } from "@/components/presets/universal-preset-hub";
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
import { ClassicChartsStudioBox } from "@/components/viz/classic-charts-studio-box";
import { IntelligenceSystemsStudioBox } from "@/components/viz/intelligence-systems-studio-box";
import { SitesMatrixStudioBox } from "@/components/viz/sites-matrix-studio-box";
import { FolderTreeStudioBox } from "@/components/viz/folder-tree-studio-box";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export interface FolderFilter {
  type: "domain" | "status" | "tag" | "folder";
  value: string;
}

export type VisualKind =
  | "chart"
  | "tags"
  | "engagement"
  | "wall"
  | "graph"
  | "plot"
  | "plot_studio"
  | "chart_studio"
  | "intel_studio"
  | "sites_studio"
  | "tree_studio"
  | "sites";

export interface TabVisual {
  id: string;
  title: string;
  kind?: VisualKind;
  chartConfig?: VizConfig;
  plotConfig?: any;
  intelConfig?: any;
  siteConfig?: any;
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
  const vId = String(v.id || "");
  const vKind = String(v.kind || v.category || "");
  const vTitle = String(v.title || (v as any).label || "");

  if (vId === "studio_observable_plot" || vKind === "plot_studio" || vId.includes("observable_plot") || vTitle.includes("Observable Plot")) {
    return { ...v, id: "studio_observable_plot", title: v.title || "Observable Plot Layered Graphics Studio (22 Variations)", kind: "plot_studio", colSpan: v.colSpan || 12, rowSpan: v.rowSpan || 2 };
  }
  if (vId === "studio_classic_charts" || vKind === "chart_studio" || vId.includes("classic_charts") || vTitle.includes("Classic Charts")) {
    return { ...v, id: "studio_classic_charts", title: v.title || "Classic Charts Layered Studio (18 Variations)", kind: "chart_studio", colSpan: v.colSpan || 12, rowSpan: v.rowSpan || 2 };
  }
  if (vId === "studio_intel_systems" || vKind === "intel_studio" || vId.includes("intel_systems") || vId.includes("intel_suite") || vTitle.includes("Intelligence Systems")) {
    return { ...v, id: "studio_intel_systems", title: v.title || "Workspace Intelligence Systems Studio (7 Variations)", kind: "intel_studio", colSpan: v.colSpan || 12, rowSpan: v.rowSpan || 2 };
  }
  if (vId === "studio_sites_matrix" || vKind === "sites_studio" || vId.includes("sites_matrix") || vTitle.includes("Sites Matrix")) {
    return { ...v, id: "studio_sites_matrix", title: v.title || "Sites Matrix Reference Studio", kind: "sites_studio", colSpan: v.colSpan || 12, rowSpan: v.rowSpan || 2 };
  }
  if (vId === "studio_folder_tree" || vKind === "tree_studio" || vKind === "tree" || vId.includes("folder_tree") || vTitle.includes("Folder Hierarchy") || vTitle.includes("Folder Tree")) {
    return { ...v, id: "studio_folder_tree", title: v.title || "Folder Hierarchy & Collections Tree", kind: "tree_studio", colSpan: v.colSpan || 12, rowSpan: v.rowSpan || 2 };
  }

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
  } catch { }
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
  } catch { }
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
  const [presetHubOpen, setPresetHubOpen] = React.useState(false);
  const [tabMenuOpen, setTabMenuOpen] = React.useState(false);
  const tabMenuRef = React.useRef<HTMLDivElement>(null);
  const [hasCustomDefaultTabs, setHasCustomDefaultTabs] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(`markly_folder_custom_default_tabs_${folderId}`) !== null;
      } catch { }
    }
    return false;
  });
  const [customDefaultSavedToast, setCustomDefaultSavedToast] = React.useState(false);

  const handleSetCustomDefaultTabs = () => {
    try {
      localStorage.setItem(`markly_folder_custom_default_tabs_${folderId}`, JSON.stringify(tabs));
      setHasCustomDefaultTabs(true);
      setCustomDefaultSavedToast(true);
      setTimeout(() => setCustomDefaultSavedToast(false), 2500);
    } catch { }
  };

  const handleClearCustomDefaultTabs = () => {
    try {
      localStorage.removeItem(`markly_folder_custom_default_tabs_${folderId}`);
      setHasCustomDefaultTabs(false);
    } catch { }
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
        setTabMenuOpen(false);
      }
    }
    if (tabMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [tabMenuOpen]);

  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_viz_expanded_${folderId}`);
        if (stored !== null) return stored === "true";
      } catch { }
    }
    return true;
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`markly_folder_viz_expanded_${folderId}`, String(next));
      } catch { }
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
    } catch { }
  };

  const handleSetVisualViewMode = (vizId: string, mode: WidgetViewMode) => {
    setVisualViewModes((prev) => ({ ...prev, [vizId]: mode }));
    try {
      localStorage.setItem(`markly_widget_view_${vizId}`, mode);
    } catch { }
  };

  // Scope: Universal (Synced across folders) vs Folder Custom
  const [isCustomScope, setIsCustomScope] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_viz_is_custom_${folderId}`);
        return stored === "true";
      } catch { }
    }
    return false;
  });

  const toggleVisualScope = () => {
    setIsCustomScope((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`markly_folder_viz_is_custom_${folderId}`, String(next));
      } catch { }
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

  // Synchronize Universal and Custom tabs in real-time across all views, folders, and windows
  React.useEffect(() => {
    const handleUniversalUpdate = (e?: any) => {
      if (!isCustomScope) {
        if (e?.detail && Array.isArray(e.detail)) {
          setTabs(e.detail);
        } else {
          const loaded = loadTabs(folderId, makeDefaultVisuals(folderId, false), false);
          setTabs(loaded);
        }
      }
    };
    const handleFolderTabsUpdate = (e?: any) => {
      if (e?.detail?.folderId === folderId) {
        if (e.detail.tabs && Array.isArray(e.detail.tabs)) {
          setTabs(e.detail.tabs);
        } else {
          const loaded = loadTabs(folderId, makeDefaultVisuals(folderId, isCustomScope), isCustomScope);
          setTabs(loaded);
        }
      }
    };
    const handleFolderTabSwitched = (e?: any) => {
      if (e?.detail?.tabId) {
        setActiveTabId(e.detail.tabId);
      }
    };
    window.addEventListener("markly-universal-tabs-updated", handleUniversalUpdate);
    window.addEventListener("markly-folder-tabs-updated", handleFolderTabsUpdate);
    window.addEventListener("markly-folder-tab-switched", handleFolderTabSwitched);
    window.addEventListener("storage", handleUniversalUpdate);
    return () => {
      window.removeEventListener("markly-universal-tabs-updated", handleUniversalUpdate);
      window.removeEventListener("markly-folder-tabs-updated", handleFolderTabsUpdate);
      window.removeEventListener("markly-folder-tab-switched", handleFolderTabSwitched);
      window.removeEventListener("storage", handleUniversalUpdate);
    };
  }, [folderId, isCustomScope]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const updateTabs = (next: Tab[]) => {
    setTabs(next);
    persistTabs(folderId, next, isCustomScope);
  };

  const handleResetToStandardDefaults = () => {
    const defaults = makeDefaultVisuals(folderId, isCustomScope);
    const standardTabs: Tab[] = [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: defaults }];
    updateTabs(standardTabs);
    setActiveTabId("tab_default");
  };

  const handleResetToCustomDefaultTabs = () => {
    try {
      const stored = localStorage.getItem(`markly_folder_custom_default_tabs_${folderId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          updateTabs(parsed);
          setActiveTabId(parsed[0].id);
          return;
        }
      }
    } catch { }
    handleResetToStandardDefaults();
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
    const cat = String(config.category || "");
    const cfgId = String(config.id || "");
    const cfgTitle = String(config.title || "");

    if (cat === "plot_studio" || cfgId === "studio_observable_plot" || cfgTitle.includes("Observable Plot")) {
      kind = "plot_studio";
    } else if (cat === "chart_studio" || cfgId === "studio_classic_charts" || cfgTitle.includes("Classic Charts")) {
      kind = "chart_studio";
    } else if (cat === "intel_studio" || cfgId === "studio_intel_systems" || cfgTitle.includes("Intelligence Systems") || cfgTitle.includes("Workspace Intelligence")) {
      kind = "intel_studio";
    } else if (cat === "sites_studio" || cfgId === "studio_sites_matrix" || cfgTitle.includes("Sites Matrix")) {
      kind = "sites_studio";
    } else if (cat === "tree_studio" || cfgId === "studio_folder_tree" || cfgTitle.includes("Folder Hierarchy") || cfgTitle.includes("Folder Tree")) {
      kind = "tree_studio";
    } else if (cat === "sites") {
      kind = "sites";
    } else if (cat === "plot") {
      kind = "plot";
    } else if (cat === "intel") {
      kind = (config.intelConfig?.type as any) || "tags";
    }

    const isStudio = kind === "plot_studio" || kind === "chart_studio" || kind === "intel_studio" || kind === "sites_studio" || kind === "tree_studio";

    const updatedTabVisual: TabVisual = {
      id: isStudio ? (config.id.startsWith("studio_") ? config.id : `studio_${kind}`) : config.id,
      title: config.title,
      kind,
      colSpan: config.colSpan || (isStudio ? 12 : 6),
      rowSpan: config.rowSpan || (isStudio ? 2 : 1),
      siteFilter: config.siteConfig?.source === "favorites" ? "favorites" : config.siteConfig?.source === "recent" ? "recent" : "all",
      plotConfig: config.plotConfig,
      chartConfig: config.chartConfig,
      intelConfig: config.intelConfig,
      siteConfig: config.siteConfig,
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

  const handlePinStudioToHome = (visual: any) => {
    try {
      const stored = localStorage.getItem("markly_home_widgets");
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      const isStudio =
        visual.kind?.includes("studio") ||
        visual.title?.includes("Studio") ||
        visual.category?.includes("studio") ||
        visual.id?.startsWith("studio_");
      const targetId = isStudio
        ? (visual.id?.startsWith("studio_") ? visual.id : `studio_${visual.kind}_${Date.now()}`)
        : `custom:${visual.kind || "chart"}_${Date.now()}`;
      list = list.filter((w: any) => w.id !== targetId && w.id !== visual.id);
      list.unshift({
        id: targetId,
        label: visual.title,
        visible: true,
        kind: isStudio ? "studio" : "custom",
        category: visual.kind || (isStudio ? "plot_studio" : "chart"),
        colSpan: visual.colSpan || 12,
        rowSpan: visual.rowSpan || 2,
        chartConfig: visual.chartConfig,
        plotConfig: visual.plotConfig,
        intelConfig: visual.intelConfig,
        siteConfig: visual.siteConfig,
        vizConfig: visual.chartConfig,
      });
      localStorage.setItem("markly_home_widgets", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePinStudioToFolder = (visual: any) => {
    try {
      const key = isCustomScope ? `markly_folder_tabs_${folderId}` : "markly_universal_folder_tabs";
      const raw = localStorage.getItem(key);
      let tbs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tbs) || tbs.length === 0) {
        tbs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      }
      const isStudio =
        visual.kind?.includes("studio") ||
        visual.title?.includes("Studio") ||
        visual.category?.includes("studio") ||
        visual.id?.startsWith("studio_");
      const targetId = isStudio
        ? (visual.id?.startsWith("studio_") ? visual.id : `studio_${visual.kind}_${Date.now()}`)
        : `viz_${Date.now()}`;
      tbs[0].visuals = (tbs[0].visuals || []).filter((v: any) => v.id !== targetId && v.id !== visual.id);
      tbs[0].visuals.unshift({
        id: targetId,
        title: visual.title,
        kind: visual.kind,
        colSpan: visual.colSpan || 12,
        rowSpan: visual.rowSpan || 2,
        chartConfig: visual.chartConfig,
        plotConfig: visual.plotConfig,
        intelConfig: visual.intelConfig,
        siteConfig: visual.siteConfig,
      });
      localStorage.setItem(key, JSON.stringify(tbs));
      window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated"));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
    } catch (e) {
      console.error(e);
    }
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
            className={`h-6 px-2 rounded-md border flex items-center gap-1.5 cursor-pointer text-[10px] font-mono transition-colors ${isCustomScope
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

          {/* Universal Preset Hub Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPresetHubOpen(true)}
            className="h-7 px-2 text-xs gap-1 cursor-pointer hover:bg-secondary text-foreground border-border"
            title="Manage and switch between folder tab presets"
          >
            <SlidersHorizontal className="h-3 w-3 text-primary" />
            <span className="font-medium hidden sm:inline">Presets</span>
          </Button>

          {/* Tab Options 3-Dots Menu */}
          <div ref={tabMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setTabMenuOpen((prev) => !prev)}
              className="h-7 w-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors border border-border/60"
              title="Folder Tab Options (Defaults, Presets, Reset)"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {tabMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setTabMenuOpen(false);
                    handleSetCustomDefaultTabs();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors text-left"
                >
                  <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Set as Custom Default Tabs</span>
                </button>

                {hasCustomDefaultTabs && (
                  <button
                    type="button"
                    onClick={() => {
                      setTabMenuOpen(false);
                      handleResetToCustomDefaultTabs();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer transition-colors text-left"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset to Custom Default</span>
                  </button>
                )}

                {hasCustomDefaultTabs && (
                  <button
                    type="button"
                    onClick={() => {
                      setTabMenuOpen(false);
                      handleClearCustomDefaultTabs();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors text-left"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Custom Default</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTabMenuOpen(false);
                    handleResetToStandardDefaults();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors text-left"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Standard Defaults</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  type="button"
                  onClick={() => {
                    setTabMenuOpen(false);
                    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
                    window.dispatchEvent(
                      new CustomEvent("markly-open-save-preset-dialog", {
                        detail: {
                          name: `${folderName} - ${activeTab?.label || "Tabs"}`,
                          category: "folder",
                          sourceLocation: `Folder '${folderName}' > Tab '${activeTab?.label || "Overview"}'`,
                          data: tabs,
                        },
                      })
                    );
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors text-left"
                >
                  <BookmarkPlus className="h-3.5 w-3.5 text-amber-500" />
                  <span>Save Tabs as Preset...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTabMenuOpen(false);
                    setPresetHubOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer transition-colors text-left"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Open Presets &amp; Layout Hub</span>
                </button>
              </div>
            )}
          </div>

          {customDefaultSavedToast && (
            <span className="text-[10px] text-emerald-500 font-mono font-semibold flex items-center gap-1 animate-in fade-in bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
              <Check className="h-2.5 w-2.5" />
              <span>Tabs Default Saved</span>
            </span>
          )}

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
                  className={`text-xs px-3 py-1.5 rounded-t-md font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${activeTabId === tab.id
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
                const vId = String(viz.id || "");
                const vKind = String(viz.kind || (viz as any).category || "");
                const vTitle = String(viz.title || (viz as any).label || "");

                // 1. Observable Plot Studio Box
                if (vId === "studio_observable_plot" || vKind === "plot_studio" || vId.includes("observable_plot") || vTitle.includes("Observable Plot")) {
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
                      onPinHome={handlePinStudioToHome}
                      onAddToFolder={handlePinStudioToFolder}
                    />
                  );
                }

                // 2. Classic Charts Studio Box
                if (vId === "studio_classic_charts" || vKind === "chart_studio" || vId.includes("classic_charts") || vTitle.includes("Classic Charts")) {
                  return (
                    <ClassicChartsStudioBox
                      key={viz.id}
                      id={viz.id}
                      bookmarks={bookmarks}
                      folders={folders}
                      initialColSpan={viz.colSpan || 12}
                      rowSpan={viz.rowSpan || 2}
                      onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                      onDeleteWidget={() => handleDeleteVisual(viz.id)}
                      onPinHome={handlePinStudioToHome}
                      onAddToFolder={handlePinStudioToFolder}
                    />
                  );
                }

                // 3. Workspace Intelligence Systems Studio Box
                if (vId === "studio_intel_systems" || vKind === "intel_studio" || vId.includes("intel_systems") || vId.includes("intel_suite") || vTitle.includes("Intelligence Systems")) {
                  return (
                    <IntelligenceSystemsStudioBox
                      key={viz.id}
                      id={viz.id}
                      bookmarks={bookmarks}
                      folders={folders}
                      initialColSpan={viz.colSpan || 12}
                      rowSpan={viz.rowSpan || 2}
                      onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                      onDeleteWidget={() => handleDeleteVisual(viz.id)}
                      onPinHome={handlePinStudioToHome}
                      onAddToFolder={handlePinStudioToFolder}
                    />
                  );
                }

                // 4. Sites Matrix Reference Studio Box
                if (vId === "studio_sites_matrix" || vKind === "sites_studio" || vId.includes("sites_matrix") || vTitle.includes("Sites Matrix")) {
                  return (
                    <SitesMatrixStudioBox
                      key={viz.id}
                      id={viz.id}
                      bookmarks={bookmarks}
                      folders={folders}
                      initialColSpan={viz.colSpan || 12}
                      rowSpan={viz.rowSpan || 2}
                      onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                      onDeleteWidget={() => handleDeleteVisual(viz.id)}
                      onPinHome={handlePinStudioToHome}
                      onAddToFolder={handlePinStudioToFolder}
                    />
                  );
                }

                // 5. Folder Hierarchy Tree Studio Box
                if (vId === "studio_folder_tree" || vKind === "tree_studio" || vKind === "tree" || vId.includes("folder_tree") || vTitle.includes("Folder Hierarchy") || vTitle.includes("Folder Tree")) {
                  return (
                    <FolderTreeStudioBox
                      key={viz.id}
                      id={viz.id}
                      bookmarks={bookmarks}
                      folders={folders}
                      initialColSpan={viz.colSpan || 12}
                      rowSpan={viz.rowSpan || 2}
                      onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                      onDeleteWidget={() => handleDeleteVisual(viz.id)}
                      onPinHome={handlePinStudioToHome}
                      onAddToFolder={handlePinStudioToFolder}
                    />
                  );
                }

                const currentSpan = viz.colSpan || (viz.kind === "graph" || viz.kind === "wall" ? 12 : 6);
                const isSiteKind = viz.kind === "sites" || Boolean(viz.siteConfig);
                const sitesList = isSiteKind ? getSitesListForVisual(viz.siteConfig?.source || viz.siteFilter) : [];
                const activeLimit = visualLimits[viz.id] ?? viz.siteConfig?.limit ?? "auto";

                return (
                  <DashboardWidgetBox
                    key={viz.id}
                    id={viz.id}
                    title={viz.title}
                    icon={getVisualIcon(viz.kind)}
                    initialColSpan={currentSpan}
                    onColSpanChange={(span) => handleVisualColSpanChange(viz.id, span)}
                    minHeight={viz.kind === "graph" ? 340 : 250}
                    badgeText={String(viz.kind || (isSiteKind ? "sites" : "chart")).toUpperCase()}
                    onEditWidget={() => handleOpenUniversalBuilder(viz)}
                    onDeleteWidget={() => handleDeleteVisual(viz.id)}
                    showItemLimitPicker={isSiteKind || viz.kind === "wall"}
                    itemLimit={activeLimit}
                    onItemLimitChange={(lim) => handleSetVisualLimit(viz.id, lim)}
                    viewMode={isSiteKind ? (visualViewModes[viz.id] ?? viz.siteConfig?.viewMode ?? "grid") : undefined}
                    availableViews={isSiteKind ? ["grid", "list", "table", "compact"] : undefined}
                    onViewModeChange={isSiteKind ? (m) => handleSetVisualViewMode(viz.id, m) : undefined}
                    widgetConfig={viz}
                  >
                    <div className="p-2 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                      {/* 1. SITES PRESET (Quick Access / Favorites / Recent) */}
                      {isSiteKind && (
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                          <BookmarkItemsView
                            items={sitesList}
                            mode={visualViewModes[viz.id] ?? viz.siteConfig?.viewMode ?? "grid"}
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
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${isSel
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
                                className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${selectedEngagementTier === tier.key
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
                        <div className="w-full h-full min-h-[300px] rounded-lg overflow-hidden border border-border bg-card flex-1">
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
        destinationType={isCustomScope ? "folder" : "universal_folders"}
        currentFolderId={folderId}
      />

      {/* Universal Preset & Layout Hub */}
      <UniversalPresetHub
        open={presetHubOpen}
        onOpenChange={setPresetHubOpen}
        activeCategory="folder"
        currentFolderId={folderId}
        folderName={folderName}
        folderTabs={tabs}
        activeTabId={activeTabId}
        isFolderCustomScope={isCustomScope}
        onApplyFolderTabs={(newTabs, appliedScope, targetTabId) => {
          const isCustom = appliedScope ? appliedScope === "custom" : isCustomScope;
          if (appliedScope && (appliedScope === "custom") !== isCustomScope) {
            setIsCustomScope(appliedScope === "custom");
            try {
              localStorage.setItem(`markly_folder_viz_is_custom_${folderId}`, String(appliedScope === "custom"));
            } catch {}
          }
          setTabs(newTabs);
          persistTabs(folderId, newTabs, isCustom);
          if (targetTabId && newTabs.some((t) => t.id === targetTabId)) {
            setActiveTabId(targetTabId);
          } else if (newTabs.length > 0 && !newTabs.some((t) => t.id === activeTabId)) {
            setActiveTabId(newTabs[0].id);
          }
        }}
      />
    </div>
  );
}
