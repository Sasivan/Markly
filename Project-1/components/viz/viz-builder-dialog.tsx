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
  BarChart3,
  LineChart,
  AreaChart,
  PieChart,
  Table,
  Hash,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Check,
  AlertCircle,
  RotateCcw,
  Plus,
} from "lucide-react";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import type {
  VizConfig,
  VizChartType,
  VizDimension,
  VizSplitByDimension,
  VizMeasure,
} from "@/lib/viz";
import { DEFAULT_VIZ_CONFIG, VIZ_PALETTE } from "@/lib/viz";
import { VizChart } from "./viz-chart";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";

export interface VizBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: VizConfig | null;
  bookmarks: BookmarkWithDetails[];
  folders?: Folder[];
  onSave: (config: VizConfig) => void;
}

interface PresetItem {
  id: string;
  name: string;
  description: string;
  config: Partial<VizConfig>;
}

const PRESETS: PresetItem[] = [
  {
    id: "bookmarks_per_month",
    name: "Bookmarks per month",
    description: "Activity trend over time",
    config: {
      title: "Bookmarks Added per Month",
      chartType: "area",
      dimension: "created_month",
      measure: "count",
      sort: { by: "dimension", direction: "asc" },
      limit: 12,
      otherBucket: false,
    },
  },
  {
    id: "top_domains",
    name: "Top web domains",
    description: "Most frequent sites",
    config: {
      title: "Top Web Domains",
      chartType: "bar",
      dimension: "domain",
      measure: "count",
      sort: { by: "measure", direction: "desc" },
      limit: 8,
      otherBucket: true,
    },
  },
  {
    id: "by_folder",
    name: "By top folder",
    description: "Folder share breakdown",
    config: {
      title: "Bookmarks by Folder Collection",
      chartType: "donut",
      dimension: "folder_top",
      measure: "count",
      sort: { by: "measure", direction: "desc" },
      limit: 7,
      otherBucket: true,
    },
  },
  {
    id: "link_status",
    name: "Link health status",
    description: "Healthy vs broken URLs",
    config: {
      title: "Workspace Link Health",
      chartType: "donut",
      dimension: "status",
      measure: "count",
      sort: { by: "measure", direction: "desc" },
      limit: 5,
      otherBucket: false,
    },
  },
  {
    id: "most_opened",
    name: "Most opened sites",
    description: "Sum of site visits",
    config: {
      title: "Most Visited Domains",
      chartType: "horizontal_bar",
      dimension: "domain",
      measure: "sum_visits",
      sort: { by: "measure", direction: "desc" },
      limit: 8,
      otherBucket: true,
    },
  },
  {
    id: "tagged_vs_untagged",
    name: "Tagged vs untagged",
    description: "Tag classification",
    config: {
      title: "Top Topic Tags",
      chartType: "bar",
      dimension: "tag",
      measure: "count",
      sort: { by: "measure", direction: "desc" },
      limit: 8,
      otherBucket: true,
    },
  },
  {
    id: "favorite_shares",
    name: "Starred vs Unstarred",
    description: "Favorites ratio",
    config: {
      title: "Starred Bookmarks Ratio",
      chartType: "donut",
      dimension: "favorite",
      measure: "count",
      sort: { by: "measure", direction: "desc" },
      limit: 3,
      otherBucket: false,
    },
  },
  {
    id: "recent_activity_velocity",
    name: "Weekly Momentum",
    description: "Ingestion velocity per week",
    config: {
      title: "Weekly Ingestion Momentum",
      chartType: "line",
      dimension: "created_week",
      measure: "count",
      sort: { by: "dimension", direction: "asc" },
      limit: 10,
      otherBucket: false,
    },
  },
  {
    id: "folder_domain_diversity",
    name: "Folder Domain Diversity",
    description: "Distinct domains per collection",
    config: {
      title: "Distinct Domains by Folder",
      chartType: "horizontal_bar",
      dimension: "folder_top",
      measure: "distinct_domains",
      sort: { by: "measure", direction: "desc" },
      limit: 8,
      otherBucket: true,
    },
  },
  {
    id: "visit_count_buckets",
    name: "Engagement Buckets",
    description: "Dormant vs active link tiers",
    config: {
      title: "Visit Count Engagement Tiers",
      chartType: "bar",
      dimension: "visit_count_bucket",
      measure: "count",
      sort: { by: "dimension", direction: "asc" },
      limit: 6,
      otherBucket: false,
    },
  },
];

