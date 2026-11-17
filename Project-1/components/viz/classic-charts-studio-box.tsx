"use client";

import * as React from "react";
import { BarChart3, Pin, FolderPlus, BookmarkPlus, Check, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { VizChart, type VizChartProps } from "./viz-chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";
import type { VizChartType, VizDimension, VizMeasure, VizConfig } from "@/lib/viz";

export type ClassicChartPatternType =
  | VizChartType
  | "barX"
  | "stackedBar"
  | "groupedBar"
  | "stepLine"
  | "multiLine"
  | "pie"
  | "radial"
  | "radar"
  | "composed"
  | "scatter"
  | "treemap"
  | "waterfall"
  | "funnel"
  | "heatmap";

export const mapToVizChartType = (p: ClassicChartPatternType): VizChartType => {
  if (p === "barX") return "horizontal_bar";
  if (p === "stackedBar" || p === "groupedBar") return "stacked_bar";
  if (p === "stepLine" || p === "multiLine") return "line";
  if (p === "pie" || p === "radial" || p === "radar") return "donut";
  if (p === "scatter" || p === "treemap" || p === "waterfall" || p === "funnel" || p === "heatmap" || p === "composed") return "bar";
  return p as VizChartType;
};

export const CLASSIC_CHART_VARIATIONS: Array<{
  type: ClassicChartPatternType;
  label: string;
  category: "Bars" | "Lines" | "Distribution" | "Multi" | "Advanced";
  desc: string;
}> = [
  // Bars (4)
  { type: "bar", label: "Column BarY", category: "Bars", desc: "Vertical columns with rounded tops" },
  { type: "barX", label: "Ranked BarX", category: "Bars", desc: "Horizontal ranked bars sorted by value" },
  { type: "stackedBar", label: "Stacked Bar", category: "Bars", desc: "Stacked columns by folder dimension" },
  { type: "groupedBar", label: "Grouped Bar", category: "Bars", desc: "Faceted side-by-side comparative bars" },

  // Lines & Trends (4)
  { type: "line", label: "Linear Line", category: "Lines", desc: "Standard linear time series" },
  { type: "area", label: "Smooth Area", category: "Lines", desc: "Splined gradient area fill" },
  { type: "stepLine", label: "Stepped Line", category: "Lines", desc: "Discrete step function curve" },
  { type: "multiLine", label: "Multi-Series", category: "Lines", desc: "Multiple lines comparison" },

  // Distribution (4)
  { type: "donut", label: "Donut Chart", category: "Distribution", desc: "Proportional ring with center readout" },
  { type: "pie", label: "Pie Chart", category: "Distribution", desc: "Standard radial circular distribution" },
  { type: "radial", label: "Radial Bar", category: "Distribution", desc: "Concentric circular progress arcs" },
  { type: "radar", label: "Radar Polygon", category: "Distribution", desc: "Multi-axis radial polygon" },

  // Multi & Advanced (6)
  { type: "composed", label: "Composed Bar+Line", category: "Multi", desc: "Hybrid dual-axis bar and line" },
  { type: "scatter", label: "Scatter Plot", category: "Multi", desc: "2D point scatter distribution" },
  { type: "treemap", label: "Treemap Density", category: "Advanced", desc: "Nested area rectangles by metric" },
  { type: "waterfall", label: "Waterfall Balance", category: "Advanced", desc: "Stepwise increment/decrement waterfall" },
  { type: "funnel", label: "Funnel Stages", category: "Advanced", desc: "Conversion funnel stages" },
  { type: "heatmap", label: "Heatmap Matrix", category: "Advanced", desc: "2D intensity color mesh grid" },
];

export interface ClassicChartsStudioBoxProps {
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
    kind: "chart";
    chartConfig: VizConfig;
  }) => void;
  onAddToFolder?: (visual: {
    id: string;
    title: string;
    kind: "chart";
    chartConfig: VizConfig;
  }) => void;
}

