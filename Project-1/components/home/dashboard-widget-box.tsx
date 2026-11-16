"use client";

import * as React from "react";
import {
  GripVertical,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List,
  Rows3,
  ArrowRight,
  Star,
  ExternalLink,
  Archive,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Columns3,
  Check,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Sparkles,
  Plus,
  Minus,
} from "lucide-react";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import type { BookmarkWithDetails } from "@/server/db/schema";
import type { WidgetColSpan } from "./home-layout-modal";

export type WidgetViewMode = "grid" | "list" | "compact";
export type WidgetItemLimit = number | "all" | "auto";

export interface WidgetBoxContextType {
  colSpan: WidgetColSpan;
  rowSpan: number;
  boxHeight: number | null;
}

export const WidgetBoxContext = React.createContext<WidgetBoxContextType>({
  colSpan: 6,
  rowSpan: 1,
  boxHeight: null,
});

interface DashboardWidgetBoxProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badgeText?: string | number;
  span?: "1" | "2";
  colSpan?: WidgetColSpan;
  initialColSpan?: WidgetColSpan;
  minHeight?: number;
  onColSpanChange?: (span: WidgetColSpan) => void;
  rowSpan?: 1 | 2;
  onRowSpanChange?: (span: 1 | 2) => void;
  viewMode?: WidgetViewMode;
  availableViews?: WidgetViewMode[];
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onToggleSpan?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onViewAll?: () => void;
  viewAllLabel?: string;
  extraHeaderAction?: React.ReactNode;
  onEditWidget?: () => void;
  onDuplicateWidget?: () => void;
  onDeleteWidget?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  showItemLimitPicker?: boolean;
  itemLimit?: WidgetItemLimit;
  onItemLimitChange?: (limit: WidgetItemLimit) => void;
  children: React.ReactNode;
}

