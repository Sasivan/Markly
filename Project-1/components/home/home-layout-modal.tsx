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
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative p-3 rounded-xl border text-xs transition-all select-none cursor-grab active:cursor-grabbing flex flex-col justify-between gap-2.5 min-h-[96px] ${colSpanClass} ${
                    isDragging
                      ? "opacity-30 border-dashed border-primary scale-95"
                      : isOver
                      ? "ring-2 ring-primary border-primary bg-primary/10 scale-[1.01] shadow-md"
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
                      <GripVertical className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground cursor-grab" />
                    </div>
                  </div>

                  {/* Bottom Controls Bar: Visibility and Column Track Width */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] gap-1.5">
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

                    <div className="flex items-center gap-1">
                      {/* Height: 1x vs 2x Tall */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowSpan(widget.id);
                        }}
                        className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors font-mono text-[10px] ${
                          widget.rowSpan === 2
                            ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                        title={widget.rowSpan === 2 ? "2x Tall (Spans 2 stacked rows)" : "1x Standard height. Click to make 2x tall"}
                      >
                        <Rows3 className="h-3 w-3" />
                        <span>{widget.rowSpan === 2 ? "2x Tall" : "1x"}</span>
                      </button>

                      {/* Column Width Selector */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleColSpan(widget.id);
                        }}
                        className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-accent text-foreground flex items-center gap-1 cursor-pointer transition-colors font-mono"
                        title={`Width: ${spanLabel}. Click to cycle: Full -> Half -> 1/3 -> 1/4 -> Full`}
                      >
                        <Columns3 className="h-3 w-3 text-muted-foreground" />
                        <span>{spanLabel}</span>
                      </button>
                    </div>
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
