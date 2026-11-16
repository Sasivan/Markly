"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Star,
  History,
  Inbox,
  Folder,
  Tag,
  BarChart3,
  LineChart,
  AreaChart,
  PieChart,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  LayoutGrid,
  Check,
  X,
  Eye,
  Sliders,
  Palette,
  Pin,
  FolderPlus,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Hash,
  Globe,
  ShieldCheck,
} from "lucide-react";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { ObservablePlotView, type ObservablePlotType, type ObservableCurveType } from "./observable-plot-view";
import { VizChart } from "./viz-chart";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { BookmarkItemsView } from "@/components/home/dashboard-widget-box";
import type { VizConfig, VizChartType } from "@/lib/viz";
import {
  computePlotData,
  type PlotDimension,
  type PlotMeasure,
  type PlotTransform,
  type PlotSortOrder,
  type PlotFilterConstraints,
} from "@/lib/viz/plot-engine";

export type VisualCategory = "sites" | "plot" | "chart" | "intel";

export interface UniversalVisualConfig {
  id: string;
  title: string;
  category: VisualCategory;
  colSpan?: WidgetColSpan;
  rowSpan?: 1 | 2;
  icon?: string;
  color?: string;

  // 1. Site Reference Box Config
  siteConfig?: {
    source: "all" | "favorites" | "recent" | "unsorted" | "folder" | "tag";
    folderId?: string;
    tag?: string;
    limit: number | "all" | "auto";
    viewMode: "grid" | "list" | "compact";
    sortBy: "recent" | "created" | "visits" | "title";
  };

  // 2. Observable Plot Config
  plotConfig?: {
    type: ObservablePlotType;
    dimension: PlotDimension;
    measure: PlotMeasure;
    group?: PlotDimension | "none";
    transform?: PlotTransform;
    sortOrder?: PlotSortOrder;
    limit?: number | "all";
    colorScheme: string;
    curve?: ObservableCurveType;
    showGrid?: boolean;
    showTip?: boolean;
    showLegend?: boolean;
    crosshair?: boolean;
    filters?: PlotFilterConstraints;
  };

  // 3. Classic Chart Config
  chartConfig?: VizConfig;

  // 4. Intelligence Visual Config
  intelConfig?: {
    type: "tags" | "engagement" | "wall" | "graph" | "heatmap";
    graphDepth?: number;
  };
}

export interface UniversalVisualBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: UniversalVisualConfig | null;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  onSave: (config: UniversalVisualConfig) => void;
  destinationName?: string;
}

