"use client";

import * as React from "react";
import { Activity, Pin, FolderPlus, BookmarkPlus, Check, SlidersHorizontal, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ObservablePlotView, type ObservablePlotConfig, type ObservableCurveType } from "./observable-plot-view";
import {
  computePlotData,
  type PlotDimension,
  type PlotMeasure,
  type PlotTransform,
  type PlotSortOrder,
} from "@/lib/viz/plot-engine";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export const PLOT_VARIATIONS: Array<{
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

export interface ObservablePlotStudioBoxProps {
  id?: string;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  initialColSpan?: WidgetColSpan;
  rowSpan?: 1 | 2;
  onColSpanChange?: (span: WidgetColSpan) => void;
  onRowSpanChange?: (span: 1 | 2) => void;
  onDeleteWidget?: () => void;
  onPinHome?: (visual: {
    id: string;
    title: string;
    kind: "plot";
    plotConfig: ObservablePlotConfig;
  }) => void;
  onAddToFolder?: (visual: {
    id: string;
    title: string;
    kind: "plot";
    plotConfig: ObservablePlotConfig;
  }) => void;
}

export function ObservablePlotStudioBox({
  id = "studio_observable_plot",
  bookmarks,
  folders,
  initialColSpan = 12,
  rowSpan = 2,
  onColSpanChange,
  onRowSpanChange,
  onDeleteWidget,
  onPinHome,
  onAddToFolder,
}: ObservablePlotStudioBoxProps) {
  const [plotType, setPlotType] = React.useState<ObservablePlotConfig["type"]>("barX");
  const [plotCategory, setPlotCategory] = React.useState<string>("All");
  const [plotDimension, setPlotDimension] = React.useState<string>("domain");
  const [plotMeasure, setPlotMeasure] = React.useState<string>("count");
  const [plotGroup, setPlotGroup] = React.useState<string>("none");
  const [plotTransform, setPlotTransform] = React.useState<PlotTransform>("raw");
  const [plotSortOrder, setPlotSortOrder] = React.useState<PlotSortOrder>("desc");
  const [plotLimit, setPlotLimit] = React.useState<number | "all">(10);
  const [plotCurve, setPlotCurve] = React.useState<ObservableCurveType>("natural");
  const [plotColorScheme, setPlotColorScheme] = React.useState<string>("tableau10");
  const [plotShowGrid, setPlotShowGrid] = React.useState<boolean>(true);
  const [plotShowTip, setPlotShowTip] = React.useState<boolean>(true);
  const [plotShowLegend, setPlotShowLegend] = React.useState<boolean>(false);
  const [filterFolderId, setFilterFolderId] = React.useState<string>("all");
  const [filterOnlyFavorites, setFilterOnlyFavorites] = React.useState<boolean>(false);
  const [filterOnlyAlive, setFilterOnlyAlive] = React.useState<boolean>(false);

  const [plotCustomColor, setPlotCustomColor] = React.useState<string>("#3b82f6");
  const [plotCustomIcon, setPlotCustomIcon] = React.useState<string>("activity");
  const [savedPresetMsg, setSavedPresetMsg] = React.useState<string | null>(null);

  // Folder Destination Dialog
  const [folderModalOpen, setFolderModalOpen] = React.useState(false);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);

  const filteredVariations = React.useMemo(() => {
    if (plotCategory === "All") return PLOT_VARIATIONS;
    return PLOT_VARIATIONS.filter((v) => v.category === plotCategory);
  }, [plotCategory]);

  const activeVariationMeta = PLOT_VARIATIONS.find((p) => p.type === plotType) || PLOT_VARIATIONS[0];

  const plotData = React.useMemo(() => {
    return computePlotData(bookmarks, folders, {
      type: plotType,
      dimension: plotDimension as PlotDimension,
      measure: plotMeasure as PlotMeasure,
      group: plotGroup as any,
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
        onlyFavorites: filterOnlyFavorites,
        onlyAlive: filterOnlyAlive,
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
    filterOnlyFavorites,
    filterOnlyAlive,
  ]);

  const currentPlotConfig: ObservablePlotConfig = React.useMemo(() => ({
    type: plotType,
    dimension: plotDimension as any,
    measure: plotMeasure as any,
    group: plotGroup as any,
    transform: plotTransform as any,
    sortOrder: plotSortOrder as any,
    limit: plotLimit,
    colorScheme: plotColorScheme,
    curve: plotCurve,
    showGrid: plotShowGrid,
    showTip: plotShowTip,
    showLegend: plotShowLegend,
    filters: {
      folderId: filterFolderId,
      onlyFavorites: filterOnlyFavorites,
      onlyAlive: filterOnlyAlive,
    },
  }), [
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
    filterOnlyFavorites,
    filterOnlyAlive,
  ]);

  const handleSaveAsPreset = () => {
    try {
      const stored = localStorage.getItem("markly_custom_plot_presets");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `preset_plot_${Date.now()}`,
        title: `Observable ${activeVariationMeta.label} Preset`,
        type: plotType,
        config: currentPlotConfig,
        createdAt: Date.now(),
      });
      localStorage.setItem("markly_custom_plot_presets", JSON.stringify(list));
      setSavedPresetMsg("Saved to preset library!");
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  const handleExecutePinHome = () => {
    onPinHome?.({
      id: `plot_${plotType}_${Date.now()}`,
      title: `Observable ${activeVariationMeta.label}`,
      kind: "plot",
      plotConfig: currentPlotConfig,
    });
    setSavedPresetMsg("Pinned to Dashboard Home!");
    setTimeout(() => setSavedPresetMsg(null), 3000);
  };

  const handleConfirmAddToFolder = () => {
    if (!selectedFolderId) return;
    const storageKey = `markly_folder_visuals_${selectedFolderId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `folder_plot_${Date.now()}`,
        title: `Observable ${activeVariationMeta.label}`,
        kind: "plot",
        colSpan: 12,
        rowSpan: 2,
        plotConfig: currentPlotConfig,
      });
      localStorage.setItem(storageKey, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("markly-folder-visuals-updated", { detail: { folderId: selectedFolderId } }));
      setFolderModalOpen(false);
      setSavedPresetMsg(`Added to ${folders.find((f) => f.id === selectedFolderId)?.name || "Folder"}!`);
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  return (
    <DashboardWidgetBox
      id={id}
      tabRef="T2"
      title="Observable Plot Studio (34 Variations)"
      icon={<FolderIconRenderer icon={plotCustomIcon} color={plotCustomColor} className="h-4 w-4" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      minHeight={640}
      badgeText={`${PLOT_VARIATIONS.length} MARKS`}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      extraHeaderAction={
        <div className="flex items-center gap-1.5">
          {savedPresetMsg && (
            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 animate-in fade-in">
              <Check className="h-3 w-3" />
              <span>{savedPresetMsg}</span>
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAsPreset}
            className="text-xs h-7 px-2 cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
            title="Save current plot settings as a preset"
          >
            <BookmarkPlus className="h-3 w-3 text-amber-500" />
            <span className="hidden sm:inline">Save Preset</span>
          </Button>
          {onPinHome && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExecutePinHome}
              className="text-xs h-7 px-2 cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
              title="Pin this plot to Dashboard Home"
            >
              <Pin className="h-3 w-3 text-cyan-500" />
              <span>Pin Home</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFolderModalOpen(true)}
            className="text-xs h-7 px-2 cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
            title="Put this plot into any folder"
          >
            <FolderPlus className="h-3 w-3 text-blue-500" />
            <span>+ Folder</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 space-y-3 select-none text-foreground">
        {/* Category Filter Pills */}
        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-border/50 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {["All", "Bars", "Points", "Trends", "Areas", "Matrix", "Special"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPlotCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  plotCategory === cat
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            {filteredVariations.length} types shown
          </span>
        </div>

        {/* Variations Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto scrollbar-none p-1 bg-secondary/15 rounded-xl border border-border/60">
          {filteredVariations.map((v) => {
            const isSel = plotType === v.type;
            return (
              <button
                key={v.type}
                type="button"
                onClick={() => setPlotType(v.type)}
                style={
                  isSel
                    ? { borderColor: plotCustomColor, backgroundColor: `${plotCustomColor}15` }
                    : undefined
                }
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  isSel
                    ? "shadow-2xs ring-1 ring-primary/40 font-semibold"
                    : "border-border/60 bg-card hover:bg-secondary/70 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold truncate ${isSel ? "text-cyan-500" : "text-foreground"}`}>{v.label}</span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{v.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Dimension, Metric, Grouping, Transform, Palette & Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border text-xs">
          {/* Dimension */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Dimension
            </label>
            <select
              value={plotDimension}
              onChange={(e) => setPlotDimension(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer font-medium"
            >
              <option value="domain">Web Domain</option>
              <option value="folder_top">Top Collection</option>
              <option value="folder_leaf">Subfolder</option>
              <option value="is_favorite">Starred Status</option>
              <option value="status">Health Status</option>
              <option value="created_month">Created Month</option>
              <option value="tag">Primary Tag</option>
            </select>
          </div>

          {/* Measure Value */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Measure Metric
            </label>
            <select
              value={plotMeasure}
              onChange={(e) => setPlotMeasure(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer font-medium"
            >
              <option value="count">Bookmark Count</option>
              <option value="sum_visits">Sum Total Visits</option>
              <option value="avg_depth">Average Depth</option>
              <option value="days_since_created">Days Since Ingestion</option>
            </select>
          </div>

          {/* Grouping */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Group / Series
            </label>
            <select
              value={plotGroup}
              onChange={(e) => setPlotGroup(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer font-medium"
            >
              <option value="none">None (Single Series)</option>
              <option value="is_favorite">By Starred Status</option>
              <option value="status">By Link Health</option>
              <option value="folder">By Folder Collection</option>
              <option value="created_month">By Ingestion Month</option>
            </select>
          </div>

          {/* Math Transform */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Transform
            </label>
            <select
              value={plotTransform}
              onChange={(e) => setPlotTransform(e.target.value as PlotTransform)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer font-medium"
            >
              <option value="raw">Absolute Raw</option>
              <option value="percentage">Percentage (0-100%)</option>
              <option value="cumulative">Cumulative Running</option>
              <option value="log">Logarithmic (log10)</option>
            </select>
          </div>

          {/* Sort & Limit */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Sort & Limit
            </label>
            <div className="flex items-center gap-1">
              <select
                value={plotSortOrder}
                onChange={(e) => setPlotSortOrder(e.target.value as PlotSortOrder)}
                className="w-1/2 h-7 px-1.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
                <option value="alpha">A-Z</option>
              </select>
              <select
                value={String(plotLimit)}
                onChange={(e) => setPlotLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-1/2 h-7 px-1.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
              >
                <option value="5">5</option>
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          {/* Palette */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Color Palette
            </label>
            <select
              value={plotColorScheme}
              onChange={(e) => setPlotColorScheme(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer font-mono"
            >
              <option value="tableau10">Tableau 10</option>
              <option value="observable10">Observable 10</option>
              <option value="blues">Blues</option>
              <option value="viridis">Viridis</option>
              <option value="turbo">Turbo</option>
              <option value="spectral">Spectral</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          {/* Curve Style */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Curve Spline
            </label>
            <select
              value={plotCurve}
              onChange={(e) => setPlotCurve(e.target.value as ObservableCurveType)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
            >
              <option value="natural">Natural Spline</option>
              <option value="linear">Linear Straight</option>
              <option value="step">Step Discrete</option>
              <option value="basis">Basis Smooth</option>
              <option value="monotone-x">Monotone-X</option>
            </select>
          </div>

          {/* Scope Folder Filter */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Folder Filter
            </label>
            <select
              value={filterFolderId}
              onChange={(e) => setFilterFolderId(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer truncate"
            >
              <option value="all">All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Boolean Toggles */}
          <div className="col-span-2 flex items-center gap-3 pt-3 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={plotShowGrid}
                onChange={(e) => setPlotShowGrid(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>Grid</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={plotShowTip}
                onChange={(e) => setPlotShowTip(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>Tooltip</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={plotShowLegend}
                onChange={(e) => setPlotShowLegend(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>Legend</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={filterOnlyFavorites}
                onChange={(e) => setFilterOnlyFavorites(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>Starred Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={filterOnlyAlive}
                onChange={(e) => setFilterOnlyAlive(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>Alive Only</span>
            </label>
          </div>

          {/* Accent Color & Icon Pickers */}
          <div className="flex items-center justify-end gap-1.5 col-span-2 sm:col-span-1 pt-2">
            <UniversalColorPicker
              value={plotCustomColor}
              onChange={(c) => setPlotCustomColor(c)}
              contextKey="studio_plot_color"
            />
            <UniversalIconPicker
              value={plotCustomIcon}
              onChange={(ic) => setPlotCustomIcon(ic)}
              contextKey="studio_plot_icon"
            />
          </div>
        </div>

        {/* Observable Plot Canvas */}
        <div
          className="rounded-xl border border-border bg-background p-3.5 shadow-inner transition-colors flex-1 min-h-[260px] flex flex-col"
          style={{ borderColor: `${plotCustomColor}30` }}
        >
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: plotCustomColor }} />
              Live ObservableHQ Plot: {activeVariationMeta.label}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border">
              {plotType} • {plotData.length} marks computed
            </span>
          </div>

          <div className="flex-1 w-full min-h-[220px]">
            <ObservablePlotView
              data={plotData}
              config={{
                type: plotType,
                x: (plotType === "barX" || plotType === "stackedBarX") ? "value" : "dimension",
                y: (plotType === "barX" || plotType === "stackedBarX") ? "dimension" : "value",
                z: plotGroup !== "none" ? "group" : undefined,
                fill: plotCustomColor,
                stroke: plotCustomColor,
                colorScheme: plotColorScheme,
                curve: plotCurve,
                grid: plotShowGrid,
                tip: plotShowTip,
                legend: plotShowLegend,
              }}
            />
          </div>
        </div>
      </div>

      {/* Put in Folder Destination Selector Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="max-w-md p-5 bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Put Observable Plot Into Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select which folder page should display this {activeVariationMeta.label} graphic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground block">Target Folder</label>
            <UniversalFolderSelect
              folders={folders}
              value={selectedFolderId}
              onChange={setSelectedFolderId}
              allowRoot={false}
              placeholder="Choose destination folder..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button size="sm" variant="outline" onClick={() => setFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFolderId}
              onClick={handleConfirmAddToFolder}
              className="bg-cyan-600 text-white font-semibold"
            >
              Add to Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardWidgetBox>
  );
}
