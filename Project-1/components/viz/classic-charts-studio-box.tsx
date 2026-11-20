"use client";

import * as React from "react";
import { BarChart3, Pin, FolderPlus, BookmarkPlus, Check, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { saveUniversalPreset } from "@/components/presets/universal-preset-hub";
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
  const [splitBy, setSplitBy] = React.useState<string>("none");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [limit, setLimit] = React.useState<number>(12);
  const [otherBucket, setOtherBucket] = React.useState<boolean>(false);
  const [filterFolderId, setFilterFolderId] = React.useState<string>("all");
  const [filterOnlyFavorites, setFilterOnlyFavorites] = React.useState<boolean>(false);
  const [filterOnlyAlive, setFilterOnlyAlive] = React.useState<boolean>(false);
  const [accentColor, setAccentColor] = React.useState<string>("#2f5fb3");
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
    const filters: any = {};
    if (filterFolderId !== "all") filters.folderId = filterFolderId;
    if (filterOnlyFavorites) filters.favorite = true;
    if (filterOnlyAlive) filters.status = ["alive"];

    return {
      version: 1,
      id: `classic_${chartType}_${Date.now()}`,
      title: `${activeMeta.label}`,
      chartType: mapToVizChartType(chartType),
      dimension,
      splitBy: splitBy === "none" ? undefined : (splitBy as any),
      measure,
      filters,
      sort: { by: "measure", direction: sortOrder },
      limit,
      otherBucket,
      color: accentColor,
      colorPalette: colorScheme,
      curve: "natural",
    };
  }, [
    chartType,
    dimension,
    splitBy,
    measure,
    filterFolderId,
    filterOnlyFavorites,
    filterOnlyAlive,
    sortOrder,
    limit,
    otherBucket,
    colorScheme,
    accentColor,
    activeMeta.label,
  ]);

  const handleSaveAsPreset = () => {
    window.dispatchEvent(
      new CustomEvent("markly-open-save-preset-dialog", {
        detail: {
          name: activeMeta.label,
          description: `T3 Classic Chart (${activeMeta.type}) measuring ${measure} by ${dimension}.`,
          category: "box",
          sourceLocation: "Classic Charts Studio (T3)",
          data: {
            id: `chart_${Date.now()}`,
            title: activeMeta.label,
            kind: "chart",
            category: "chart",
            chartConfig: currentConfig,
            colSpan: 12,
            rowSpan: 2,
          },
        },
      })
    );
  };

  const handleExecutePinHome = () => {
    if (onPinHome) {
      onPinHome({
        id: `home_classic_${Date.now()}`,
        title: activeMeta.label,
        kind: "chart",
        chartConfig: currentConfig,
      });
    } else {
      try {
        const stored = localStorage.getItem("markly_home_widgets");
        let list = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];
        const newId = `custom:chart_${Date.now()}`;
        list.unshift({
          id: newId,
          label: activeMeta.label,
          visible: true,
          kind: "custom",
          category: "chart",
          colSpan: 12,
          span: "2",
          rowSpan: 2,
          chartConfig: currentConfig,
        });
        localStorage.setItem("markly_home_widgets", JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      } catch (e) {
        console.error(e);
      }
    }
    setSavedPresetMsg("Pinned to Dashboard Home!");
    setTimeout(() => setSavedPresetMsg(null), 3000);
  };

  const handleConfirmAddToFolder = () => {
    if (!selectedFolderId) return;
    try {
      const storageKey = `markly_folder_visuals_${selectedFolderId}`;
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

      const tabsKey = `markly_folder_tabs_${selectedFolderId}`;
      const rawTabs = localStorage.getItem(tabsKey);
      let tabs = rawTabs ? JSON.parse(rawTabs) : [];
      if (!Array.isArray(tabs) || tabs.length === 0) {
        tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      }
      tabs[0].visuals = tabs[0].visuals || [];
      tabs[0].visuals.push({
        id: `folder_chart_${Date.now()}`,
        title: activeMeta.label,
        kind: "chart",
        colSpan: 12,
        rowSpan: 2,
        chartConfig: currentConfig,
      });
      localStorage.setItem(tabsKey, JSON.stringify(tabs));

      window.dispatchEvent(new CustomEvent("markly-folder-visuals-updated", { detail: { folderId: selectedFolderId } }));
      window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: tabs }));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      setFolderModalOpen(false);
      setSavedPresetMsg(`Added to ${folders.find((f) => f.id === selectedFolderId)?.name || "Folder"}!`);
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  return (
    <DashboardWidgetBox
      id={id}
      tabRef="T3"
      title="Classic Charts Studio (18 Variations)"
      icon={<FolderIconRenderer icon={icon} color={accentColor} className="h-4 w-4" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      minHeight={620}
      badgeText="18 PATTERNS"
      extraHeaderAction={
        <div className="flex items-center gap-1.5">
          {savedPresetMsg && (
            <span className="text-2xs text-emerald-500 font-semibold flex items-center gap-1 mk-fade-in">
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
              <Pin className="h-3 w-3 text-muted-foreground" />
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
            <FolderPlus className="h-3 w-3 text-primary" />
            <span>+ Folder</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 space-y-3.5 select-none text-foreground min-w-0">
        {/* Category Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto mk-scroll">
            {(["All", "Bars", "Lines", "Distribution", "Multi", "Advanced"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-surface"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-3xs font-mono text-muted-foreground uppercase hidden sm:inline">
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
                className={`p-2 rounded-xl border text-left cursor-pointer transition-colors flex flex-col justify-between gap-1 ${
                  isSel
                    ? "shadow-surface ring-1 ring-primary/40 font-semibold"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-semibold truncate ${isSel ? "text-primary" : "text-foreground"}`}>
                    {v.label}
                  </span>
                  <span className="text-3xs font-mono uppercase text-muted-foreground/60">{v.category}</span>
                </div>
                <p className="text-3xs text-muted-foreground truncate leading-tight">{v.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Controls Bar: Dimension, Metric, Split By, Color Palette, Filters & Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border text-xs">
          <div>
            <label className="mk-eyebrow block mb-1">
              Dimension
            </label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as VizDimension)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
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
            <label className="mk-eyebrow block mb-1">
              Measure Metric
            </label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as VizMeasure)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="count">Bookmark Count</option>
              <option value="sum_visits">Total Visits</option>
              <option value="avg_visits">Average Visits</option>
              <option value="avg_depth">Average Depth</option>
            </select>
          </div>

          <div>
            <label className="mk-eyebrow block mb-1">
              Split By / Group
            </label>
            <select
              value={splitBy}
              onChange={(e) => setSplitBy(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="none">None (Single Series)</option>
              <option value="folder">By Folder</option>
              <option value="status">By Link Health</option>
              <option value="is_favorite">By Starred</option>
            </select>
          </div>

          <div>
            <label className="mk-eyebrow block mb-1">
              Sort & Limit
            </label>
            <div className="flex items-center gap-1">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
                className="w-1/2 h-7 px-1.5 rounded-lg border border-border bg-background text-xs cursor-pointer"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <select
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-1/2 h-7 px-1.5 rounded-lg border border-border bg-background text-xs cursor-pointer"
              >
                <option value="5">5</option>
                <option value="8">8</option>
                <option value="12">12</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mk-eyebrow block mb-1">
              Color Palette Scale
            </label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="tableau10">Tableau 10</option>
              <option value="observable10">Observable 10</option>
              <option value="category10">Category 10</option>
              <option value="blues">Blues</option>
              <option value="viridis">Viridis</option>
              <option value="spectral">Spectral</option>
            </select>
          </div>

          <div>
            <label className="mk-eyebrow block mb-1">
              Folder Filter
            </label>
            <UniversalFolderSelect
              folders={folders}
              value={filterFolderId === "all" ? null : filterFolderId}
              onChange={(id) => setFilterFolderId(id || "all")}
              allowRoot={true}
              rootLabel="All Folders"
            />
          </div>

          <div className="col-span-2 flex items-center gap-3 pt-3 text-2xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={otherBucket}
                onChange={(e) => setOtherBucket(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>&ldquo;Other&rdquo; Bucket</span>
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

          <div className="flex items-center justify-end gap-1.5 col-span-2 pt-2">
            <UniversalColorPicker color={accentColor} onChange={setAccentColor} compact={true} contextKey="studio_chart_color" />
            <UniversalIconPicker icon={icon} color={accentColor} onChange={setIcon} compact={true} contextKey="studio_chart_icon" />
          </div>
        </div>

        {/* Live Interactive Chart Rendering */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between pb-1.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live Interactive Preview: {activeMeta.label}
            </span>
            <span className="text-3xs font-mono text-muted-foreground">{chartType} • Recharts SVG Engine</span>
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
        <DialogContent className="max-w-md p-5 bg-card border border-border shadow-overlay rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
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
