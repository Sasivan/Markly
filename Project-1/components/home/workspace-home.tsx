"use client";

import * as React from "react";
import {
  Compass,
  Folder as FolderIcon,
  Clock,
  Star,
  Inbox,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Plus,
  CheckCircle2,
  Tag,
  Hash,
  ShieldCheck,
  TrendingUp,
  Bookmark,
  Layers,
  Search,
  Ghost,
  History,
  Trash2,
  Globe,
  Archive,
  SlidersHorizontal,
  Rows3,
  Sparkles,
  Keyboard,
  StickyNote,
  Calendar,
  Folders,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { ActivityHeatmap365 } from "./activity-heatmap-365";
import { ScratchpadWidget } from "./scratchpad-widget";
import {
  DashboardWidgetBox,
  BookmarkItemsView,
  type WidgetViewMode,
  type WidgetItemLimit,
} from "./dashboard-widget-box";
import {
  HomeLayoutModal,
  DEFAULT_HOME_WIDGETS,
  type HomeWidgetConfig,
  type HomeWidgetKey,
  type WidgetColSpan,
} from "./home-layout-modal";
import { VizChart } from "@/components/viz/viz-chart";
import { UniversalVisualBuilderModal, type UniversalVisualConfig } from "@/components/viz/universal-visual-builder-modal";
import { ObservablePlotStudioBox } from "@/components/viz/observable-plot-studio-box";
import { ClassicChartsStudioBox } from "@/components/viz/classic-charts-studio-box";
import { IntelligenceSystemsStudioBox } from "@/components/viz/intelligence-systems-studio-box";
import { SitesMatrixStudioBox } from "@/components/viz/sites-matrix-studio-box";
import { FolderTreeStudioBox } from "@/components/viz/folder-tree-studio-box";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { ObservablePlotView } from "@/components/viz/observable-plot-view";
import { computePlotData } from "@/lib/viz/plot-engine";
import { UniversalPresetHub } from "@/components/presets/universal-preset-hub";
import { type VizConfig, safeParseStoredWidgets, RemoteWidgetStore } from "@/lib/viz";
import type { Folder, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";

interface WorkspaceHomeProps {
  bookmarks: BookmarkWithDetails[];
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "database") => void;
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string | null) => void;
  onOpenAddModal: () => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onRefreshData?: () => void;
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: (id: string, title?: string) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onSearchJump?: (query: string) => void;
  onOpenCleanupWizard?: () => void;
  onOpenShortcuts?: () => void;
}