export function UniversalVisualBuilderModal({
  open,
  onOpenChange,
  initialConfig,
  bookmarks,
  folders,
  onSave,
  destinationName = "current view",
}: UniversalVisualBuilderModalProps) {
  // Category tab
  const [activeTab, setActiveTab] = React.useState<VisualCategory>(() => {
    return initialConfig?.category || "sites";
  });

  // Common Header State
  const [title, setTitle] = React.useState(initialConfig?.title || "Custom Visual Box");
  const [icon, setIcon] = React.useState(initialConfig?.icon || "bar-chart-3");
  const [color, setColor] = React.useState(initialConfig?.color || "#3b82f6");
  const [colSpan, setColSpan] = React.useState<WidgetColSpan>(initialConfig?.colSpan || 6);
  const [rowSpan, setRowSpan] = React.useState<1 | 2>(initialConfig?.rowSpan || 1);

  // 1. Site Box State
  const [siteSource, setSiteSource] = React.useState<"all" | "favorites" | "recent" | "unsorted" | "folder" | "tag">(
    initialConfig?.siteConfig?.source || "all"
  );
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>(
    initialConfig?.siteConfig?.folderId || (folders[0]?.id || "")
  );
  const [selectedTag, setSelectedTag] = React.useState<string>(
    initialConfig?.siteConfig?.tag || ""
  );
  const [siteLimit, setSiteLimit] = React.useState<number | "all" | "auto">(
    initialConfig?.siteConfig?.limit || "auto"
  );
  const [siteViewMode, setSiteViewMode] = React.useState<"grid" | "list" | "compact">(
    initialConfig?.siteConfig?.viewMode || "grid"
  );
  const [siteSortBy, setSiteSortBy] = React.useState<"recent" | "created" | "visits" | "title">(
    initialConfig?.siteConfig?.sortBy || "recent"
  );

  // 2. Observable Plot State
  const [plotType, setPlotType] = React.useState<ObservablePlotType>(
    initialConfig?.plotConfig?.type || "barX"
  );
  const [plotDimension, setPlotDimension] = React.useState<PlotDimension>(
    initialConfig?.plotConfig?.dimension || "domain"
  );
  const [plotMeasure, setPlotMeasure] = React.useState<PlotMeasure>(
    initialConfig?.plotConfig?.measure || "count"
  );
  const [plotGroup, setPlotGroup] = React.useState<PlotDimension | "none">(
    initialConfig?.plotConfig?.group || "none"
  );
  const [plotTransform, setPlotTransform] = React.useState<PlotTransform>(
    initialConfig?.plotConfig?.transform || "raw"
  );
  const [plotSortOrder, setPlotSortOrder] = React.useState<PlotSortOrder>(
    initialConfig?.plotConfig?.sortOrder || "desc"
  );
  const [plotLimit, setPlotLimit] = React.useState<number | "all">(
    initialConfig?.plotConfig?.limit ?? 10
  );
  const [plotColorScheme, setPlotColorScheme] = React.useState<string>(
    initialConfig?.plotConfig?.colorScheme || "tableau10"
  );
  const [plotCurve, setPlotCurve] = React.useState<ObservableCurveType>(
    initialConfig?.plotConfig?.curve || "natural"
  );
  const [plotShowGrid, setPlotShowGrid] = React.useState<boolean>(
    initialConfig?.plotConfig?.showGrid ?? true
  );
  const [plotShowTip, setPlotShowTip] = React.useState<boolean>(
    initialConfig?.plotConfig?.showTip ?? true
  );
  const [plotShowLegend, setPlotShowLegend] = React.useState<boolean>(
    initialConfig?.plotConfig?.showLegend ?? false
  );

  // Database Filter Constraints
  const [filterFolderId, setFilterFolderId] = React.useState<string>(
    initialConfig?.plotConfig?.filters?.folderId || "all"
  );
  const [filterMinVisits, setFilterMinVisits] = React.useState<number>(
    initialConfig?.plotConfig?.filters?.minVisits || 0
  );
  const [filterOnlyFavorites, setFilterOnlyFavorites] = React.useState<boolean>(
    initialConfig?.plotConfig?.filters?.onlyFavorites || false
  );
  const [filterOnlyAlive, setFilterOnlyAlive] = React.useState<boolean>(
    initialConfig?.plotConfig?.filters?.onlyAlive || false
  );
  const [filterExcludeArchived, setFilterExcludeArchived] = React.useState<boolean>(
    initialConfig?.plotConfig?.filters?.excludeArchived ?? true
  );
  const [filterProtocol, setFilterProtocol] = React.useState<"all" | "https" | "http">(
    initialConfig?.plotConfig?.filters?.protocol || "all"
  );

  // 3. Classic Chart State
  const [chartType, setChartType] = React.useState<VizChartType>(
    initialConfig?.chartConfig?.chartType || "bar"
  );

  // 4. Intelligence Visual State
  const [intelType, setIntelType] = React.useState<"tags" | "engagement" | "wall" | "graph" | "heatmap">(
    initialConfig?.intelConfig?.type || "tags"
  );

  // Reset or Sync when initialConfig changes
  React.useEffect(() => {
    if (initialConfig) {
      setActiveTab(initialConfig.category || "sites");
      setTitle(initialConfig.title || "Custom Visual Box");
      setIcon(initialConfig.icon || "bar-chart-3");
      setColor(initialConfig.color || "#3b82f6");
      setColSpan(initialConfig.colSpan || 6);
      setRowSpan(initialConfig.rowSpan || 1);
      if (initialConfig.siteConfig) {
        setSiteSource(initialConfig.siteConfig.source || "all");
        setSelectedFolderId(initialConfig.siteConfig.folderId || (folders[0]?.id || ""));
        setSelectedTag(initialConfig.siteConfig.tag || "");
        setSiteLimit(initialConfig.siteConfig.limit || 8);
        setSiteViewMode(initialConfig.siteConfig.viewMode || "grid");
        setSiteSortBy(initialConfig.siteConfig.sortBy || "recent");
      }
      if (initialConfig.plotConfig) {
        setPlotType(initialConfig.plotConfig.type || "barX");
        setPlotDimension(initialConfig.plotConfig.dimension || "domain");
        setPlotMeasure(initialConfig.plotConfig.measure || "count");
        setPlotGroup(initialConfig.plotConfig.group || "none");
        setPlotTransform(initialConfig.plotConfig.transform || "raw");
        setPlotSortOrder(initialConfig.plotConfig.sortOrder || "desc");
        setPlotLimit(initialConfig.plotConfig.limit ?? 10);
        setPlotColorScheme(initialConfig.plotConfig.colorScheme || "tableau10");
        setPlotCurve(initialConfig.plotConfig.curve || "natural");
        setPlotShowGrid(initialConfig.plotConfig.showGrid ?? true);
        setPlotShowTip(initialConfig.plotConfig.showTip ?? true);
        setPlotShowLegend(initialConfig.plotConfig.showLegend ?? false);
        if (initialConfig.plotConfig.filters) {
          setFilterFolderId(initialConfig.plotConfig.filters.folderId || "all");
          setFilterMinVisits(initialConfig.plotConfig.filters.minVisits || 0);
          setFilterOnlyFavorites(initialConfig.plotConfig.filters.onlyFavorites || false);
          setFilterOnlyAlive(initialConfig.plotConfig.filters.onlyAlive || false);
          setFilterExcludeArchived(initialConfig.plotConfig.filters.excludeArchived ?? true);
          setFilterProtocol(initialConfig.plotConfig.filters.protocol || "all");
        }
      }
      if (initialConfig.chartConfig) {
        setChartType(initialConfig.chartConfig.chartType || "bar");
      }
      if (initialConfig.intelConfig) {
        setIntelType(initialConfig.intelConfig.type || "tags");
      }
    }
  }, [initialConfig, folders]);

  // Compute Filtered Bookmark Items for Site Reference Box Preview
  const previewSiteItems = React.useMemo(() => {
    let result = bookmarks.filter((b) => !b.isArchived);
    if (siteSource === "favorites") {
      result = result.filter((b) => b.isFavorite);
    } else if (siteSource === "recent") {
      result = result.filter((b) => (b.visitCount || 0) > 0 || b.lastVisitedAt || b.lastClickedAt);
    } else if (siteSource === "unsorted") {
      result = result.filter((b) => !b.folderId);
    } else if (siteSource === "folder" && selectedFolderId) {
      result = result.filter((b) => b.folderId === selectedFolderId);
    } else if (siteSource === "tag" && selectedTag) {
      result = result.filter((b) =>
        b.tags?.some((t: any) => (typeof t === "string" ? t : t.name).toLowerCase() === selectedTag.toLowerCase())
      );
    }

    if (siteSortBy === "visits") {
      result.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    } else if (siteSortBy === "created") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (siteSortBy === "title") {
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      result.sort((a, b) => {
        const tA = new Date(a.lastClickedAt || a.lastVisitedAt || a.createdAt).getTime();
        const tB = new Date(b.lastClickedAt || b.lastVisitedAt || b.createdAt).getTime();
        return tB - tA;
      });
    }
    return result;
  }, [bookmarks, siteSource, selectedFolderId, selectedTag, siteSortBy]);

  // Compute Aggregated Data for Observable Plot Preview using Comprehensive Plot Engine
  const previewPlotData = React.useMemo(() => {
    return computePlotData(bookmarks, folders, {
      type: plotType,
      dimension: plotDimension,
      measure: plotMeasure,
      group: plotGroup,
      transform: plotTransform,
      sortOrder: plotSortOrder,
      limit: plotLimit,
      colorScheme: plotColorScheme,
      curve: plotCurve,
      showGrid: plotShowGrid,
      showTip: plotShowTip,
      showLegend: plotShowLegend,
      filters: {
        folderId: filterFolderId,
        minVisits: filterMinVisits,
        onlyFavorites: filterOnlyFavorites,
        onlyAlive: filterOnlyAlive,
        excludeArchived: filterExcludeArchived,
        protocol: filterProtocol,
      },
    });
  }, [
    bookmarks,
    folders,
    plotType,
    plotDimension,
    plotMeasure,
    plotGroup,
    plotTransform,
    plotSortOrder,
    plotLimit,
    plotColorScheme,
    plotCurve,
    plotShowGrid,
    plotShowTip,
    plotShowLegend,
    filterFolderId,
    filterMinVisits,
    filterOnlyFavorites,
    filterOnlyAlive,
    filterExcludeArchived,
    filterProtocol,
  ]);

  // Distinct tags list for tag filter
  const allTags = React.useMemo(() => {
    const s = new Set<string>();
    bookmarks.forEach((b) => {
      (b.tags || []).forEach((t: any) => s.add(typeof t === "string" ? t : t.name));
    });
    return Array.from(s).sort();
  }, [bookmarks]);

  // Save handler
  const handleSave = () => {
    const finalId = initialConfig?.id || `viz_${Date.now()}`;
    const builtConfig: UniversalVisualConfig = {
      id: finalId,
      title: title.trim() || "Visual Box",
      category: activeTab,
      colSpan,
      rowSpan,
      icon,
      color,
    };

    if (activeTab === "sites") {
      builtConfig.siteConfig = {
        source: siteSource,
        folderId: siteSource === "folder" ? selectedFolderId : undefined,
        tag: siteSource === "tag" ? selectedTag : undefined,
        limit: siteLimit,
        viewMode: siteViewMode,
        sortBy: siteSortBy,
      };
    } else if (activeTab === "plot") {
      builtConfig.plotConfig = {
        type: plotType,
        dimension: plotDimension,
        measure: plotMeasure,
        group: plotGroup,
        transform: plotTransform,
        sortOrder: plotSortOrder,
        limit: plotLimit,
        colorScheme: plotColorScheme,
        curve: plotCurve,
        showGrid: plotShowGrid,
        showTip: plotShowTip,
        showLegend: plotShowLegend,
        crosshair: true,
        filters: {
          folderId: filterFolderId,
          minVisits: filterMinVisits,
          onlyFavorites: filterOnlyFavorites,
          onlyAlive: filterOnlyAlive,
          excludeArchived: filterExcludeArchived,
          protocol: filterProtocol,
        },
      };
    } else if (activeTab === "chart") {
      builtConfig.chartConfig = {
        version: 1,
        id: finalId,
        title,
        chartType,
        dimension: "domain",
        measure: "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: 8,
        otherBucket: true,
      };
    } else if (activeTab === "intel") {
      builtConfig.intelConfig = {
        type: intelType,
        graphDepth: 2,
      };
    }

    onSave(builtConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        {/* Header with Title Input, Universal Icon Picker, and Universal Color Picker */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border bg-secondary/30 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Universal Icon Picker */}
              <UniversalIconPicker
                icon={icon}
                color={color}
                onChange={setIcon}
                label="Choose visual icon"
              />
              {/* Universal Color Picker */}
              <UniversalColorPicker
                color={color}
                onChange={setColor}
                label="Choose visual accent color"
              />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Visual Box Title..."
                  className="w-full text-base font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 text-foreground"
                />
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  Configuring for {destinationName} • Multi-format Visual Intelligence
                </DialogDescription>
              </div>
            </div>

            {/* Layout Column Span & Row Span Control */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border border-border/60 text-xs">
                <span className="text-[10px] text-muted-foreground uppercase px-1.5 font-mono">Width:</span>
                {[
                  { label: "1/3", val: 4 as WidgetColSpan },
                  { label: "1/2", val: 6 as WidgetColSpan },
                  { label: "2/3", val: 8 as WidgetColSpan },
                  { label: "Full", val: 12 as WidgetColSpan },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setColSpan(s.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${colSpan === s.val
                        ? "bg-card text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Bento Height Toggle */}
              <button
                type="button"
                onClick={() => setRowSpan(rowSpan === 1 ? 2 : 1)}
                className={`h-7 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${rowSpan === 2
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                  }`}
                title="Toggle standard height vs 2x tall Bento box"
              >
                <span>{rowSpan === 2 ? "2x Tall (Bento)" : "1x Standard"}</span>
              </button>
            </div>
          </div>

          {/* Master Visual Category Tabs */}
          <div className="flex items-center gap-2 pt-3 border-t border-border/40 mt-3 text-xs overflow-x-auto">
            {[
              { id: "sites" as const, label: "Sites Reference Box", icon: Compass, desc: "Quick access, favorites, recent, or folder site cards" },
              { id: "plot" as const, label: "ObservableHQ Plots", icon: Activity, desc: "33 marks, transforms, and reactive grammar of graphics" },
              { id: "chart" as const, label: "Classic Charts", icon: BarChart3, desc: "Standard bars, lines, donuts, and stat metrics" },
              { id: "intel" as const, label: "Intelligence Systems", icon: Layers, desc: "Knowledge graph, tags cloud, engagement, favicon wall" },
            ].map((cat) => {
              const IconComp = cat.icon;
              const isSelected = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(cat.id);
                    if (title === "Custom Visual Box") {
                      setTitle(cat.id === "sites" ? "Quick Access Sites" : cat.id === "plot" ? "Observable Ranked Bar" : cat.id === "chart" ? "Domain Breakdown" : "Topic Cloud");
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left cursor-pointer transition-all shrink-0 ${isSelected
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                    }`}
                >
                  <IconComp className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Modal Body: Left Controls & Right Live Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Left Column: Category Specific Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4 pr-1">
            {/* 1. SITES REFERENCE BOX CONFIGURATION */}
            {activeTab === "sites" && (
              <div className="space-y-3.5 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Bookmark Source
                  </label>
                  <select
                    value={siteSource}
                    onChange={(e) => setSiteSource(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                  >
                    <option value="all">Quick Access (All Active Sites)</option>
                    <option value="favorites">Starred Favorites</option>
                    <option value="recent">Recently Visited Sites</option>
                    <option value="unsorted">Inbox / Unfiled Sites</option>
                    <option value="folder">Specific Folder Collection</option>
                    <option value="tag">Specific Topic Tag</option>
                  </select>
                </div>

                {siteSource === "folder" && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Choose Folder Collection
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {siteSource === "tag" && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Filter by Tag
                    </label>
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="">-- Choose Tag --</option>
                      {allTags.map((t) => (
                        <option key={t} value={t}>
                          #{t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Sites to Show
                    </label>
                    <select
                      value={String(siteLimit)}
                      onChange={(e) => setSiteLimit(e.target.value === "all" ? "all" : e.target.value === "auto" ? "auto" : Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="auto">✨ Auto-Fit (Adaptive to box)</option>
                      <option value="all">Show All Sites</option>
                      <option value="4">4 sites</option>
                      <option value="6">6 sites</option>
                      <option value="8">8 sites</option>
                      <option value="12">12 sites</option>
                      <option value="16">16 sites</option>
                      <option value="24">24 sites</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Card Layout
                    </label>
                    <select
                      value={siteViewMode}
                      onChange={(e) => setSiteViewMode(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      <option value="grid">Grid Cards</option>
                      <option value="list">Document List</option>
                      <option value="compact">Compact Rows</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Sort Order
                  </label>
                  <select
                    value={siteSortBy}
                    onChange={(e) => setSiteSortBy(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                  >
                    <option value="recent">Most Recently Visited</option>
                    <option value="created">Recently Added</option>
                    <option value="visits">Most Visits (Frequency)</option>
                    <option value="title">Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 2. OBSERVABLE PLOT CONFIGURATION (Advanced Information Graphics Studio) */}
            {activeTab === "plot" && (
              <div className="space-y-4 animate-in fade-in">
                {/* 1. Mark Type & Curve */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Graphic Mark & Plot Type
                    </label>
                    <span className="text-[10px] font-mono text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                      34 Variations
                    </span>
                  </div>
                  <select
                    value={plotType}
                    onChange={(e) => setPlotType(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-medium"
                  >
                    <optgroup label="Bars & Discrete Distributions (8)">
                      <option value="barX">Ranked BarX (Horizontal Sorted)</option>
                      <option value="barY">Column BarY (Vertical Rounded)</option>
                      <option value="stackedBarY">Stacked BarY (Multi-Collection)</option>
                      <option value="stackedBarX">Stacked BarX (Horizontal Stack)</option>
                      <option value="groupedBar">Grouped Bar (Side-by-Side)</option>
                      <option value="lollipop">Lollipop Stem (Pin & Dot)</option>
                      <option value="box">Box & Whisker (Quartiles & Median)</option>
                      <option value="waffle">Waffle Matrix (Unit Squares)</option>
                    </optgroup>
                    <optgroup label="Points, Scatter & 3D (4)">
                      <option value="dot">Scatter Dot (2D Point Cloud)</option>
                      <option value="bubble">Bubble Chart (Radius Sized)</option>
                      <option value="tick">1D Distribution Ticks</option>
                      <option value="rule">Stem Rules (Baseline Spikes)</option>
                    </optgroup>
                    <optgroup label="Trends, Regression & Volatility (6)">
                      <option value="line">Smooth Trend Line (Spline)</option>
                      <option value="stepLine">Stepped Discrete Line</option>
                      <option value="multiLine">Multi-Series Line Curves</option>
                      <option value="difference">Envelope Difference Bands</option>
                      <option value="linearRegression">Linear Regression Trendline</option>
                      <option value="bollinger">Bollinger Volatility Bands</option>
                    </optgroup>
                    <optgroup label="Areas, Contours & Densities (5)">
                      <option value="area">Gradient Area Fill</option>
                      <option value="stackedArea">Stacked Multi-Stream Area</option>
                      <option value="histogram">Auto-Binned Histogram</option>
                      <option value="density">2D Kernel Density Contours</option>
                      <option value="contour">Topographic Contour Isolines</option>
                    </optgroup>
                    <optgroup label="Matrix, Meshes & Geometry (5)">
                      <option value="cell">Heatmap Matrix Cells</option>
                      <option value="matrix">Cross-Tabulation Matrix</option>
                      <option value="hexbin">Hexagonal Bin Density Mesh</option>
                      <option value="delaunay">Delaunay Spatial Triangulation</option>
                      <option value="voronoi">Voronoi Planar Polygons</option>
                    </optgroup>
                    <optgroup label="Specialized Visuals (4)">
                      <option value="tree">Dendrogram Hierarchy Tree</option>
                      <option value="vector">Vector Magnitude & Angle</option>
                      <option value="arrow">Directed Vector Arrows</option>
                      <option value="text">Direct Annotation Text Grid</option>
                    </optgroup>
                  </select>
                </div>

                {/* 2. Primary Dimension & Metric */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Primary Dimension (X)
                    </label>
                    <select
                      value={plotDimension}
                      onChange={(e) => setPlotDimension(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      <optgroup label="Taxonomy & Folders">
                        <option value="domain">Web Domain (root site)</option>
                        <option value="folder">Folder Collection</option>
                        <option value="tag">Primary Topic / Tag</option>
                        <option value="tld">Top-Level Domain (.com, .io...)</option>
                      </optgroup>
                      <optgroup label="Time & Evolution">
                        <option value="month">Month Added (YYYY-MM)</option>
                        <option value="week">Week of Year (W1 - W52)</option>
                        <option value="dayOfWeek">Day of Week (Mon - Sun)</option>
                        <option value="year">Year Created</option>
                        <option value="recency">Activity Recency (Past 7d / 30d)</option>
                      </optgroup>
                      <optgroup label="Health, Security & Metadata">
                        <option value="status">Health Status (200 / Dead)</option>
                        <option value="favorite">Starred vs Standard</option>
                        <option value="protocol">HTTPS vs HTTP Protocol</option>
                        <option value="hasNotes">Notes Presence</option>
                        <option value="urlDepth">URL Path Depth (Root vs Subpage)</option>
                        <option value="visitBucket">Visit Volume Tier</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Metric / Measure (Y)
                    </label>
                    <select
                      value={plotMeasure}
                      onChange={(e) => setPlotMeasure(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      <option value="count">Bookmark Count</option>
                      <option value="sum_visits">Total Visits (Sum)</option>
                      <option value="avg_visits">Average Visits / Site</option>
                      <option value="max_visits">Peak / Max Visits</option>
                      <option value="median_visits">Median Visit Count</option>
                      <option value="stale_days">Stale Days Since Visit</option>
                      <option value="tag_count">Average Tags per Item</option>
                      <option value="title_length">Average Title Character Length</option>
                    </select>
                  </div>
                </div>

                {/* 3. Secondary Grouping (Z-Axis / Color Facet) & Math Transform */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Multi-Series Group (Z)
                    </label>
                    <select
                      value={plotGroup}
                      onChange={(e) => setPlotGroup(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      <option value="none">None (Single Series)</option>
                      <option value="folder">Split by Folder Collection</option>
                      <option value="status">Split by Health Status</option>
                      <option value="favorite">Split by Starred Status</option>
                      <option value="protocol">Split by Protocol (HTTPS/HTTP)</option>
                      <option value="tld">Split by Top-Level Domain (TLD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Math Transform
                    </label>
                    <select
                      value={plotTransform}
                      onChange={(e) => setPlotTransform(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      <option value="raw">Absolute Raw Values</option>
                      <option value="percentage">Percentage Share (0 – 100%)</option>
                      <option value="cumulative">Cumulative Running Total</option>
                      <option value="log">Logarithmic Scale (log10)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Sorting & Top-N Limit */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Sort Sequence
                    </label>
                    <select
                      value={plotSortOrder}
                      onChange={(e) => setPlotSortOrder(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                    >
                      <option value="desc">Highest Value First (Desc)</option>
                      <option value="asc">Lowest Value First (Asc)</option>
                      <option value="alpha">Alphabetical (A – Z)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Top-N Sizing Limit
                    </label>
                    <select
                      value={String(plotLimit)}
                      onChange={(e) => setPlotLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="5">Top 5 Items</option>
                      <option value="8">Top 8 Items</option>
                      <option value="10">Top 10 Items</option>
                      <option value="15">Top 15 Items</option>
                      <option value="25">Top 25 Items</option>
                      <option value="all">All Visible Records</option>
                    </select>
                  </div>
                </div>

                {/* 5. Database Constraints & Query Filters */}
                <div className="p-3 rounded-xl border border-border/70 bg-secondary/30 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span>Database Constraints & Filters</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Filter by Folder</label>
                      <select
                        value={filterFolderId}
                        onChange={(e) => setFilterFolderId(e.target.value)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-[11px] cursor-pointer"
                      >
                        <option value="all">All Folders & Inbox</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Minimum Visits</label>
                      <select
                        value={String(filterMinVisits)}
                        onChange={(e) => setFilterMinVisits(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-[11px] cursor-pointer font-mono"
                      >
                        <option value="0">0+ (All Sites)</option>
                        <option value="1">1+ visits (Visited)</option>
                        <option value="5">5+ visits (Frequent)</option>
                        <option value="10">10+ visits (Top Tier)</option>
                        <option value="25">25+ visits (Power Sites)</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Toggles */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={filterOnlyFavorites}
                        onChange={(e) => setFilterOnlyFavorites(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Only Starred</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={filterOnlyAlive}
                        onChange={(e) => setFilterOnlyAlive(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Only Alive (200 OK)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={filterExcludeArchived}
                        onChange={(e) => setFilterExcludeArchived(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Exclude Archived</span>
                    </label>
                  </div>
                </div>

                {/* 6. Visual Style, Palette & Interpolation */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Color Palette Scale
                    </label>
                    <select
                      value={plotColorScheme}
                      onChange={(e) => setPlotColorScheme(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="tableau10">Tableau 10 (Qualitative)</option>
                      <option value="observable10">Observable 10 (High Contrast)</option>
                      <option value="viridis">Viridis (Sequential Perception)</option>
                      <option value="turbo">Turbo (Full Spectrum)</option>
                      <option value="spectral">Spectral (Multi-Tone Diverging)</option>
                      <option value="warm">Warm (Amber to Crimson)</option>
                      <option value="cool">Cool (Cyan to Violet)</option>
                      <option value="blues">Blues (Monochrome Gradient)</option>
                      <option value="purples">Purples (Deep Indigo)</option>
                      <option value="greens">Emerald Greens</option>
                      <option value="rdylbu">Red-Yellow-Blue Diverging</option>
                      <option value="magma">Magma (Dark to Solar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Curve Interpolation
                    </label>
                    <select
                      value={plotCurve}
                      onChange={(e) => setPlotCurve(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="natural">Natural Cubic Spline</option>
                      <option value="step">Discrete Step Line</option>
                      <option value="linear">Linear Segmented</option>
                      <option value="catmull-rom">Catmull-Rom Smooth</option>
                      <option value="basis">Basis Uniform Curve</option>
                    </select>
                  </div>
                </div>

                {/* 7. Display Options */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={plotShowGrid}
                      onChange={(e) => setPlotShowGrid(e.target.checked)}
                      className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                    />
                    <span>Gridlines</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={plotShowTip}
                      onChange={(e) => setPlotShowTip(e.target.checked)}
                      className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                    />
                    <span>Value Tips</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={plotShowLegend}
                      onChange={(e) => setPlotShowLegend(e.target.checked)}
                      className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                    />
                    <span>Color Legend</span>
                  </label>
                </div>
              </div>
            )}

            {/* 3. CLASSIC CHART CONFIGURATION */}
            {activeTab === "chart" && (
              <div className="space-y-3.5 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Chart Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "bar" as const, label: "Vertical Bar", icon: BarChart3 },
                      { id: "horizontal_bar" as const, label: "Ranked Bar", icon: BarChart3 },
                      { id: "donut" as const, label: "Donut Share", icon: PieChart },
                      { id: "area" as const, label: "Trend Area", icon: AreaChart },
                      { id: "line" as const, label: "Smooth Line", icon: LineChart },
                      { id: "number" as const, label: "Metric Stat", icon: Activity },
                    ].map((c) => {
                      const IconC = c.icon;
                      const isSel = chartType === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setChartType(c.id)}
                          className={`p-2 rounded-xl border text-left cursor-pointer transition-colors flex items-center gap-2 ${isSel
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "bg-background border-border hover:bg-secondary text-muted-foreground"
                            }`}
                        >
                          <IconC className="h-4 w-4" />
                          <span className="text-xs">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 4. WORKSPACE INTELLIGENCE CONFIGURATION */}
            {activeTab === "intel" && (
              <div className="space-y-3.5 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Intelligence Engine
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "tags" as const, label: "Tag Frequency & Cloud", desc: "Interactive weighted keyword cloud with click filtering", icon: Tag },
                      { id: "engagement" as const, label: "Engagement Spectrum", desc: "Frequent, active, occasional, and dormant visit tiers", icon: TrendingUp },
                      { id: "wall" as const, label: "Visual Favicon Wall", desc: "High-density grid of site favicons and quick links", icon: LayoutGrid },
                      { id: "graph" as const, label: "Interactive Knowledge Graph", desc: "Force-directed physics graph connecting folders and domains", icon: Layers },
                    ].map((item) => {
                      const IconI = item.icon;
                      const isSel = intelType === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIntelType(item.id)}
                          className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition-colors flex items-start gap-2.5 ${isSel
                              ? "bg-primary/10 border-primary text-foreground shadow-2xs"
                              : "bg-background border-border hover:bg-secondary text-muted-foreground"
                            }`}
                        >
                          <IconI className={`h-4 w-4 mt-0.5 ${isSel ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <div className="text-xs font-semibold">{item.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Real-Time Live Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-border bg-background p-3.5 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Live Interactive Preview</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border/50">
                {colSpan}/12 width • {rowSpan === 2 ? "2x tall" : "1x standard"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[260px] flex flex-col justify-center">
              {/* Site Box Preview */}
              {activeTab === "sites" && (
                <div className="w-full">
                  <BookmarkItemsView
                    items={previewSiteItems}
                    mode={siteViewMode}
                    limit={siteLimit}
                    emptyMessage="No bookmarks match this source."
                    handleSiteVisit={() => { }}
                    formatTimeAgo={() => "just now"}
                    getParentName={(bm) => folders.find((f) => f.id === bm.folderId)?.name || "Folder"}
                  />
                </div>
              )}

              {/* Observable Plot Preview */}
              {activeTab === "plot" && (
                <div className="w-full">
                  <ObservablePlotView
                    data={previewPlotData}
                    config={{
                      type: plotType,
                      x: plotType === "barX" || plotType === "stackedBarX" ? "value" : "dimension",
                      y: plotType === "barX" || plotType === "stackedBarX" ? "dimension" : "value",
                      z: plotGroup !== "none" ? "group" : undefined,
                      fill: color || "#3b82f6",
                      stroke: color || "#3b82f6",
                      colorScheme: plotColorScheme,
                      curve: plotCurve,
                      grid: plotShowGrid,
                      tip: plotShowTip,
                      legend: plotShowLegend,
                      crosshair: true,
                      height: 240,
                    }}
                  />
                </div>
              )}

              {/* Classic Chart Preview */}
              {activeTab === "chart" && (
                <div className="w-full">
                  <VizChart
                    config={{
                      version: 1,
                      id: "preview",
                      title,
                      chartType,
                      dimension: "domain",
                      measure: "count",
                      filters: {},
                      sort: { by: "measure", direction: "desc" },
                      limit: 6,
                      otherBucket: true,
                    }}
                    bookmarks={bookmarks}
                    folders={folders}
                  />
                </div>
              )}

              {/* Intelligence Preview */}
              {activeTab === "intel" && (
                <div className="w-full">
                  {intelType === "graph" ? (
                    <div className="h-56 w-full rounded-xl overflow-hidden border border-border">
                      <KnowledgeGraph
                        mode="global"
                        depth={2}
                        showControls={false}
                      />
                    </div>
                  ) : intelType === "tags" ? (
                    <div className="flex flex-wrap gap-1.5 p-3">
                      {allTags.slice(0, 20).map((t, idx) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-border"
                          style={{
                            backgroundColor: idx % 2 === 0 ? `${color}15` : undefined,
                            color: idx % 2 === 0 ? color : undefined,
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <span>{intelType.toUpperCase()} module ready for placement in {destinationName}.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 border-t border-border bg-secondary/20 flex items-center justify-between flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 cursor-pointer gap-1.5 shadow-xs"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save & Place Visual</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