export function DashboardWidgetBox({
  id,
  title,
  icon,
  badgeText,
  span = "1",
  colSpan,
  initialColSpan,
  minHeight,
  onColSpanChange,
  rowSpan,
  onRowSpanChange,
  viewMode,
  availableViews,
  onViewModeChange,
  onToggleSpan,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onViewAll,
  viewAllLabel = "View all",
  extraHeaderAction,
  onEditWidget,
  onDuplicateWidget,
  onDeleteWidget,
  onDragStart,
  onDragOver,
  onDrop,
  showItemLimitPicker,
  itemLimit,
  onItemLimitChange,
  children,
}: DashboardWidgetBoxProps) {
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("markly_box_collapsed_" + id) === "true";
      } catch {}
    }
    return false;
  });

  // Track Column Span (2 to 12 cols, persisted in localStorage)
  const [colSpanState, setColSpanState] = React.useState<WidgetColSpan>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_box_colspan_" + id);
        if (stored) {
          const val = Number(stored);
          if ([2, 3, 4, 6, 8, 9, 12].includes(val)) return val as WidgetColSpan;
        }
        const legacyW = localStorage.getItem("markly_box_w_" + id);
        if (legacyW) {
          const val = Number(legacyW);
          if (val >= 90) return 12;
          if (val >= 70) return 9;
          if (val >= 58) return 8;
          if (val >= 42) return 6;
          if (val >= 28) return 4;
          if (val >= 20) return 3;
          return 2;
        }
      } catch {}
    }
    if (colSpan) return colSpan;
    if (initialColSpan) return initialColSpan;
    return span === "2" ? 12 : 6;
  });

  React.useEffect(() => {
    if (colSpan && colSpan !== colSpanState) {
      setColSpanState(colSpan);
    }
  }, [colSpan]);

  // Track Row Span (1 or 2 rows tall, persisted in localStorage)
  const [rowSpanState, setRowSpanState] = React.useState<1 | 2>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_box_rowspan_" + id);
        if (stored === "2" || stored === "1") return Number(stored) as 1 | 2;
      } catch {}
    }
    return rowSpan || 1;
  });

  React.useEffect(() => {
    if (rowSpan && rowSpan !== rowSpanState) {
      setRowSpanState(rowSpan);
    }
  }, [rowSpan]);

  const toggleRowSpan = () => {
    const next: 1 | 2 = rowSpanState === 1 ? 2 : 1;
    setRowSpanState(next);
    try {
      localStorage.setItem("markly_box_rowspan_" + id, String(next));
    } catch {}
    onRowSpanChange?.(next);
  };

  // User-Customizable Box Height (Persisted in localStorage)
  const [boxHeight, setBoxHeight] = React.useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_box_h_" + id);
        if (stored) {
          const val = Number(stored);
          if (!isNaN(val) && val >= 140 && val <= 1600) return val;
        }
      } catch {}
    }
    return null;
  });

  const boxRef = React.useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = React.useState<"width" | "height" | "both" | null>(null);
  const [colMenuOpen, setColMenuOpen] = React.useState(false);
  const colMenuRef = React.useRef<HTMLDivElement>(null);

  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);

  const [limitMenuOpen, setLimitMenuOpen] = React.useState(false);
  const limitMenuRef = React.useRef<HTMLDivElement>(null);

  const [internalLimit, setInternalLimit] = React.useState<WidgetItemLimit>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_box_item_limit_" + id);
        if (stored) {
          if (stored === "all") return "all";
          if (stored === "auto") return "auto";
          const num = Number(stored);
          if (!isNaN(num) && num > 0) return num;
        }
      } catch {}
    }
    return itemLimit ?? "auto";
  });

  const activeLimit = itemLimit ?? internalLimit;

  const handleSelectLimit = (lim: WidgetItemLimit, shouldClose = false) => {
    setInternalLimit(lim);
    try {
      localStorage.setItem("markly_box_item_limit_" + id, String(lim));
    } catch {}
    onItemLimitChange?.(lim);
    if (shouldClose) {
      setLimitMenuOpen(false);
    }
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setColMenuOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
      if (limitMenuRef.current && !limitMenuRef.current.contains(event.target as Node)) {
        setLimitMenuOpen(false);
      }
    }
    if (colMenuOpen || actionMenuOpen || limitMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [colMenuOpen, actionMenuOpen, limitMenuOpen]);

  const startResize = React.useCallback(
    (direction: "width" | "height" | "both", startEvent: React.MouseEvent) => {
      startEvent.preventDefault();
      startEvent.stopPropagation();
      setIsResizing(direction);

      const startX = startEvent.clientX;
      const startY = startEvent.clientY;
      const boxElem = boxRef.current;
      if (!boxElem) return;

      const parentElem = boxElem.parentElement;
      const parentWidth = parentElem ? parentElem.getBoundingClientRect().width : window.innerWidth;
      const initialBoxRect = boxElem.getBoundingClientRect();
      const initialWidthPx = initialBoxRect.width;
      const initialHeightPx = initialBoxRect.height;
      let lastSpan: WidgetColSpan = colSpanState;

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      if (direction === "width") document.body.style.cursor = "ew-resize";
      else if (direction === "height") document.body.style.cursor = "ns-resize";
      else document.body.style.cursor = "nwse-resize";

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (direction === "width" || direction === "both") {
          const deltaX = moveEvent.clientX - startX;
          const newWidthPx = Math.max(120, initialWidthPx + deltaX);
          const fraction = newWidthPx / parentWidth;
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
          lastSpan = closest;
          setColSpanState(closest);
        }

        if (direction === "height" || direction === "both") {
          const deltaY = moveEvent.clientY - startY;
          const newHeightPx = Math.min(1600, Math.max(140, Math.round(initialHeightPx + deltaY)));
          setBoxHeight(newHeightPx);
          if (newHeightPx >= 350) {
            setRowSpanState(2);
            onRowSpanChange?.(2);
            try {
              localStorage.setItem("markly_box_rowspan_" + id, "2");
            } catch {}
          } else {
            setRowSpanState(1);
            onRowSpanChange?.(1);
            try {
              localStorage.setItem("markly_box_rowspan_" + id, "1");
            } catch {}
          }
        }
      };

      const onMouseUp = () => {
        setIsResizing(null);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        try {
          localStorage.setItem("markly_box_colspan_" + id, String(lastSpan));
          onColSpanChange?.(lastSpan);
          setBoxHeight((currH) => {
            if (currH !== null) {
              localStorage.setItem("markly_box_h_" + id, String(currH));
            }
            return currH;
          });
        } catch {}
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [id, colSpanState, onColSpanChange]
  );

  const [viewBoxMenuOpen, setViewBoxMenuOpen] = React.useState(false);
  const viewBoxMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewBoxMenuRef.current && !viewBoxMenuRef.current.contains(event.target as Node)) {
        setViewBoxMenuOpen(false);
      }
    }
    if (viewBoxMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [viewBoxMenuOpen]);

  const toggleCollapsed = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("markly_box_collapsed_" + id, String(next));
      } catch {}
      return next;
    });
  };

  const handleCycleColSpan = () => {
    const cycleOrder: WidgetColSpan[] = [12, 6, 4, 3];
    const currentIdx = cycleOrder.indexOf(colSpanState);
    const nextSpan = currentIdx !== -1 && currentIdx < cycleOrder.length - 1 ? cycleOrder[currentIdx + 1] : cycleOrder[0];
    setColSpanState(nextSpan);
    try {
      localStorage.setItem("markly_box_colspan_" + id, String(nextSpan));
    } catch {}
    onColSpanChange?.(nextSpan);
  };

  const colSpanClass = {
    2: "col-span-1 md:col-span-2",
    3: "col-span-1 md:col-span-3",
    4: "col-span-1 md:col-span-4",
    6: "col-span-1 md:col-span-6",
    8: "col-span-1 md:col-span-8",
    9: "col-span-1 md:col-span-9",
    12: "col-span-1 md:col-span-12",
  }[colSpanState] || "col-span-1 md:col-span-6";

  const spanLabel = {
    12: "Full (100%)",
    9: "3/4 (75%)",
    8: "2/3 (67%)",
    6: "1/2 (50%)",
    4: "1/3 (33%)",
    3: "1/4 (25%)",
    2: "1/6 (16%)",
  }[colSpanState] || `${colSpanState}/12`;

  return (
    <div
      ref={boxRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        gridColumn: typeof window !== "undefined" && window.innerWidth >= 768 ? `span ${colSpanState} / span ${colSpanState}` : undefined,
        gridRow: typeof window !== "undefined" && window.innerWidth >= 768 && rowSpanState === 2 ? "span 2" : undefined,
        height: isCollapsed ? "auto" : boxHeight ? `${boxHeight}px` : undefined,
        minHeight: isCollapsed ? undefined : boxHeight ? `${boxHeight}px` : rowSpanState === 2 ? "440px" : "auto",
      }}
      className={`rounded-xl border border-border bg-card shadow-2xs flex flex-col transition-[border-color,background-color] duration-150 group/box relative ${colSpanClass} ${
        rowSpanState === 2 ? "md:row-span-2" : "md:row-span-1"
      } ${
        isResizing ? "ring-2 ring-primary/40 select-none" : ""
      }`}
    >
      {/* Box Header Toolbar */}
      <div className="px-3 py-2 border-b border-border bg-card/90 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Left: Notion Chevron Collapse/Expand, Drag Handle, Icon Badge, Title, Item Count */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title={isCollapsed ? "Expand section (Notion toggle)" : "Collapse section (Notion toggle)"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <div
            draggable={!isResizing}
            onDragStart={onDragStart}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground p-0.5 rounded hover:bg-secondary transition-colors"
            title="Drag to place section anywhere in N rows / N cols"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="h-6 w-6 rounded-md bg-secondary text-foreground flex items-center justify-center flex-shrink-0 border border-border/60">
            {icon}
          </div>
          <div
            className="flex items-center gap-1.5 truncate cursor-pointer select-text"
            onClick={toggleCollapsed}
          >
            <h2 className="text-xs font-semibold text-foreground truncate">{title}</h2>
            {badgeText !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60 tabular-nums">
                {badgeText}
              </span>
            )}
          </div>
        </div>

        {/* Right: View Switcher, Adaptive Column Width Popover, Extra Actions, Icon-Only > Link */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {extraHeaderAction}

          {/* Site Limit Selector (Auto-Fit, Stepper, Slider, Presets, All) */}
          {(showItemLimitPicker || availableViews) && (
            <div className="relative" ref={limitMenuRef}>
              <button
                type="button"
                onClick={() => setLimitMenuOpen(!limitMenuOpen)}
                className="h-6 px-2 rounded-md bg-secondary/80 hover:bg-secondary text-foreground border border-border/50 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Change number of sites displayed or enable auto-fitting"
              >
                {activeLimit === "auto" ? (
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Auto</span>
                  </span>
                ) : activeLimit === "all" ? (
                  <span className="font-semibold">All sites</span>
                ) : (
                  <span>{activeLimit} sites</span>
                )}
                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
              </button>

              {limitMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-border bg-card p-3 shadow-2xl z-50 text-xs text-foreground animate-in zoom-in-95 space-y-2.5">
                  {/* Header with Title and Current Mode */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Sites Displayed
                    </span>
                    <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {activeLimit === "auto" ? "Adaptive" : activeLimit === "all" ? "All" : `${activeLimit} Max`}
                    </span>
                  </div>

                  {/* Quick Modes: Auto (Fit Box) vs All (Scroll) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectLimit("auto", true)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                        activeLimit === "auto"
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                          : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-Fit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectLimit("all", true)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center cursor-pointer transition-colors ${
                        activeLimit === "all"
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                          : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                      }`}
                    >
                      Show All
                    </button>
                  </div>

                  {/* Direct Stepper & Numeric Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Exact Count:</span>
                      <span className="font-mono text-foreground font-semibold">
                        {typeof activeLimit === "number" ? `${activeLimit} sites` : "Adaptive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = typeof activeLimit === "number" ? activeLimit : 4;
                          handleSelectLimit(Math.max(1, current - 1));
                        }}
                        className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center font-bold text-sm cursor-pointer transition-colors border border-border/60"
                        title="Decrease sites"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={typeof activeLimit === "number" ? activeLimit : ""}
                        placeholder="Auto"
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            handleSelectLimit(val);
                          }
                        }}
                        className="flex-1 h-7 text-center font-mono text-xs bg-background rounded-md border border-border text-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = typeof activeLimit === "number" ? activeLimit : 4;
                          handleSelectLimit(Math.min(60, current + 1));
                        }}
                        className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center font-bold text-sm cursor-pointer transition-colors border border-border/60"
                        title="Increase sites"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Slider Control for Fast Tuning */}
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Tune Slider</span>
                      <span className="font-mono text-[10px]">1 – 24 sites</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={typeof activeLimit === "number" ? activeLimit : 4}
                      onChange={(e) => handleSelectLimit(Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Quick Presets Grid */}
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <div className="text-[10px] text-muted-foreground font-medium">Quick Presets:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[2, 4, 6, 8, 10, 12, 16, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSelectLimit(num, true)}
                          className={`py-1 rounded text-[11px] font-mono text-center cursor-pointer transition-colors border ${
                            activeLimit === num
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                              : "bg-secondary/60 hover:bg-secondary text-foreground border-border/50"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact View Switcher Popover */}
          {availableViews && availableViews.length > 0 && onViewModeChange && viewMode && (
            <div className="relative" ref={viewBoxMenuRef}>
              <button
                type="button"
                onClick={() => setViewBoxMenuOpen(!viewBoxMenuOpen)}
                className="h-6 px-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-foreground border border-border/50 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Switch widget view mode"
              >
                {viewMode === "grid" && <LayoutGrid className="h-3 w-3 text-primary" />}
                {viewMode === "list" && <List className="h-3 w-3 text-primary" />}
                {viewMode === "compact" && <Rows3 className="h-3 w-3 text-primary" />}
                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
              </button>

              {viewBoxMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-lg z-50 text-xs text-foreground animate-in zoom-in-95 space-y-0.5">
                  {[
                    { id: "grid", label: "Grid Cards", icon: LayoutGrid },
                    { id: "list", label: "Document List", icon: List },
                    { id: "compact", label: "Compact Rows", icon: Rows3 },
                  ]
                    .filter((v) => availableViews.includes(v.id as any))
                    .map((v) => {
                      const Icon = v.icon;
                      const isSel = viewMode === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            onViewModeChange(v.id as any);
                            setViewBoxMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            isSel ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon className={`h-3 w-3 ${isSel ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="text-[11px]">{v.label}</span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Custom Widget Menu: Edit, Duplicate, Delete */}
          {(onEditWidget || onDuplicateWidget || onDeleteWidget) && (
            <div className="relative" ref={actionMenuRef}>
              <button
                type="button"
                onClick={() => setActionMenuOpen(!actionMenuOpen)}
                className="h-6 w-6 rounded border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                title="Visual widget options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {actionMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-lg z-50 text-xs text-foreground animate-in zoom-in-95 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false);
                      toggleRowSpan();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                  >
                    <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{rowSpanState === 2 ? "Standard 1x Height" : "Bento 2x Tall (1:2)"}</span>
                  </button>

                  {onEditWidget && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onEditWidget();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Edit visual</span>
                    </button>
                  )}
                  {onDuplicateWidget && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onDuplicateWidget();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Duplicate visual</span>
                    </button>
                  )}
                  {onDeleteWidget && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onDeleteWidget();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-[11px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete visual</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Icon-Only > Link to Open Page (Replacing "View all" text) */}
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={viewAllLabel || "Open page"}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Box Body (Collapsible Notion style) */}
      {!isCollapsed && (
        <WidgetBoxContext.Provider
          value={{
            colSpan: colSpanState,
            rowSpan: rowSpanState,
            boxHeight,
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin rounded-b-xl animate-in fade-in duration-150 relative">
            {children}
          </div>
        </WidgetBoxContext.Provider>
      )}

      {/* Active Resizing Floating Dimensions Pill */}
      {isResizing && (
        <div className="absolute bottom-3 right-8 px-2.5 py-1 rounded-md bg-foreground text-background text-[11px] font-mono font-medium shadow-xl pointer-events-none z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>{spanLabel} ({colSpanState}/12)</span>
          <span className="opacity-60">×</span>
          <span>{boxHeight ? `${boxHeight}px` : rowSpanState === 2 ? "440px" : "Auto"}</span>
        </div>
      )}

      {/* Right Edge: Left-to-Right Horizontal Width Resize Handle */}
      <div
        onMouseDown={(e) => startResize("width", e)}
        onDoubleClick={handleCycleColSpan}
        className="absolute top-0 -right-2 bottom-0 w-4 cursor-ew-resize z-20 flex items-center justify-center opacity-40 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
        title="Drag right edge to resize column width (Double-click to cycle 1/4 -> 1/3 -> 1/2 -> Full)"
      >
        <div
          className={`w-1 h-14 rounded-full transition-all ${
            isResizing === "width" || isResizing === "both"
              ? "bg-primary w-1.5 shadow-sm"
              : "bg-muted-foreground/40 hover:bg-primary hover:w-1.5"
          }`}
        />
      </div>

      {/* Bottom Edge: Height Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={(e) => startResize("height", e)}
          onDoubleClick={toggleRowSpan}
          className="absolute -bottom-2 left-0 right-0 h-4 cursor-ns-resize z-20 flex items-center justify-center opacity-40 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
          title="Drag bottom edge to resize box height (Double click to toggle 1x standard / 2x Bento tall)"
        >
          <div
            className={`h-1 w-20 rounded-full transition-all ${
              isResizing === "height" || isResizing === "both"
                ? "bg-primary h-1.5 shadow-sm"
                : "bg-muted-foreground/40 hover:bg-primary hover:h-1.5"
            }`}
          />
        </div>
      )}

      {/* Bottom-Right Corner: Bi-Directional Resize Grip */}
      {!isCollapsed && (
        <div
          onMouseDown={(e) => startResize("both", e)}
          className="absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize z-30 flex items-end justify-end p-1 opacity-70 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
          title="Drag corner to freely resize both width and height"
        >
          <svg className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="14" cy="14" r="1.5" />
            <circle cx="9" cy="14" r="1.5" />
            <circle cx="4" cy="14" r="1.5" />
            <circle cx="14" cy="9" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="14" cy="4" r="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

export interface BookmarkItemsViewProps {
  items: BookmarkWithDetails[];
  mode: WidgetViewMode;
  emptyMessage?: string;
  limit?: WidgetItemLimit;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: ((id: string, title?: string) => void) | ((bm: BookmarkWithDetails) => void);
  handleSiteVisit?: (bm: BookmarkWithDetails) => void;
  formatTimeAgo?: (timestamp: any) => string;
  getParentName?: (bm: BookmarkWithDetails) => string;
}

export function BookmarkItemsView({
  items,
  mode,
  emptyMessage = "No bookmarks in this view yet",
  limit = "auto",
  onOpenPreview,
  onEditBookmark,
  onToggleFavorite,
  onToggleArchive,
  onDeleteBookmark,
  handleSiteVisit = (bm) => {
    try {
      window.open(bm.url, "_blank");
    } catch {}
  },
  formatTimeAgo = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  },
  getParentName = (bm) => bm.domain || "Workspace",
}: BookmarkItemsViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const [containerHeight, setContainerHeight] = React.useState<number>(0);
  const boxCtx = React.useContext(WidgetBoxContext);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    const target = parent || containerRef.current;
    const updateSize = () => {
      const rect = target.getBoundingClientRect();
      if (rect.width > 20) setContainerWidth(Math.floor(rect.width));
      if (rect.height > 20) setContainerHeight(Math.floor(rect.height));
    };
    updateSize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 20) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
        if (entry.contentRect.height > 20) {
          setContainerHeight(Math.floor(entry.contentRect.height));
        }
      }
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  // Compute adaptive item count dynamically based on width and height
  const adaptiveCount = React.useMemo(() => {
    if (typeof limit === "number") return limit;
    if (limit === "all") return items.length;

    // In auto/adaptive mode, calculate based on actual measured parent height:
    const availableHeight = containerHeight > 40
      ? containerHeight
      : (boxCtx.boxHeight ? boxCtx.boxHeight - 44 : (boxCtx.rowSpan === 2 ? 380 : 180));

    if (mode === "grid") {
      const cols = containerWidth >= 1000 ? 4 : containerWidth >= 680 ? 3 : containerWidth >= 400 ? 2 : 1;
      // In grid mode: 52px card + 8px gap = 60px per row. Minus 16px padding.
      const rows = Math.max(1, Math.floor((availableHeight - 16) / 60));
      return Math.max(cols, cols * rows);
    }

    if (mode === "compact") {
      const cols = containerWidth >= 750 ? 3 : containerWidth >= 480 ? 2 : 1;
      // 34px row
      const rows = Math.max(1, Math.floor((availableHeight - 16) / 36));
      return Math.max(cols, cols * rows);
    }

    // Default list mode: 42px row
    const listRows = Math.max(1, Math.floor((availableHeight - 12) / 44));
    return listRows;
  }, [limit, items.length, mode, containerWidth, containerHeight, boxCtx.boxHeight, boxCtx.rowSpan]);

  const displayItems = limit === "all"
    ? items
    : typeof limit === "number"
    ? items.slice(0, limit)
    : items.slice(0, adaptiveCount);

  if (displayItems.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
        <Bookmark className="h-5 w-5 text-muted-foreground/30" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  // 1. Grid View (Responsive Adaptive Bookmark Tile Cards)
  if (mode === "grid") {
    return (
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2 p-2.5 min-h-0 w-full">
        {displayItems.map((bm) => (
          <div
            key={bm.id}
            onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
            className="h-[52px] min-h-[52px] max-h-[52px] rounded-xl border border-border bg-card hover:bg-secondary/30 px-2.5 py-1.5 shadow-xs hover:border-border-hover transition-colors flex items-center justify-between gap-2 group cursor-pointer overflow-hidden"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <BookmarkIcon
                src={bm.iconUrl}
                alt={bm.title}
                domain={bm.domain}
                className="h-6 w-6 rounded object-contain bg-background flex-shrink-0 border border-border/40"
              />
              <div className="truncate min-w-0 flex-1">
                <span className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer">
                  {bm.title}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                  <span className="truncate max-w-28">{bm.domain}</span>
                  <span>•</span>
                  <span className="tabular-nums">
                    {bm.visitCount ? `${bm.visitCount} visits` : formatTimeAgo(bm.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(bm)}
                  className={`h-6 w-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                    bm.isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={bm.isFavorite ? "Unstar" : "Star"}
                >
                  <Star className={`h-3 w-3 ${bm.isFavorite ? "fill-amber-500" : ""}`} />
                </button>
              )}
              {onToggleArchive && (
                <button
                  type="button"
                  onClick={() => onToggleArchive(bm)}
                  className="h-6 w-6 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Archive"
                >
                  <Archive className="h-3 w-3" />
                </button>
              )}
              <a
                href={bm.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleSiteVisit(bm)}
                className="h-6 w-6 rounded bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title="Launch site"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. List View (Detailed Document Rows)
  if (mode === "list") {
    return (
      <div ref={containerRef} className="divide-y divide-border min-h-0 w-full">
        {displayItems.map((bm) => {
          const timeAgo = formatTimeAgo(bm.lastClickedAt || bm.lastVisitedAt || bm.createdAt);
          return (
            <div
              key={bm.id}
              onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
              className="h-[42px] min-h-[42px] px-3.5 py-1.5 flex items-center justify-between gap-2.5 hover:bg-muted/40 transition-colors cursor-pointer group text-xs overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-5 w-5 rounded object-contain flex-shrink-0 border border-border/40"
                />
                <div className="truncate min-w-0">
                  <div className="font-medium hover:underline text-foreground truncate cursor-pointer leading-tight">
                    {bm.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                    <span className="truncate max-w-32">{bm.domain}</span>
                    <span>•</span>
                    <span className="truncate max-w-28 text-muted-foreground/80">{getParentName(bm)}</span>
                    <span>•</span>
                    <span>{timeAgo}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(bm)}
                    className={`h-6 w-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                      bm.isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={bm.isFavorite ? "Unstar" : "Star"}
                  >
                    <Star className={`h-3 w-3 ${bm.isFavorite ? "fill-amber-500" : ""}`} />
                  </button>
                )}
                {onToggleArchive && (
                  <button
                    type="button"
                    onClick={() => onToggleArchive(bm)}
                    className="h-6 w-6 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Archive"
                  >
                    <Archive className="h-3 w-3" />
                  </button>
                )}
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleSiteVisit(bm)}
                  className="h-6 w-6 rounded bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Launch site"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 3. Compact View (Dense 1-Line Rows)
  return (
    <div ref={containerRef} className="divide-y divide-border/60 min-h-0 w-full">
      {displayItems.map((bm) => (
        <div
          key={bm.id}
          onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
          className="h-[34px] min-h-[34px] px-3.5 py-1 flex items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors cursor-pointer group text-xs overflow-hidden"
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            <BookmarkIcon
              src={bm.iconUrl}
              alt={bm.title}
              domain={bm.domain}
              className="h-4 w-4 rounded object-contain flex-shrink-0"
            />
            <span className="font-medium text-foreground truncate hover:text-primary">
              {bm.title}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:inline">
              ({bm.domain})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(bm)}
                className={`cursor-pointer ${
                  bm.isFavorite ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground"
                }`}
              >
                <Star className={`h-3 w-3 ${bm.isFavorite ? "fill-amber-500" : ""}`} />
              </button>
            )}
            <a
              href={bm.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleSiteVisit(bm)}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