export function WorkspaceHome({
  bookmarks,
  folders,
  folderTree,
  onSelectFolder,
  onSelectView,
  onSelectDomain,
  onSelectTag,
  onOpenAddModal,
  onEditBookmark,
  onToggleFavorite,
  onRefreshData,
  onRecordVisit,
  onDeleteBookmark,
  onToggleArchive,
  onOpenPreview,
  onSearchJump,
  onOpenCleanupWizard,
  onOpenShortcuts,
}: WorkspaceHomeProps) {
  const { user } = useAuth();
  const widgetStore = React.useMemo(() => new RemoteWidgetStore(), []);

  // 1.2: Homepage Widgets Ordering & Visibility state (persisted synchronously in localStorage with exact colSpan and rowSpan to prevent layout repositioning on refresh)
  const [homeWidgets, setHomeWidgets] = React.useState<HomeWidgetConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_home_widgets");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((p: any) => {
              let colSpan = p.colSpan;
              let rowSpan = p.rowSpan;
              try {
                const savedCol = localStorage.getItem("markly_box_colspan_" + p.id);
                if (savedCol) {
                  const val = Number(savedCol);
                  if ([2, 3, 4, 6, 8, 9, 12].includes(val)) colSpan = val as WidgetColSpan;
                }
                const savedRow = localStorage.getItem("markly_box_rowspan_" + p.id);
                if (savedRow) {
                  const rVal = Number(savedRow);
                  if (rVal === 1 || rVal === 2) rowSpan = rVal as 1 | 2;
                }
              } catch {}

              // Normalize studio widgets that may have been saved with custom: prefix or legacy format
              const pId = String(p.id || "");
              const pLabel = String(p.label || "");
              if (
                pId.startsWith("custom:studio_") ||
                pId.startsWith("studio_") ||
                pLabel.includes("Studio (18 Variations)") ||
                pLabel.includes("Studio (22 Variations)") ||
                pLabel.includes("Intelligence Systems Studio") ||
                pLabel.includes("Sites Matrix Reference") ||
                pLabel.includes("Folder Hierarchy") ||
                pLabel.includes("Folder Tree") ||
                pId.includes("folder_tree")
              ) {
                const cleanId = pId.replace(/^custom:/, "");
                const cat =
                  cleanId.includes("observable_plot") || pLabel.includes("Observable Plot")
                    ? "plot_studio"
                    : cleanId.includes("classic_charts") || pLabel.includes("Classic Charts")
                    ? "chart_studio"
                    : cleanId.includes("intel_systems") || cleanId.includes("intel_suite") || pLabel.includes("Intelligence Systems")
                    ? "intel_studio"
                    : cleanId.includes("folder_tree") || pLabel.includes("Folder Hierarchy") || pLabel.includes("Folder Tree")
                    ? "tree_studio"
                    : "sites_studio";
                return {
                  ...p,
                  id: cleanId,
                  kind: "studio",
                  category: cat,
                  colSpan: colSpan ?? p.colSpan ?? 12,
                  rowSpan: rowSpan ?? p.rowSpan ?? 2,
                };
              }

              return { ...p, colSpan: colSpan ?? p.colSpan, rowSpan: rowSpan ?? p.rowSpan };
            });
          }
        }
      } catch {}
    }
    return DEFAULT_HOME_WIDGETS;
  });
  const [layoutModalOpen, setLayoutModalOpen] = React.useState(false);
  const [presetHubOpen, setPresetHubOpen] = React.useState(false);
  const [universalModalOpen, setUniversalModalOpen] = React.useState(false);
  const [editingUniversalConfig, setEditingUniversalConfig] = React.useState<UniversalVisualConfig | null>(null);

  // Instant global search on homepage
  const [homeSearch, setHomeSearch] = React.useState("");

  const homeSearchResults = React.useMemo(() => {
    const q = homeSearch.toLowerCase().trim();
    if (!q) return [];
    return bookmarks
      .filter((bm) => !bm.isArchived)
      .filter((bm) => {
        const matchText = [
          bm.title || "",
          bm.domain || "",
          bm.url || "",
          bm.description || "",
          (bm as any).notes || "",
          ...(bm.tags || []).map((t: any) => (typeof t === "string" ? t : t.name)),
        ]
          .join(" ")
          .toLowerCase();
        return matchText.includes(q);
      });
  }, [bookmarks, homeSearch]);

  // Per-widget view mode state (Grid vs List vs Compact)
  const [widgetViews, setWidgetViews] = React.useState<Record<string, WidgetViewMode>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_home_widget_views");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {
      folders: "grid",
      recent: "list",
      favorites: "grid",
      unsorted: "compact",
    };
  });

  const handleSetWidgetView = (widgetId: string, mode: WidgetViewMode) => {
    setWidgetViews((prev) => {
      const next = { ...prev, [widgetId]: mode };
      try {
        localStorage.setItem("markly_home_widget_views", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Per-widget site limit state persisted (Adaptive Auto / Stepper / Slider / All)
  const [widgetItemLimits, setWidgetItemLimits] = React.useState<Record<string, WidgetItemLimit>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_widget_item_limits");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  const [homeNotice, setHomeNotice] = React.useState<string | null>(null);

  const handleSetWidgetLimit = (widgetId: string, limit: WidgetItemLimit) => {
    setWidgetItemLimits((prev) => {
      const next = { ...prev, [widgetId]: limit };
      try {
        localStorage.setItem("markly_widget_item_limits", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleEditBuiltinWidget = (widgetId: string) => {
    const w = homeWidgets.find((x) => x.id === widgetId);

    if (widgetId === "analytics_velocity") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "Activity Velocity Momentum",
        category: "chart",
        colSpan: w?.colSpan || 12,
        rowSpan: w?.rowSpan || 1,
        chartConfig: {
          version: 1,
          id: "builtin_velocity",
          title: "Activity Velocity Momentum",
          chartType: "area",
          dimension: "created_month",
          measure: "count",
          filters: {},
          sort: { by: "dimension", direction: "asc" },
          limit: 12,
          otherBucket: false,
        },
      });
      setUniversalModalOpen(true);
      return;
    }
    if (widgetId === "analytics_domains") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "Top Web Ecosystems",
        category: "chart",
        colSpan: w?.colSpan || 4,
        rowSpan: w?.rowSpan || 1,
        chartConfig: {
          version: 1,
          id: "builtin_domains",
          title: "Top Web Ecosystems",
          chartType: "bar",
          dimension: "domain",
          measure: "count",
          filters: {},
          sort: { by: "measure", direction: "desc" },
          limit: 8,
          otherBucket: true,
        },
      });
      setUniversalModalOpen(true);
      return;
    }
    if (widgetId === "analytics_radar") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "Collection Distribution",
        category: "chart",
        colSpan: w?.colSpan || 4,
        rowSpan: w?.rowSpan || 1,
        chartConfig: {
          version: 1,
          id: "builtin_radar",
          title: "Collection Distribution",
          chartType: "donut",
          dimension: "folder_top",
          measure: "count",
          filters: {},
          sort: { by: "measure", direction: "desc" },
          limit: 7,
          otherBucket: true,
        },
      });
      setUniversalModalOpen(true);
      return;
    }
    if (widgetId === "analytics_tags") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "Tag Distribution Donut",
        category: "chart",
        colSpan: w?.colSpan || 4,
        rowSpan: w?.rowSpan || 1,
        chartConfig: {
          version: 1,
          id: "builtin_tags",
          title: "Tag Distribution Donut",
          chartType: "donut",
          dimension: "tag",
          measure: "count",
          filters: {},
          sort: { by: "measure", direction: "desc" },
          limit: 8,
          otherBucket: true,
        },
      });
      setUniversalModalOpen(true);
      return;
    }
    if (widgetId === "tags") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "Workspace Topics & Tags",
        category: "intel",
        colSpan: w?.colSpan || 6,
        rowSpan: w?.rowSpan || 1,
        intelConfig: { type: "tags" },
      });
      setUniversalModalOpen(true);
      return;
    }
    if (widgetId === "spectrum") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "Inactivity Dot Spectrum",
        category: "intel",
        colSpan: w?.colSpan || 12,
        rowSpan: w?.rowSpan || 1,
        intelConfig: { type: "engagement" },
      });
      setUniversalModalOpen(true);
      return;
    }
    if (widgetId === "heatmap") {
      setEditingUniversalConfig({
        id: widgetId,
        title: "365-Day Activity Heatmap",
        category: "intel",
        colSpan: w?.colSpan || 12,
        rowSpan: w?.rowSpan || 1,
        intelConfig: { type: "heatmap" },
      });
      setUniversalModalOpen(true);
      return;
    }

    let title = "Quick Access";
    let src: "all" | "favorites" | "recent" | "unsorted" = "all";
    let icon = "compass";
    let color = "#3b82f6";

    if (widgetId === "favorites") {
      title = "Starred Favorites";
      src = "favorites";
      icon = "star";
      color = "#f59e0b";
    } else if (widgetId === "recent") {
      title = "Recently Visited";
      src = "recent";
      icon = "history";
      color = "#3b82f6";
    } else if (widgetId === "unsorted") {
      title = "Inbox / Unsorted";
      src = "unsorted";
      icon = "inbox";
      color = "#a855f7";
    }

    setEditingUniversalConfig({
      id: widgetId,
      title,
      category: "sites",
      colSpan: w?.colSpan || 4,
      rowSpan: w?.rowSpan || 1,
      icon,
      color,
      siteConfig: {
        source: src,
        limit: widgetItemLimits[widgetId] || 8,
        viewMode: (widgetViews[widgetId] || "grid") as any,
        sortBy: widgetId === "recent" ? "recent" : widgetId === "favorites" ? "recent" : "visits",
      },
    });
    setUniversalModalOpen(true);
  };

  const handleEditCustomWidget = (widget: HomeWidgetConfig) => {
    const vc = widget.vizConfig;
    let cat: any = "chart";
    if (vc?.chartType === ("sites" as any) || (vc as any)?.siteConfig) cat = "sites";
    else if (vc?.chartType === ("plot" as any) || (vc as any)?.plotConfig) cat = "plot";
    else if (vc?.chartType === "tags" || vc?.chartType === "wall" || vc?.chartType === "graph") cat = "intel";

    setEditingUniversalConfig({
      id: widget.id,
      title: widget.label,
      category: cat,
      colSpan: widget.colSpan || 6,
      rowSpan: widget.rowSpan || 1,
      siteConfig: (vc as any)?.siteConfig,
      plotConfig: (vc as any)?.plotConfig,
      chartConfig: vc,
      intelConfig: cat === "intel" ? { type: vc?.chartType as any } : undefined,
    });
    setUniversalModalOpen(true);
  };

  const handleSaveUniversalVisual = (config: UniversalVisualConfig) => {
    // 1. If it's a built-in widget being updated
    if (["folders", "favorites", "recent", "unsorted"].includes(config.id)) {
      if (config.siteConfig?.limit) {
        handleSetWidgetLimit(config.id, config.siteConfig.limit);
      }
      if (config.siteConfig?.viewMode) {
        handleSetWidgetView(config.id, config.siteConfig.viewMode as any);
      }
      if (config.colSpan) {
        handleWidgetColSpanChange(config.id, config.colSpan);
      }
      if (config.rowSpan) {
        handleWidgetRowSpanChange(config.id, config.rowSpan);
      }
      return;
    }

    // 2. Otherwise create or update custom / studio widget
    const isStudio =
      config.category === "plot_studio" ||
      config.category === "chart_studio" ||
      config.category === "intel_studio" ||
      config.category === "sites_studio" ||
      config.id.startsWith("studio_") ||
      config.id.includes("studio") ||
      config.title?.includes("Studio");

    let vizConfig: VizConfig | undefined;
    if (config.category === "chart" && config.chartConfig) {
      vizConfig = config.chartConfig;
    } else if (config.category === "plot") {
      vizConfig = {
        version: 1,
        id: config.id,
        title: config.title,
        chartType: "plot" as any,
        dimension: config.plotConfig?.dimension || "domain",
        measure: config.plotConfig?.measure || "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: 8,
        otherBucket: true,
        plotConfig: config.plotConfig,
      } as any;
    } else if (config.category === "intel") {
      vizConfig = {
        version: 1,
        id: config.id,
        title: config.title,
        chartType: (config.intelConfig?.type as any) || "tags",
        dimension: "domain",
        measure: "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: 8,
        otherBucket: false,
        intelConfig: config.intelConfig,
      } as any;
    } else if (!isStudio) {
      // Sites Box
      vizConfig = {
        version: 1,
        id: config.id,
        title: config.title,
        chartType: "sites" as any,
        dimension: "domain",
        measure: "count",
        filters: {},
        sort: { by: "measure", direction: "desc" },
        limit: config.siteConfig?.limit === "all" ? 50 : (config.siteConfig?.limit || 8),
        otherBucket: false,
        siteConfig: config.siteConfig,
      } as any;
    }

    const widgetId = isStudio
      ? (config.id.startsWith("studio_") ? config.id : `studio_${config.category}_${Date.now()}`)
      : config.id.startsWith("custom:")
      ? config.id
      : `custom:${config.id}`;

    const newWidget: HomeWidgetConfig = {
      id: widgetId,
      label: config.title,
      visible: true,
      kind: isStudio ? ("studio" as any) : "custom",
      category: config.category as any,
      span: "2",
      colSpan: config.colSpan || 12,
      rowSpan: config.rowSpan || 2,
      chartConfig: config.chartConfig,
      intelConfig: config.intelConfig,
      plotConfig: config.plotConfig,
      siteConfig: config.siteConfig,
      vizConfig,
    };

    const filtered = homeWidgets.filter(
      (w) => w.id !== widgetId && w.id !== `custom:${widgetId}` && w.id !== config.id
    );
    const updated = [newWidget, ...filtered];

    handleSaveWidgets(updated);
  };

  // Reorder widget up / down
  const handleMoveWidget = (id: HomeWidgetKey, direction: "up" | "down") => {
    setHomeWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      try {
        localStorage.setItem("markly_home_widgets", JSON.stringify(copy));
      } catch {}
      return copy;
    });
  };

  // Change column span for a widget (2 to 12 cols)
  const handleWidgetColSpanChange = (id: string, newColSpan: WidgetColSpan) => {
    setHomeWidgets((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, colSpan: newColSpan, span: (newColSpan === 12 ? "2" : "1") as "1" | "2" } : w
      );
      try {
        localStorage.setItem("markly_home_widgets", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Change row span for a widget (1 standard vs 2 tall)
  const handleWidgetRowSpanChange = (id: string, newRowSpan: 1 | 2) => {
    setHomeWidgets((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, rowSpan: newRowSpan } : w
      );
      try {
        localStorage.setItem("markly_home_widgets", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Toggle span for a widget (Half width vs Full width)
  const handleToggleWidgetSpan = (id: HomeWidgetKey) => {
    setHomeWidgets((prev) => {
      const next = prev.map((w) => {
        if (w.id === id) {
          const curr = w.colSpan ?? (w.span === "2" ? 12 : 6);
          const nextSpan: WidgetColSpan = curr === 12 ? 6 : 12;
          return { ...w, colSpan: nextSpan, span: (nextSpan === 12 ? "2" : "1") as "1" | "2" };
        }
        return w;
      });
      try {
        localStorage.setItem("markly_home_widgets", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Drag and drop for widgets
  const handleWidgetDragStart = (e: React.DragEvent, id: HomeWidgetKey) => {
    e.dataTransfer.setData("application/x-markly-widget", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleWidgetDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleWidgetDrop = (e: React.DragEvent, targetId: HomeWidgetKey) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("application/x-markly-widget") as HomeWidgetKey;
    if (!sourceId || sourceId === targetId) return;

    setHomeWidgets((prev) => {
      const sourceIdx = prev.findIndex((w) => w.id === sourceId);
      const targetIdx = prev.findIndex((w) => w.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(sourceIdx, 1);
      copy.splice(targetIdx, 0, moved);
      try {
        localStorage.setItem("markly_home_widgets", JSON.stringify(copy));
      } catch {}
      return copy;
    });
  };

  const handleDuplicateCustomWidget = (widget: HomeWidgetConfig) => {
    if (!widget.vizConfig) return;
    const customCount = homeWidgets.filter((w) => w.kind === "custom" || w.id.startsWith("custom:")).length;
    if (customCount >= 30) {
      setHomeNotice("Maximum limit of 30 custom visuals reached. Please remove an existing visual first.");
      setTimeout(() => setHomeNotice(null), 4000);
      return;
    }
    const duplicatedConfig: VizConfig = {
      ...widget.vizConfig,
      id: `viz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${widget.vizConfig.title} (Copy)`,
    };
    const newWidget: HomeWidgetConfig = {
      id: `custom:${duplicatedConfig.id}`,
      label: duplicatedConfig.title,
      visible: true,
      kind: "custom",
      vizConfig: duplicatedConfig,
      colSpan: widget.colSpan || 6,
      span: widget.span || "1",
    };
    setHomeWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === widget.id);
      const copy = [...prev];
      if (idx !== -1) {
        copy.splice(idx + 1, 0, newWidget);
      } else {
        copy.push(newWidget);
      }
      widgetStore.saveWidgets(copy);
      return copy;
    });
  };

  const handleDeleteCustomWidget = (widgetId: string) => {
    setHomeWidgets((prev) => {
      const filtered = prev.filter((w) => w.id !== widgetId);
      widgetStore.saveWidgets(filtered);
      try {
        localStorage.setItem("markly_home_widgets", JSON.stringify(filtered));
        localStorage.removeItem("markly_box_colspan_" + widgetId);
        localStorage.removeItem("markly_box_h_" + widgetId);
        localStorage.removeItem("markly_box_collapsed_" + widgetId);
      } catch {}
      window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      return filtered;
    });
  };

  React.useEffect(() => {
    let cancelled = false;
    const loadWidgetsAsync = async () => {
      try {
        const parsed = await widgetStore.loadWidgets();
        if (cancelled) return;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged: HomeWidgetConfig[] = [];
          for (const p of parsed) {
            const isStudio = p.kind === "studio" || p.id.startsWith("studio_") || (p as any).category?.includes("studio");
            const isCustom = p.kind === "custom" || p.id.startsWith("custom:");
            if (isStudio || isCustom) {
              merged.push({
                id: p.id,
                label: p.label,
                visible: p.visible ?? true,
                kind: isStudio ? ("studio" as any) : "custom",
                category: (p as any).category,
                vizConfig: p.vizConfig,
                plotConfig: (p as any).plotConfig,
                chartConfig: (p as any).chartConfig,
                intelConfig: (p as any).intelConfig,
                siteConfig: (p as any).siteConfig,
                icon: (p as any).icon,
                color: (p as any).color,
                span: (p.span as any) ?? (isStudio ? "2" : "1"),
                colSpan: (p.colSpan as WidgetColSpan) ?? (isStudio ? 12 : 6),
                rowSpan: (p as any).rowSpan ?? (isStudio ? 2 : 1),
              });
              continue;
            }
            const def = DEFAULT_HOME_WIDGETS.find((d) => d.id === p.id);
            if (def) {
              let colSpan = p.colSpan;
              try {
                const savedCol = localStorage.getItem("markly_box_colspan_" + p.id);
                if (savedCol) {
                  const val = Number(savedCol);
                  if ([2, 3, 4, 6, 8, 9, 12].includes(val)) colSpan = val as WidgetColSpan;
                }
              } catch {}
              merged.push({
                ...def,
                visible: p.visible ?? true,
                span: (p.span as any) ?? def.span ?? "1",
                colSpan: (colSpan as WidgetColSpan) ?? def.colSpan ?? (p.span === "2" ? 12 : 6),
              });
            }
          }
          if (merged.length === 0 && (!parsed || parsed.length === 0)) {
            for (const def of DEFAULT_HOME_WIDGETS) {
              merged.push(def);
            }
          }
          setHomeWidgets((prev) => {
            const currentStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(merged);
            if (currentStr === nextStr) return prev;
            try {
              localStorage.setItem("markly_home_widgets", nextStr);
            } catch {}
            return merged;
          });
        }
      } catch {
        // ignore
      }
    };
    loadWidgetsAsync();

    const handleWorkspaceUpdated = () => {
      loadWidgetsAsync();
    };
    window.addEventListener("markly-workspace-updated", handleWorkspaceUpdated);
    window.addEventListener("markly-home-widgets-updated", handleWorkspaceUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("markly-workspace-updated", handleWorkspaceUpdated);
      window.removeEventListener("markly-home-widgets-updated", handleWorkspaceUpdated);
    };
  }, [widgetStore]);

  const handleSaveWidgets = (newWidgets: HomeWidgetConfig[]) => {
    setHomeWidgets(newWidgets);
    try {
      localStorage.setItem("markly_home_widgets", JSON.stringify(newWidgets));
    } catch {}
    widgetStore.saveWidgets(newWidgets);
  };

  const handleResetWidgets = () => {
    setHomeWidgets(DEFAULT_HOME_WIDGETS);
    try {
      localStorage.setItem("markly_home_widgets", JSON.stringify(DEFAULT_HOME_WIDGETS));
    } catch {}
    widgetStore.saveWidgets(DEFAULT_HOME_WIDGETS);
  };

  // Realtime visit handler
  const handleSiteVisit = async (bm: BookmarkWithDetails) => {
    if (onRecordVisit) {
      onRecordVisit(bm);
      return;
    }
    try {
      bm.visitCount = (bm.visitCount || 0) + 1;
      const now = Date.now();
      bm.lastVisitedAt = now;
      bm.lastClickedAt = now;
      await fetch(`/api/bookmarks/${bm.id}/visit`, { method: "POST", keepalive: true });
      onRefreshData?.();
    } catch (e) {
      console.error("Visit error:", e);
    }
  };
  // Accurate synchronized metrics across workspace
  const folderCollectionsCount = React.useMemo(
    () => folders.filter((f) => f.id !== "__UNSORTED__" && !f.id.startsWith("fld_unsorted_")).length,
    [folders]
  );

  const totalFavoritesCount = React.useMemo(
    () => bookmarks.filter((b) => b.isFavorite && !b.isArchived).length,
    [bookmarks]
  );

  const totalVisitedCount = React.useMemo(
    () => bookmarks.filter((b) => !b.isArchived && Boolean(b.lastClickedAt || b.lastVisitedAt)).length,
    [bookmarks]
  );

  // 1. Quick Access: High-frequency daily drivers & pinned bookmarks
  const quickAccessList = React.useMemo(() => {
    const unarchived = bookmarks.filter((b) => !b.isArchived);
    // Prioritize high-visit sites and favorites
    const activeAndFavs = unarchived.filter((b) => (b.visitCount || 0) > 0 || b.isFavorite);
    if (activeAndFavs.length > 0) {
      return activeAndFavs
        .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0) || (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || b.createdAt - a.createdAt);
    }
    // Fallback if no bookmarks have been visited yet: show newest additions
    return [...unarchived].sort((a, b) => b.createdAt - a.createdAt);
  }, [bookmarks]);

  // 2. Recently Visited: Strict chronological timeline of actual visits
  const recentlyVisited = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived && Boolean(b.lastClickedAt || b.lastVisitedAt))
      .sort((a, b) => {
        const timeA = Math.max(a.lastClickedAt || 0, a.lastVisitedAt || 0);
        const timeB = Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0);
        return timeB - timeA;
      });
  }, [bookmarks]);

  // 3. Favorites (all – adaptive)
  const favorites = React.useMemo(() => {
    return bookmarks.filter((b) => b.isFavorite && !b.isArchived);
  }, [bookmarks]);

  // 4. Unsorted / Inbox: Strictly unarchived bookmarks without any folder
  const unsortedBookmarks = React.useMemo(() => {
    return bookmarks.filter(
      (b) =>
        !b.isArchived &&
        (!b.folderId || b.folderId === "__UNSORTED__" || b.folderId.startsWith("fld_unsorted_"))
    );
  }, [bookmarks]);

  const totalUnsortedCount = unsortedBookmarks.length;
  const unorganized = React.useMemo(() => unsortedBookmarks, [unsortedBookmarks]);

  // 6. Topic & Tags Cloud
  const topTags = React.useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const bm of bookmarks) {
      if (bm.isArchived) continue;
      for (const t of bm.tags || []) {
        const existing = map.get(t.name) || { count: 0, color: t.color || "#3b82f6" };
        map.set(t.name, { count: existing.count + 1, color: t.color || "#3b82f6" });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [bookmarks]);

  // 7. Forgotten Bookmarks State: 1 to 90 Days Slider & Spot Hover (Persisted in localStorage)
  const [inactiveThreshold, setInactiveThresholdState] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_forgotten_threshold");
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 90) return parsed;
        }
      } catch {}
    }
    return 30;
  });

  const setInactiveThreshold = React.useCallback((val: number) => {
    setInactiveThresholdState(val);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("markly_forgotten_threshold", String(val));
      } catch {}
    }
  }, []);
  const [hoveredSpot, setHoveredSpot] = React.useState<{
    bookmark: BookmarkWithDetails;
    x: number;
    y: number;
    daysAgo: number;
    timeAgoLabel?: string;
  } | null>(null);

  // Calibrated archival dot palette for sites in spectrum
  const DOT_PALETTE = [
    "#2563eb", // Primary blue
    "#475569", // Slate
    "#0d9488", // Teal
    "#6366f1", // Indigo
    "#64748b", // Cool grey
    "#d97706", // Amber
    "#0284c7", // Sky
    "#4f46e5", // Iris
    "#059669", // Emerald
    "#78716c", // Warm stone
  ];

  // Compute Area Dot Spectrum data mapped dynamically across Hours (1 day) or Days (N days)
  const spectrumData = React.useMemo(() => {
    // Quantize now to the current hour to guarantee deterministic coordinates across SSR & client hydration
    const now = Math.floor(Date.now() / 3600000) * 3600000;
    const unarchived = bookmarks.filter((b) => !b.isArchived);

    // Check if threshold is 1 day (divide by hours) or N days (divide by days)
    const isHourly = inactiveThreshold === 1;

    let timeMarkers: { val: number; label: string; xPercent: number }[] = [];
    let gridLines: { xPercent: number; isMajor: boolean }[] = [];

    const lanes = [
      { id: "24h", label: isHourly ? "< 6h" : "Past 24h", minDays: 0, maxDays: 1, center: 100, color: "#10b981" },
      { id: "7d", label: isHourly ? "6 - 12h" : "2 - 7 Days", minDays: 1, maxDays: 7, center: 300, color: "#3b82f6" },
      { id: "14d", label: isHourly ? "12 - 18h" : "8 - 14 Days", minDays: 7, maxDays: 14, center: 500, color: "#6366f1" },
      { id: "30d", label: isHourly ? "18 - 24h" : "15 - 30 Days", minDays: 14, maxDays: Math.min(30, inactiveThreshold), center: 700, color: "#f59e0b" },
      { id: "dormant", label: isHourly ? "24h+ (Dormant)" : `${inactiveThreshold}d+ (Dormant)`, minDays: inactiveThreshold, maxDays: Infinity, center: 900, color: "#64748b" },
    ];

    timeMarkers = lanes.map((l) => ({
      val: l.minDays,
      label: l.label,
      xPercent: (l.center / 1000) * 100,
    }));

    // Grid boundary lines dividing the 5 swimlanes (at 200, 400, 600, 800)
    [200, 400, 600, 800].forEach((xVal) => {
      gridLines.push({
        xPercent: (xVal / 1000) * 100,
        isMajor: true,
      });
    });

    // Group bookmarks into lanes
    const laneBuckets: Record<string, BookmarkWithDetails[]> = {
      "24h": [],
      "7d": [],
      "14d": [],
      "30d": [],
      dormant: [],
    };

    unarchived.forEach((bm) => {
      const lastTime = bm.lastClickedAt || bm.lastVisitedAt;
      if (!lastTime) {
        laneBuckets.dormant.push(bm);
        return;
      }
      const diffMs = Math.max(0, now - lastTime);
      const daysAgo = diffMs / (1000 * 60 * 60 * 24);

      if (daysAgo >= inactiveThreshold) {
        laneBuckets.dormant.push(bm);
      } else if (daysAgo < 1) {
        laneBuckets["24h"].push(bm);
      } else if (daysAgo < 7) {
        laneBuckets["7d"].push(bm);
      } else if (daysAgo < 14) {
        laneBuckets["14d"].push(bm);
      } else {
        laneBuckets["30d"].push(bm);
      }
    });

    const dots: {
      bookmark: BookmarkWithDetails;
      x: number; // 0..1000 in SVG viewBox
      y: number; // 0..200 in SVG viewBox
      color: string;
      timeAgoLabel: string;
      daysAgo: number;
      isInactive: boolean;
    }[] = [];

    lanes.forEach((lane) => {
      const items = laneBuckets[lane.id] || [];
      const cols = 5;
      const colSpacing = 26;
      const rowSpacing = 22;
      const totalWidth = (cols - 1) * colSpacing;
      const startX = lane.center - totalWidth / 2;
      const startY = 32;

      items.forEach((bm, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = Number((startX + col * colSpacing).toFixed(1));
        const y = Number(Math.min(145, startY + row * rowSpacing).toFixed(1));

        const lastTime = bm.lastClickedAt || bm.lastVisitedAt;
        const diffMs = lastTime ? Math.max(0, now - lastTime) : Infinity;
        const daysAgo = lastTime ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 999;
        const hoursAgo = lastTime ? Math.floor(diffMs / (1000 * 60 * 60)) : 9999;

        let timeAgoLabel = "";
        if (!lastTime) timeAgoLabel = "Never clicked";
        else if (daysAgo < 1) timeAgoLabel = hoursAgo < 1 ? "< 1h ago" : `${hoursAgo}h ago`;
        else timeAgoLabel = `${daysAgo}d ago`;

        dots.push({
          bookmark: bm,
          x,
          y,
          color: lane.color,
          timeAgoLabel,
          daysAgo,
          isInactive: lane.id === "dormant",
        });
      });
    });

    const inactiveCount = laneBuckets.dormant.length;
    const totalUnarchived = Math.max(1, unarchived.length);

    const distributionTiers = lanes.map((l) => {
      const count = (laneBuckets[l.id] || []).length;
      const percent = Math.round((count / totalUnarchived) * 100);
      return {
        id: l.id,
        label: l.label,
        color: l.color,
        count,
        percent,
      };
    });

    return { isHourly, timeMarkers, gridLines, dots, inactiveCount, distributionTiers };
  }, [bookmarks, inactiveThreshold]);

  // Workspace summary calculations
  const totalCount = bookmarks.filter((b) => !b.isArchived).length;
  const reachableCount = bookmarks.filter((b) => !b.isArchived && b.status !== "dead").length;
  const healthPercent = totalCount > 0 ? Math.round((reachableCount / totalCount) * 100) : 100;

  // Helper to format relative time
  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Helper to get parent folder name
  const getParentName = (bm: BookmarkWithDetails) => {
    if (!bm.folderId) return "Unsorted";
    const current = folders.find((f) => f.id === bm.folderId);
    if (!current) return bm.folderName || "Unsorted";
    const pid = current.parentId ?? (current as any).parent_id;
    if (pid) {
      const parent = folders.find((f) => f.id === pid);
      if (parent) return parent.name;
    }
    return current.name;
  };

  // Spectrum widget header controls (Threshold slider & presets)
  const renderDotSpectrumExtraHeader = () => (
    <div className="flex flex-wrap items-center gap-2 bg-secondary/50 px-2 py-1 rounded-lg border border-border/60 text-xs">
      <div className="flex items-center gap-1 font-medium text-foreground text-[11px]">
        <span className="text-muted-foreground">Threshold:</span>
        <span className="font-mono tabular-nums">
          {inactiveThreshold === 1 ? "1D (24h)" : `${inactiveThreshold}d`}
        </span>
        <span className="text-muted-foreground font-mono tabular-nums">({spectrumData.inactiveCount} dormant)</span>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={1}
          max={90}
          step={1}
          value={inactiveThreshold}
          onChange={(e) => setInactiveThreshold(Number(e.target.value))}
          className="w-20 sm:w-28 h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary border border-border"
          aria-label="Adjust Inactivity Timeline Threshold"
        />
        {/* Quick Presets */}
        <div className="flex items-center gap-1">
          {[
            { label: "1D", val: 1 },
            { label: "7D", val: 7 },
            { label: "14D", val: 14 },
            { label: "30D", val: 30 },
            { label: "90D", val: 90 },
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => setInactiveThreshold(preset.val)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                inactiveThreshold === preset.val
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Spectrum coordinate matrix body
  const renderDotSpectrumContent = () => (
    <div className="p-4 space-y-4">
      {/* Dynamic Continuous Multi-Line Coordinate Matrix Container */}
      <div className="relative w-full h-44 rounded-lg bg-secondary/30 border border-border overflow-hidden select-none">
        <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <defs>
            <pattern id="spectrum-grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/30" />
            </pattern>
          </defs>

          <rect width="1000" height="200" fill="url(#spectrum-grid)" />

          {/* Dynamic Division Grid Lines */}
          {spectrumData.gridLines.map((line, i) => (
            <line
              key={`grid-${i}`}
              x1={line.xPercent * 10}
              y1={0}
              x2={line.xPercent * 10}
              y2={200}
              stroke="currentColor"
              strokeWidth={line.isMajor ? "1" : "0.5"}
              strokeDasharray={line.isMajor ? "none" : "2 2"}
              className={line.isMajor ? "text-border" : "text-border/40"}
            />
          ))}

          {/* Inactive Dormant Threshold Barrier Line */}
          <line
            x1={940}
            y1={0}
            x2={940}
            y2={200}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-muted-foreground"
          />

          {/* Render Bookmark Dots */}
          {spectrumData.dots.map((dot) => {
            const isHovered = hoveredSpot?.bookmark.id === dot.bookmark.id;
            return (
              <g key={dot.bookmark.id} className="cursor-pointer">
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={isHovered ? 6 : 4}
                  fill={dot.color}
                  className="stroke-card transition-all duration-150"
                  strokeWidth={isHovered ? 2 : 1}
                  onMouseEnter={() =>
                    setHoveredSpot({
                      bookmark: dot.bookmark,
                      x: (dot.x / 1000) * 100,
                      y: (dot.y / 200) * 100,
                      timeAgoLabel: dot.timeAgoLabel,
                      daysAgo: dot.daysAgo,
                    })
                  }
                  onMouseLeave={() => setHoveredSpot(null)}
                  onClick={() => {
                    if (onOpenPreview) {
                      onOpenPreview(dot.bookmark);
                    } else {
                      handleSiteVisit(dot.bookmark);
                      window.open(dot.bookmark.url, "_blank");
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Bottom Time Axis */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1.5 border-t border-border px-3">
          {spectrumData.timeMarkers.map((m, i) => (
            <div key={`tm-${i}`} className="text-center" style={{ width: `${100 / spectrumData.timeMarkers.length}%` }}>
              <span className="font-medium text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Tooltip Over the Spot (Last Time Clicked) */}
        {hoveredSpot && (
          <div
            className="absolute z-30 cursor-pointer pointer-events-auto transform -translate-x-1/2 -translate-y-full mb-3 bg-card border border-border p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-56 text-card-foreground hover:border-primary/50 transition-colors"
            style={{
              left: `${Math.min(88, Math.max(12, hoveredSpot.x))}%`,
              top: `${Math.min(75, Math.max(15, hoveredSpot.y))}%`,
            }}
            onClick={() => {
              if (onOpenPreview) {
                onOpenPreview(hoveredSpot.bookmark);
              } else {
                handleSiteVisit(hoveredSpot.bookmark);
                window.open(hoveredSpot.bookmark.url, "_blank");
              }
            }}
          >
            <div className="flex items-center gap-2 border-b border-border pb-1.5 font-medium">
              <BookmarkIcon
                src={hoveredSpot.bookmark.iconUrl}
                domain={hoveredSpot.bookmark.domain}
                className="h-4 w-4 rounded object-contain flex-shrink-0"
              />
              <div className="truncate text-foreground font-semibold">
                {hoveredSpot.bookmark.title}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>URL Domain:</span>
                <span className="font-mono text-foreground truncate max-w-36">
                  {hoveredSpot.bookmark.domain}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Folder Group:</span>
                <span className="truncate max-w-36 text-foreground font-medium">
                  {getParentName(hoveredSpot.bookmark)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Last Clicked:</span>
                <span className="font-mono text-foreground font-semibold">
                  {hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt
                    ? `${new Date(hoveredSpot.bookmark.lastClickedAt || hoveredSpot.bookmark.lastVisitedAt!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })} (${hoveredSpot.timeAgoLabel || `${hoveredSpot.daysAgo}d ago`})`
                    : `Never (Added ${new Date(hoveredSpot.bookmark.createdAt).toLocaleDateString()})`}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Total visits:</span>
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {hoveredSpot.bookmark.visitCount || 0}
                </span>
              </div>
            </div>

            <div className="text-xs text-center text-primary font-medium pt-1 border-t border-border flex items-center justify-center gap-1">
              <span>Open preview & details</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
        )}
      </div>

      {/* Recency Velocity Distribution Bar */}
      {spectrumData.distributionTiers && (
        <div className="space-y-2 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Activity Swimlane Velocity</span>
            <span className="font-mono tabular-nums">{bookmarks.filter((b) => !b.isArchived).length} sites tracked</span>
          </div>

          {/* Segmented Bar */}
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
            {spectrumData.distributionTiers.map((tier) => (
              <div
                key={tier.id}
                style={{
                  width: `${tier.percent}%`,
                  backgroundColor: tier.color,
                }}
                className="h-full transition-all duration-300"
                title={`${tier.label}: ${tier.count} sites (${tier.percent}%)`}
              />
            ))}
          </div>

          {/* Legend with Counts and Percentages */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {spectrumData.distributionTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="truncate">{tier.label}:</span>
                <span className="font-semibold text-foreground ml-auto tabular-nums">
                  {tier.count} ({tier.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Unified Box Dashboard Renderer
  const renderWidget = (
    widget: HomeWidgetConfig,
    index: number,
    isFirst: boolean,
    isLast: boolean
  ) => {
    const commonProps = {
      id: widget.id,
      span: widget.span ?? "1",
      colSpan: widget.colSpan ?? (widget.span === "2" ? 12 : 6),
      onColSpanChange: (span: WidgetColSpan) => handleWidgetColSpanChange(widget.id, span),
      rowSpan: widget.rowSpan || 1,
      onRowSpanChange: (rSpan: 1 | 2) => handleWidgetRowSpanChange(widget.id, rSpan),
      isFirst,
      isLast,
      onToggleSpan: () => handleToggleWidgetSpan(widget.id),
      onMoveUp: () => handleMoveWidget(widget.id, "up"),
      onMoveDown: () => handleMoveWidget(widget.id, "down"),
      onDragStart: (e: React.DragEvent) => handleWidgetDragStart(e, widget.id),
      onDragOver: handleWidgetDragOver,
      onDrop: (e: React.DragEvent) => handleWidgetDrop(e, widget.id),
      onDeleteWidget: () => handleDeleteCustomWidget(widget.id),
    };

    // Custom Visual Studio Units (Observable Plot, Classic Charts, Intelligence Systems, Sites Matrix)
    const wId = String(widget.id || "").replace(/^custom:/, "");
    const wCat = String((widget as any).category || "");
    const wLabel = String(widget.label || widget.vizConfig?.title || "");

    if (wId === "studio_observable_plot" || wCat === "plot_studio" || wId.includes("observable_plot") || wLabel.includes("Observable Plot")) {
      return (
        <ObservablePlotStudioBox
          key={widget.id}
          id={widget.id}
          bookmarks={bookmarks}
          folders={folders}
          initialColSpan={widget.colSpan || 12}
          rowSpan={widget.rowSpan || 2}
          onColSpanChange={(span) => handleWidgetColSpanChange(widget.id, span)}
          onRowSpanChange={(span) => handleWidgetRowSpanChange(widget.id, span as 1 | 2)}
          onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
        />
      );
    }

    if (wId === "studio_classic_charts" || wCat === "chart_studio" || wId.includes("classic_charts") || wLabel.includes("Classic Charts")) {
      return (
        <ClassicChartsStudioBox
          key={widget.id}
          id={widget.id}
          bookmarks={bookmarks}
          folders={folders}
          initialColSpan={widget.colSpan || 12}
          rowSpan={widget.rowSpan || 2}
          onColSpanChange={(span) => handleWidgetColSpanChange(widget.id, span)}
          onRowSpanChange={(span) => handleWidgetRowSpanChange(widget.id, span as 1 | 2)}
          onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
        />
      );
    }

    if (wId === "studio_intel_systems" || wCat === "intel_studio" || wId.includes("intel_systems") || wId.includes("intel_suite") || wLabel.includes("Intelligence Systems")) {
      return (
        <IntelligenceSystemsStudioBox
          key={widget.id}
          id={widget.id}
          bookmarks={bookmarks}
          folders={folders}
          initialColSpan={widget.colSpan || 12}
          rowSpan={widget.rowSpan || 2}
          onColSpanChange={(span) => handleWidgetColSpanChange(widget.id, span)}
          onRowSpanChange={(span) => handleWidgetRowSpanChange(widget.id, span as 1 | 2)}
          onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
        />
      );
    }

    if (wId === "studio_sites_matrix" || wCat === "sites_studio" || wId.includes("sites_matrix") || wLabel.includes("Sites Matrix")) {
      return (
        <SitesMatrixStudioBox
          key={widget.id}
          id={widget.id}
          bookmarks={bookmarks}
          folders={folders}
          initialColSpan={widget.colSpan || 12}
          rowSpan={widget.rowSpan || 2}
          onColSpanChange={(span) => handleWidgetColSpanChange(widget.id, span)}
          onRowSpanChange={(span) => handleWidgetRowSpanChange(widget.id, span as 1 | 2)}
          onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
        />
      );
    }

    if (wId === "studio_folder_tree" || wCat === "tree_studio" || wId.includes("folder_tree") || wLabel.includes("Folder Hierarchy") || wLabel.includes("Folder Tree")) {
      return (
        <FolderTreeStudioBox
          key={widget.id}
          id={widget.id}
          bookmarks={bookmarks}
          folders={folders}
          initialColSpan={widget.colSpan || 12}
          rowSpan={widget.rowSpan || 2}
          onColSpanChange={(span) => handleWidgetColSpanChange(widget.id, span)}
          onRowSpanChange={(span) => handleWidgetRowSpanChange(widget.id, span as 1 | 2)}
          onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
        />
      );
    }

    if (widget.kind === "custom" || widget.id.startsWith("custom:") || (widget as any).category || (widget as any).siteConfig || (widget as any).plotConfig || (widget as any).chartConfig || (widget as any).intelConfig) {
      const siteCfg = (widget as any).siteConfig || widget.vizConfig?.siteConfig;
      const plotCfg = (widget as any).plotConfig || widget.vizConfig?.plotConfig;
      const intelCfg = (widget as any).intelConfig || widget.vizConfig?.intelConfig;
      const chartCfg = (widget as any).chartConfig || widget.vizConfig;
      const vKind =
        (widget as any).category ||
        (siteCfg ? "sites" : plotCfg ? "plot" : intelCfg ? "intel" : widget.vizConfig?.kind || widget.vizConfig?.chartType || "chart");

      // Filter sites if siteCfg exists
      let customSiteItems = bookmarks.filter((b) => !b.isArchived);
      if (siteCfg) {
        if (siteCfg.source === "favorites") customSiteItems = customSiteItems.filter((b) => b.isFavorite);
        else if (siteCfg.source === "recent") customSiteItems = [...customSiteItems].sort((a, b) => (b.lastVisitedAt || b.createdAt || 0) - (a.lastVisitedAt || a.createdAt || 0));
        else if (siteCfg.source === "unsorted") customSiteItems = customSiteItems.filter((b) => !b.folderId);
        else if (siteCfg.source === "folder" && siteCfg.folderId) customSiteItems = customSiteItems.filter((b) => b.folderId === siteCfg.folderId);
        else if (siteCfg.source === "tag" && siteCfg.tag) customSiteItems = customSiteItems.filter((b) => (b.tags || []).some((t: any) => (typeof t === "string" ? t : t.name).toLowerCase() === siteCfg.tag.toLowerCase()));
      }

      const activeView = widgetViews[widget.id] || siteCfg?.viewMode || "grid";
      const activeLimit = widgetItemLimits[widget.id] || siteCfg?.limit || "auto";

      return (
        <DashboardWidgetBox
          key={widget.id}
          {...commonProps}
          title={widget.vizConfig?.title || widget.label || "Custom Visual"}
          icon={
            vKind === "sites" ? (
              <FolderIconRenderer icon={(widget as any).icon || "compass"} color={(widget as any).color || "#10b981"} className="h-4 w-4" />
            ) : vKind === "graph" ? (
              <Layers className="h-4 w-4 text-indigo-500" />
            ) : vKind === "tags" ? (
              <Tag className="h-4 w-4 text-pink-500" />
            ) : vKind === "wall" ? (
              <Bookmark className="h-4 w-4 text-amber-500" />
            ) : (
              <BarChart3 className="h-4 w-4 text-primary" />
            )
          }
          badgeText={String(vKind || "visual").toUpperCase()}
          viewMode={vKind === "sites" ? activeView : undefined}
          availableViews={vKind === "sites" ? ["grid", "list", "table", "compact"] : undefined}
          onViewModeChange={vKind === "sites" ? (mode) => handleSetWidgetView(widget.id, mode) : undefined}
          itemLimit={vKind === "sites" ? activeLimit : undefined}
          showItemLimitPicker={vKind === "sites"}
          onItemLimitChange={vKind === "sites" ? (lim) => handleSetWidgetLimit(widget.id, lim) : undefined}
          onEditWidget={() => handleEditCustomWidget(widget)}
          onDuplicateWidget={() => handleDuplicateCustomWidget(widget)}
          onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
          widgetConfig={widget}
        >
          <div className="p-3 flex-1 flex flex-col min-h-0">
            {vKind === "sites" || siteCfg ? (
              <div className="flex-1 min-h-[220px] overflow-y-auto">
                <BookmarkItemsView
                  items={customSiteItems}
                  mode={activeView}
                  limit={activeLimit}
                  onOpenPreview={onOpenPreview}
                  onEditBookmark={onEditBookmark}
                  onToggleFavorite={onToggleFavorite}
                  onToggleArchive={onToggleArchive}
                  onDeleteBookmark={onDeleteBookmark}
                />
              </div>
            ) : vKind === "graph" || intelCfg?.type === "graph" ? (
              <div className="w-full h-full min-h-[300px] flex-1 rounded-lg overflow-hidden border border-border">
                <KnowledgeGraph
                  mode={widget.vizConfig?.intelConfig?.folderId || intelCfg?.folderId ? "folder" : "global"}
                  folderId={widget.vizConfig?.intelConfig?.folderId || intelCfg?.folderId}
                  depth={widget.vizConfig?.intelConfig?.graphDepth ?? intelCfg?.graphDepth ?? 2}
                  showControls={false}
                  onSelectDomain={onSelectDomain}
                />
              </div>
            ) : vKind === "plot" || plotCfg ? (
              <ObservablePlotView
                data={computePlotData(bookmarks, folders, {
                  type: (plotCfg?.type as any) || "barX",
                  dimension: (plotCfg?.dimension as any) || "domain",
                  measure: (plotCfg?.measure as any) || "count",
                  group: (plotCfg?.group as any) || "none",
                  transform: (plotCfg?.transform as any) || "raw",
                  sortOrder: (plotCfg?.sortOrder as any) || "desc",
                  limit: plotCfg?.limit ?? 10,
                  colorScheme: plotCfg?.colorScheme || "tableau10",
                  curve: (plotCfg?.curve as any) || "natural",
                  showGrid: plotCfg?.showGrid ?? true,
                  showTip: plotCfg?.showTip ?? true,
                  showLegend: plotCfg?.showLegend ?? false,
                  filters: plotCfg?.filters,
                })}
                config={{
                  type: (plotCfg?.type as any) || "barX",
                  x: (plotCfg?.type === "barX" || plotCfg?.type === "stackedBarX") ? "value" : "dimension",
                  y: (plotCfg?.type === "barX" || plotCfg?.type === "stackedBarX") ? "dimension" : "value",
                  z: plotCfg?.group && plotCfg?.group !== "none" ? "group" : undefined,
                  height: 220,
                  colorScheme: plotCfg?.colorScheme || "tableau10",
                  curve: (plotCfg?.curve as any) || "natural",
                  grid: plotCfg?.showGrid ?? true,
                  tip: plotCfg?.showTip ?? true,
                  legend: plotCfg?.showLegend ?? false,
                }}
              />
            ) : vKind === "wall" || intelCfg?.type === "wall" ? (
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto p-1 bg-secondary/15 rounded-lg border border-border/40">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => onOpenPreview?.(bm)}
                    className="p-1 rounded bg-card border border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    title={bm.title}
                  >
                    <BookmarkIcon src={bm.iconUrl} alt={bm.title} domain={bm.domain} className="h-4 w-4 object-contain" />
                  </div>
                ))}
              </div>
            ) : vKind === "tags" || intelCfg?.type === "tags" ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/15 rounded-lg border border-border/40">
                {topTags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => {
                      onSelectTag?.(tag.name);
                      onSelectFolder(null);
                      onSelectView("all");
                    }}
                    className="px-2 py-0.5 rounded-md text-xs font-mono bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 flex items-center gap-1 cursor-pointer"
                  >
                    <span>#{tag.name}</span>
                    <span className="text-[10px] text-muted-foreground">({tag.count})</span>
                  </button>
                ))}
              </div>
            ) : (
              <VizChart
                config={chartCfg || widget.vizConfig || {
                  version: 1,
                  id: widget.id,
                  title: widget.label || "Visual Chart",
                  chartType: "bar",
                  dimension: "domain",
                  measure: "count",
                  filters: {},
                  sort: { by: "measure", direction: "desc" },
                  limit: 8,
                  otherBucket: true,
                }}
                bookmarks={bookmarks}
                folders={folders}
                onSelectDomain={onSelectDomain}
                onSelectTag={onSelectTag}
                onSelectFolder={onSelectFolder}
                bare={false}
              />
            )}
          </div>
        </DashboardWidgetBox>
      );
    }

    switch (widget.id) {
      case "folders":
        return (
          <DashboardWidgetBox
            key="folders"
            {...commonProps}
            title="Quick Access"
            icon={<Compass className="h-4 w-4 text-primary" />}
            badgeText={`${quickAccessList.length} sites`}
            viewMode={widgetViews["folders"] ?? "grid"}
            availableViews={["grid", "list", "compact"]}
            onViewModeChange={(m) => handleSetWidgetView("folders", m)}
            onViewAll={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            viewAllLabel="View all"
            showItemLimitPicker={true}
            itemLimit={widgetItemLimits["folders"] ?? "auto"}
            onItemLimitChange={(lim) => handleSetWidgetLimit("folders", lim)}
            onEditWidget={() => handleEditBuiltinWidget("folders")}
          >
            <BookmarkItemsView
              items={quickAccessList}
              mode={widgetViews["folders"] ?? "grid"}
              limit={widgetItemLimits["folders"] ?? "auto"}
              emptyMessage="No bookmarks available yet in Quick Access"
              onOpenPreview={onOpenPreview}
              onEditBookmark={onEditBookmark}
              onToggleArchive={onToggleArchive}
              onDeleteBookmark={onDeleteBookmark}
              handleSiteVisit={handleSiteVisit}
              formatTimeAgo={formatTimeAgo}
              getParentName={getParentName}
            />
          </DashboardWidgetBox>
        );

      case "recent":
        return (
          <DashboardWidgetBox
            key="recent"
            {...commonProps}
            title="Recently Visited"
            icon={<History className="h-4 w-4 text-blue-500" />}
            badgeText={`${recentlyVisited.length} sites`}
            viewMode={widgetViews["recent"] ?? "list"}
            availableViews={["grid", "list", "compact"]}
            onViewModeChange={(m) => handleSetWidgetView("recent", m)}
            onViewAll={() => {
              onSelectFolder(null);
              onSelectView("recent");
            }}
            viewAllLabel="View history"
            showItemLimitPicker={true}
            itemLimit={widgetItemLimits["recent"] ?? "auto"}
            onItemLimitChange={(lim) => handleSetWidgetLimit("recent", lim)}
            onEditWidget={() => handleEditBuiltinWidget("recent")}
          >
            <BookmarkItemsView
              items={recentlyVisited}
              mode={widgetViews["recent"] ?? "list"}
              limit={widgetItemLimits["recent"] ?? "auto"}
              emptyMessage="No recently visited links recorded. Click any bookmark to start building history."
              onOpenPreview={onOpenPreview}
              onEditBookmark={onEditBookmark}
              onToggleFavorite={onToggleFavorite}
              onToggleArchive={onToggleArchive}
              onDeleteBookmark={onDeleteBookmark}
              handleSiteVisit={handleSiteVisit}
              formatTimeAgo={formatTimeAgo}
              getParentName={getParentName}
            />
          </DashboardWidgetBox>
        );

      case "favorites":
        return (
          <DashboardWidgetBox
            key="favorites"
            {...commonProps}
            title="Starred Favorites"
            icon={<Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
            badgeText={totalFavoritesCount > 0 ? `${totalFavoritesCount} ${totalFavoritesCount === 1 ? "site" : "sites"}` : undefined}
            viewMode={widgetViews["favorites"] ?? "grid"}
            availableViews={["grid", "list", "compact"]}
            onViewModeChange={(m) => handleSetWidgetView("favorites", m)}
            onViewAll={() => {
              onSelectFolder(null);
              onSelectView("favorites");
            }}
            viewAllLabel="View favorites"
            showItemLimitPicker={true}
            itemLimit={widgetItemLimits["favorites"] ?? "auto"}
            onItemLimitChange={(lim) => handleSetWidgetLimit("favorites", lim)}
            onEditWidget={() => handleEditBuiltinWidget("favorites")}
          >
            <BookmarkItemsView
              items={favorites}
              mode={widgetViews["favorites"] ?? "grid"}
              limit={widgetItemLimits["favorites"] ?? "auto"}
              emptyMessage="No favorites starred yet. Click the star on any bookmark to pin it here."
              onOpenPreview={onOpenPreview}
              onEditBookmark={onEditBookmark}
              onToggleArchive={onToggleArchive}
              onDeleteBookmark={onDeleteBookmark}
              handleSiteVisit={handleSiteVisit}
              formatTimeAgo={formatTimeAgo}
              getParentName={getParentName}
            />
          </DashboardWidgetBox>
        );

      case "unsorted":
        return (
          <DashboardWidgetBox
            key="unsorted"
            {...commonProps}
            title="Inbox / Unsorted Sites"
            icon={<Inbox className="h-4 w-4 text-emerald-500" />}
            badgeText={totalUnsortedCount === 0 ? "Inbox Zero" : `${totalUnsortedCount} unfiled`}
            viewMode={widgetViews["unsorted"] ?? "compact"}
            availableViews={["grid", "list", "compact"]}
            onViewModeChange={(m) => handleSetWidgetView("unsorted", m)}
            onViewAll={() => {
              onSelectFolder(null);
              onSelectView("unsorted");
            }}
            viewAllLabel={`Open inbox (${totalUnsortedCount})`}
            showItemLimitPicker={true}
            itemLimit={widgetItemLimits["unsorted"] ?? "auto"}
            onItemLimitChange={(lim) => handleSetWidgetLimit("unsorted", lim)}
            onEditWidget={() => handleEditBuiltinWidget("unsorted")}
          >
            {totalUnsortedCount === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                <div className="text-xs font-semibold text-foreground">Inbox Zero</div>
                <p className="text-xs text-muted-foreground">
                  All bookmarks in your workspace are filed into folder collections.
                </p>
              </div>
            ) : (
              <BookmarkItemsView
                items={unorganized}
                mode={widgetViews["unsorted"] ?? "compact"}
                limit={widgetItemLimits["unsorted"] ?? "auto"}
                emptyMessage="All bookmarks organized"
                onOpenPreview={onOpenPreview}
                onEditBookmark={onEditBookmark}
                onToggleFavorite={onToggleFavorite}
                onToggleArchive={onToggleArchive}
                onDeleteBookmark={onDeleteBookmark}
                handleSiteVisit={handleSiteVisit}
                formatTimeAgo={formatTimeAgo}
                getParentName={getParentName}
              />
            )}
          </DashboardWidgetBox>
        );

      case "scratchpad":
        return (
          <DashboardWidgetBox
            key="scratchpad"
            {...commonProps}
            title="Scratchpad & Notes"
            icon={<StickyNote className="h-4 w-4 text-amber-500" />}
            badgeText="Auto-saved"
            onEditWidget={() => handleEditBuiltinWidget("scratchpad")}
          >
            <ScratchpadWidget bare={true} />
          </DashboardWidgetBox>
        );

      case "heatmap":
        return (
          <DashboardWidgetBox
            key="heatmap"
            {...commonProps}
            title="Annual Activity Heatmap"
            icon={<Calendar className="h-4 w-4 text-primary" />}
            badgeText="365 Days"
            onEditWidget={() => handleEditBuiltinWidget("heatmap")}
          >
            <ActivityHeatmap365 bookmarks={bookmarks} onOpenPreview={onOpenPreview} bare={true} />
          </DashboardWidgetBox>
        );

      case "spectrum":
        return (
          <DashboardWidgetBox
            key="spectrum"
            {...commonProps}
            title="Activity Spectrum"
            icon={<Ghost className="h-4 w-4 text-purple-500" />}
            badgeText={spectrumData.isHourly ? "24h Activity" : `${inactiveThreshold}d Division`}
            extraHeaderAction={renderDotSpectrumExtraHeader()}
            onEditWidget={() => handleEditBuiltinWidget("spectrum")}
          >
            {renderDotSpectrumContent()}
          </DashboardWidgetBox>
        );

      case "analytics":
        return (
          <DashboardWidgetBox
            key="analytics"
            {...commonProps}
            title="Workspace Analytics"
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            badgeText={`${totalCount} bookmarks`}
            onEditWidget={() => handleEditBuiltinWidget("analytics_overview")}
          >
            <div className="p-3">
              <VizChart
                config={{
                  version: 1,
                  id: "builtin_analytics_overview",
                  title: "Workspace Analytics",
                  chartType: "bar",
                  dimension: "domain",
                  measure: "count",
                  filters: {},
                  sort: { by: "measure", direction: "desc" },
                  limit: 10,
                  otherBucket: true,
                }}
                bookmarks={bookmarks}
                folders={folders}
                onSelectDomain={onSelectDomain}
                onSelectTag={onSelectTag}
                onSelectFolder={(fId) => onSelectFolder(fId)}
                bare={false}
              />
            </div>
          </DashboardWidgetBox>
        );

      case "analytics_velocity":
        return (
          <DashboardWidgetBox
            key="analytics_velocity"
            {...commonProps}
            title="Activity Velocity Momentum"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            badgeText="Bookmarks over time"
            onEditWidget={() => handleEditBuiltinWidget("analytics_velocity")}
          >
            <div className="p-3">
              <VizChart
                config={{
                  version: 1,
                  id: "builtin_velocity",
                  title: "Activity Velocity Momentum",
                  chartType: "area",
                  dimension: "created_month",
                  measure: "count",
                  filters: {},
                  sort: { by: "dimension", direction: "asc" },
                  limit: 12,
                  otherBucket: false,
                }}
                bookmarks={bookmarks}
                folders={folders}
                onSelectDomain={onSelectDomain}
                onSelectTag={onSelectTag}
                onSelectFolder={(fId) => onSelectFolder(fId)}
                bare={false}
              />
            </div>
          </DashboardWidgetBox>
        );

      case "analytics_domains":
        return (
          <DashboardWidgetBox
            key="analytics_domains"
            {...commonProps}
            title="Top Web Ecosystems"
            icon={<Globe className="h-4 w-4 text-teal-600" />}
            badgeText="Domain breakdown"
            onEditWidget={() => handleEditBuiltinWidget("analytics_domains")}
          >
            <div className="p-3">
              <VizChart
                config={{
                  version: 1,
                  id: "builtin_domains",
                  title: "Top Web Ecosystems",
                  chartType: "bar",
                  dimension: "domain",
                  measure: "count",
                  filters: {},
                  sort: { by: "measure", direction: "desc" },
                  limit: 8,
                  otherBucket: true,
                }}
                bookmarks={bookmarks}
                folders={folders}
                onSelectDomain={onSelectDomain}
                onSelectTag={onSelectTag}
                onSelectFolder={(fId) => onSelectFolder(fId)}
                bare={false}
              />
            </div>
          </DashboardWidgetBox>
        );

      case "analytics_radar":
        return (
          <DashboardWidgetBox
            key="analytics_radar"
            {...commonProps}
            title="Collection Distribution"
            icon={<Folders className="h-4 w-4 text-indigo-500" />}
            badgeText="Top-level folders"
            onEditWidget={() => handleEditBuiltinWidget("analytics_radar")}
          >
            <div className="p-3">
              <VizChart
                config={{
                  version: 1,
                  id: "builtin_radar",
                  title: "Collection Distribution",
                  chartType: "donut",
                  dimension: "folder_top",
                  measure: "count",
                  filters: {},
                  sort: { by: "measure", direction: "desc" },
                  limit: 7,
                  otherBucket: true,
                }}
                bookmarks={bookmarks}
                folders={folders}
                onSelectDomain={onSelectDomain}
                onSelectTag={onSelectTag}
                onSelectFolder={(fId) => onSelectFolder(fId)}
                bare={false}
              />
            </div>
          </DashboardWidgetBox>
        );

      case "analytics_tags":
        return (
          <DashboardWidgetBox
            key="analytics_tags"
            {...commonProps}
            title="Tag Distribution Donut"
            icon={<Tag className="h-4 w-4 text-amber-500" />}
            badgeText={`${topTags.length} tags`}
            onEditWidget={() => handleEditBuiltinWidget("analytics_tags")}
          >
            <div className="p-3">
              <VizChart
                config={{
                  version: 1,
                  id: "builtin_tags",
                  title: "Tag Distribution Donut",
                  chartType: "donut",
                  dimension: "tag",
                  measure: "count",
                  filters: {},
                  sort: { by: "measure", direction: "desc" },
                  limit: 8,
                  otherBucket: true,
                }}
                bookmarks={bookmarks}
                folders={folders}
                onSelectDomain={onSelectDomain}
                onSelectTag={onSelectTag}
                onSelectFolder={(fId) => onSelectFolder(fId)}
                bare={false}
              />
            </div>
          </DashboardWidgetBox>
        );

      case "tags":
        return (
          <DashboardWidgetBox
            key="tags"
            {...commonProps}
            title="Workspace Topics & Tags"
            icon={<Tag className="h-4 w-4 text-muted-foreground" />}
            badgeText={`${topTags.length} topics`}
            onViewAll={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            viewAllLabel="Browse all"
          >
            <div className="p-4 space-y-3">
              {topTags.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No tags added yet. Add tags to bookmarks to see topics here.
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {topTags.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => {
                        onSelectTag?.(tag.name);
                        onSelectFolder(null);
                        onSelectView("all");
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:border-border-hover hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {tag.name}
                      </span>
                      <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono tabular-nums">
                        {tag.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DashboardWidgetBox>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3.5 pb-8 animate-in fade-in duration-300">
      {/* Workspace Hero Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground border border-border inline-flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-muted-foreground" />
                Workspace Overview
              </span>
              <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Markly Workspace
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Centralized bookmark library. Jump into collections, review recent discoveries, or organize unfiled items.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              onClick={onOpenAddModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-3 h-8 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Bookmark</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("all");
              }}
              className="text-xs h-8 px-3 rounded-lg border-border cursor-pointer flex items-center gap-1.5"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Browse All Sites ({totalCount})</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingUniversalConfig(null);
                setUniversalModalOpen(true);
              }}
              className="text-xs h-8 px-2.5 rounded-lg border-border cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              title="Add a custom visual chart, Observable plot, or site collection to your homepage"
            >
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Add Visual</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setLayoutModalOpen(true)}
              className="text-xs h-8 px-2.5 rounded-lg border-border cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              title="Customize widget order, visibility and column layout"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Layout</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setPresetHubOpen(true)}
              className="text-xs h-8 px-2.5 rounded-lg border-border cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              title="Open Universal Presets &amp; Layout Hub to switch, save, and delete presets"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              <span>Presets</span>
            </Button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="View all active bookmarks"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-primary transition-colors">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Active bookmarks</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("collections");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="Browse folder collections"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <FolderIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-primary transition-colors">{folderCollectionsCount}</div>
              <div className="text-xs text-muted-foreground">Folder collections</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="Inspect link health"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-emerald-500 transition-colors">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-emerald-500 transition-colors">{healthPercent}%</div>
              <div className="text-xs text-muted-foreground">Reachable & healthy</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("favorites");
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors text-left outline-none focus:outline-none group"
            title="Open starred favorites"
          >
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-amber-500 transition-colors">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold font-mono tabular-nums text-foreground group-hover:text-amber-500 transition-colors">{totalFavoritesCount}</div>
              <div className="text-xs text-muted-foreground">Starred favorites</div>
            </div>
          </button>
        </div>

        {/* Instant Entire DB Search Bar */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="markly-home-search-input"
              type="text"
              value={homeSearch}
              onChange={(e) => setHomeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && homeSearch.trim()) {
                  if (onSearchJump) {
                    onSearchJump(homeSearch.trim());
                  } else {
                    onSelectFolder(null);
                    onSelectView("all");
                  }
                }
              }}
              placeholder={`Search entire library (${bookmarks.length} bookmarks, tags, URLs, notes... Press Enter to view in table or / to focus)`}
              className="w-full pl-9 pr-28 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground shadow-2xs"
            />
            {homeSearch.trim() && (
              <button
                type="button"
                onClick={() => {
                  if (onSearchJump) {
                    onSearchJump(homeSearch.trim());
                  } else {
                    onSelectFolder(null);
                    onSelectView("all");
                  }
                }}
                className="absolute right-1.5 top-1.5 px-2.5 py-1 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
              >
                <span>Search All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Instant Matches Dropdown Preview */}
          {homeSearchResults.length > 0 && (
            <div className="mt-2 p-2 rounded-xl border border-border bg-card shadow-lg space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground flex items-center justify-between border-b border-border/60 pb-1">
                <span>Matching bookmarks across database ({homeSearchResults.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchJump) {
                      onSearchJump(homeSearch.trim());
                    } else {
                      onSelectFolder(null);
                      onSelectView("all");
                    }
                  }}
                  className="text-primary hover:underline cursor-pointer font-medium text-[11px]"
                >
                  View all results in Table →
                </button>
              </div>
              {homeSearchResults.slice(0, 5).map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookmarkIcon src={bm.iconUrl} domain={bm.domain} alt={bm.title} className="h-4 w-4 rounded flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-foreground truncate hover:text-primary">{bm.title}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{bm.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {bm.tags?.slice(0, 2).map((t) => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                        #{t.name}
                      </span>
                    ))}
                    <ExternalLink
                      className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSiteVisit(bm);
                        window.open(bm.url, "_blank");
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty Database State Banner */}
      {bookmarks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground shadow-xs">
            <Bookmark className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {user ? "Your Cloud Database is Ready & Clean" : "Welcome to Markly"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {user
                ? "You are signed in with a fresh personal database synced with Supabase. Add your first bookmark or import existing bookmarks to get started!"
                : "You are browsing in guest mode. Add bookmarks to test locally, or sign in to sync your library across devices permanently."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={onOpenAddModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-8 px-3 rounded-lg cursor-pointer shadow-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Bookmark</span>
            </Button>
          </div>
        </div>
      )}

      {/* Dynamic User-Customizable Homepage Widgets */}
      {(() => {
        const visibleWidgets = homeWidgets.filter((w) => w.visible);
        if (visibleWidgets.length === 0) {
          return (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-3">
              <p className="text-sm font-medium text-foreground">All dashboard widgets are currently hidden or removed.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You can restore default widgets, customize your layout, or import rich visual charts from the Visuals Studio.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLayoutModalOpen(true)}
                  className="text-xs cursor-pointer"
                >
                  Customize Layout
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSelectView("visuals" as any)}
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Import from Visuals Studio</span>
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 w-full items-start [grid-auto-flow:dense]">
            {visibleWidgets.map((widget, idx) =>
              renderWidget(widget, idx, idx === 0, idx === visibleWidgets.length - 1)
            )}
          </div>
        );
      })()}


      {/* 6. Tags & Categories Explorer (Only shown if not already added as a layout widget) */}
      {topTags.length > 0 && !homeWidgets.some((w) => w.id === "tags" && w.visible) && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-secondary text-muted-foreground flex items-center justify-center">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Workspace Topics & Tags</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {topTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => {
                  onSelectTag?.(tag.name);
                  onSelectFolder(null);
                  onSelectView("all");
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:border-border-hover hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <Hash className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {tag.name}
                </span>
                <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono tabular-nums">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Homepage Layout Customizer Modal (1.2) */}
      <HomeLayoutModal
        open={layoutModalOpen}
        onOpenChange={setLayoutModalOpen}
        widgets={homeWidgets}
        onSaveWidgets={handleSaveWidgets}
        onResetDefaults={handleResetWidgets}
      />

      {/* Universal Visual Studio Builder & Editor Modal */}
      <UniversalVisualBuilderModal
        open={universalModalOpen}
        onOpenChange={setUniversalModalOpen}
        initialConfig={editingUniversalConfig}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveUniversalVisual}
        destinationName="Dashboard Home"
      />

      {/* Universal Preset & Layout Hub */}
      <UniversalPresetHub
        open={presetHubOpen}
        onOpenChange={setPresetHubOpen}
        activeCategory="home"
      />

      {/* Modern In-App Notification Toast */}
      {homeNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <AlertCircle className="h-4 w-4" />
          <span>{homeNotice}</span>
        </div>
      )}
    </div>
  );
}