export function ClassicChartsStudioBox({
  id = "studio_classic_charts",
  bookmarks,
  folders,
  initialColSpan = 12,
  rowSpan = 2,
  onColSpanChange,
  onRowSpanChange,
  onDeleteWidget,
  onPinHome,
  onAddToFolder,
}: ClassicChartsStudioBoxProps) {
  const [activeCategory, setActiveCategory] = React.useState<"All" | "Bars" | "Lines" | "Distribution" | "Multi" | "Advanced">("All");
  const [chartType, setChartType] = React.useState<ClassicChartPatternType>("bar");
  const [dimension, setDimension] = React.useState<VizDimension>("domain");
  const [measure, setMeasure] = React.useState<VizMeasure>("count");
  const [colorScheme, setColorScheme] = React.useState<string>("tableau10");
  const [accentColor, setAccentColor] = React.useState<string>("#3b82f6");
  const [icon, setIcon] = React.useState<string>("bar-chart-3");
  const [savedPresetMsg, setSavedPresetMsg] = React.useState<string | null>(null);

  // Folder Destination Dialog
  const [folderModalOpen, setFolderModalOpen] = React.useState(false);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);

  const filteredVariations = React.useMemo(() => {
    if (activeCategory === "All") return CLASSIC_CHART_VARIATIONS;
    return CLASSIC_CHART_VARIATIONS.filter((v) => v.category === activeCategory);
  }, [activeCategory]);

  const activeMeta = React.useMemo(() => {
    return CLASSIC_CHART_VARIATIONS.find((v) => v.type === chartType) || CLASSIC_CHART_VARIATIONS[0];
  }, [chartType]);

  const currentConfig: VizConfig = React.useMemo(() => {
    return {
      version: 1,
      id: `classic_${chartType}_${Date.now()}`,
      title: `${activeMeta.label}`,
      chartType: mapToVizChartType(chartType),
      dimension,
      measure,
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 12,
      otherBucket: false,
      color: accentColor,
      colorPalette: colorScheme,
      curve: "natural",
    };
  }, [chartType, dimension, measure, colorScheme, accentColor, activeMeta.label]);

  const handleSaveAsPreset = () => {
    try {
      const stored = localStorage.getItem("markly_custom_chart_presets");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `preset_${Date.now()}`,
        title: `${activeMeta.label} Preset`,
        config: currentConfig,
        createdAt: Date.now(),
      });
      localStorage.setItem("markly_custom_chart_presets", JSON.stringify(list));
      setSavedPresetMsg("Saved to preset library!");
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  const handleExecutePinHome = () => {
    onPinHome?.({
      id: `home_classic_${Date.now()}`,
      title: activeMeta.label,
      kind: "chart",
      chartConfig: currentConfig,
    });
  };

  const handleConfirmAddToFolder = () => {
    if (!selectedFolderId) return;
    const storageKey = `markly_folder_visuals_${selectedFolderId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `folder_chart_${Date.now()}`,
        title: activeMeta.label,
        kind: "chart",
        colSpan: 12,
        rowSpan: 2,
        chartConfig: currentConfig,
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
      title="Classic Charts Studio (18 Variations)"
      icon={<FolderIconRenderer icon={icon} color={accentColor} className="h-4 w-4" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      minHeight={560}
      badgeText="18 PATTERNS"
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
            title="Save current chart settings as a preset"
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
              title="Pin this chart to Dashboard Home"
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
            title="Put this chart into any folder"
          >
            <FolderPlus className="h-3 w-3 text-blue-500" />
            <span>+ Folder</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 space-y-3.5 select-none text-foreground">
        {/* Category Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {(["All", "Bars", "Lines", "Distribution", "Multi", "Advanced"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase hidden sm:inline">
            {filteredVariations.length} types shown
          </span>
        </div>

        {/* Variations Matrix Grid (Like the image) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {filteredVariations.map((v) => {
            const isSel = chartType === v.type;
            return (
              <button
                key={v.type}
                type="button"
                onClick={() => setChartType(v.type)}
                style={
                  isSel
                    ? { borderColor: accentColor, backgroundColor: `${accentColor}15` }
                    : undefined
                }
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1 ${
                  isSel
                    ? "shadow-xs ring-1 ring-primary/40 font-semibold"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isSel ? "text-primary" : "text-foreground"}`}>
                    {v.label}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-muted-foreground/60">{v.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{v.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Controls Bar: Dimension, Metric, Color Palette, Accent & Icon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/60 text-xs">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Dimension
            </label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as VizDimension)}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="domain">Web Domain</option>
              <option value="folder">Folder Collection</option>
              <option value="status">Link Health Status</option>
              <option value="favorite">Starred Status</option>
              <option value="created_month">Created Month</option>
              <option value="visit_tier">Visit Tier</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Measure Metric
            </label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as VizMeasure)}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="count">Bookmark Count</option>
              <option value="visits">Total Visits</option>
              <option value="avg_visits">Average Visits</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Color Palette Scale
            </label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="tableau10">Tableau 10 (Qualitative)</option>
              <option value="observable10">Observable 10</option>
              <option value="category10">Category 10</option>
              <option value="blues">Blues (Sequential)</option>
              <option value="viridis">Viridis (Scientific)</option>
              <option value="spectral">Spectral (Diverging)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Accent & Icon
            </label>
            <div className="flex items-center gap-1.5 h-8">
              <UniversalColorPicker color={accentColor} onChange={setAccentColor} compact={true} contextKey="studio_chart_color" />
              <UniversalIconPicker icon={icon} color={accentColor} onChange={setIcon} compact={true} contextKey="studio_chart_icon" />
            </div>
          </div>
        </div>

        {/* Live Interactive Chart Rendering */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between pb-1.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live Interactive Preview: {activeMeta.label}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{chartType} • Recharts SVG Engine</span>
          </div>
          <div className="min-h-[280px] w-full rounded-xl border border-border/80 bg-background/50 p-2">
            <VizChart
              config={currentConfig}
              bookmarks={bookmarks}
              folders={folders}
              height={260}
            />
          </div>
        </div>
      </div>

      {/* Put in Folder Destination Selector Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="max-w-md p-5 bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Put Chart Into Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select which folder page should display this {activeMeta.label} visualization box.
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
              className="bg-primary text-primary-foreground font-semibold"
            >
              Add to Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardWidgetBox>
  );
}