const CHRONO_DIMENSIONS: VizDimension[] = [
  "created_day",
  "created_week",
  "created_month",
  "created_year",
  "last_opened_date",
];

export function VizBuilderDialog({
  open,
  onOpenChange,
  initialConfig,
  bookmarks,
  folders = [],
  onSave,
}: VizBuilderDialogProps) {
  const [config, setConfig] = React.useState<VizConfig>(() => {
    if (initialConfig) return initialConfig;
    return {
      ...DEFAULT_VIZ_CONFIG,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  });

  const [activePreset, setActivePreset] = React.useState<string | null>(null);

  // Modal resizing
  const { format, toggleFormat, modalStyle, hasCustomSize, handleRestoreDefaults, startResize } = useResizableModal({
    modalId: "viz_builder_dialog",
    defaultVerticalWidth: 720,
    defaultHorizontalWidth: 1040,
    defaultVerticalHeight: 740,
    defaultHorizontalHeight: 680,
  });

  React.useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    } else {
      setConfig({
        ...DEFAULT_VIZ_CONFIG,
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      setActivePreset(null);
    }
  }, [initialConfig, open]);

  // Suggest title automatically when dimension and measure change
  const suggestTitle = (dim: VizDimension, meas: VizMeasure, chart: VizChartType) => {
    const dimLabels: Record<VizDimension, string> = {
      folder_leaf: "Folder",
      folder_top: "Folder Group",
      tag: "Tag",
      domain: "Domain",
      status: "Link Status",
      favorite: "Favorite Status",
      has_notes: "Notes Status",
      created_day: "Daily Bookmarks",
      created_week: "Weekly Bookmarks",
      created_month: "Monthly Bookmarks",
      created_year: "Yearly Bookmarks",
      last_opened_date: "Last Visited Date",
      last_opened_bucket: "Recency Activity",
      visit_count_bucket: "Visit Volume",
    };

    const measLabels: Record<VizMeasure, string> = {
      count: "Bookmarks",
      sum_visits: "Total Visits",
      avg_visits: "Average Visits",
      max_visits: "Peak Visits",
      distinct_domains: "Distinct Domains",
      percent_of_total: "% Share",
    };

    if (chart === "number") {
      return `${measLabels[meas]} Overview`;
    }
    return `${measLabels[meas]} by ${dimLabels[dim]}`;
  };

  const applyPreset = (preset: PresetItem) => {
    setActivePreset(preset.id);
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      filters: { ...prev.filters, ...(preset.config.filters || {}) },
      sort: { ...prev.sort, ...(preset.config.sort || {}) },
    }));
  };

  // Compatibility validation rules
  const validationError = React.useMemo(() => {
    if ((config.chartType === "line" || config.chartType === "area") && !CHRONO_DIMENSIONS.includes(config.dimension)) {
      return "Line and area charts require a chronological date dimension (created day/week/month/year or opened date).";
    }
    if (config.chartType === "donut" && config.dimension === "tag") {
      return "Donut charts require a single-valued dimension (tags can belong to multiple categories simultaneously).";
    }
    if (config.chartType === "stacked_bar" && !config.splitBy) {
      return "Stacked bar charts require a secondary 'Split By' dimension to create stacked segments.";
    }
    return null;
  }, [config.chartType, config.dimension, config.splitBy]);

  const handleChartTypeSelect = (type: VizChartType) => {
    let nextDim = config.dimension;
    let nextSplit = config.splitBy;

    if ((type === "line" || type === "area") && !CHRONO_DIMENSIONS.includes(nextDim)) {
      nextDim = "created_month";
    }
    if (type === "donut" && nextDim === "tag") {
      nextDim = "folder_top";
    }
    if (type === "stacked_bar" && !nextSplit) {
      nextSplit = "status";
    }

    const autoTitle = suggestTitle(nextDim, config.measure, type);
    setConfig((prev) => ({
      ...prev,
      chartType: type,
      dimension: nextDim,
      splitBy: nextSplit,
      title: prev.title.trim() === "" || prev.title.startsWith("Bookmarks by") || prev.title.startsWith("Total Visits") ? autoTitle : prev.title,
    }));
  };

  const handleDimensionSelect = (dim: VizDimension) => {
    let nextType = config.chartType;
    if (CHRONO_DIMENSIONS.includes(dim) && nextType === "donut") {
      nextType = "area";
    }
    if (dim === "tag" && nextType === "donut") {
      nextType = "bar";
    }
    const autoTitle = suggestTitle(dim, config.measure, nextType);
    setConfig((prev) => ({
      ...prev,
      dimension: dim,
      chartType: nextType,
      title: prev.title.trim() === "" || prev.title.startsWith("Bookmarks by") ? autoTitle : prev.title,
    }));
  };

  const handleMeasureSelect = (meas: VizMeasure) => {
    const autoTitle = suggestTitle(config.dimension, meas, config.chartType);
    setConfig((prev) => ({
      ...prev,
      measure: meas,
      title: prev.title.trim() === "" || prev.title.startsWith("Bookmarks by") ? autoTitle : prev.title,
    }));
  };

  const handleSave = () => {
    if (validationError) return;
    onSave(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative flex flex-col bg-card border border-border p-5 text-foreground overflow-hidden max-w-[95vw] max-h-[92vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        {/* Dialog Header */}
        <DialogHeader className="space-y-1 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Custom Visual Builder
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Construct customized data visualizations and metric boards from your workspace links.
                </DialogDescription>
              </div>
            </div>

            <ModalFormatControls
              format={format}
              onToggleFormat={toggleFormat}
              hasCustomSize={hasCustomSize}
              onRestoreDefaults={handleRestoreDefaults}
            />
          </div>

          {/* Quick Preset Gallery */}
          <div className="pt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
              Quick presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-colors flex items-center gap-1.5 ${activePreset === preset.id
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  title={preset.description}
                >
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Builder Body: Two Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 overflow-y-auto py-3 min-h-0">
          {/* Left: Configuration Controls (5 columns) */}
          <div className="md:col-span-5 space-y-4 pr-1">
            {/* Visual Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Visual title</span>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((p) => ({ ...p, title: suggestTitle(p.dimension, p.measure, p.chartType) }))
                  }
                  className="text-[10px] text-primary hover:underline cursor-pointer"
                >
                  Auto-suggest
                </button>
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Bookmarks by Domain"
                maxLength={100}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Chart Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Chart type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { type: "bar" as VizChartType, label: "Bar", icon: BarChart3 },
                  { type: "horizontal_bar" as VizChartType, label: "Row", icon: BarChart3 },
                  { type: "line" as VizChartType, label: "Line", icon: LineChart },
                  { type: "area" as VizChartType, label: "Area", icon: AreaChart },
                  { type: "stacked_bar" as VizChartType, label: "Stacked", icon: Layers },
                  { type: "donut" as VizChartType, label: "Donut", icon: PieChart },
                  { type: "number" as VizChartType, label: "Number", icon: Hash },
                  { type: "table" as VizChartType, label: "Table", icon: Table },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = config.chartType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleChartTypeSelect(item.type)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${isSel
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                    >
                      <Icon className="h-4 w-4 mb-0.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group by (Dimension) & Value (Measure) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Group by</label>
                <select
                  value={config.dimension}
                  onChange={(e) => handleDimensionSelect(e.target.value as VizDimension)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="domain">Domain</option>
                  <option value="folder_top">Top Folder</option>
                  <option value="folder_leaf">Leaf Folder</option>
                  <option value="tag">Tags (Multi-tag)</option>
                  <option value="status">Health Status</option>
                  <option value="favorite">Favorite Starred</option>
                  <option value="has_notes">Has Notes</option>
                  <option value="created_month">Created Month</option>
                  <option value="created_week">Created Week</option>
                  <option value="created_day">Created Day</option>
                  <option value="created_year">Created Year</option>
                  <option value="last_opened_bucket">Last Opened Bucket</option>
                  <option value="visit_count_bucket">Visit Count Tier</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Value measure</label>
                <select
                  value={config.measure}
                  onChange={(e) => handleMeasureSelect(e.target.value as VizMeasure)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="count">Bookmark Count</option>
                  <option value="sum_visits">Total Visits</option>
                  <option value="avg_visits">Average Visits</option>
                  <option value="max_visits">Maximum Visits</option>
                  <option value="distinct_domains">Distinct Domains</option>
                  <option value="percent_of_total">% Share of Total</option>
                </select>
              </div>
            </div>

            {/* Split by (Secondary Dimension for Stacked Charts) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Split by series (Optional)</span>
                {config.splitBy && (
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, splitBy: undefined }))}
                    className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Clear split
                  </button>
                )}
              </label>
              <select
                value={config.splitBy || ""}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    splitBy: e.target.value ? (e.target.value as VizSplitByDimension) : undefined,
                  }))
                }
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">None (Single series)</option>
                <option value="status">Health Status</option>
                <option value="favorite">Favorite Starred</option>
                <option value="folder_top">Top Folder</option>
                <option value="domain">Domain</option>
                <option value="has_notes">Has Notes</option>
                <option value="last_opened_bucket">Recency Bucket</option>
              </select>
            </div>

            {/* Sort & Limit */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sort order</label>
                <select
                  value={`${config.sort?.by}_${config.sort?.direction}`}
                  onChange={(e) => {
                    const [by, direction] = e.target.value.split("_");
                    setConfig((p) => ({
                      ...p,
                      sort: { by: by as any, direction: direction as any },
                    }));
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="measure_desc">Value (High to Low)</option>
                  <option value="measure_asc">Value (Low to High)</option>
                  <option value="dimension_asc">Label (A to Z / Old to New)</option>
                  <option value="dimension_desc">Label (Z to A / New to Old)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Limit items</label>
                <select
                  value={config.limit}
                  onChange={(e) => setConfig((p) => ({ ...p, limit: parseInt(e.target.value, 10) }))}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="5">Top 5</option>
                  <option value="8">Top 8</option>
                  <option value="10">Top 10</option>
                  <option value="15">Top 15</option>
                  <option value="25">Top 25</option>
                  <option value="50">Top 50</option>
                </select>
              </div>
            </div>

            {/* Top-N Other Bucket & Archived Toggle */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <label className="flex items-center gap-2 text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.otherBucket}
                  onChange={(e) => setConfig((p) => ({ ...p, otherBucket: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Combine remaining into &quot;Other&quot;</span>
              </label>

              <label className="flex items-center gap-2 text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.filters?.includeArchived ?? false}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      filters: { ...p.filters, includeArchived: e.target.checked },
                    }))
                  }
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Include archived</span>
              </label>
            </div>

            {/* Folder Filter */}
            <div className="space-y-1 pt-1 border-t border-border/40">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Filter by folder</span>
                {config.filters?.folderId && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({ ...p, filters: { ...p.filters, folderId: null } }))
                    }
                    className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    All folders
                  </button>
                )}
              </label>
              <UniversalFolderSelect
                folders={folders}
                value={config.filters?.folderId}
                onChange={(id) =>
                  setConfig((p) => ({
                    ...p,
                    filters: { ...p.filters, folderId: id },
                  }))
                }
                allowRoot={true}
                rootLabel="All folders (Entire workspace)"
                placeholder="All folders..."
              />
            </div>
          </div>

          {/* Right: Live Interactive Preview (7 columns) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3 bg-secondary/20 p-4 rounded-xl border border-border">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Live Visual Preview</span>
                <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-background border border-border">
                  {bookmarks.length} links in workspace
                </span>
              </div>

              {/* Inline Compatibility Alert */}
              {validationError && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Chart Renderer Preview */}
            <div className="flex-1 min-h-[280px] flex items-center justify-center">
              <VizChart
                config={config}
                bookmarks={bookmarks}
                folders={folders}
                height={280}
                bare={false}
              />
            </div>

            {/* Color Accent Picker */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
              <span className="text-muted-foreground font-mono text-[11px]">Color accent:</span>
              <div className="flex items-center gap-1.5">
                {VIZ_PALETTE.map((c: string) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        displayOptions: { ...p.displayOptions, colorAccent: c },
                      }))
                    }
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${(config.displayOptions?.colorAccent || VIZ_PALETTE[0]) === c
                      ? "ring-2 ring-foreground scale-110"
                      : "hover:scale-105"
                      }`}
                  >
                    {(config.displayOptions?.colorAccent || VIZ_PALETTE[0]) === c && (
                      <Check className="h-2.5 w-2.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={Boolean(validationError)}
            onClick={handleSave}
            className="text-xs h-8 cursor-pointer gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{initialConfig ? "Update Visual" : "Save to Dashboard"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
