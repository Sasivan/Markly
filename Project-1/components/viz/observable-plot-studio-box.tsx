"use client";

import * as React from "react";
import { Activity, Pin, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { ObservablePlotView, type ObservablePlotConfig } from "./observable-plot-view";
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
  const [plotColorScheme, setPlotColorScheme] = React.useState<string>("tableau10");
  const [plotCustomColor, setPlotCustomColor] = React.useState<string>("#3b82f6");
  const [plotCustomIcon, setPlotCustomIcon] = React.useState<string>("activity");

  const filteredVariations = React.useMemo(() => {
    if (plotCategory === "All") return PLOT_VARIATIONS;
    return PLOT_VARIATIONS.filter((v) => v.category === plotCategory);
  }, [plotCategory]);

  const plotData = React.useMemo(() => {
    if (
      plotType === "dot" ||
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
    ) {
      return bookmarks.map((b, idx) => ({
        x: (idx % 12) + 1,
        y: (b.visitCount || 0) + (idx % 4),
        dimension: b.domain || "Unknown",
        value: b.visitCount || 1,
        count: b.visitCount || 1,
        dx: 1,
        dy: (b.visitCount || 1) % 5,
        targetX: ((idx + 2) % 12) + 1,
        targetY: (b.visitCount || 0) + 2,
      }));
    }

    if (plotType === "link" || plotType === "arrow") {
      return bookmarks.slice(0, 15).map((b, idx) => ({
        x: (idx % 8) + 1,
        y: (b.visitCount || 1) + (idx % 3),
        targetX: ((idx + 2) % 8) + 1,
        targetY: (b.visitCount || 1) + 2,
        dimension: b.domain || "Unknown",
        value: b.visitCount || 1,
      }));
    }

    if (plotType === "tree") {
      return folders.map((f) => ({
        name: f.name,
        parent: folders.find((p) => p.id === f.parentId)?.name || "Markly Root",
        dimension: f.name,
        value: bookmarks.filter((b) => b.folderId === f.id).length,
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

  const activeVariationMeta = PLOT_VARIATIONS.find((p) => p.type === plotType);

  return (
    <DashboardWidgetBox
      id={id}
      title="Observable Plot Layered Graphics Studio (22 Variations)"
      icon={<Activity className="h-4 w-4 text-cyan-500" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      minHeight={420}
      badgeText={`${PLOT_VARIATIONS.length} MARKS`}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      extraHeaderAction={
        <div className="flex items-center gap-1.5">
          {onPinHome && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onPinHome({
                  id: `plot_${plotType}_${Date.now()}`,
                  title: `Observable ${activeVariationMeta?.label || plotType}`,
                  kind: "plot",
                  plotConfig: { type: plotType, colorScheme: plotColorScheme },
                })
              }
              className="text-xs h-7 px-2 cursor-pointer gap-1"
            >
              <Pin className="h-3 w-3" />
              <span>Pin Home</span>
            </Button>
          )}
          {onAddToFolder && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onAddToFolder({
                  id: `plot_${plotType}_${Date.now()}`,
                  title: `Observable ${activeVariationMeta?.label || plotType}`,
                  kind: "plot",
                  plotConfig: { type: plotType, colorScheme: plotColorScheme },
                })
              }
              className="text-xs h-7 px-2 cursor-pointer gap-1 text-primary"
            >
              <FolderPlus className="h-3 w-3" />
              <span>+ Folder</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Category Filter Pills */}
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

        {/* 34 Observable Plot Variations Grid */}
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

        {/* Dimension & Metric Controls */}
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

          {/* Accent Color & Icon Pickers */}
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
              Live ObservableHQ Plot: {activeVariationMeta?.label}
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
              colorScheme: plotColorScheme,
              curve: "natural",
              grid: true,
              crosshair: true,
            }}
          />
        </div>
      </div>
    </DashboardWidgetBox>
  );
}
