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
  RotateCcw,
  Columns2,
  Rows2,
} from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { ObservablePlotView, type ObservablePlotType, type ObservableCurveType } from "./observable-plot-view";
import { VizChart } from "./viz-chart";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { BookmarkItemsView } from "@/components/home/dashboard-widget-box";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import type { VizConfig, VizChartType, VizDimension, VizMeasure, VizSplitByDimension } from "@/lib/viz";
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
    tagLimit?: number;
    minTagCount?: number;
    tagSort?: "count" | "alpha";
    wallLimit?: number;
    wallDensity?: "compact" | "standard" | "cozy";
    wallSort?: "visits" | "recent" | "alpha";
    folderId?: string;
    onlyFavorites?: boolean;
    onlyAlive?: boolean;
    excludeArchived?: boolean;
  };
}

export const CLASSIC_CHART_PRESETS = [
  {
    id: "top_domains_visits",
    label: "Top Domains (Visits)",
    desc: "Ranked horizontal bars of most visited domains",
    chartType: "horizontal_bar" as VizChartType,
    dimension: "domain" as VizDimension,
    measure: "sum_visits" as VizMeasure,
    limit: 10,
    otherBucket: true,
    sort: { by: "measure" as const, direction: "desc" as const },
  },
  {
    id: "collection_share_donut",
    label: "Collection Share",
    desc: "Proportional donut chart of bookmarks by top folder",
    chartType: "donut" as VizChartType,
    dimension: "folder_top" as VizDimension,
    measure: "count" as VizMeasure,
    limit: 7,
    otherBucket: true,
    sort: { by: "measure" as const, direction: "desc" as const },
  },
  {
    id: "monthly_velocity_area",
    label: "Monthly Ingestion",
    desc: "Cumulative bookmark ingestion momentum over months",
    chartType: "area" as VizChartType,
    dimension: "created_month" as VizDimension,
    measure: "count" as VizMeasure,
    limit: 12,
    otherBucket: false,
    sort: { by: "dimension" as const, direction: "asc" as const },
  },
  {
    id: "link_health_status",
    label: "Link Health Status",
    desc: "Breakdown of alive, unreachable, and broken sites",
    chartType: "donut" as VizChartType,
    dimension: "status" as VizDimension,
    measure: "count" as VizMeasure,
    limit: 5,
    otherBucket: false,
    sort: { by: "measure" as const, direction: "desc" as const },
  },
  {
    id: "visit_intensity_tiers",
    label: "Visit Intensity Tiers",
    desc: "Distribution across heavy, active, and light usage",
    chartType: "bar" as VizChartType,
    dimension: "visit_count_bucket" as VizDimension,
    measure: "count" as VizMeasure,
    limit: 5,
    otherBucket: false,
    sort: { by: "dimension" as const, direction: "asc" as const },
  },
  {
    id: "tag_frequency_bars",
    label: "Tag Frequency",
    desc: "Most frequent bookmark tags in the workspace",
    chartType: "bar" as VizChartType,
    dimension: "tag" as VizDimension,
    measure: "count" as VizMeasure,
    limit: 8,
    otherBucket: true,
    sort: { by: "measure" as const, direction: "desc" as const },
  },
  {
    id: "domain_diversity_stacked",
    label: "Folder Domain Diversity",
    desc: "Unique domains per folder split by favorite star",
    chartType: "stacked_bar" as VizChartType,
    dimension: "folder_top" as VizDimension,
    measure: "distinct_domains" as VizMeasure,
    splitBy: "favorite" as VizSplitByDimension,
    limit: 8,
    otherBucket: true,
    sort: { by: "measure" as const, direction: "desc" as const },
  },
  {
    id: "weekly_wave_line",
    label: "Weekly Trend Wave",
    desc: "Smooth activity line across weekly intervals",
    chartType: "line" as VizChartType,
    dimension: "created_week" as VizDimension,
    measure: "count" as VizMeasure,
    limit: 14,
    otherBucket: false,
    sort: { by: "dimension" as const, direction: "asc" as const },
  },
];

