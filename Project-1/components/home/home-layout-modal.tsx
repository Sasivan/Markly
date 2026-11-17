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
  SlidersHorizontal,
  RotateCcw,
  Check,
  GripVertical,
  Eye,
  EyeOff,
  Activity,
  FileEdit,
  Folder,
  Clock,
  Star,
  Inbox,
  Hash,
  Zap,
  TrendingUp,
  Compass,
  PieChart,
  Globe,
  Plus,
  BarChart3,
  Columns3,
  Rows3,
} from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";

export type HomeWidgetKey =
  | "heatmap"
  | "scratchpad"
  | "folders"
  | "recent"
  | "favorites"
  | "unsorted"
  | "spectrum"
  | "analytics"
  | "analytics_velocity"
  | "analytics_radar"
  | "analytics_tags"
  | "analytics_domains"
  | "tags"
  | (string & {});

export type HomeWidgetKind = "builtin" | "custom";
export type WidgetColSpan = 2 | 3 | 4 | 6 | 8 | 9 | 12;

export interface HomeWidgetConfig {
  id: string; // HomeWidgetKey or "custom:<uuid>"
  label: string;
  visible: boolean;
  kind?: HomeWidgetKind;
  vizConfig?: any; // VizConfig
  span?: "1" | "2"; // 1 = Half Width, 2 = Full Width (legacy)
  colSpan?: WidgetColSpan; // 2..12 column track span
  rowSpan?: 1 | 2; // 1 = standard height, 2 = tall (spans 2 rows)
  icon?: string;
  color?: string;
  category?: string;
  siteConfig?: any;
  plotConfig?: any;
  chartConfig?: any;
  intelConfig?: any;
}

export const DEFAULT_HOME_WIDGETS: HomeWidgetConfig[] = [
  { id: "heatmap", label: "365-Day Activity Heatmap", visible: true, span: "2", colSpan: 12 },
  { id: "scratchpad", label: "Quick Scratchpad", visible: true, span: "1", colSpan: 6 },
  { id: "folders", label: "Quick Access Folders", visible: true, span: "1", colSpan: 6 },
  { id: "recent", label: "Recently Visited Sites", visible: true, span: "1", colSpan: 6 },
  { id: "favorites", label: "Starred Favorites", visible: true, span: "1", colSpan: 6 },
  { id: "unsorted", label: "Inbox / Unsorted Bookmarks", visible: true, span: "1", colSpan: 6 },
  { id: "tags", label: "Workspace Topics & Tags", visible: true, span: "1", colSpan: 6 },
  { id: "spectrum", label: "Inactivity Dot Spectrum", visible: true, span: "2", colSpan: 12 },
  { id: "analytics_velocity", label: "Activity Velocity Momentum", visible: true, span: "2", colSpan: 12 },
  { id: "analytics_domains", label: "Top Web Ecosystems", visible: true, span: "1", colSpan: 4 },
  { id: "analytics_radar", label: "Category Fingerprint Radar", visible: true, span: "1", colSpan: 4 },
  { id: "analytics_tags", label: "Tag Distribution Donut", visible: true, span: "1", colSpan: 4 },
];

interface HomeLayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: HomeWidgetConfig[];
  onSaveWidgets: (widgets: HomeWidgetConfig[]) => void;
  onResetDefaults: () => void;
}

