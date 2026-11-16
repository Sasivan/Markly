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
import { VizBuilderDialog } from "./viz-builder-dialog";
import { ObservablePlotView, type ObservablePlotConfig } from "./observable-plot-view";

export interface VisualsPageViewProps {
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectFolder?: (folderId: string | null) => void;
  onNavigateHome?: () => void;
}

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
  const [editingConfig, setEditingConfig] = React.useState<VizConfig | null>(null);

  // Observable Plot Studio state
  const [plotType, setPlotType] = React.useState<"barY" | "barX" | "dot" | "line" | "area" | "cell">("barX");
  const [plotColorScheme, setPlotColorScheme] = React.useState<string>("tableau10");
  const [plotDimension, setPlotDimension] = React.useState<string>("domain");
  const [plotMeasure, setPlotMeasure] = React.useState<string>("count");

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

  const [exportDestination, setExportDestination] = React.useState<string>("folder"); // "folder" or "page"
  const [exportFolderId, setExportFolderId] = React.useState<string>(folders[0]?.id || "");
  const [exportPageKey, setExportPageKey] = React.useState<string>("page_all");
  const [exportTabName, setExportTabName] = React.useState<string>("Overview");
  const [isNewTab, setIsNewTab] = React.useState<boolean>(false);
  const [newTabInput, setNewTabInput] = React.useState<string>("");
  const [exportSuccessMsg, setExportSuccessMsg] = React.useState<string | null>(null);

  const widgetStore = React.useMemo(() => new RemoteWidgetStore(), []);

  // Compute aggregated data for Observable Plot Studio
  const plotData = React.useMemo(() => {
    if (plotType === "dot") {
      // Scatter plot of bookmarks: X = createdAt (month), Y = visitCount, fill = folder
      return bookmarks.slice(0, 80).map((b) => ({
        x: new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        y: b.visitCount || 0,
        domain: b.domain,
        title: b.title,
        folder: folders.find((f) => f.id === b.folderId)?.name || "Unsorted",
      }));
    }

    if (plotType === "cell") {
      // Heatmap matrix: domain vs status or month
      const map = new Map<string, number>();
      for (const b of bookmarks) {
        const d = b.domain || "Unknown";
        const m = new Date(b.createdAt).toLocaleDateString(undefined, { month: "short" });
        const key = `${d}__${m}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries()).slice(0, 30).map(([k, count]) => {
        const [domain, month] = k.split("__");
        return { x: month, y: domain, count };
      });
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
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
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

  // Pin ANY visual to Homepage Dashboard
  const handlePinAnyVisual = async (visual: {
    id: string;
    title: string;
    kind: "chart" | "tags" | "engagement" | "wall" | "graph" | "plot";
    chartConfig?: VizConfig;
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

  const handleSaveVisual = async (newConfig: VizConfig) => {
    await handlePinAnyVisual({
      id: newConfig.id,
      title: newConfig.title,
      kind: "chart",
      chartConfig: newConfig,
    });
    setBuilderOpen(false);
    setEditingConfig(null);
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
      });

      localStorage.setItem(storageKey, JSON.stringify(tabs));
      // Keep legacy sync
      localStorage.setItem(`markly_folder_visuals_${destId}`, JSON.stringify(tabs[0].visuals));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));

      setExportTargetVisual(null);
      setExportSuccessMsg(`Exported "${exportTargetVisual.title}" to ${destName} › Tab: ${finalTabName}!`);
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (e) {
      console.error("Export visual error:", e);
    }
  };

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
                Observable Plot Grammar + Recharts + Knowledge Graph + Multi-Tab Allocation
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Master Visual Studio & Plot Intelligence
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Central control plane for all workspace visualizations. Create layered Observable Plots, Knowledge Graphs, Tag Clouds, Engagement Spectrums, and allocate them across Home and any folder page tabs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
              <span>New Visual</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 1. OBSERVABLE PLOT GRAMMAR OF GRAPHICS STUDIO */}
      <div className="rounded-xl border border-primary/40 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-primary text-primary-foreground uppercase tracking-wider">
                ObservableHQ Plot
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Observable Plot Layered Graphics Studio
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              A concise layered grammar of graphics with marks, auto-sorting, scales, and pointer tooltips.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handlePinAnyVisual({
                  id: `plot_${plotType}_${Date.now()}`,
                  title: `Observable ${plotType.toUpperCase()} Plot`,
                  kind: "plot",
                })
              }
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <Pin className="h-3.5 w-3.5" />
              <span>Pin to Home</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setExportTargetVisual({
                  id: `plot_${plotType}_${Date.now()}`,
                  title: `Observable ${plotType.toUpperCase()} Plot`,
                  kind: "plot",
                  plotConfig: {
                    type: plotType,
                    colorScheme: plotColorScheme,
                  },
                })
              }
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5 text-primary" />
              <span>Export to Folder/Page…</span>
            </Button>
          </div>
        </div>

        {/* Observable Plot Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
          {/* Plot Mark Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              1. Plot Mark
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { type: "barX" as const, label: "H-Bar" },
                { type: "barY" as const, label: "V-Bar" },
                { type: "dot" as const, label: "Scatter" },
                { type: "area" as const, label: "Area" },
                { type: "line" as const, label: "Line" },
                { type: "cell" as const, label: "Matrix" },
              ].map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setPlotType(m.type)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium border text-center cursor-pointer transition-colors ${
                    plotType === m.type
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-card hover:bg-secondary text-foreground border-border"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group By Dimension */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              2. Dimension
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
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              3. Measure Metric
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
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              4. Color Palette Scale
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
        </div>

        {/* Observable Plot Canvas */}
        <div className="rounded-xl border border-border bg-background p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-xs font-semibold text-foreground">
              Observable Plot Preview: {plotType.toUpperCase()} Mark
            </span>
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border">
              Layered Grammar of Graphics
            </span>
          </div>

          <ObservablePlotView
            data={plotData}
            config={{
              type: plotType,
              x: plotType === "barX" ? "value" : plotType === "dot" || plotType === "cell" ? "x" : "dimension",
              y: plotType === "barX" ? "dimension" : plotType === "dot" || plotType === "cell" ? "y" : "value",
              fill: plotType === "dot" ? "folder" : plotType === "cell" ? "count" : "#3b82f6",
              stroke: "#3b82f6",
              colorScheme: plotColorScheme,
              height: 280,
            }}
          />
        </div>
      </div>

      {/* 2. KNOWLEDGE GRAPH MASTER STUDIO */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-500 uppercase tracking-wider border border-indigo-500/20">
                Knowledge Graph
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Knowledge Graph Master Allocation Studio
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Deep relationship graph mapping bookmarks, domains, folders, and tags with force-directed physics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <Pin className="h-3.5 w-3.5" />
              <span>Pin to Home</span>
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
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5 text-primary" />
              <span>Export to Folder/Page…</span>
            </Button>
          </div>
        </div>

        {/* Graph Master Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-xl border border-border text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">
              1. Depth Traversal Level ({graphDepth})
            </label>
            <input
              type="range"
              min={1}
              max={4}
              value={graphDepth}
              onChange={(e) => setGraphDepth(Number(e.target.value))}
              className="w-full cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Direct (1)</span>
              <span>Deep (4)</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">
              2. Graph Mode Scope
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setGraphMode("global")}
                className={`py-1 px-2 rounded-md border text-center font-medium cursor-pointer transition-colors ${
                  graphMode === "global" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                }`}
              >
                Global Workspace
              </button>
              <button
                type="button"
                onClick={() => setGraphMode("folder")}
                className={`py-1 px-2 rounded-md border text-center font-medium cursor-pointer transition-colors ${
                  graphMode === "folder" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                }`}
              >
                Folder Centric
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">
              3. Filter by Folder
            </label>
            <select
              value={selectedGraphFolder}
              onChange={(e) => setSelectedGraphFolder(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
            >
              <option value="">All Folders Included</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Knowledge Graph Preview */}
        <div className="h-80 w-full rounded-xl overflow-hidden border border-border bg-card shadow-inner">
          <KnowledgeGraph
            mode={graphMode}
            folderId={selectedGraphFolder || undefined}
            depth={graphDepth}
            showControls={true}
          />
        </div>
      </div>

      {/* 3. CORE SPECIALIZED VISUALS (TAGS, ENGAGEMENT, FAVICON WALL) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Workspace Intelligence Units (Pin to Home or Export to Folder Tabs)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Modular intelligence modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TAGS UNIT */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-pink-500" />
                  <h3 className="text-xs font-semibold text-foreground">Tag Frequency & Topic Cloud</h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{tagData.length} tags</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Frequency distribution curve with clickable topic tags for interactive filtering.
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-secondary/20 rounded-lg border border-border/40">
                {tagData.slice(0, 16).map((t) => (
                  <span key={t.rawName} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border/60">
                    #{t.rawName} ({t.count})
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
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
                className="flex-1 text-xs h-7 cursor-pointer"
              >
                <Pin className="h-3 w-3 mr-1" />
                Pin Home
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
                className="flex-1 text-xs h-7 cursor-pointer text-primary"
              >
                <FolderPlus className="h-3 w-3 mr-1" />
                + Folder
              </Button>
            </div>
          </div>

          {/* ENGAGEMENT UNIT */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-semibold text-foreground">Engagement Spectrum Tiers</h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{engagementData.totalVisits} visits</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Frequent, Active, Occasional, and Dormant tier segmentation with visit drilldowns.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {engagementData.tiers.map((tier) => (
                  <div key={tier.key} className="p-1.5 rounded border border-border bg-secondary/30 text-xs">
                    <span className="text-[10px] text-muted-foreground block truncate">{tier.tier}</span>
                    <span className="font-bold text-foreground font-mono">{tier.count} sites</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
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
                className="flex-1 text-xs h-7 cursor-pointer"
              >
                <Pin className="h-3 w-3 mr-1" />
                Pin Home
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
                className="flex-1 text-xs h-7 cursor-pointer text-primary"
              >
                <FolderPlus className="h-3 w-3 mr-1" />
                + Folder
              </Button>
            </div>
          </div>

          {/* FAVICON WALL UNIT */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-semibold text-foreground">Visual Favicon Wall</h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{bookmarks.length} sites</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                High-density visual favicon grid for rapid optical recognition and launching.
              </p>
              <div className="grid grid-cols-6 gap-1 max-h-24 overflow-y-auto p-1 bg-secondary/20 rounded-lg border border-border/40">
                {bookmarks.slice(0, 18).map((bm) => (
                  <div key={bm.id} className="p-1 rounded bg-card border border-border flex items-center justify-center">
                    <BookmarkIcon src={bm.iconUrl} alt={bm.title} domain={bm.domain} className="h-4 w-4 object-contain" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
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
                className="flex-1 text-xs h-7 cursor-pointer"
              >
                <Pin className="h-3 w-3 mr-1" />
                Pin Home
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
                className="flex-1 text-xs h-7 cursor-pointer text-primary"
              >
                <FolderPlus className="h-3 w-3 mr-1" />
                + Folder
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CUSTOM VISUALS LIBRARY */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customWidgets.map((widget) => (
              <div
                key={widget.id}
                className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-xs font-semibold text-foreground truncate">
                      {widget.vizConfig?.title || widget.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {widget.vizConfig && (
                      <button
                        type="button"
                        onClick={() =>
                          setExportTargetVisual({
                            id: widget.id,
                            title: widget.vizConfig?.title || widget.label,
                            kind: "chart",
                            chartConfig: widget.vizConfig,
                          })
                        }
                        className="text-[11px] font-mono text-primary hover:bg-primary/10 px-2 py-0.5 rounded cursor-pointer"
                        title="Export to any folder"
                      >
                        + Folder
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteWidget(widget.id)}
                      className="text-[11px] font-mono text-destructive hover:text-destructive/80 px-2 py-0.5 rounded hover:bg-destructive/10 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  {widget.vizConfig ? (
                    <VizChart
                      config={widget.vizConfig}
                      bookmarks={bookmarks}
                      folders={folders}
                      height={220}
                      onSelectDomain={onSelectDomain}
                      onSelectTag={onSelectTag}
                      onSelectFolder={onSelectFolder}
                      bare={true}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CORE WORKSPACE VISUALS LIBRARY */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreVisualsList.map((viz) => (
            <div
              key={viz.id}
              className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 group"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="text-xs font-semibold text-foreground truncate">
                    {viz.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handlePinAnyVisual({
                        id: viz.id,
                        title: viz.title,
                        kind: "chart",
                        chartConfig: viz,
                      })
                    }
                    className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-secondary cursor-pointer"
                    title="Pin visual to Homepage"
                  >
                    Pin Home
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExportTargetVisual({
                        id: viz.id,
                        title: viz.title,
                        kind: "chart",
                        chartConfig: viz,
                      })
                    }
                    className="text-[11px] font-mono text-primary hover:bg-primary/10 px-2 py-0.5 rounded cursor-pointer"
                    title="Export to any folder"
                  >
                    + Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoreVisual(viz.id)}
                    className="text-[11px] font-mono text-destructive hover:text-destructive/80 px-2 py-0.5 rounded hover:bg-destructive/10 cursor-pointer"
                    title="Remove visual"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <VizChart
                  config={viz}
                  bookmarks={bookmarks}
                  folders={folders}
                  height={220}
                  onSelectDomain={onSelectDomain}
                  onSelectTag={onSelectTag}
                  onSelectFolder={onSelectFolder}
                  bare={false}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. ADVANCED EXPORT MODAL WITH DESTINATION & TAB SELECTION */}
      {exportTargetVisual && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-md w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Export Visual to Destination
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportTargetVisual(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              Allocating <strong className="text-foreground">{exportTargetVisual.title}</strong>
            </div>

            {/* Destination Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                1. Destination Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportDestination("folder")}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    exportDestination === "folder"
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-secondary/40 border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  Specific Folder
                </button>
                <button
                  type="button"
                  onClick={() => setExportDestination("page")}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    exportDestination === "page"
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-secondary/40 border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  General Page Section
                </button>
              </div>
            </div>

            {/* Destination Target */}
            {exportDestination === "folder" ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  2. Select Target Folder
                </label>
                <select
                  value={exportFolderId}
                  onChange={(e) => setExportFolderId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
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
                  2. Select Target Page View
                </label>
                <select
                  value={exportPageKey}
                  onChange={(e) => setExportPageKey(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
                >
                  <option value="page_all">All Sites View</option>
                  <option value="page_favorites">Starred Favorites View</option>
                  <option value="page_recent">Recently Visited View</option>
                </select>
              </div>
            )}

            {/* Tab Selection (Multiple Visuals Per Tab) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                3. Choose Target Tab (Multi-Visual Support)
              </label>
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => setIsNewTab(false)}
                  className={`text-xs px-2.5 py-1 rounded border cursor-pointer ${
                    !isNewTab ? "bg-primary/10 border-primary text-primary font-semibold" : "border-border text-muted-foreground"
                  }`}
                >
                  Existing Tab
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewTab(true)}
                  className={`text-xs px-2.5 py-1 rounded border cursor-pointer ${
                    isNewTab ? "bg-primary/10 border-primary text-primary font-semibold" : "border-border text-muted-foreground"
                  }`}
                >
                  + Create New Tab
                </button>
              </div>

              {!isNewTab ? (
                <input
                  type="text"
                  value={exportTabName}
                  onChange={(e) => setExportTabName(e.target.value)}
                  placeholder="e.g. Overview, Analytics, Deep Dive"
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs"
                />
              ) : (
                <input
                  type="text"
                  value={newTabInput}
                  onChange={(e) => setNewTabInput(e.target.value)}
                  placeholder="Enter name for new tab"
                  className="w-full h-9 px-2.5 rounded-lg border border-primary bg-card text-foreground text-xs"
                />
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
                className="text-xs h-8 cursor-pointer bg-primary text-primary-foreground font-semibold"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Allocate to Tab
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Builder Dialog */}
      <VizBuilderDialog
        open={builderOpen}
        onOpenChange={(op) => {
          setBuilderOpen(op);
          if (!op) setEditingConfig(null);
        }}
        initialConfig={editingConfig}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveVisual}
      />
    </div>
  );
}
