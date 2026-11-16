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
} from "lucide-react";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import type { BookmarkWithDetails } from "@/server/db/schema";
import type { WidgetColSpan } from "./home-layout-modal";

export type WidgetViewMode = "grid" | "list" | "compact";

interface DashboardWidgetBoxProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badgeText?: string | number;
  span?: "1" | "2";
  colSpan?: WidgetColSpan;
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
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export function DashboardWidgetBox({
  id,
  title,
  icon,
  badgeText,
  span = "1",
  colSpan,
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

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setColMenuOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
    }
    if (colMenuOpen || actionMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [colMenuOpen, actionMenuOpen]);

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
        }
      };

      const onMouseUp = () => {
        setIsResizing(null);
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
        gridRow: typeof window !== "undefined" && window.innerWidth >= 768 && rowSpanState === 2 ? "span 2 / span 2" : undefined,
        height: isCollapsed ? "auto" : boxHeight ? `${boxHeight}px` : undefined,
        minHeight: isCollapsed ? undefined : rowSpanState === 2 ? "440px" : "140px",
      }}
      className={`rounded-xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col transition-[border-color,background-color] duration-150 group/box relative ${colSpanClass} ${
        rowSpanState === 2 ? "md:row-span-2" : ""
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

          {/* Height Toggle: 1x vs 2x Tall */}
          <button
            type="button"
            onClick={toggleRowSpan}
            className={`h-6 px-1.5 rounded-md border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
              rowSpanState === 2
                ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                : "bg-secondary/80 hover:bg-secondary text-foreground border-border/50"
            }`}
            title={rowSpanState === 2 ? "2x Tall (Spans 2 stacked rows). Click for 1x standard height" : "1x Standard height. Click to make 2x tall"}
          >
            <Rows3 className="h-3 w-3 text-muted-foreground" />
            <span>{rowSpanState === 2 ? "2x Tall" : "1x"}</span>
          </button>

          {/* Adaptive N-Col Width Track Popover (Replaces rigid 2-col button) */}
          <div className="relative" ref={colMenuRef}>
            <button
              type="button"
              onClick={() => setColMenuOpen(!colMenuOpen)}
              className="h-6 px-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-foreground border border-border/50 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title={`Column width: ${spanLabel}. Click to pick column size or resize with mouse handle.`}
            >
              <Columns3 className="h-3 w-3 text-muted-foreground" />
              <span>{colSpanState === 12 ? "Full" : colSpanState === 6 ? "1/2" : colSpanState === 4 ? "1/3" : colSpanState === 3 ? "1/4" : `${colSpanState}/12`}</span>
              <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
            </button>

            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-border bg-card p-1 shadow-lg z-50 text-xs text-foreground animate-in zoom-in-95 space-y-0.5">
                {[
                  { span: 12 as WidgetColSpan, label: "Full Width (1 col)" },
                  { span: 9 as WidgetColSpan, label: "3/4 Width (75%)" },
                  { span: 8 as WidgetColSpan, label: "2/3 Width (67%)" },
                  { span: 6 as WidgetColSpan, label: "Half Width (2 cols)" },
                  { span: 4 as WidgetColSpan, label: "1/3 Width (3 cols)" },
                  { span: 3 as WidgetColSpan, label: "1/4 Width (4 cols)" },
                  { span: 2 as WidgetColSpan, label: "1/6 Width (6 cols)" },
                ].map((item) => (
                  <button
                    key={item.span}
                    type="button"
                    onClick={() => {
                      setColSpanState(item.span);
                      setColMenuOpen(false);
                      try {
                        localStorage.setItem("markly_box_colspan_" + id, String(item.span));
                      } catch {}
                      onColSpanChange?.(item.span);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer text-[11px] ${
                      colSpanState === item.span ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{item.label}</span>
                    {colSpanState === item.span && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

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
        <div className="flex-1 animate-in fade-in duration-150">
          {children}
        </div>
      )}

      {/* Right Edge: Left-to-Right Horizontal Width Resize Handle */}
      <div
        onMouseDown={(e) => startResize("width", e)}
        onDoubleClick={handleCycleColSpan}
        className="absolute top-0 right-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
        title="Drag left-to-right to resize box column width (Double-click to cycle 1/4 -> 1/3 -> 1/2 -> Full)"
      >
        <div
          className={`w-[2.5px] h-10 rounded-full transition-colors ${
            isResizing === "width" || isResizing === "both"
              ? "bg-primary"
              : "bg-border/80 hover:bg-primary/80"
          }`}
        />
      </div>

      {/* Bottom Edge: Height Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={(e) => startResize("height", e)}
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
          title="Drag up/down to resize box height"
        >
          <div
            className={`h-[2.5px] w-12 rounded-full transition-colors ${
              isResizing === "height" || isResizing === "both"
                ? "bg-primary"
                : "bg-border/80 hover:bg-primary/80"
            }`}
          />
        </div>
      )}

      {/* Bottom-Right Corner: Bi-Directional Resize Grip */}
      {!isCollapsed && (
        <div
          onMouseDown={(e) => startResize("both", e)}
          className="absolute bottom-0.5 right-0.5 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 opacity-30 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
          title="Drag corner to resize both width and height"
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-muted-foreground/60 hover:border-primary transition-colors" />
        </div>
      )}
    </div>
  );
}

interface BookmarkItemsViewProps {
  items: BookmarkWithDetails[];
  mode: WidgetViewMode;
  emptyMessage: string;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: (id: string, title?: string) => void;
  handleSiteVisit: (bm: BookmarkWithDetails) => void;
  formatTimeAgo: (timestamp: number) => string;
  getParentName: (bm: BookmarkWithDetails) => string;
}

export function BookmarkItemsView({
  items,
  mode,
  emptyMessage,
  onOpenPreview,
  onEditBookmark,
  onToggleFavorite,
  onToggleArchive,
  onDeleteBookmark,
  handleSiteVisit,
  formatTimeAgo,
  getParentName,
}: BookmarkItemsViewProps) {
  if (items.length === 0) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5 p-3">
        {items.map((bm) => (
          <div
            key={bm.id}
            onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
            className="rounded-xl border border-border bg-card hover:bg-secondary/30 p-2.5 shadow-xs hover:border-border-hover transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate min-w-0">
              <BookmarkIcon
                src={bm.iconUrl}
                alt={bm.title}
                domain={bm.domain}
                className="h-6 w-6 rounded object-contain bg-background flex-shrink-0 border border-border/40"
              />
              <div className="truncate">
                <span className="text-xs font-medium hover:underline text-foreground truncate block cursor-pointer">
                  {bm.title}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mt-0.5">
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
      <div className="divide-y divide-border">
        {items.map((bm) => {
          const timeAgo = formatTimeAgo(bm.lastClickedAt || bm.lastVisitedAt || bm.createdAt);
          return (
            <div
              key={bm.id}
              onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
              className="px-3.5 py-2 flex items-center justify-between gap-2.5 hover:bg-muted/40 transition-colors cursor-pointer group text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-5 w-5 rounded object-contain flex-shrink-0 border border-border/40"
                />
                <div className="truncate">
                  <div className="font-medium hover:underline text-foreground truncate cursor-pointer">
                    {bm.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mt-0.5">
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
    <div className="divide-y divide-border/60">
      {items.map((bm) => (
        <div
          key={bm.id}
          onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
          className="px-3.5 py-1.5 flex items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors cursor-pointer group text-xs"
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