export function HomeLayoutModal({
  open,
  onOpenChange,
  widgets,
  onSaveWidgets,
  onResetDefaults,
}: HomeLayoutModalProps) {
  const [localWidgets, setLocalWidgets] = React.useState<HomeWidgetConfig[]>(widgets);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  // Adaptive Resizable Modal state with custom width & height persisted
  const { modalStyle, hasCustomSize, handleRestoreDefaults, startResize } = useResizableModal({
    modalId: "home_layout",
    defaultVerticalWidth: 640,
    defaultHorizontalWidth: 980,
    defaultVerticalHeight: 700,
    defaultHorizontalHeight: 660,
  });

  React.useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets, open]);

  const toggleVisibility = (id: HomeWidgetKey) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const cycleColSpan = (id: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const current = w.colSpan ?? (w.span === "2" ? 12 : 6);
        // Cycle: 12 (Full) -> 6 (Half) -> 4 (1/3) -> 3 (1/4) -> 12
        const order: WidgetColSpan[] = [12, 6, 4, 3];
        const idx = order.indexOf(current);
        const next = idx !== -1 && idx < order.length - 1 ? order[idx + 1] : order[0];
        return { ...w, colSpan: next, span: next === 12 ? "2" : "1" };
      })
    );
  };

  const setWidgetColSpan = (id: string, colSpan: WidgetColSpan) => {
    setLocalWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        return { ...w, colSpan, span: colSpan === 12 ? "2" : "1" };
      })
    );
  };

  const toggleRowSpan = (id: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const current = w.rowSpan || 1;
        const next: 1 | 2 = current === 1 ? 2 : 1;
        return { ...w, rowSpan: next };
      })
    );
  };

  const [resizingBoxId, setResizingBoxId] = React.useState<string | null>(null);

  const startBoxResize = (
    widgetId: string,
    direction: "width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw",
    startEvent: React.MouseEvent
  ) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    setResizingBoxId(widgetId);

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const targetCard = startEvent.currentTarget.closest(".layout-widget-card") as HTMLElement | null;
    const gridContainer = targetCard?.parentElement;
    const gridWidth = gridContainer ? gridContainer.getBoundingClientRect().width : 800;
    const initialWidth = targetCard ? targetCard.getBoundingClientRect().width : 200;

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    if (direction === "width" || direction === "e" || direction === "w") document.body.style.cursor = "ew-resize";
    else if (direction === "height" || direction === "s" || direction === "n") document.body.style.cursor = "ns-resize";
    else if (direction === "ne" || direction === "sw") document.body.style.cursor = "nesw-resize";
    else document.body.style.cursor = "nwse-resize";

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Horizontal resize (from right or left)
      if (
        direction === "width" ||
        direction === "both" ||
        direction === "e" ||
        direction === "se" ||
        direction === "ne"
      ) {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(60, initialWidth + deltaX);
        const fraction = newWidth / gridWidth;
        const rawCols = Math.round(fraction * 12);
        const validSpans: WidgetColSpan[] = [2, 3, 4, 6, 8, 9, 12];
        let closest = validSpans[0];
        let minDiff = Math.abs(closest - rawCols);
        for (const s of validSpans) {
          const diff = Math.abs(s - rawCols);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        setLocalWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId
              ? { ...w, colSpan: closest, span: closest === 12 ? "2" : "1" }
              : w
          )
        );
      } else if (direction === "w" || direction === "sw" || direction === "nw") {
        const deltaX = startX - moveEvent.clientX;
        const newWidth = Math.max(60, initialWidth + deltaX);
        const fraction = newWidth / gridWidth;
        const rawCols = Math.round(fraction * 12);
        const validSpans: WidgetColSpan[] = [2, 3, 4, 6, 8, 9, 12];
        let closest = validSpans[0];
        let minDiff = Math.abs(closest - rawCols);
        for (const s of validSpans) {
          const diff = Math.abs(s - rawCols);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        setLocalWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId
              ? { ...w, colSpan: closest, span: closest === 12 ? "2" : "1" }
              : w
          )
        );
      }

      // Vertical resize (from bottom or top)
      if (
        direction === "height" ||
        direction === "both" ||
        direction === "s" ||
        direction === "se" ||
        direction === "sw"
      ) {
        const deltaY = moveEvent.clientY - startY;
        const newRowSpan: 1 | 2 = deltaY > 30 ? 2 : 1;
        setLocalWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, rowSpan: newRowSpan } : w
          )
        );
      } else if (direction === "n" || direction === "ne" || direction === "nw") {
        const deltaY = startY - moveEvent.clientY;
        const newRowSpan: 1 | 2 = deltaY > 30 ? 2 : 1;
        setLocalWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, rowSpan: newRowSpan } : w
          )
        );
      }
    };

    const onMouseUp = () => {
      setResizingBoxId(null);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setLocalWidgets((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = () => {
    onSaveWidgets(localWidgets);
    onOpenChange(false);
  };

  const getWidgetIcon = (id: string) => {
    if (id.startsWith("custom:")) {
      return <BarChart3 className="h-4 w-4 text-primary shrink-0" />;
    }
    switch (id) {
      case "heatmap":
        return <Activity className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "scratchpad":
        return <FileEdit className="h-4 w-4 text-primary shrink-0" />;
      case "folders":
        return <Folder className="h-4 w-4 text-blue-500 shrink-0" />;
      case "recent":
        return <Clock className="h-4 w-4 text-cyan-500 shrink-0" />;
      case "favorites":
        return <Star className="h-4 w-4 text-amber-500 shrink-0" />;
      case "unsorted":
        return <Inbox className="h-4 w-4 text-purple-500 shrink-0" />;
      case "tags":
        return <Hash className="h-4 w-4 text-pink-500 shrink-0" />;
      case "spectrum":
        return <Zap className="h-4 w-4 text-indigo-500 shrink-0" />;
      case "analytics_velocity":
        return <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "analytics_domains":
        return <Globe className="h-4 w-4 text-blue-500 shrink-0" />;
      case "analytics_radar":
        return <Compass className="h-4 w-4 text-violet-500 shrink-0" />;
      case "analytics_tags":
        return <PieChart className="h-4 w-4 text-orange-500 shrink-0" />;
      default:
        return <BarChart3 className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative flex flex-col bg-card border border-border p-5 text-foreground overflow-hidden max-w-[95vw] max-h-[92vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="space-y-1 pb-2.5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Homepage Box Layout & Reordering
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Multi-column board mirroring your homepage. Drag any box to any slot (1 box right, 2 boxes right, or across N positions).
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border hidden sm:inline-block">
                {localWidgets.filter((w) => w.visible).length} / {localWidgets.length} visible
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Visual Multi-Column Layout Grid (N-to-N Drag and Drop matching Homepage) */}
        <div className="overflow-y-auto flex-1 pr-1.5 py-3">
          <div className="grid grid-cols-12 gap-2.5 w-full">
            {localWidgets.map((widget, index) => {
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index && draggedIndex !== index;
              const currentSpan = widget.colSpan ?? (widget.span === "2" ? 12 : 6);

              const colSpanClass = {
                2: "col-span-12 sm:col-span-2",
                3: "col-span-12 sm:col-span-3",
                4: "col-span-12 sm:col-span-4",
                6: "col-span-12 sm:col-span-6",
                8: "col-span-12 sm:col-span-8",
                9: "col-span-12 sm:col-span-9",
                12: "col-span-12",
              }[currentSpan] || "col-span-12 sm:col-span-6";

              const spanLabel = {
                12: "Full (100%)",
                9: "3/4 (75%)",
                8: "2/3 (67%)",
                6: "1/2 (50%)",
                4: "1/3 (33%)",
                3: "1/4 (25%)",
                2: "1/6 (16%)",
              }[currentSpan] || `${currentSpan}/12`;

              return (
                <div
                  key={widget.id}
                  draggable={!resizingBoxId}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`layout-widget-card group/card relative p-3 rounded-xl border text-xs transition-all select-none cursor-grab active:cursor-grabbing flex flex-col justify-between gap-2.5 ${
                    widget.rowSpan === 2 ? "min-h-[140px]" : "min-h-[96px]"
                  } ${colSpanClass} ${
                    isDragging
                      ? "opacity-30 border-dashed border-primary scale-95"
                      : isOver
                      ? "ring-2 ring-primary border-primary bg-primary/10 scale-[1.01] shadow-md"
                      : resizingBoxId === widget.id
                      ? "ring-2 ring-primary border-primary bg-primary/10 shadow-md"
                      : widget.visible
                      ? "bg-secondary/40 border-border hover:border-border-hover hover:bg-secondary/70 shadow-2xs"
                      : "bg-muted/20 border-border/40 opacity-55"
                  }`}
                >
                  {/* Top Bar: Icon, Name, and Position Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-md bg-background border border-border shrink-0 shadow-2xs">
                        {getWidgetIcon(widget.id)}
                      </div>
                      <div className="min-w-0">
                        <span className={`font-semibold text-xs truncate block ${widget.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>
                          {widget.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Slot #{index + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground/60 group-hover/card:text-foreground cursor-grab" />
                    </div>
                  </div>

                  {/* Bottom Controls Bar: Visibility and Direct Dimension Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] gap-1.5 relative z-10">
                    {/* Visibility Switch */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(widget.id);
                      }}
                      className={`px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
                        widget.visible
                          ? "bg-background border-border text-foreground hover:bg-accent"
                          : "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                      }`}
                      title={widget.visible ? "Hide this box" : "Show this box"}
                    >
                      {widget.visible ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3" />}
                      <span>{widget.visible ? "Active" : "Hidden"}</span>
                    </button>

                    {/* Resizable Dimension Status Badge (Click to cycle width) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleColSpan(widget.id);
                      }}
                      className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background px-2 py-0.5 rounded-md border border-border/60 cursor-pointer transition-colors shadow-2xs"
                      title="Click to cycle width, or drag right/bottom edges to resize directly"
                    >
                      <span className="font-semibold text-foreground">{spanLabel}</span>
                      <span className="opacity-40">•</span>
                      <span className={widget.rowSpan === 2 ? "text-primary font-bold" : ""}>
                        {widget.rowSpan === 2 ? "2x Tall" : "1x"}
                      </span>
                    </button>
                  </div>

                  {/* Right Edge: Horizontal Width Resize (East) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "e", e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      cycleColSpan(widget.id);
                    }}
                    className="absolute top-1 -right-1.5 bottom-1 w-3 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag right edge to resize column width (Double-click to cycle)"
                  >
                    <div
                      className={`w-1 h-8 rounded-full transition-all ${
                        resizingBoxId === widget.id
                          ? "bg-primary w-1.5 shadow-sm"
                          : "bg-muted-foreground/50 hover:bg-primary hover:w-1.5"
                      }`}
                    />
                  </div>

                  {/* Left Edge: Horizontal Width Resize (West) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "w", e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      cycleColSpan(widget.id);
                    }}
                    className="absolute top-1 -left-1.5 bottom-1 w-3 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag left edge to resize column width"
                  >
                    <div
                      className={`w-1 h-8 rounded-full transition-all ${
                        resizingBoxId === widget.id
                          ? "bg-primary w-1.5 shadow-sm"
                          : "bg-muted-foreground/50 hover:bg-primary hover:w-1.5"
                      }`}
                    />
                  </div>

                  {/* Bottom Edge: Height Resize (South) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "s", e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      toggleRowSpan(widget.id);
                    }}
                    className="absolute -bottom-1.5 left-1 right-1 h-3 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag bottom edge to toggle 1x standard / 2x Bento tall"
                  >
                    <div
                      className={`h-1 w-12 rounded-full transition-all ${
                        resizingBoxId === widget.id
                          ? "bg-primary h-1.5 shadow-sm"
                          : "bg-muted-foreground/50 hover:bg-primary hover:h-1.5"
                      }`}
                    />
                  </div>

                  {/* Top Edge: Height Resize (North) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "n", e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      toggleRowSpan(widget.id);
                    }}
                    className="absolute -top-1.5 left-1 right-1 h-3 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag top edge to resize height"
                  >
                    <div
                      className={`h-1 w-12 rounded-full transition-all ${
                        resizingBoxId === widget.id
                          ? "bg-primary h-1.5 shadow-sm"
                          : "bg-muted-foreground/50 hover:bg-primary hover:h-1.5"
                      }`}
                    />
                  </div>

                  {/* Bottom-Right Corner (South-East) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "se", e)}
                    className="absolute -bottom-1 -right-1 w-5 h-5 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag corner to freely resize width and height"
                  >
                    <svg className="w-3 h-3 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="14" cy="14" r="1.5" />
                      <circle cx="9" cy="14" r="1.5" />
                      <circle cx="14" cy="9" r="1.5" />
                      <circle cx="4" cy="14" r="1.5" />
                      <circle cx="9" cy="9" r="1.5" />
                      <circle cx="14" cy="4" r="1.5" />
                    </svg>
                  </div>

                  {/* Bottom-Left Corner (South-West) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "sw", e)}
                    className="absolute -bottom-1 -left-1 w-5 h-5 cursor-nesw-resize z-30 flex items-end justify-start p-0.5 opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag corner to freely resize width and height"
                  >
                    <svg className="w-3 h-3 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="2" cy="14" r="1.5" />
                      <circle cx="7" cy="14" r="1.5" />
                      <circle cx="2" cy="9" r="1.5" />
                      <circle cx="12" cy="14" r="1.5" />
                      <circle cx="7" cy="9" r="1.5" />
                      <circle cx="2" cy="4" r="1.5" />
                    </svg>
                  </div>

                  {/* Top-Right Corner (North-East) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "ne", e)}
                    className="absolute -top-1 -right-1 w-5 h-5 cursor-nesw-resize z-30 flex items-start justify-end p-0.5 opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag corner to freely resize width and height"
                  >
                    <svg className="w-3 h-3 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="14" cy="2" r="1.5" />
                      <circle cx="9" cy="2" r="1.5" />
                      <circle cx="14" cy="7" r="1.5" />
                      <circle cx="4" cy="2" r="1.5" />
                      <circle cx="9" cy="7" r="1.5" />
                      <circle cx="14" cy="12" r="1.5" />
                    </svg>
                  </div>

                  {/* Top-Left Corner (North-West) */}
                  <div
                    onMouseDown={(e) => startBoxResize(widget.id, "nw", e)}
                    className="absolute -top-1 -left-1 w-5 h-5 cursor-nwse-resize z-30 flex items-start justify-start p-0.5 opacity-0 group-hover/card:opacity-100 hover:!opacity-100 transition-opacity select-none"
                    title="Drag corner to freely resize width and height"
                  >
                    <svg className="w-3 h-3 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="2" cy="2" r="1.5" />
                      <circle cx="7" cy="2" r="1.5" />
                      <circle cx="2" cy="7" r="1.5" />
                      <circle cx="12" cy="2" r="1.5" />
                      <circle cx="7" cy="7" r="1.5" />
                      <circle cx="2" cy="12" r="1.5" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Presets to Add or Restore */}
        {DEFAULT_HOME_WIDGETS.some((def) => !localWidgets.some((w) => w.id === def.id)) && (
          <div className="pt-2 pb-1 border-t border-border/60">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Add / Restore Deleted Presets</span>
              <span className="text-[10px] font-normal lowercase">click to add back to board</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {DEFAULT_HOME_WIDGETS.filter((def) => !localWidgets.some((w) => w.id === def.id)).map((def) => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setLocalWidgets((prev) => [...prev, def])}
                  className="px-2 py-1 rounded-md text-xs font-medium border border-border bg-secondary/50 hover:bg-secondary text-foreground flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="h-3 w-3 text-primary" />
                  <span>{def.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Layout</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