export const INTEL_PRESETS = [
  {
    id: "topic_cloud",
    label: "Active Topic Cloud",
    desc: "Interactive weighted tag pills with direct click filtering",
    type: "tags" as const,
    tagLimit: 30,
    minTagCount: 1,
    tagSort: "count" as const,
  },
  {
    id: "engagement_spectrum",
    label: "Engagement Spectrum",
    desc: "Frequent, active, occasional, and dormant visit tiers",
    type: "engagement" as const,
    excludeArchived: true,
  },
  {
    id: "starred_wall",
    label: "Starred Favicons Constellation",
    desc: "Grid of your favorite websites and platforms",
    type: "wall" as const,
    onlyFavorites: true,
    wallLimit: 48,
    wallSort: "visits" as const,
  },
  {
    id: "deep_graph",
    label: "Architecture Knowledge Graph",
    desc: "Interactive physics network of interconnected collections",
    type: "graph" as const,
    graphDepth: 2,
  },
  {
    id: "density_wall",
    label: "High-Density Favicon Wall",
    desc: "Maximum density matrix of most visited web destinations",
    type: "wall" as const,
    wallLimit: 72,
    wallSort: "visits" as const,
  },
];

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

  // Adaptive Resizable Modal state with custom width & height persisted
  const {
    format: modalFormat,
    toggleFormat: toggleModalFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "universal_visual_builder",
    defaultVerticalWidth: 720,
    defaultHorizontalWidth: 1080,
    defaultVerticalHeight: 680,
    defaultHorizontalHeight: 660,
    minWidth: 500,
    minHeight: 420,
  });

  // Target Destination Selector State (defaulted to caller's context)
  const [targetDestination, setTargetDestination] = React.useState<string>(() => {
    if (destinationName?.toLowerCase().includes("home")) return "home";
    if (destinationName?.toLowerCase().includes("visual")) return "visuals";
    if (destinationName?.toLowerCase().includes("universal")) return "universal_folders";
    return destinationName || "home";
  });

  React.useEffect(() => {
    if (open) {
      if (destinationName?.toLowerCase().includes("home")) setTargetDestination("home");
      else if (destinationName?.toLowerCase().includes("visual")) setTargetDestination("visuals");
      else if (destinationName?.toLowerCase().includes("universal")) setTargetDestination("universal_folders");
      else setTargetDestination(destinationName || "home");
    }
  }, [open, destinationName]);

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
  const [chartDimension, setChartDimension] = React.useState<VizDimension>(
    initialConfig?.chartConfig?.dimension || "domain"
  );
  const [chartMeasure, setChartMeasure] = React.useState<VizMeasure>(
    initialConfig?.chartConfig?.measure || "count"
  );
  const [chartSplitBy, setChartSplitBy] = React.useState<VizSplitByDimension | "none">(
    initialConfig?.chartConfig?.splitBy || "none"
  );
  const [chartSortBy, setChartSortBy] = React.useState<"measure" | "dimension">(
    initialConfig?.chartConfig?.sort?.by || "measure"
  );
  const [chartSortDir, setChartSortDir] = React.useState<"desc" | "asc">(
    initialConfig?.chartConfig?.sort?.direction || "desc"
  );
  const [chartLimit, setChartLimit] = React.useState<number>(
    initialConfig?.chartConfig?.limit ?? 10
  );
  const [chartOtherBucket, setChartOtherBucket] = React.useState<boolean>(
    initialConfig?.chartConfig?.otherBucket ?? true
  );
  const [chartShowGrid, setChartShowGrid] = React.useState<boolean>(
    initialConfig?.chartConfig?.displayOptions?.showGrid ?? true
  );
  const [chartShowLegend, setChartShowLegend] = React.useState<boolean>(
    initialConfig?.chartConfig?.displayOptions?.showLegend ?? true
  );
  const [chartUnitLabel, setChartUnitLabel] = React.useState<string>(
    initialConfig?.chartConfig?.displayOptions?.unitLabel || ""
  );
  const [chartValuePrefix, setChartValuePrefix] = React.useState<string>(
    initialConfig?.chartConfig?.displayOptions?.valuePrefix || ""
  );
  const [chartValueSuffix, setChartValueSuffix] = React.useState<string>(
    initialConfig?.chartConfig?.displayOptions?.valueSuffix || ""
  );
  // Classic Chart Filters
  const [chartFilterFolderId, setChartFilterFolderId] = React.useState<string>(
    initialConfig?.chartConfig?.filters?.folderId || "all"
  );
  const [chartFilterIncludeSubfolders, setChartFilterIncludeSubfolders] = React.useState<boolean>(
    initialConfig?.chartConfig?.filters?.includeSubfolders ?? true
  );
  const [chartFilterFavorite, setChartFilterFavorite] = React.useState<"all" | "favorites_only">(
    initialConfig?.chartConfig?.filters?.favorite ? "favorites_only" : "all"
  );
  const [chartFilterStatus, setChartFilterStatus] = React.useState<"all" | "alive" | "broken">(
    initialConfig?.chartConfig?.filters?.status?.includes("alive")
      ? "alive"
      : initialConfig?.chartConfig?.filters?.status?.length
        ? "broken"
        : "all"
  );
  const [chartFilterDateRange, setChartFilterDateRange] = React.useState<"all" | "24h" | "7d" | "30d" | "90d" | "1y">("all");
  const [chartFilterSearch, setChartFilterSearch] = React.useState<string>(
    initialConfig?.chartConfig?.filters?.searchQuery || ""
  );
  const [chartFilterExcludeArchived, setChartFilterExcludeArchived] = React.useState<boolean>(
    !(initialConfig?.chartConfig?.filters?.includeArchived ?? false)
  );

  // 4. Intelligence Visual State
  const [intelType, setIntelType] = React.useState<"tags" | "engagement" | "wall" | "graph" | "heatmap">(
    initialConfig?.intelConfig?.type || "tags"
  );
  const [intelScopeFolderId, setIntelScopeFolderId] = React.useState<string>(
    initialConfig?.intelConfig?.folderId || "all"
  );
  const [intelGraphDepth, setIntelGraphDepth] = React.useState<number>(
    initialConfig?.intelConfig?.graphDepth ?? 2
  );
  const [intelTagLimit, setIntelTagLimit] = React.useState<number>(
    initialConfig?.intelConfig?.tagLimit ?? 30
  );
  const [intelMinTagCount, setIntelMinTagCount] = React.useState<number>(
    initialConfig?.intelConfig?.minTagCount ?? 1
  );
  const [intelTagSort, setIntelTagSort] = React.useState<"count" | "alpha">(
    initialConfig?.intelConfig?.tagSort || "count"
  );
  const [intelWallLimit, setIntelWallLimit] = React.useState<number>(
    initialConfig?.intelConfig?.wallLimit ?? 48
  );
  const [intelWallSort, setIntelWallSort] = React.useState<"visits" | "recent" | "alpha">(
    initialConfig?.intelConfig?.wallSort || "visits"
  );
  const [intelWallDensity, setIntelWallDensity] = React.useState<"compact" | "standard" | "cozy">(
    initialConfig?.intelConfig?.wallDensity || "standard"
  );
  const [intelOnlyFavorites, setIntelOnlyFavorites] = React.useState<boolean>(
    initialConfig?.intelConfig?.onlyFavorites || false
  );
  const [intelOnlyAlive, setIntelOnlyAlive] = React.useState<boolean>(
    initialConfig?.intelConfig?.onlyAlive || false
  );
  const [intelExcludeArchived, setIntelExcludeArchived] = React.useState<boolean>(
    initialConfig?.intelConfig?.excludeArchived ?? true
  );

  // Quick Preset Handlers
  const handleApplyClassicPreset = (preset: (typeof CLASSIC_CHART_PRESETS)[number]) => {
    setTitle(preset.label);
    setChartType(preset.chartType);
    setChartDimension(preset.dimension);
    setChartMeasure(preset.measure);
    setChartSplitBy(preset.splitBy || "none");
    setChartLimit(preset.limit);
    setChartOtherBucket(preset.otherBucket);
    setChartSortBy(preset.sort.by);
    setChartSortDir(preset.sort.direction);
  };

  const handleApplyIntelPreset = (preset: (typeof INTEL_PRESETS)[number]) => {
    setTitle(preset.label);
    setIntelType(preset.type);
    if ("tagLimit" in preset && preset.tagLimit) setIntelTagLimit(preset.tagLimit);
    if ("minTagCount" in preset && preset.minTagCount) setIntelMinTagCount(preset.minTagCount);
    if ("tagSort" in preset && preset.tagSort) setIntelTagSort(preset.tagSort);
    if ("wallLimit" in preset && preset.wallLimit) setIntelWallLimit(preset.wallLimit);
    if ("wallSort" in preset && preset.wallSort) setIntelWallSort(preset.wallSort);
    if ("graphDepth" in preset && preset.graphDepth) setIntelGraphDepth(preset.graphDepth);
    if ("onlyFavorites" in preset && preset.onlyFavorites !== undefined) setIntelOnlyFavorites(preset.onlyFavorites);
    if ("excludeArchived" in preset && preset.excludeArchived !== undefined) setIntelExcludeArchived(preset.excludeArchived);
  };

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
        setChartDimension(initialConfig.chartConfig.dimension || "domain");
        setChartMeasure(initialConfig.chartConfig.measure || "count");
        setChartSplitBy(initialConfig.chartConfig.splitBy || "none");
        setChartSortBy(initialConfig.chartConfig.sort?.by || "measure");
        setChartSortDir(initialConfig.chartConfig.sort?.direction || "desc");
        setChartLimit(initialConfig.chartConfig.limit ?? 10);
        setChartOtherBucket(initialConfig.chartConfig.otherBucket ?? true);
        if (initialConfig.chartConfig.displayOptions) {
          setChartShowGrid(initialConfig.chartConfig.displayOptions.showGrid ?? true);
          setChartShowLegend(initialConfig.chartConfig.displayOptions.showLegend ?? true);
          setChartUnitLabel(initialConfig.chartConfig.displayOptions.unitLabel || "");
          setChartValuePrefix(initialConfig.chartConfig.displayOptions.valuePrefix || "");
          setChartValueSuffix(initialConfig.chartConfig.displayOptions.valueSuffix || "");
        }
        if (initialConfig.chartConfig.filters) {
          setChartFilterFolderId(initialConfig.chartConfig.filters.folderId || "all");
          setChartFilterIncludeSubfolders(initialConfig.chartConfig.filters.includeSubfolders ?? true);
          setChartFilterFavorite(initialConfig.chartConfig.filters.favorite ? "favorites_only" : "all");
          if (initialConfig.chartConfig.filters.status?.includes("alive")) setChartFilterStatus("alive");
          else if (initialConfig.chartConfig.filters.status?.length) setChartFilterStatus("broken");
          else setChartFilterStatus("all");
          setChartFilterSearch(initialConfig.chartConfig.filters.searchQuery || "");
          setChartFilterExcludeArchived(!(initialConfig.chartConfig.filters.includeArchived ?? false));
        }
      }
      if (initialConfig.intelConfig) {
        setIntelType(initialConfig.intelConfig.type || "tags");
        if (initialConfig.intelConfig.folderId) setIntelScopeFolderId(initialConfig.intelConfig.folderId);
        if (initialConfig.intelConfig.graphDepth) setIntelGraphDepth(initialConfig.intelConfig.graphDepth);
        if (initialConfig.intelConfig.tagLimit) setIntelTagLimit(initialConfig.intelConfig.tagLimit);
        if (initialConfig.intelConfig.minTagCount) setIntelMinTagCount(initialConfig.intelConfig.minTagCount);
        if (initialConfig.intelConfig.tagSort) setIntelTagSort(initialConfig.intelConfig.tagSort);
        if (initialConfig.intelConfig.wallLimit) setIntelWallLimit(initialConfig.intelConfig.wallLimit);
        if (initialConfig.intelConfig.wallSort) setIntelWallSort(initialConfig.intelConfig.wallSort);
        if (initialConfig.intelConfig.wallDensity) setIntelWallDensity(initialConfig.intelConfig.wallDensity);
        if (initialConfig.intelConfig.onlyFavorites !== undefined) setIntelOnlyFavorites(initialConfig.intelConfig.onlyFavorites);
        if (initialConfig.intelConfig.onlyAlive !== undefined) setIntelOnlyAlive(initialConfig.intelConfig.onlyAlive);
        if (initialConfig.intelConfig.excludeArchived !== undefined) setIntelExcludeArchived(initialConfig.intelConfig.excludeArchived);
      }
    }
  }, [initialConfig, folders]);

  // Cross-destination visual dispatcher
  const dispatchToDestination = (config: UniversalVisualConfig) => {
    onSave(config);

    if (typeof window !== "undefined") {
      try {
        if (targetDestination === "home") {
          const stored = localStorage.getItem("markly_workspace_dashboard_widgets");
          const list = stored ? JSON.parse(stored) : [];
          if (!list.some((w: any) => w.id === config.id)) {
            list.push({
              id: config.id,
              label: config.title,
              visible: true,
              kind: "custom",
              colSpan: config.colSpan || 12,
              rowSpan: config.rowSpan || 2,
              icon: config.icon,
              color: config.color,
              category: config.category,
              vizConfig: {
                id: config.id,
                title: config.title,
                chartType: config.category === "plot" ? "plot" : "bar",
                plotConfig: config.plotConfig,
                chartConfig: config.chartConfig,
                intelConfig: config.intelConfig,
                siteConfig: config.siteConfig,
              },
            });
            localStorage.setItem("markly_workspace_dashboard_widgets", JSON.stringify(list));
            window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
          }
        } else if (targetDestination === "universal_folders") {
          const stored = localStorage.getItem("markly_universal_visual_tabs");
          let tabs = stored ? JSON.parse(stored) : [];
          if (!Array.isArray(tabs) || tabs.length === 0) {
            tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
          }
          if (!tabs[0].visuals.some((v: any) => v.id === config.id)) {
            tabs[0].visuals.push({
              id: config.id,
              title: config.title,
              kind: config.category === "plot" ? "plot_studio" : config.category,
              colSpan: config.colSpan || 12,
              rowSpan: config.rowSpan || 2,
              plotConfig: config.plotConfig,
              chartConfig: config.chartConfig,
              intelConfig: config.intelConfig,
              siteConfig: config.siteConfig,
            });
            localStorage.setItem("markly_universal_visual_tabs", JSON.stringify(tabs));
            window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: tabs }));
            window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
          }
        } else if (targetDestination.startsWith("folder:")) {
          const folderId = targetDestination.replace("folder:", "");
          const storageKey = `markly_folder_visuals_${folderId}`;
          const stored = localStorage.getItem(storageKey);
          let visuals = stored ? JSON.parse(stored) : [];
          if (!visuals.some((v: any) => v.id === config.id)) {
            visuals.push({
              id: config.id,
              title: config.title,
              kind: config.category === "plot" ? "plot_studio" : config.category,
              colSpan: config.colSpan || 12,
              rowSpan: config.rowSpan || 2,
              plotConfig: config.plotConfig,
              chartConfig: config.chartConfig,
              intelConfig: config.intelConfig,
              siteConfig: config.siteConfig,
            });
            localStorage.setItem(storageKey, JSON.stringify(visuals));
            window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
          }
        }
      } catch (err) {
        console.error("dispatchToDestination error:", err);
      }
    }
  };

  // One-Click Sample Studio Builders for testing all variations together
  const handlePlaceSamplePlotStudio = () => {
    dispatchToDestination({
      id: "studio_observable_plot",
      title: "Observable Plot Layered Graphics Studio (22 Variations)",
      category: "plot",
      colSpan: 12,
      rowSpan: 2,
      icon: "activity",
      color: "#06b6d4",
      plotConfig: {
        type: "barX",
        dimension: "domain",
        measure: "count",
        colorScheme: "tableau10",
        curve: "natural",
        showGrid: true,
        showTip: true,
        showLegend: true,
        crosshair: true,
      },
    });
    try {
      const stored = localStorage.getItem("markly_hidden_visual_studio_units");
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((id: string) => id !== "studio_observable_plot");
        localStorage.setItem("markly_hidden_visual_studio_units", JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent("markly-unhide-studio-unit", { detail: { id: "studio_observable_plot" } }));
      }
    } catch {}
    onOpenChange(false);
  };

  const handlePlaceSampleChartStudio = () => {
    dispatchToDestination({
      id: `studio_classic_charts_${Date.now()}`,
      title: "Complete Classic Charts Studio",
      category: "chart",
      colSpan: 12,
      rowSpan: 2,
      icon: "bar-chart-3",
      color: "#3b82f6",
      chartConfig: {
        version: 1,
        id: `studio_classic_charts_${Date.now()}`,
        title: "Complete Classic Charts Studio",
        chartType: "bar",
        dimension: "domain",
        measure: "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: 10,
        otherBucket: true,
      },
    });
    onOpenChange(false);
  };

  const handlePlaceSampleIntelSuite = () => {
    dispatchToDestination({
      id: `studio_intel_suite_${Date.now()}`,
      title: "Workspace Intelligence Suite",
      category: "intel",
      colSpan: 12,
      rowSpan: 2,
      icon: "layers",
      color: "#8b5cf6",
      intelConfig: {
        type: "graph",
        graphDepth: 2,
      },
    });
    onOpenChange(false);
  };

  const handlePlaceSampleSitesMatrix = () => {
    dispatchToDestination({
      id: `studio_sites_matrix_${Date.now()}`,
      title: "Multi-Source Sites Matrix",
      category: "sites",
      colSpan: 12,
      rowSpan: 2,
      icon: "compass",
      color: "#10b981",
      siteConfig: {
        source: "all",
        limit: "all",
        viewMode: "grid",
        sortBy: "recent",
      },
    });
    onOpenChange(false);
  };

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

  // Compute live config for Classic Chart Preview
  const previewChartConfig: VizConfig = React.useMemo(() => {
    const filters: any = {};
    if (chartFilterFolderId !== "all") {
      filters.folderId = chartFilterFolderId;
      filters.includeSubfolders = chartFilterIncludeSubfolders;
    }
    if (chartFilterFavorite === "favorites_only") {
      filters.favorite = true;
    }
    if (chartFilterStatus === "alive") {
      filters.status = ["alive"];
    } else if (chartFilterStatus === "broken") {
      filters.status = ["broken", "error", "unreachable"];
    }
    if (chartFilterDateRange !== "all") {
      const now = Date.now();
      const days =
        chartFilterDateRange === "24h"
          ? 1
          : chartFilterDateRange === "7d"
            ? 7
            : chartFilterDateRange === "30d"
              ? 30
              : chartFilterDateRange === "90d"
                ? 90
                : 365;
      filters.dateRangeField = "created";
      filters.dateAfter = now - days * 24 * 60 * 60 * 1000;
    }
    if (chartFilterSearch.trim()) {
      filters.searchQuery = chartFilterSearch.trim();
    }
    filters.includeArchived = !chartFilterExcludeArchived;

    return {
      version: 1,
      id: "preview_chart",
      title: title || "Classic Chart Preview",
      chartType,
      dimension: chartDimension,
      splitBy: chartSplitBy === "none" ? undefined : chartSplitBy,
      measure: chartMeasure,
      filters,
      sort: { by: chartSortBy, direction: chartSortDir },
      limit: chartLimit,
      otherBucket: chartOtherBucket,
      displayOptions: {
        showGrid: chartShowGrid,
        showLegend: chartShowLegend,
        unitLabel: chartUnitLabel || undefined,
        valuePrefix: chartValuePrefix || undefined,
        valueSuffix: chartValueSuffix || undefined,
      },
    };
  }, [
    title,
    chartType,
    chartDimension,
    chartMeasure,
    chartSplitBy,
    chartSortBy,
    chartSortDir,
    chartLimit,
    chartOtherBucket,
    chartShowGrid,
    chartShowLegend,
    chartUnitLabel,
    chartValuePrefix,
    chartValueSuffix,
    chartFilterFolderId,
    chartFilterIncludeSubfolders,
    chartFilterFavorite,
    chartFilterStatus,
    chartFilterDateRange,
    chartFilterSearch,
    chartFilterExcludeArchived,
  ]);

  // Compute filtered bookmarks for Intelligence Live Preview
  const filteredIntelBookmarks = React.useMemo(() => {
    let list = bookmarks;
    if (intelScopeFolderId !== "all") {
      list = list.filter((b) => b.folderId === intelScopeFolderId);
    }
    if (intelOnlyFavorites) {
      list = list.filter((b) => b.isFavorite);
    }
    if (intelOnlyAlive) {
      list = list.filter((b) => b.status === "alive");
    }
    if (intelExcludeArchived) {
      list = list.filter((b) => !b.isArchived);
    }
    return list;
  }, [bookmarks, intelScopeFolderId, intelOnlyFavorites, intelOnlyAlive, intelExcludeArchived]);

  // Compute live tags for intel preview
  const liveIntelTags = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of filteredIntelBookmarks) {
      if (Array.isArray(b.tags)) {
        for (const t of b.tags as any[]) {
          const rawName = typeof t === "string" ? t : t?.name;
          if (rawName && typeof rawName === "string") {
            const clean = rawName.trim().toLowerCase();
            if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
          }
        }
      }
    }
    let list = Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }));
    list = list.filter((x) => x.count >= intelMinTagCount);
    if (intelTagSort === "count") {
      list.sort((a, b) => b.count - a.count);
    } else {
      list.sort((a, b) => a.tag.localeCompare(b.tag));
    }
    return list.slice(0, intelTagLimit);
  }, [filteredIntelBookmarks, intelMinTagCount, intelTagSort, intelTagLimit]);

  // Compute live engagement tiers for intel preview
  const liveIntelEngagement = React.useMemo(() => {
    let frequent = 0;
    let active = 0;
    let occasional = 0;
    let dormant = 0;
    for (const b of filteredIntelBookmarks) {
      const v = b.visitCount || 0;
      if (v >= 21) frequent++;
      else if (v >= 6) active++;
      else if (v >= 1) occasional++;
      else dormant++;
    }
    const total = filteredIntelBookmarks.length || 1;
    return [
      { key: "frequent", label: "Frequent (21+ visits)", count: frequent, pct: Math.round((frequent / total) * 100), color: "#3b82f6" },
      { key: "active", label: "Active (6-20 visits)", count: active, pct: Math.round((active / total) * 100), color: "#10b981" },
      { key: "occasional", label: "Occasional (1-5 visits)", count: occasional, pct: Math.round((occasional / total) * 100), color: "#f59e0b" },
      { key: "dormant", label: "Dormant (0 visits)", count: dormant, pct: Math.round((dormant / total) * 100), color: "#64748b" },
    ];
  }, [filteredIntelBookmarks]);

  // Compute live wall bookmarks for intel preview
  const liveIntelWall = React.useMemo(() => {
    let list = [...filteredIntelBookmarks];
    if (intelWallSort === "visits") {
      list.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    } else if (intelWallSort === "recent") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      list.sort((a, b) => (a.title || a.domain || "").localeCompare(b.title || b.domain || ""));
    }
    return list.slice(0, intelWallLimit);
  }, [filteredIntelBookmarks, intelWallSort, intelWallLimit]);

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
      const filters: any = {};
      if (chartFilterFolderId !== "all") {
        filters.folderId = chartFilterFolderId;
        filters.includeSubfolders = chartFilterIncludeSubfolders;
      }
      if (chartFilterFavorite === "favorites_only") {
        filters.favorite = true;
      }
      if (chartFilterStatus === "alive") {
        filters.status = ["alive"];
      } else if (chartFilterStatus === "broken") {
        filters.status = ["broken", "error", "unreachable"];
      }
      if (chartFilterDateRange !== "all") {
        const now = Date.now();
        const days =
          chartFilterDateRange === "24h"
            ? 1
            : chartFilterDateRange === "7d"
              ? 7
              : chartFilterDateRange === "30d"
                ? 30
                : chartFilterDateRange === "90d"
                  ? 90
                  : 365;
        filters.dateRangeField = "created";
        filters.dateAfter = now - days * 24 * 60 * 60 * 1000;
      }
      if (chartFilterSearch.trim()) {
        filters.searchQuery = chartFilterSearch.trim();
      }
      filters.includeArchived = !chartFilterExcludeArchived;

      builtConfig.chartConfig = {
        version: 1,
        id: finalId,
        title: title.trim() || "Classic Chart",
        chartType,
        dimension: chartDimension,
        splitBy: chartSplitBy === "none" ? undefined : chartSplitBy,
        measure: chartMeasure,
        filters,
        sort: { by: chartSortBy, direction: chartSortDir },
        limit: chartLimit,
        otherBucket: chartOtherBucket,
        displayOptions: {
          showGrid: chartShowGrid,
          showLegend: chartShowLegend,
          unitLabel: chartUnitLabel || undefined,
          valuePrefix: chartValuePrefix || undefined,
          valueSuffix: chartValueSuffix || undefined,
        },
      };
    } else if (activeTab === "intel") {
      builtConfig.intelConfig = {
        type: intelType,
        folderId: intelScopeFolderId !== "all" ? intelScopeFolderId : undefined,
        graphDepth: intelGraphDepth,
        tagLimit: intelTagLimit,
        minTagCount: intelMinTagCount,
        tagSort: intelTagSort,
        wallLimit: intelWallLimit,
        wallSort: intelWallSort,
        wallDensity: intelWallDensity,
        onlyFavorites: intelOnlyFavorites,
        onlyAlive: intelOnlyAlive,
        excludeArchived: intelExcludeArchived,
      };
    }

    dispatchToDestination(builtConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl max-w-[98vw] max-h-[96vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        {/* Header with Title Input, Universal Icon Picker, and Universal Color Picker */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border bg-secondary/30 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background border border-border shadow-2xs">
                {/* Universal Icon Picker */}
                <UniversalIconPicker
                  icon={icon}
                  color={color}
                  onChange={setIcon}
                  label="Choose visual icon"
                  compact={true}
                />
                {/* Universal Color Picker */}
                <UniversalColorPicker
                  color={color}
                  onChange={setColor}
                  label="Choose visual accent color"
                  compact={true}
                />
              </div>
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

            {/* Layout Column Span, Row Span Control & Modal Controls */}
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

              {/* Restore size button */}
              {hasCustomSize && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  title="Restore default modal size"
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Layout format toggle */}
              <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => toggleModalFormat("vertical")}
                  title="Vertical stacked layout"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${modalFormat === "vertical"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Rows2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleModalFormat("horizontal")}
                  title="Horizontal side-by-side layout"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${modalFormat === "horizontal"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                </button>
              </div>
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
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 ${
            modalFormat === "vertical"
              ? "flex flex-col gap-6"
              : "grid grid-cols-1 lg:grid-cols-12 gap-6"
          }`}
        >
          {/* Left Column: Category Specific Configuration Controls */}
          <div className={modalFormat === "vertical" ? "w-full space-y-4" : "lg:col-span-5 space-y-4 pr-1"}>
            {/* 1. SITES REFERENCE BOX CONFIGURATION */}
            {activeTab === "sites" && (
              <div className="space-y-3.5 animate-in fade-in">
                {/* One-Click Sample Studio Unit Action */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePlaceSampleSitesMatrix}
                  className="w-full text-xs h-9 border-dashed border-emerald-500/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-2 font-semibold cursor-pointer shadow-2xs"
                >
                  <Compass className="h-4 w-4 text-emerald-500" />
                  <span>🧪 Try All Patterns: Multi-Source Sites Matrix (All Sources & Layouts)</span>
                </Button>
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
                {/* One-Click Sample Studio Unit Action */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePlaceSamplePlotStudio}
                  className="w-full text-xs h-9 border-dashed border-cyan-500/60 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 gap-2 font-semibold cursor-pointer shadow-2xs"
                >
                  <Activity className="h-4 w-4 text-cyan-500" />
                  <span>🧪 Try All Patterns: 34 Marks ObservableHQ Layered Studio (Single Box)</span>
                </Button>
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
                {/* One-Click Sample Studio Unit Action */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePlaceSampleChartStudio}
                  className="w-full text-xs h-9 border-dashed border-blue-500/60 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 gap-2 font-semibold cursor-pointer shadow-2xs"
                >
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span>🧪 Try All Patterns: Complete Classic Charts Studio (Bars, Lines, Donuts, Areas)</span>
                </Button>
                {/* Widely Used Presets & Recipes */}
                <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Widely Used Presets & Quick Recipes</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {CLASSIC_CHART_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyClassicPreset(p)}
                        className="p-1.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-secondary/60 text-left transition-colors cursor-pointer group"
                        title={p.desc}
                      >
                        <div className="text-[11px] font-medium text-foreground group-hover:text-primary truncate">
                          {p.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">
                          {p.chartType} • {p.dimension}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. Chart Format */}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Chart Format
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "bar" as const, label: "Column", icon: BarChart3 },
                      { id: "horizontal_bar" as const, label: "Ranked Bar", icon: BarChart3 },
                      { id: "donut" as const, label: "Donut", icon: PieChart },
                      { id: "area" as const, label: "Area Trend", icon: AreaChart },
                      { id: "line" as const, label: "Line", icon: LineChart },
                      { id: "stacked_bar" as const, label: "Stacked", icon: BarChart3 },
                      { id: "number" as const, label: "Metric Stat", icon: Activity },
                      { id: "table" as const, label: "Summary", icon: Layers },
                    ].map((c) => {
                      const IconC = c.icon;
                      const isSel = chartType === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setChartType(c.id)}
                          className={`p-2 rounded-xl border text-center cursor-pointer transition-colors flex flex-col items-center gap-1 ${isSel
                            ? "bg-primary/10 border-primary text-primary font-semibold shadow-2xs"
                            : "bg-background border-border hover:bg-secondary text-muted-foreground"
                            }`}
                        >
                          <IconC className="h-4 w-4" />
                          <span className="text-[11px] truncate w-full">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Primary Dimension (X) & Metric (Y) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Primary Dimension (X)
                    </label>
                    <select
                      value={chartDimension}
                      onChange={(e) => setChartDimension(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-medium"
                    >
                      <optgroup label="Taxonomy & Collections">
                        <option value="domain">Web Domain (root)</option>
                        <option value="folder_top">Top Folder Collection</option>
                        <option value="folder_leaf">Immediate Subfolder</option>
                        <option value="tag">Primary Tag / Topic</option>
                      </optgroup>
                      <optgroup label="Temporal Intervals">
                        <option value="created_month">Month Ingested (YYYY-MM)</option>
                        <option value="created_week">Week Ingested</option>
                        <option value="created_day">Day Created</option>
                        <option value="created_year">Year Created</option>
                        <option value="last_opened_date">Last Opened Date</option>
                      </optgroup>
                      <optgroup label="Metadata & Health">
                        <option value="status">Link Health Status</option>
                        <option value="favorite">Starred Favorite</option>
                        <option value="has_notes">Notes Attachment</option>
                        <option value="last_opened_bucket">Recency Tier</option>
                        <option value="visit_count_bucket">Visit Intensity Bucket</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Measure Metric (Y)
                    </label>
                    <select
                      value={chartMeasure}
                      onChange={(e) => setChartMeasure(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-medium"
                    >
                      <option value="count">Bookmark Count</option>
                      <option value="sum_visits">Total Visits (Sum)</option>
                      <option value="avg_visits">Average Visits / Site</option>
                      <option value="max_visits">Peak / Max Visits</option>
                      <option value="distinct_domains">Unique Domain Count</option>
                      <option value="percent_of_total">% Share of Total</option>
                    </select>
                  </div>
                </div>

                {/* 3. Secondary Split / Stacking Dimension (splitBy) & Sort Order */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Multi-Series Group (Split By)
                    </label>
                    <select
                      value={chartSplitBy}
                      onChange={(e) => setChartSplitBy(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="none">None (Single Series)</option>
                      <option value="folder_top">Folder Collection</option>
                      <option value="folder_leaf">Immediate Subfolder</option>
                      <option value="tag">Primary Tag</option>
                      <option value="domain">Web Domain</option>
                      <option value="status">Health Status</option>
                      <option value="favorite">Starred Favorite</option>
                      <option value="has_notes">Notes Presence</option>
                      <option value="last_opened_bucket">Recency Tier</option>
                      <option value="visit_count_bucket">Visit Intensity Tier</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Sort Direction & Ranking
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={chartSortBy}
                        onChange={(e) => setChartSortBy(e.target.value as any)}
                        className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="measure">By Value</option>
                        <option value="dimension">By Name</option>
                      </select>
                      <select
                        value={chartSortDir}
                        onChange={(e) => setChartSortDir(e.target.value as any)}
                        className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="desc">Desc (High→Low)</option>
                        <option value="asc">Asc (Low→High)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Limits & Tail Grouping */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Max Items Limit
                    </label>
                    <select
                      value={chartLimit}
                      onChange={(e) => setChartLimit(Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                    >
                      <option value="5">Top 5 Records</option>
                      <option value="8">Top 8 Records</option>
                      <option value="10">Top 10 Records</option>
                      <option value="15">Top 15 Records</option>
                      <option value="25">Top 25 Records</option>
                      <option value="50">Top 50 Records</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={chartOtherBucket}
                        onChange={(e) => setChartOtherBucket(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Group rest into &quot;Other&quot;</span>
                    </label>
                  </div>
                </div>

                {/* 5. Database Constraints & Query Filters */}
                <div className="p-3 rounded-xl border border-border/80 bg-secondary/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                      Database Query Constraints &amp; Filters
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">SQL Pre-aggregation</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Folder Collection Scope</label>
                      <select
                        value={chartFilterFolderId}
                        onChange={(e) => setChartFilterFolderId(e.target.value)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="all">All Folders (Workspace-wide)</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Date Ingested Range</label>
                      <select
                        value={chartFilterDateRange}
                        onChange={(e) => setChartFilterDateRange(e.target.value as any)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="all">All-Time Ingestion</option>
                        <option value="24h">Past 24 Hours</option>
                        <option value="7d">Past 7 Days</option>
                        <option value="30d">Past 30 Days</option>
                        <option value="90d">Past 90 Days</option>
                        <option value="1y">Past 1 Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">HTTP Link Health</label>
                      <select
                        value={chartFilterStatus}
                        onChange={(e) => setChartFilterStatus(e.target.value as any)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="all">All Links (Any Status)</option>
                        <option value="alive">Verified Alive (200 OK)</option>
                        <option value="broken">Broken / Error Sites</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Favorites Scope</label>
                      <select
                        value={chartFilterFavorite}
                        onChange={(e) => setChartFilterFavorite(e.target.value as any)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="all">All Sites (Starred &amp; Standard)</option>
                        <option value="favorites_only">⭐ Starred Favorites Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Toggles */}
                  <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/40 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={chartFilterIncludeSubfolders}
                        onChange={(e) => setChartFilterIncludeSubfolders(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Include Subfolders</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={chartFilterExcludeArchived}
                        onChange={(e) => setChartFilterExcludeArchived(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Exclude Archived</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={chartShowGrid}
                        onChange={(e) => setChartShowGrid(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Gridlines</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={chartShowLegend}
                        onChange={(e) => setChartShowLegend(e.target.checked)}
                        className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                      />
                      <span>Color Legend</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. WORKSPACE INTELLIGENCE CONFIGURATION */}
            {activeTab === "intel" && (
              <div className="space-y-3.5 animate-in fade-in">
                {/* One-Click Sample Studio Unit Action */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePlaceSampleIntelSuite}
                  className="w-full text-xs h-9 border-dashed border-purple-500/60 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 gap-2 font-semibold cursor-pointer shadow-2xs"
                >
                  <Layers className="h-4 w-4 text-purple-500" />
                  <span>🧪 Try All Patterns: Full Intelligence Suite (Knowledge Graph, Tag Cloud, Wall)</span>
                </Button>
                {/* Widely Used Presets */}
                <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Intelligence Presets &amp; Architecture Layouts</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {INTEL_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyIntelPreset(p)}
                        className="p-1.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-secondary/60 text-left transition-colors cursor-pointer group"
                        title={p.desc}
                      >
                        <div className="text-[11px] font-medium text-foreground group-hover:text-primary truncate">
                          {p.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">
                          {p.type.toUpperCase()} module
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. Intelligence Engine */}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Intelligence Engine
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "tags" as const, label: "Tag Frequency & Cloud", desc: "Interactive weighted topic cloud with direct click filtering", icon: Tag },
                      { id: "engagement" as const, label: "Engagement Spectrum", desc: "Frequent, active, occasional, and dormant visit tiers", icon: TrendingUp },
                      { id: "wall" as const, label: "Visual Favicon Wall", desc: "High-density matrix of site favicons and quick links", icon: LayoutGrid },
                      { id: "graph" as const, label: "Knowledge Graph", desc: "Physics network graph connecting folders and domains", icon: Layers },
                    ].map((item) => {
                      const IconI = item.icon;
                      const isSel = intelType === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIntelType(item.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors flex items-start gap-2.5 ${isSel
                            ? "bg-primary/10 border-primary text-foreground shadow-2xs"
                            : "bg-background border-border hover:bg-secondary text-muted-foreground"
                            }`}
                        >
                          <IconI className={`h-4 w-4 mt-0.5 ${isSel ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Engine-Specific Constraints & Deep Fields */}
                {intelType === "tags" && (
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-border/80 bg-secondary/15">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Max Tags Limit</label>
                      <select
                        value={intelTagLimit}
                        onChange={(e) => setIntelTagLimit(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="15">Top 15 Tags</option>
                        <option value="30">Top 30 Tags</option>
                        <option value="50">Top 50 Tags</option>
                        <option value="100">Top 100 Tags</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Min Tag Count</label>
                      <select
                        value={intelMinTagCount}
                        onChange={(e) => setIntelMinTagCount(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="1">1+ Sites (All Tags)</option>
                        <option value="2">2+ Sites (Recurring)</option>
                        <option value="3">3+ Sites (Frequent)</option>
                        <option value="5">5+ Sites (Clusters)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Sort Priority</label>
                      <select
                        value={intelTagSort}
                        onChange={(e) => setIntelTagSort(e.target.value as any)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="count">Most Frequent First</option>
                        <option value="alpha">Alphabetical A→Z</option>
                      </select>
                    </div>
                  </div>
                )}

                {intelType === "wall" && (
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-border/80 bg-secondary/15">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Max Favicons</label>
                      <select
                        value={intelWallLimit}
                        onChange={(e) => setIntelWallLimit(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="24">24 Sites</option>
                        <option value="48">48 Sites</option>
                        <option value="72">72 Sites</option>
                        <option value="120">120 Sites</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Sort Order</label>
                      <select
                        value={intelWallSort}
                        onChange={(e) => setIntelWallSort(e.target.value as any)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="visits">Most Visited</option>
                        <option value="recent">Recently Added</option>
                        <option value="alpha">Alphabetical Name</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Grid Density</label>
                      <select
                        value={intelWallDensity}
                        onChange={(e) => setIntelWallDensity(e.target.value as any)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="compact">Compact (High Density)</option>
                        <option value="standard">Standard Grid</option>
                        <option value="cozy">Cozy (Larger Icons)</option>
                      </select>
                    </div>
                  </div>
                )}

                {intelType === "graph" && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-border/80 bg-secondary/15">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Constellation Depth</label>
                      <select
                        value={intelGraphDepth}
                        onChange={(e) => setIntelGraphDepth(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer font-mono"
                      >
                        <option value="1">Depth 1 (Direct folder links)</option>
                        <option value="2">Depth 2 (Full folder-domain mesh)</option>
                        <option value="3">Depth 3 (Constellation constellation)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-3 text-[11px] text-muted-foreground">
                      <span>Physics force-directed spring simulation enabled</span>
                    </div>
                  </div>
                )}

                {/* 3. Database Constraints & Query Filters */}
                <div className="p-3 rounded-xl border border-border/80 bg-secondary/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                      Workspace Scope &amp; Site Constraints
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {filteredIntelBookmarks.length} matching sites
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Scope Collection</label>
                      <select
                        value={intelScopeFolderId}
                        onChange={(e) => setIntelScopeFolderId(e.target.value)}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs cursor-pointer"
                      >
                        <option value="all">Entire Workspace (All Collections)</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="flex items-center gap-3 pt-1 text-[11px]">
                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={intelOnlyFavorites}
                            onChange={(e) => setIntelOnlyFavorites(e.target.checked)}
                            className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                          />
                          <span>Only Starred</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={intelOnlyAlive}
                            onChange={(e) => setIntelOnlyAlive(e.target.checked)}
                            className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                          />
                          <span>Only Alive</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={intelExcludeArchived}
                            onChange={(e) => setIntelExcludeArchived(e.target.checked)}
                            className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                          />
                          <span>Exclude Archived</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Real-Time Live Preview */}
          <div className={`${modalFormat === "vertical" ? "w-full" : "lg:col-span-7"} flex flex-col rounded-2xl border border-border bg-background p-3.5 overflow-hidden shadow-inner`}>
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
                    config={previewChartConfig}
                    bookmarks={bookmarks}
                    folders={folders}
                    height={240}
                  />
                </div>
              )}

              {/* Intelligence Preview */}
              {activeTab === "intel" && (
                <div className="w-full">
                  {intelType === "graph" ? (
                    <div className="h-60 w-full rounded-xl overflow-hidden border border-border">
                      <KnowledgeGraph
                        mode={intelScopeFolderId !== "all" ? "folder" : "global"}
                        folderId={intelScopeFolderId !== "all" ? intelScopeFolderId : undefined}
                        depth={intelGraphDepth}
                        showControls={false}
                      />
                    </div>
                  ) : intelType === "tags" ? (
                    <div className="space-y-3 p-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>Tag Cloud ({liveIntelTags.length} tags shown)</span>
                        <span>Min count: {intelMinTagCount}+</span>
                      </div>
                      {liveIntelTags.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          No tags match the selected criteria.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-1">
                          {liveIntelTags.map((t, idx) => (
                            <span
                              key={t.tag}
                              className="px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-border flex items-center gap-1.5 transition-colors"
                              style={{
                                backgroundColor: idx % 2 === 0 ? `${color}18` : undefined,
                                borderColor: idx % 2 === 0 ? `${color}40` : undefined,
                                color: idx % 2 === 0 ? color : undefined,
                              }}
                            >
                              <span>#{t.tag}</span>
                              <span className="text-[10px] opacity-75 font-bold font-mono">({t.count})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : intelType === "engagement" ? (
                    <div className="space-y-3 p-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>Engagement Spectrum ({filteredIntelBookmarks.length} sites)</span>
                        <span>Visit Volume Tiers</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {liveIntelEngagement.map((tier) => (
                          <div
                            key={tier.key}
                            className="p-2.5 rounded-xl border border-border bg-card flex flex-col justify-between"
                          >
                            <span className="text-[10px] text-muted-foreground font-medium truncate block">
                              {tier.label}
                            </span>
                            <div className="flex items-baseline justify-between mt-1.5">
                              <span className="text-base font-bold font-mono text-foreground">{tier.count}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{tier.pct}%</span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-secondary overflow-hidden mt-1.5">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${tier.pct}%`, backgroundColor: tier.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>Favicon Wall Matrix ({liveIntelWall.length} sites)</span>
                        <span className="capitalize">{intelWallDensity} • {intelWallSort}</span>
                      </div>
                      <div
                        className={`grid gap-1.5 max-h-56 overflow-y-auto p-1 ${intelWallDensity === "compact"
                          ? "grid-cols-6 sm:grid-cols-10"
                          : intelWallDensity === "cozy"
                            ? "grid-cols-4 sm:grid-cols-6"
                            : "grid-cols-5 sm:grid-cols-8"
                          }`}
                      >
                        {liveIntelWall.map((bm) => (
                          <div
                            key={bm.id}
                            className="p-1.5 rounded-lg border border-border bg-card flex flex-col items-center justify-center gap-1 group hover:border-primary transition-colors"
                            title={`${bm.title} (${bm.domain})`}
                          >
                            <BookmarkIcon
                              src={bm.iconUrl}
                              alt={bm.title}
                              domain={bm.domain}
                              className={
                                intelWallDensity === "cozy"
                                  ? "h-6 w-6 object-contain"
                                  : "h-4 w-4 object-contain"
                              }
                            />
                            <span className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                              {bm.domain?.split(".")[0] || "site"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Destination Selector */}
        <div className="p-3.5 sm:px-6 border-t border-border bg-secondary/30 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
              Place In:
            </span>
            <select
              value={targetDestination}
              onChange={(e) => setTargetDestination(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground cursor-pointer shadow-2xs"
            >
              <option value="home">Dashboard Home</option>
              <option value="visuals">Visuals Studio Page</option>
              <option value="universal_folders">All Folders (Universal Sync)</option>
              {folders.map((f) => (
                <option key={f.id} value={`folder:${f.id}`}>
                  Folder: {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
