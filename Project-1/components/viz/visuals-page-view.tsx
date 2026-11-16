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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";
import type { VizConfig, VizChartType, VizDimension, VizMeasure } from "@/lib/viz";
import { RemoteWidgetStore } from "@/lib/viz";
import { VIZ_GRADIENTS, type VizGradientPreset } from "@/lib/viz/palette";
import { VizChart } from "./viz-chart";
import { VizBuilderDialog } from "./viz-builder-dialog";

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

  // Studio Interactive Lab state
  const [studioPreset, setStudioPreset] = React.useState<string>("top_domains");
  const [studioChartType, setStudioChartType] = React.useState<VizChartType>("bar");
  const [studioDimension, setStudioDimension] = React.useState<VizDimension>("domain");
  const [studioMeasure, setStudioMeasure] = React.useState<VizMeasure>("count");
  const [selectedGradient, setSelectedGradient] = React.useState<string>("indigo_cyan");
  const [studioPinnedSuccess, setStudioPinnedSuccess] = React.useState(false);

  // Export to Folder State (Folder Picker popover)
  const [exportTargetConfig, setExportTargetConfig] = React.useState<VizConfig | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = React.useState<string | null>(null);

  const activeStudioConfig: VizConfig = React.useMemo(() => {
    return {
      version: 1,
      id: "studio_live_chart",
      title: `${studioDimension.replace("_", " ").toUpperCase()} by ${studioMeasure.replace("_", " ").toUpperCase()}`,
      chartType: studioChartType,
      dimension: studioDimension,
      measure: studioMeasure,
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: studioChartType === "donut" ? 7 : 10,
      otherBucket: true,
    };
  }, [studioChartType, studioDimension, studioMeasure]);

  const widgetStore = React.useMemo(() => new RemoteWidgetStore(), []);

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

  // Core Visuals (Persisted and completely deletable by user)
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
    const updated = coreVisualsList.filter((v) => v.id !== id);
    saveCoreVisuals(updated);
  };

  const handleRestoreCoreVisuals = () => {
    saveCoreVisuals(INITIAL_CORE_VISUALS);
  };

  const handleSaveVisual = async (newConfig: VizConfig) => {
    try {
      const current = await widgetStore.loadWidgets();
      let updated: HomeWidgetConfig[];

      const existingIdx = current.findIndex(
        (w: any) => w.vizConfig?.id === newConfig.id || w.id === `custom:${newConfig.id}`
      );
      if (existingIdx !== -1) {
        updated = current.map((w: any, idx: number) =>
          idx === existingIdx
            ? { ...w, label: newConfig.title, vizConfig: newConfig }
            : w
        );
      } else {
        const customCount = current.filter(
          (w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
        ).length;
        if (customCount >= 30) {
          alert("Maximum limit of 30 custom visuals reached. Please remove an existing visual first.");
          return;
        }
        const newWidget: HomeWidgetConfig = {
          id: `custom:${newConfig.id}`,
          label: newConfig.title,
          visible: true,
          kind: "custom",
          vizConfig: newConfig,
          colSpan: 6,
          span: "1",
        };
        updated = [...current, newWidget];
      }

      await widgetStore.saveWidgets(updated);
      setCustomWidgets(
        updated.filter(
          (w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))
        )
      );
    } catch {}
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

  // Pin any visual directly to Dashboard Home
  const handlePinToDashboard = async (config: VizConfig) => {
    const configToPin: VizConfig = {
      ...config,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `viz_${Date.now()}`,
    };
    await handleSaveVisual(configToPin);
    setExportSuccessMsg(`Pinned "${config.title}" to Dashboard Home!`);
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  const handlePinStudioToDashboard = async () => {
    await handlePinToDashboard(activeStudioConfig);
    setStudioPinnedSuccess(true);
    setTimeout(() => setStudioPinnedSuccess(false), 3000);
  };

  // Export any visual to a specific Folder's Visual Analytics
  const handleExportToFolder = (config: VizConfig, targetFolderId: string, targetFolderName: string) => {
    try {
      const storageKey = `markly_folder_visuals_${targetFolderId}`;
      const stored = localStorage.getItem(storageKey);
      let list: VizConfig[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const newFolderVisual: VizConfig = {
        ...config,
        id: `fld_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      };

      list.push(newFolderVisual);
      localStorage.setItem(storageKey, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));

      setExportTargetConfig(null);
      setExportSuccessMsg(`Exported "${config.title}" to ${targetFolderName}!`);
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (e) {
      console.error("Export visual error:", e);
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* Toast Notification for Export */}
      {exportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-4 w-4" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground border border-border inline-flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-primary" />
                Visual Studio Hub
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {bookmarks.length} links • All charts modular & exportable
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Visual Analytics & Chart Studio
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Parent studio for all workspace visuals. Build, customize with color gradients, pin to Homepage, or export into folder intelligence.
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

      {/* Visual Studio Interactive Playground */}
      <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-primary text-primary-foreground uppercase tracking-wider">
                Interactive Studio
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Live Visual Builder & Variations Studio
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Tweak data dimensions, measures, and chart variations in real-time with your live bookmarks database.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePinStudioToDashboard}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              {studioPinnedSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pinned to Dashboard!</span>
                </>
              ) : (
                <>
                  <Pin className="h-3.5 w-3.5" />
                  <span>Pin to Home</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setExportTargetConfig(activeStudioConfig)}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5 text-primary" />
              <span>Export to Folder...</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingConfig(activeStudioConfig);
                setBuilderOpen(true);
              }}
              className="text-xs h-8 cursor-pointer gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Advanced Studio</span>
            </Button>
          </div>
        </div>

        {/* Studio Presets Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono text-muted-foreground mr-1">Presets:</span>
          {[
            { id: "top_domains", label: "Top Domains", type: "bar" as VizChartType, dim: "domain" as VizDimension, measure: "count" as VizMeasure },
            { id: "bookmarks_per_month", label: "Velocity Trend", type: "area" as VizChartType, dim: "created_month" as VizDimension, measure: "count" as VizMeasure },
            { id: "by_folder", label: "By Folder", type: "donut" as VizChartType, dim: "folder_top" as VizDimension, measure: "count" as VizMeasure },
            { id: "link_status", label: "Link Health", type: "donut" as VizChartType, dim: "status" as VizDimension, measure: "count" as VizMeasure },
            { id: "most_visited", label: "Most Visited", type: "horizontal_bar" as VizChartType, dim: "domain" as VizDimension, measure: "sum_visits" as VizMeasure },
            { id: "by_tag", label: "Tag Distribution", type: "donut" as VizChartType, dim: "tag" as VizDimension, measure: "count" as VizMeasure },
            { id: "table_view", label: "Data Table", type: "table" as VizChartType, dim: "domain" as VizDimension, measure: "count" as VizMeasure },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setStudioPreset(preset.id);
                setStudioChartType(preset.type);
                setStudioDimension(preset.dim);
                setStudioMeasure(preset.measure);
              }}
              className={`px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors whitespace-nowrap text-xs ${
                studioPreset === preset.id
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                  : "bg-secondary/60 hover:bg-secondary text-foreground border-border"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Studio Interactive Control Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-xl border border-border">
          {/* 1. Chart Type Variation Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              1. Chart Variation
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { type: "bar" as VizChartType, label: "Bar" },
                { type: "horizontal_bar" as VizChartType, label: "H-Bar" },
                { type: "area" as VizChartType, label: "Area" },
                { type: "line" as VizChartType, label: "Line" },
                { type: "donut" as VizChartType, label: "Donut" },
                { type: "number" as VizChartType, label: "Number" },
                { type: "table" as VizChartType, label: "Table" },
                { type: "stacked_bar" as VizChartType, label: "Stacked" },
              ].map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => {
                    setStudioChartType(c.type);
                    setStudioPreset("");
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium border text-center cursor-pointer transition-colors ${
                    studioChartType === c.type
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-card hover:bg-secondary text-foreground border-border"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Group By Dimension */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              2. Data Group By
            </label>
            <select
              value={studioDimension}
              onChange={(e) => {
                setStudioDimension(e.target.value as VizDimension);
                setStudioPreset("");
              }}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
            >
              <option value="domain">Web Domain (Ecosystem)</option>
              <option value="folder_top">Top-Level Folder</option>
              <option value="folder_leaf">Subfolder</option>
              <option value="created_month">Creation Month</option>
              <option value="created_day">Creation Day</option>
              <option value="status">Link Status (Active / Broken)</option>
              <option value="tag">Tags & Topics</option>
              <option value="visit_count_bucket">Visit Frequency Bucket</option>
              <option value="last_opened_bucket">Last Opened Recency</option>
              <option value="favorite">Starred Favorite</option>
            </select>
          </div>

          {/* 3. Measure Value */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              3. Measure Metric
            </label>
            <select
              value={studioMeasure}
              onChange={(e) => {
                setStudioMeasure(e.target.value as VizMeasure);
                setStudioPreset("");
              }}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs cursor-pointer"
            >
              <option value="count">Count (Total Bookmarks)</option>
              <option value="sum_visits">Sum of Total Visits</option>
              <option value="avg_visits">Average Visits per Link</option>
              <option value="distinct_domains">Distinct Domains</option>
              <option value="percent_of_total">% of Total Collection</option>
            </select>
          </div>
        </div>

        {/* Live Studio Canvas */}
        <div className="rounded-xl border border-border bg-background p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {activeStudioConfig.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded bg-secondary border border-border">
              Live Interactive Preview
            </span>
          </div>

          <VizChart
            config={activeStudioConfig}
            bookmarks={bookmarks}
            folders={folders}
            height={260}
            onSelectDomain={onSelectDomain}
            onSelectTag={onSelectTag}
            onSelectFolder={onSelectFolder}
            bare={false}
          />
        </div>
      </div>

      {/* Custom User Visuals Section */}
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
                        onClick={() => setExportTargetConfig(widget.vizConfig)}
                        className="text-[11px] font-mono text-primary hover:bg-primary/10 px-2 py-0.5 rounded cursor-pointer"
                        title="Export this visual to any folder"
                      >
                        + Folder
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (widget.vizConfig) {
                          setEditingConfig(widget.vizConfig);
                          setBuilderOpen(true);
                        }
                      }}
                      className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-secondary cursor-pointer"
                    >
                      Edit
                    </button>
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

      {/* Workspace Foundation Visuals Section (All Modular, Deletable & Exportable) */}
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

        {coreVisualsList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground space-y-2">
            <p>All core visuals have been removed.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreCoreVisuals}
              className="text-xs cursor-pointer"
            >
              Restore Core Visuals Library
            </Button>
          </div>
        ) : (
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
                      onClick={() => handlePinToDashboard(viz)}
                      className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-secondary cursor-pointer"
                      title="Pin visual to Homepage"
                    >
                      Pin Home
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportTargetConfig(viz)}
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
        )}
      </section>

      {/* Export to Folder Modal Dialog */}
      {exportTargetConfig && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Export to Folder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportTargetConfig(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select which folder to attach <strong className="text-foreground">{exportTargetConfig.title}</strong> into:
            </p>

            <div className="max-h-56 overflow-y-auto space-y-1 py-1">
              {folders.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No folders created yet.
                </div>
              ) : (
                folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleExportToFolder(exportTargetConfig, f.id, f.name)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-secondary cursor-pointer flex items-center justify-between text-xs text-foreground transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary">
                      Add →
                    </span>
                  </button>
                ))
              )}
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
