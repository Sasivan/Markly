"use client";

import * as React from "react";
import {
  BarChart3,
  Plus,
  Sparkles,
  TrendingUp,
  Folder,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2,
  Pin,
  Play,
  Table as TableIcon,
  PieChart as PieChartIcon,
  Activity,
  Trash2,
  FolderPlus,
  Check,
  Palette,
  RotateCcw,
  LayoutGrid,
  Tag as TagIcon,
  Globe,
  Share2,
  Eye,
  PanelTop,
  Search,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";
import type { VizConfig, VizChartType, VizDimension, VizMeasure } from "@/lib/viz";
import { RemoteWidgetStore } from "@/lib/viz";
import { VIZ_GRADIENTS, type VizGradientPreset } from "@/lib/viz/palette";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { VizChart } from "./viz-chart";
import { ObservablePlotView, type ObservablePlotConfig } from "./observable-plot-view";
import { DashboardWidgetBox, BookmarkItemsView } from "@/components/home/dashboard-widget-box";
import { UniversalVisualBuilderModal, type UniversalVisualConfig } from "./universal-visual-builder-modal";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export interface VisualsPageViewProps {
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectFolder?: (folderId: string | null) => void;
  onNavigateHome?: () => void;
}

const PLOT_VARIATIONS: Array<{
  type: ObservablePlotConfig["type"];
  label: string;
  category: "Bars" | "Points" | "Trends" | "Areas" | "Matrix" | "Special";
  desc: string;
}> = [
  // Bars & Distribution (8)
  { type: "barX", label: "Ranked BarX", category: "Bars", desc: "Horizontal ranked bars sorted by value" },
  { type: "barY", label: "Column BarY", category: "Bars", desc: "Vertical columns with rounded caps" },
  { type: "stackedBarY", label: "Stacked BarY", category: "Bars", desc: "Stacked columns by folder" },
  { type: "stackedBarX", label: "Stacked BarX", category: "Bars", desc: "Horizontal stacked bars" },
  { type: "groupedBar", label: "Grouped Bar", category: "Bars", desc: "Side-by-side faceted bars" },
  { type: "lollipop", label: "Lollipop Stem", category: "Bars", desc: "Stems with dot endpoints" },
  { type: "box", label: "Box & Whisker", category: "Bars", desc: "Quartile spread and median distribution" },
  { type: "waffle", label: "Waffle Matrix", category: "Bars", desc: "Grid of unit squares for proportions" },

  // Points & Spikes (4)
  { type: "dot", label: "Scatter Dot", category: "Points", desc: "2D point scatter with opacity" },
  { type: "bubble", label: "Bubble Chart", category: "Points", desc: "3D scatter with radius mapped to metric" },
  { type: "tick", label: "1D Ticks", category: "Points", desc: "Distribution tick marks along axis" },
  { type: "rule", label: "Stem Rules", category: "Points", desc: "Vertical spikes from zero baseline" },

  // Trends & Regression (6)
  { type: "line", label: "Smooth Line", category: "Trends", desc: "Natural splined trend curve" },
  { type: "stepLine", label: "Stepped Line", category: "Trends", desc: "Discrete step function curve" },
  { type: "multiLine", label: "Multi-Series", category: "Trends", desc: "Comparative lines by collection" },
  { type: "difference", label: "Envelope Diff", category: "Trends", desc: "Upper/lower variance band" },
  { type: "linearRegression", label: "Linear Regression", category: "Trends", desc: "Ordinary least-squares trendline & CI" },
  { type: "bollinger", label: "Bollinger Bands", category: "Trends", desc: "Rolling volatility & moving average bands" },

  // Areas & Densities (5)
  { type: "area", label: "Gradient Area", category: "Areas", desc: "Area fill with boundary line" },
  { type: "stackedArea", label: "Stacked Stream", category: "Areas", desc: "Multi-layer stream area" },
  { type: "histogram", label: "Histogram", category: "Areas", desc: "Auto-binned numeric distribution" },
  { type: "density", label: "Kernel Density", category: "Areas", desc: "2D kernel density estimation contours" },
  { type: "contour", label: "Topographic Contour", category: "Areas", desc: "Isoline level surfaces and contours" },

  // Matrix & Meshes (5)
  { type: "cell", label: "Heatmap Cells", category: "Matrix", desc: "Discrete 2D color intensity matrix" },
  { type: "matrix", label: "Cross Matrix", category: "Matrix", desc: "Dimension cross-tabulation table" },
  { type: "hexbin", label: "Hexagonal Bin", category: "Matrix", desc: "Hexagonal aggregation density mesh" },
  { type: "delaunay", label: "Delaunay Mesh", category: "Matrix", desc: "Triangular spatial Delaunay graph" },
  { type: "voronoi", label: "Voronoi Cells", category: "Matrix", desc: "Voronoi planar proximity polygons" },

  // Specialized & Geometric (6)
  { type: "arrow", label: "Directed Arrows", category: "Special", desc: "Directed vectors with arrowheads" },
  { type: "vector", label: "Flow Vectors", category: "Special", desc: "Directional vector displacement field" },
  { type: "link", label: "Network Links", category: "Special", desc: "Pairwise links connecting data coordinates" },
  { type: "text", label: "Word Cloud", category: "Special", desc: "Text labels sized by frequency" },
  { type: "tree", label: "Hierarchy Tree", category: "Special", desc: "Node-link dendritic hierarchical tree" },
  { type: "auto", label: "Auto Graphic", category: "Special", desc: "Inferred graphical grammar representation" },
];

const INITIAL_CORE_VISUALS: VizConfig[] = [
  {
    version: 1,
    id: "core_bookmarks_monthly",
    title: "Monthly Ingestion Velocity",
    chartType: "area",
    dimension: "created_month",
    measure: "count",
    filters: {},
    sort: { by: "dimension", direction: "asc" },
    limit: 12,
    otherBucket: false,
  },
  {
    version: 1,
    id: "core_top_domains",
    title: "Ecosystem Domain Share",
    chartType: "bar",
    dimension: "domain",
    measure: "count",
    filters: {},
    sort: { by: "measure", direction: "desc" },
    limit: 8,
    otherBucket: true,
  },
  {
    version: 1,
    id: "core_folder_breakdown",
    title: "Top-Level Collection Distribution",
    chartType: "donut",
    dimension: "folder_top",
    measure: "count",
    filters: {},
    sort: { by: "measure", direction: "desc" },
    limit: 7,
    otherBucket: true,
  },
  {
    version: 1,
    id: "core_link_status",
    title: "Link Health Overview",
    chartType: "donut",
    dimension: "status",
    measure: "count",
    filters: {},
    sort: { by: "measure", direction: "desc" },
    limit: 4,
    otherBucket: false,
  },
  {
    version: 1,
    id: "core_tag_distribution",
    title: "Tag & Topic Spread",
    chartType: "donut",
    dimension: "tag",
    measure: "count",
    filters: {},
    sort: { by: "measure", direction: "desc" },
    limit: 8,
    otherBucket: true,
  },
  {
    version: 1,
    id: "core_most_visited_domains",
    title: "Most Visited Ecosystems",
    chartType: "horizontal_bar",
    dimension: "domain",
    measure: "sum_visits",
    filters: {},
    sort: { by: "measure", direction: "desc" },
    limit: 7,
    otherBucket: true,
  },
];

export function VisualsPageView({
  bookmarks,
  folders,
  onSelectDomain,
  onSelectTag,
  onSelectFolder,
  onNavigateHome,
}: VisualsPageViewProps) {
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] = React.useState<UniversalVisualConfig | null>(null);

  // Observable Plot Studio state (22 Plot Variations)
  const [plotType, setPlotType] = React.useState<ObservablePlotConfig["type"]>("barX");
  const [plotCategory, setPlotCategory] = React.useState<string>("All");
  const [plotColorScheme, setPlotColorScheme] = React.useState<string>("tableau10");
  const [plotDimension, setPlotDimension] = React.useState<string>("domain");
  const [plotMeasure, setPlotMeasure] = React.useState<string>("count");
  const [plotCustomColor, setPlotCustomColor] = React.useState<string>("#3b82f6");
  const [plotCustomIcon, setPlotCustomIcon] = React.useState<string>("activity");

  // Knowledge Graph Studio state
  const [graphDepth, setGraphDepth] = React.useState<number>(2);
  const [graphMode, setGraphMode] = React.useState<"global" | "folder">("global");
  const [selectedGraphFolder, setSelectedGraphFolder] = React.useState<string>("");

  // Export Target Modal state
  const [exportTargetVisual, setExportTargetVisual] = React.useState<{
    id: string;
    title: string;
    kind: "chart" | "tags" | "engagement" | "wall" | "graph" | "plot";
    chartConfig?: VizConfig;
    plotConfig?: ObservablePlotConfig;
  } | null>(null);

  const [exportDestination, setExportDestination] = React.useState<string>("folder");
  const [exportFolderId, setExportFolderId] = React.useState<string>(folders[0]?.id || "");
  const [exportPageKey, setExportPageKey] = React.useState<string>("page_all");
  const [exportTabName, setExportTabName] = React.useState<string>("Overview");
  const [isNewTab, setIsNewTab] = React.useState<boolean>(false);
  const [newTabInput, setNewTabInput] = React.useState<string>("");
  const [exportSuccessMsg, setExportSuccessMsg] = React.useState<string | null>(null);

  const widgetStore = React.useMemo(() => new RemoteWidgetStore(), []);

  // Compute aggregated data for Observable Plot Studio
  const plotData = React.useMemo(() => {
    if (plotType === "dot" || plotType === "bubble" || plotType === "vector" || plotType === "tick") {
      return bookmarks.slice(0, 80).map((b) => ({
        x: new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        y: b.visitCount || 0,
        domain: b.domain || "Unknown",
        title: b.title,
        folder: folders.find((f) => f.id === b.folderId)?.name || "Unsorted",
        r: Math.min(18, Math.max(4, (b.visitCount || 0) * 2 + 3)),
        dx: ((b.title?.length || 5) % 10) - 5,
        dy: (b.visitCount || 1) % 8,
      }));
    }

    if (plotType === "cell" || plotType === "matrix" || plotType === "hexbin") {
      const map = new Map<string, number>();
      for (const b of bookmarks) {
        const d = b.domain || "Unknown";
        const m = new Date(b.createdAt).toLocaleDateString(undefined, { month: "short" });
        const key = `${d}__${m}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries()).slice(0, 35).map(([k, count]) => {
        const [domain, month] = k.split("__");
        return { x: month, y: domain, count, value: count };
      });
    }

    if (plotType === "stackedBarY" || plotType === "stackedBarX" || plotType === "multiLine" || plotType === "groupedBar" || plotType === "stackedArea") {
      return bookmarks.slice(0, 50).map((b) => ({
        dimension: b.domain || "Unknown",
        folder: folders.find((f) => f.id === b.folderId)?.name || "Unsorted",
        value: plotMeasure === "sum_visits" ? b.visitCount || 1 : 1,
        count: 1,
        y1: b.visitCount || 1,
        y2: (b.visitCount || 1) + 2,
        time: new Date(b.createdAt).toLocaleDateString(undefined, { month: "short" }),
      }));
    }

    if (plotType === "box") {
      return bookmarks.slice(0, 100).map((b) => ({
        dimension: folders.find((f) => f.id === b.folderId)?.name || b.domain || "Other",
        value: b.visitCount || 0,
        y: b.visitCount || 0,
        x: folders.find((f) => f.id === b.folderId)?.name || "Other",
      }));
    }

    if (plotType === "linearRegression" || plotType === "bollinger" || plotType === "density" || plotType === "contour" || plotType === "delaunay" || plotType === "voronoi") {
      return bookmarks.slice(0, 50).map((b, i) => ({
        x: i + 1,
        y: (b.visitCount || 0) + (i % 4) + 1,
        value: (b.visitCount || 0) + (i % 4) + 1,
        dimension: b.domain || "Unknown",
        title: b.title,
      }));
    }

    if (plotType === "arrow" || plotType === "link") {
      return bookmarks.slice(0, 25).map((b, i) => ({
        x1: i * 5,
        y1: (b.visitCount || 0) * 2,
        x2: (i + 1) * 5,
        y2: ((b.visitCount || 0) + 2) * 2,
        dimension: b.domain || "Unknown",
        value: b.visitCount || 1,
      }));
    }

    if (plotType === "tree") {
      return bookmarks.slice(0, 40).map((b) => ({
        path: `${folders.find((f) => f.id === b.folderId)?.name || "Workspace"}/${b.domain || "Sites"}/${(b.title || "Bookmark").slice(0, 20)}`,
        dimension: b.title,
        value: 1,
      }));
    }

    if (plotType === "waffle") {
      return bookmarks.slice(0, 40).map((b) => ({
        dimension: folders.find((f) => f.id === b.folderId)?.name || b.domain || "Unsorted",
        value: 1,
        y: 1,
      }));
    }

    if (plotType === "histogram") {
      return bookmarks.map((b) => ({
        value: b.visitCount || 0,
        dimension: b.domain || "Unknown",
      }));
    }

    if (plotType === "text") {
      const map = new Map<string, number>();
      for (const b of bookmarks) {
        for (const t of b.tags || []) {
          const name = typeof t === "string" ? t : t.name;
          map.set(name, (map.get(name) || 0) + 1);
        }
      }
      return Array.from(map.entries()).slice(0, 30).map(([tag, count]) => ({
        dimension: `#${tag}`,
        value: count,
      }));
    }

    // Default: Group by chosen dimension and measure
    const map = new Map<string, { count: number; sum_visits: number }>();
    for (const b of bookmarks) {
      let key = "Unknown";
      if (plotDimension === "domain") key = b.domain || "Unknown";
      else if (plotDimension === "folder") key = folders.find((f) => f.id === b.folderId)?.name || "Unsorted";
      else if (plotDimension === "status") key = b.status || "alive";
      else if (plotDimension === "month") key = new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", year: "2-digit" });

      const curr = map.get(key) || { count: 0, sum_visits: 0 };
      map.set(key, { count: curr.count + 1, sum_visits: curr.sum_visits + (b.visitCount || 0) });
    }

    return Array.from(map.entries())
      .map(([k, v]) => ({
        dimension: k,
        value: plotMeasure === "sum_visits" ? v.sum_visits : v.count,
        count: v.count,
        y1: v.count,
        y2: v.count + 3,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [bookmarks, folders, plotType, plotDimension, plotMeasure]);

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
    let totalVisits = 0;

    for (const bm of bookmarks) {
      const v = bm.visitCount || 0;
      totalVisits += v;
      if (v >= 5) frequent++;
      else if (v >= 2) active++;
      else if (v === 1) occasional++;
      else dormant++;
    }

    const total = bookmarks.length || 1;
    const avgVisits = Math.round((totalVisits / total) * 10) / 10;

    return {
      totalVisits,
      avgVisits,
      dormantCount: dormant,
      tiers: [
        { key: "frequent", tier: "Frequent (≥5)", count: frequent, percentage: Math.round((frequent / total) * 100), color: "#2563eb" },
        { key: "active", tier: "Active (2-4)", count: active, percentage: Math.round((active / total) * 100), color: "#0d9488" },
        { key: "occasional", tier: "Occasional (1)", count: occasional, percentage: Math.round((occasional / total) * 100), color: "#d97706" },
        { key: "dormant", tier: "Dormant (0)", count: dormant, percentage: Math.round((dormant / total) * 100), color: "#64748b" },
      ],
    };
  }, [bookmarks]);

  // Load custom visual widgets from store
  const [customWidgets, setCustomWidgets] = React.useState<HomeWidgetConfig[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    widgetStore.loadWidgets().then((widgets) => {
      if (cancelled) return;
      setCustomWidgets(
        widgets.filter(
          (w) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [widgetStore]);

  // Core Visuals Library
  const [coreVisualsList, setCoreVisualsList] = React.useState<VizConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_core_visuals_list");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return INITIAL_CORE_VISUALS;
  });

  const saveCoreVisuals = (updated: VizConfig[]) => {
    setCoreVisualsList(updated);
    try {
      localStorage.setItem("markly_core_visuals_list", JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteCoreVisual = (id: string) => {
    saveCoreVisuals(coreVisualsList.filter((v) => v.id !== id));
  };

  const handleRestoreCoreVisuals = () => {
    saveCoreVisuals(INITIAL_CORE_VISUALS);
  };

  // Hidden studio units (allows deleting any studio or intelligence unit)
  const [hiddenStudioUnits, setHiddenStudioUnits] = React.useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_hidden_visual_studio_units");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  const handleHideStudioUnit = (unitId: string) => {
    setHiddenStudioUnits((prev) => {
      const next = [...prev, unitId];
      try {
        localStorage.setItem("markly_hidden_visual_studio_units", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRestoreStudioUnits = () => {
    setHiddenStudioUnits([]);
    try {
      localStorage.removeItem("markly_hidden_visual_studio_units");
    } catch {}
  };

  // Pin ANY visual to Homepage Dashboard
  const handlePinAnyVisual = async (visual: {
    id: string;
    title: string;
    kind: "chart" | "tags" | "engagement" | "wall" | "graph" | "plot";
    chartConfig?: VizConfig;
    plotConfig?: ObservablePlotConfig;
  }) => {
    try {
      const current = await widgetStore.loadWidgets();
      const customCount = current.filter(
        (w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
      ).length;

      if (customCount >= 30) {
        alert("Maximum limit of 30 custom visuals reached. Please remove an existing visual first.");
        return;
      }

      const newId = `custom:${visual.kind}_${Date.now()}`;
      const newWidget: HomeWidgetConfig = {
        id: newId,
        label: visual.title,
        visible: true,
        kind: "custom",
        vizConfig: visual.chartConfig || {
          id: newId,
          title: visual.title,
          chartType: visual.kind as any,
          kind: visual.kind,
          plotConfig: visual.plotConfig,
        },
        colSpan: visual.kind === "graph" || visual.kind === "wall" ? 12 : 6,
        span: visual.kind === "graph" || visual.kind === "wall" ? "2" : "1",
      };

      const updated = [...current, newWidget];
      await widgetStore.saveWidgets(updated);
      setCustomWidgets(
        updated.filter(
          (w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
        )
      );

      setExportSuccessMsg(`Pinned "${visual.title}" to Dashboard Home!`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Pin to dashboard error:", e);
    }
  };

  const handleSaveUniversalVisual = async (uConfig: UniversalVisualConfig) => {
    try {
      const current = await widgetStore.loadWidgets();
      const newId = uConfig.id.startsWith("custom:") ? uConfig.id : `custom:${uConfig.category}_${Date.now()}`;
      const newWidget: HomeWidgetConfig = {
        id: newId,
        label: uConfig.title,
        visible: true,
        kind: "custom",
        colSpan: uConfig.colSpan || 6,
        span: uConfig.rowSpan === 2 ? "2" : "1",
        rowSpan: uConfig.rowSpan || 1,
        icon: uConfig.icon,
        color: uConfig.color,
        category: uConfig.category,
        siteConfig: uConfig.siteConfig,
        plotConfig: uConfig.plotConfig,
        chartConfig: uConfig.chartConfig,
        intelConfig: uConfig.intelConfig,
        vizConfig: {
          id: newId,
          title: uConfig.title,
          kind: uConfig.category as any,
          category: uConfig.category,
          chartType: (uConfig.chartConfig?.chartType || (uConfig.category === "plot" ? "plot" : "bar")) as any,
          plotConfig: uConfig.plotConfig,
          siteConfig: uConfig.siteConfig,
          intelConfig: uConfig.intelConfig,
        },
      };

      const existsIndex = current.findIndex((w: any) => w.id === uConfig.id);
      let updated: HomeWidgetConfig[];
      if (existsIndex >= 0) {
        updated = [...current];
        updated[existsIndex] = { ...updated[existsIndex], ...newWidget };
      } else {
        updated = [...current, newWidget];
      }
      await widgetStore.saveWidgets(updated);
      setCustomWidgets(
        updated.filter(
          (w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
        )
      );
      setBuilderOpen(false);
      setEditingConfig(null);
      setExportSuccessMsg(`Saved visual "${uConfig.title}" to Dashboard Home!`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Save universal visual error:", e);
    }
  };

  const handleDeleteWidget = async (id: string) => {
    try {
      const current = await widgetStore.loadWidgets();
      const filtered = current.filter((w: any) => w.id !== id);
      await widgetStore.saveWidgets(filtered);
      setCustomWidgets(
        filtered.filter(
          (w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
        )
      );
    } catch {}
  };

  // Export any visual to Folder or Page Section with Tab Selection (Multi-Visual Per Tab)
  const handleExecuteExport = () => {
    if (!exportTargetVisual) return;

    try {
      const destId = exportDestination === "folder" ? exportFolderId : exportPageKey;
      const destName =
        exportDestination === "folder"
          ? folders.find((f) => f.id === exportFolderId)?.name || "Folder"
          : exportPageKey === "page_all"
          ? "All Sites"
          : exportPageKey === "page_favorites"
          ? "Favorites"
          : "Recent";

      const finalTabName = isNewTab ? newTabInput.trim() || "New Tab" : exportTabName || "Overview";
      const storageKey = `markly_folder_tabs_${destId}`;
      const stored = localStorage.getItem(storageKey);
      let tabs: Array<{ id: string; label: string; visuals: any[] }> = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(tabs) || tabs.length === 0) {
        tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      }

      let targetTab = tabs.find((t) => t.label.toLowerCase() === finalTabName.toLowerCase());
      if (!targetTab) {
        targetTab = {
          id: `tab_${Date.now()}`,
          label: finalTabName,
          visuals: [],
        };
        tabs.push(targetTab);
      }

      // Add the visual into the chosen tab
      targetTab.visuals.push({
        id: `${exportTargetVisual.kind}_${Date.now()}`,
        title: exportTargetVisual.title,
        kind: exportTargetVisual.kind,
        chartConfig: exportTargetVisual.chartConfig,
        plotConfig: exportTargetVisual.plotConfig,
        colSpan: exportTargetVisual.kind === "graph" || exportTargetVisual.kind === "wall" ? 12 : 6,
      });

      localStorage.setItem(storageKey, JSON.stringify(tabs));
      localStorage.setItem(`markly_folder_visuals_${destId}`, JSON.stringify(tabs[0].visuals));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));

      setExportTargetVisual(null);
      setExportSuccessMsg(`Exported "${exportTargetVisual.title}" to ${destName} › Tab: ${finalTabName}!`);
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (e) {
      console.error("Export visual error:", e);
    }
  };

  const filteredVariations = React.useMemo(() => {
    if (plotCategory === "All") return PLOT_VARIATIONS;
    return PLOT_VARIATIONS.filter((v) => v.category === plotCategory);
  }, [plotCategory]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {exportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-4 w-4" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Master Brain Studio Banner */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Visual Master Brain
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                22 Observable Plot Variations + Recharts + Knowledge Graph + Multi-Tab Allocation
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Master Visual Studio & Plot Intelligence
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Central control plane for all workspace visualizations. Create layered Observable Plots, Knowledge Graphs, Tag Clouds, Engagement Spectrums, and allocate them across Home and folder tabs. All charts are resizable by default.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hiddenStudioUnits.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreStudioUnits}
                className="text-xs h-8 cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore Default Units ({hiddenStudioUnits.length})</span>
              </Button>
            )}
            {onNavigateHome && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateHome}
                className="text-xs h-8 cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <span>Dashboard Home</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditingConfig(null);
                setBuilderOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Visual</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 1. OBSERVABLE PLOT GRAMMAR OF GRAPHICS STUDIO (Wrapped in Resizable Box) */}
      {!hiddenStudioUnits.includes("studio_observable_plot") && (
        <DashboardWidgetBox
          id="studio_observable_plot"
          title="Observable Plot Layered Graphics Studio (22 Variations)"
          icon={<Activity className="h-4 w-4 text-cyan-500" />}
          initialColSpan={12}
          minHeight={420}
          badgeText={`${PLOT_VARIATIONS.length} MARKS`}
          onDeleteWidget={() => handleHideStudioUnit("studio_observable_plot")}
        extraHeaderAction={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handlePinAnyVisual({
                  id: `plot_${plotType}_${Date.now()}`,
                  title: `Observable ${PLOT_VARIATIONS.find((p) => p.type === plotType)?.label || plotType}`,
                  kind: "plot",
                  plotConfig: { type: plotType, colorScheme: plotColorScheme },
                })
              }
              className="text-xs h-7 px-2 cursor-pointer gap-1"
            >
              <Pin className="h-3 w-3" />
              <span>Pin Home</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setExportTargetVisual({
                  id: `plot_${plotType}_${Date.now()}`,
                  title: `Observable ${PLOT_VARIATIONS.find((p) => p.type === plotType)?.label || plotType}`,
                  kind: "plot",
                  plotConfig: { type: plotType, colorScheme: plotColorScheme },
                })
              }
              className="text-xs h-7 px-2 cursor-pointer gap-1 text-primary"
            >
              <FolderPlus className="h-3 w-3" />
              <span>+ Folder</span>
            </Button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          {/* Category Filter Pills for 22 Plot Variations */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/50 text-xs">
            {["All", "Bars", "Points", "Trends", "Areas", "Matrix", "Special"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPlotCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  plotCategory === cat
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {filteredVariations.length} types shown
            </span>
          </div>

          {/* 22 Observable Plot Variations Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-secondary/15 rounded-xl border border-border/60">
            {filteredVariations.map((v) => (
              <button
                key={v.type}
                type="button"
                onClick={() => setPlotType(v.type)}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  plotType === v.type
                    ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/40"
                    : "border-border/60 bg-card hover:bg-secondary/70 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground truncate">{v.label}</span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{v.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.desc}</p>
              </button>
            ))}
          </div>

          {/* Observable Plot Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
            {/* Dimension */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Dimension
              </label>
              <select
                value={plotDimension}
                onChange={(e) => setPlotDimension(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
              >
                <option value="domain">Web Domain</option>
                <option value="folder">Folder Collection</option>
                <option value="status">Link Health Status</option>
                <option value="month">Creation Month</option>
              </select>
            </div>

            {/* Measure Value */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Measure Metric
              </label>
              <select
                value={plotMeasure}
                onChange={(e) => setPlotMeasure(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
              >
                <option value="count">Bookmark Count</option>
                <option value="sum_visits">Sum of Total Visits</option>
              </select>
            </div>

            {/* Observable Color Scheme */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Color Palette Scale
              </label>
              <select
                value={plotColorScheme}
                onChange={(e) => setPlotColorScheme(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer font-mono"
              >
                <option value="tableau10">Tableau 10 (Qualitative)</option>
                <option value="blues">Blues (Sequential)</option>
                <option value="viridis">Viridis (Sequential)</option>
                <option value="turbo">Turbo (Rainbow)</option>
                <option value="spectral">Spectral (Diverging)</option>
                <option value="warm">Warm (Sequential)</option>
                <option value="cool">Cool (Sequential)</option>
              </select>
            </div>

            {/* Universal Accent Color & Icon Pickers */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Accent & Icon
              </label>
              <div className="flex items-center gap-1.5 h-8">
                <UniversalColorPicker
                  value={plotCustomColor}
                  onChange={(c) => setPlotCustomColor(c)}
                />
                <UniversalIconPicker
                  value={plotCustomIcon}
                  onChange={(ic) => setPlotCustomIcon(ic)}
                />
              </div>
            </div>
          </div>

          {/* Observable Plot Canvas */}
          <div className="rounded-xl border border-border bg-background p-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
              <span className="text-xs font-semibold text-foreground">
                Live ObservableHQ Plot: {PLOT_VARIATIONS.find((p) => p.type === plotType)?.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border">
                {plotType} • Reactive Grammar of Graphics
              </span>
            </div>

            <ObservablePlotView
              data={plotData}
              config={{
                type: plotType,
                x:
                  plotType === "barX" || plotType === "stackedBarX"
                    ? "value"
                    : plotType === "dot" ||
                      plotType === "bubble" ||
                      plotType === "vector" ||
                      plotType === "tick" ||
                      plotType === "cell" ||
                      plotType === "matrix" ||
                      plotType === "linearRegression" ||
                      plotType === "bollinger" ||
                      plotType === "density" ||
                      plotType === "contour" ||
                      plotType === "delaunay" ||
                      plotType === "voronoi"
                    ? "x"
                    : "dimension",
                y:
                  plotType === "barX" || plotType === "stackedBarX"
                    ? "dimension"
                    : plotType === "dot" ||
                      plotType === "bubble" ||
                      plotType === "vector" ||
                      plotType === "tick" ||
                      plotType === "cell" ||
                      plotType === "matrix" ||
                      plotType === "linearRegression" ||
                      plotType === "bollinger" ||
                      plotType === "density" ||
                      plotType === "contour" ||
                      plotType === "delaunay" ||
                      plotType === "voronoi"
                    ? "y"
                    : "value",
                x1: "x1",
                y1: "y1",
                x2: "x2",
                y2: "y2",
                fill: plotType === "dot" || plotType === "bubble" || plotType === "stackedBarY" || plotType === "stackedBarX" ? "folder" : plotType === "cell" ? "count" : (plotCustomColor || "#3b82f6"),
                stroke: plotCustomColor || "#3b82f6",
                z: "folder",
                r: 6,
                colorScheme: plotColorScheme,
                crosshair: true,
                grid: true,
                height: 300,
              }}
            />
          </div>
        </div>
      </DashboardWidgetBox>
      )}

      {/* 2. KNOWLEDGE GRAPH MASTER STUDIO (Wrapped in Resizable Box) */}
      {!hiddenStudioUnits.includes("studio_knowledge_graph") && (
      <DashboardWidgetBox
        id="studio_knowledge_graph"
        title="Knowledge Graph Master Allocation Studio"
        icon={<Layers className="h-4 w-4 text-indigo-500" />}
        initialColSpan={12}
        minHeight={420}
        badgeText="FORCE-DIRECTED"
        onDeleteWidget={() => handleHideStudioUnit("studio_knowledge_graph")}
        extraHeaderAction={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handlePinAnyVisual({
                  id: `graph_${Date.now()}`,
                  title: "Interactive Knowledge Graph",
                  kind: "graph",
                })
              }
              className="text-xs h-7 px-2 cursor-pointer gap-1"
            >
              <Pin className="h-3 w-3" />
              <span>Pin Home</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setExportTargetVisual({
                  id: `graph_${Date.now()}`,
                  title: "Interactive Knowledge Graph",
                  kind: "graph",
                })
              }
              className="text-xs h-7 px-2 cursor-pointer gap-1 text-primary"
            >
              <FolderPlus className="h-3 w-3" />
              <span>+ Folder</span>
            </Button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Graph Scope
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGraphMode("global")}
                  className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border text-center cursor-pointer transition-colors ${
                    graphMode === "global"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-card hover:bg-secondary text-foreground border-border"
                  }`}
                >
                  Global Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode("folder")}
                  className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border text-center cursor-pointer transition-colors ${
                    graphMode === "folder"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-card hover:bg-secondary text-foreground border-border"
                  }`}
                >
                  Folder Filtered
                </button>
              </div>
            </div>

            {graphMode === "folder" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Target Folder
                </label>
                <select
                  value={selectedGraphFolder}
                  onChange={(e) => setSelectedGraphFolder(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
                >
                  <option value="">Select a folder...</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Node Exploration Depth: {graphDepth}
              </label>
              <input
                type="range"
                min={1}
                max={4}
                value={graphDepth}
                onChange={(e) => setGraphDepth(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="h-80 w-full rounded-xl overflow-hidden border border-border bg-card shadow-inner">
            <KnowledgeGraph
              mode={graphMode}
              folderId={graphMode === "folder" && selectedGraphFolder ? selectedGraphFolder : undefined}
              depth={graphDepth}
              showControls={true}
              onSelectDomain={onSelectDomain}
            />
          </div>
        </div>
      </DashboardWidgetBox>
      )}

      {/* 3. CORE SPECIALIZED VISUALS IN RESIZABLE BOXES */}
      {(!hiddenStudioUnits.includes("unit_tags_cloud") || !hiddenStudioUnits.includes("unit_engagement_spectrum") || !hiddenStudioUnits.includes("unit_favicon_wall")) && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Workspace Intelligence Units (Resizable & Modular)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Drag handles to resize
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* TAGS UNIT */}
          {!hiddenStudioUnits.includes("unit_tags_cloud") && (
          <DashboardWidgetBox
            id="unit_tags_cloud"
            title="Tag Frequency & Topic Cloud"
            icon={<TagIcon className="h-4 w-4 text-pink-500" />}
            initialColSpan={4}
            minHeight={260}
            badgeText={`${tagData.length} TAGS`}
            onDeleteWidget={() => handleHideStudioUnit("unit_tags_cloud")}
            extraHeaderAction={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handlePinAnyVisual({
                      id: `tags_${Date.now()}`,
                      title: "Tag Frequency & Cloud",
                      kind: "tags",
                    })
                  }
                  className="text-xs h-6 px-1.5 cursor-pointer"
                >
                  <Pin className="h-2.5 w-2.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExportTargetVisual({
                      id: `tags_${Date.now()}`,
                      title: "Tag Frequency & Cloud",
                      kind: "tags",
                    })
                  }
                  className="text-xs h-6 px-1.5 cursor-pointer text-primary"
                >
                  <FolderPlus className="h-2.5 w-2.5" />
                </Button>
              </div>
            }
          >
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Frequency distribution with clickable topic tags for interactive filtering.
              </p>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 bg-secondary/20 rounded-lg border border-border/40">
                {tagData.slice(0, 24).map((t) => (
                  <span
                    key={t.rawName}
                    onClick={() => onSelectTag?.(t.rawName)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border/60 hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors"
                  >
                    #{t.rawName} ({t.count})
                  </span>
                ))}
              </div>
            </div>
          </DashboardWidgetBox>
          )}

          {/* ENGAGEMENT UNIT */}
          {!hiddenStudioUnits.includes("unit_engagement_spectrum") && (
          <DashboardWidgetBox
            id="unit_engagement_spectrum"
            title="Engagement Spectrum Tiers"
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            initialColSpan={4}
            minHeight={260}
            badgeText={`${engagementData.totalVisits} VISITS`}
            onDeleteWidget={() => handleHideStudioUnit("unit_engagement_spectrum")}
            extraHeaderAction={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handlePinAnyVisual({
                      id: `eng_${Date.now()}`,
                      title: "Engagement Spectrum",
                      kind: "engagement",
                    })
                  }
                  className="text-xs h-6 px-1.5 cursor-pointer"
                >
                  <Pin className="h-2.5 w-2.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExportTargetVisual({
                      id: `eng_${Date.now()}`,
                      title: "Engagement Spectrum",
                      kind: "engagement",
                    })
                  }
                  className="text-xs h-6 px-1.5 cursor-pointer text-primary"
                >
                  <FolderPlus className="h-2.5 w-2.5" />
                </Button>
              </div>
            }
          >
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Frequent, Active, Occasional, and Dormant tier segmentation.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {engagementData.tiers.map((tier) => (
                  <div key={tier.key} className="p-2 rounded-lg border border-border bg-secondary/30 text-xs">
                    <span className="text-[10px] text-muted-foreground block truncate">{tier.tier}</span>
                    <span className="font-bold text-foreground font-mono">{tier.count} sites</span>
                  </div>
                ))}
              </div>
            </div>
          </DashboardWidgetBox>
          )}

          {/* FAVICON WALL UNIT */}
          {!hiddenStudioUnits.includes("unit_favicon_wall") && (
          <DashboardWidgetBox
            id="unit_favicon_wall"
            title="Visual Favicon Wall"
            icon={<LayoutGrid className="h-4 w-4 text-amber-500" />}
            initialColSpan={4}
            minHeight={260}
            badgeText={`${bookmarks.length} SITES`}
            onDeleteWidget={() => handleHideStudioUnit("unit_favicon_wall")}
            extraHeaderAction={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handlePinAnyVisual({
                      id: `wall_${Date.now()}`,
                      title: "Visual Favicon Wall",
                      kind: "wall",
                    })
                  }
                  className="text-xs h-6 px-1.5 cursor-pointer"
                >
                  <Pin className="h-2.5 w-2.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExportTargetVisual({
                      id: `wall_${Date.now()}`,
                      title: "Visual Favicon Wall",
                      kind: "wall",
                    })
                  }
                  className="text-xs h-6 px-1.5 cursor-pointer text-primary"
                >
                  <FolderPlus className="h-2.5 w-2.5" />
                </Button>
              </div>
            }
          >
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                High-density favicon matrix for rapid optical recognition.
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-36 overflow-y-auto p-1 bg-secondary/20 rounded-lg border border-border/40">
                {bookmarks.slice(0, 32).map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => window.open(bm.url, "_blank")}
                    className="p-1.5 rounded bg-card border border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    title={bm.title}
                  >
                    <BookmarkIcon src={bm.iconUrl} alt={bm.title} domain={bm.domain} className="h-4 w-4 object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </DashboardWidgetBox>
          )}
        </div>
      </section>
      )}

      {/* 4. CUSTOM VISUALS LIBRARY IN RESIZABLE BOXES */}
      {customWidgets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Your Custom Visuals ({customWidgets.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Live on Dashboard Home
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {customWidgets.map((widget) => {
              const siteCfg = widget.siteConfig || widget.vizConfig?.siteConfig;
              const plotCfg = widget.plotConfig || widget.vizConfig?.plotConfig;
              const intelCfg = widget.intelConfig || widget.vizConfig?.intelConfig;

              let siteItems = bookmarks;
              if (siteCfg) {
                if (siteCfg.source === "favorites") siteItems = siteItems.filter((b) => b.isFavorite);
                else if (siteCfg.source === "recent")
                  siteItems = [...siteItems].sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  );
                else if (siteCfg.source === "unsorted") siteItems = siteItems.filter((b) => !b.folderId);
                else if (siteCfg.source === "folder" && siteCfg.folderId)
                  siteItems = siteItems.filter((b) => b.folderId === siteCfg.folderId);
                else if (siteCfg.source === "tag" && siteCfg.tag)
                  siteItems = siteItems.filter((b) =>
                    b.tags?.some(
                      (t) => (typeof t === "string" ? t : t.name).toLowerCase() === siteCfg.tag?.toLowerCase()
                    )
                  );

                if (siteCfg.sortBy === "visits")
                  siteItems = [...siteItems].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
                else if (siteCfg.sortBy === "title")
                  siteItems = [...siteItems].sort((a, b) => (a.title || "").localeCompare(b.title || ""));

                const limitNum =
                  siteCfg.limit === "all"
                    ? siteItems.length
                    : typeof siteCfg.limit === "number"
                    ? siteCfg.limit
                    : 7;
                siteItems = siteItems.slice(0, limitNum);
              }

              return (
                <DashboardWidgetBox
                  key={widget.id}
                  id={widget.id}
                  title={widget.vizConfig?.title || widget.label}
                  icon={<BarChart3 className="h-4 w-4 text-primary" />}
                  initialColSpan={widget.colSpan || 6}
                  minHeight={280}
                  onDeleteWidget={() => handleDeleteWidget(widget.id)}
                  onEditWidget={() => {
                    setEditingConfig({
                      id: widget.id,
                      title: widget.vizConfig?.title || widget.label,
                      category: (widget.category ||
                        (siteCfg ? "sites" : plotCfg ? "plot" : intelCfg ? "intel" : "chart")) as any,
                      colSpan: widget.colSpan || 6,
                      rowSpan: widget.rowSpan || (widget.span === "2" ? 2 : 1),
                      icon: widget.icon,
                      color: widget.color,
                      siteConfig: siteCfg,
                      plotConfig: plotCfg,
                      chartConfig: widget.vizConfig,
                      intelConfig: intelCfg,
                    });
                    setBuilderOpen(true);
                  }}
                  extraHeaderAction={
                    widget.vizConfig ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExportTargetVisual({
                            id: widget.id,
                            title: widget.vizConfig?.title || widget.label,
                            kind: "chart",
                            chartConfig: widget.vizConfig,
                          })
                        }
                        className="text-xs h-6 px-1.5 cursor-pointer text-primary"
                      >
                        <FolderPlus className="h-3 w-3 mr-1" />
                        <span>+ Folder</span>
                      </Button>
                    ) : undefined
                  }
                >
                  <div className="p-3">
                    {siteCfg ? (
                      <BookmarkItemsView
                        items={siteItems}
                        mode={siteCfg.viewMode || "list"}
                        onOpenPreview={() => {}}
                      />
                    ) : plotCfg ? (
                      <ObservablePlotView
                        data={plotData}
                        config={{
                          ...plotCfg,
                          height: 220,
                        }}
                      />
                    ) : widget.vizConfig ? (
                      <VizChart
                        config={widget.vizConfig}
                        bookmarks={bookmarks}
                        folders={folders}
                        height={200}
                        onSelectDomain={onSelectDomain}
                        onSelectTag={onSelectTag}
                        onSelectFolder={onSelectFolder}
                        bare={true}
                      />
                    ) : null}
                  </div>
                </DashboardWidgetBox>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. CORE WORKSPACE VISUALS LIBRARY IN RESIZABLE BOXES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Core Workspace Visuals Library ({coreVisualsList.length})
            </h2>
          </div>
          {coreVisualsList.length < INITIAL_CORE_VISUALS.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreCoreVisuals}
              className="text-xs h-7 cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restore Core Visuals</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {coreVisualsList.map((viz) => (
            <DashboardWidgetBox
              key={viz.id}
              id={viz.id}
              title={viz.title}
              icon={<BarChart3 className="h-4 w-4 text-primary" />}
              initialColSpan={6}
              minHeight={280}
              onDeleteWidget={() => handleDeleteCoreVisual(viz.id)}
              extraHeaderAction={
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handlePinAnyVisual({
                        id: viz.id,
                        title: viz.title,
                        kind: "chart",
                        chartConfig: viz,
                      })
                    }
                    className="text-xs h-6 px-1.5 cursor-pointer"
                  >
                    <Pin className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setExportTargetVisual({
                        id: viz.id,
                        title: viz.title,
                        kind: "chart",
                        chartConfig: viz,
                      })
                    }
                    className="text-xs h-6 px-1.5 cursor-pointer text-primary"
                  >
                    <FolderPlus className="h-2.5 w-2.5" />
                  </Button>
                </div>
              }
            >
              <div className="p-3">
                <VizChart
                  config={viz}
                  bookmarks={bookmarks}
                  folders={folders}
                  height={200}
                  onSelectDomain={onSelectDomain}
                  onSelectTag={onSelectTag}
                  onSelectFolder={onSelectFolder}
                  bare={true}
                />
              </div>
            </DashboardWidgetBox>
          ))}
        </div>
      </section>

      {/* Export to Folder / Page Tab Modal */}
      {exportTargetVisual && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Export Visual to Folder / Page Tabs
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportTargetVisual(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select where to allocate &ldquo;{exportTargetVisual.title}&rdquo;. You can add it to an existing tab or create a new tab.
            </p>

            {/* Destination Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Destination Page or Folder
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportDestination("folder")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center cursor-pointer transition-colors ${
                    exportDestination === "folder"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                  }`}
                >
                  Folder Collection
                </button>
                <button
                  type="button"
                  onClick={() => setExportDestination("page")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center cursor-pointer transition-colors ${
                    exportDestination === "page"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                  }`}
                >
                  Main Page Section
                </button>
              </div>
            </div>

            {/* Folder Dropdown */}
            {exportDestination === "folder" ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Select Folder
                </label>
                <select
                  value={exportFolderId}
                  onChange={(e) => setExportFolderId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Select Page Section
                </label>
                <select
                  value={exportPageKey}
                  onChange={(e) => setExportPageKey(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
                >
                  <option value="page_all">All Sites (Main Library)</option>
                  <option value="page_favorites">Starred Favorites</option>
                  <option value="page_recent">Recently Visited</option>
                  <option value="page_unsorted">Inbox / Unsorted</option>
                </select>
              </div>
            )}

            {/* Tab Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Target Tab
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewTab(!isNewTab)}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  {isNewTab ? "Choose existing tab" : "+ Create new tab"}
                </button>
              </div>

              {isNewTab ? (
                <input
                  type="text"
                  placeholder="New tab name (e.g. Traffic Trends, SEO)"
                  value={newTabInput}
                  onChange={(e) => setNewTabInput(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Tab name (defaults to 'Overview')"
                  value={exportTabName}
                  onChange={(e) => setExportTabName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs"
                />
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportTargetVisual(null)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteExport}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 cursor-pointer"
              >
                Confirm Allocation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Visual Builder Modal */}
      <UniversalVisualBuilderModal
        open={builderOpen}
        onOpenChange={(op) => {
          setBuilderOpen(op);
          if (!op) setEditingConfig(null);
        }}
        initialConfig={editingConfig}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveUniversalVisual}
        destinationName="Dashboard Home"
      />
    </div>
  );
}
