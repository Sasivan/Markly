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
  RotateCcw,
  Table as TableIcon,
  BookmarkCheck,
  Box,
  Pin,
  Folder,
  Globe,
} from "lucide-react";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { saveUniversalPreset } from "@/components/presets/universal-preset-hub";
import type { BookmarkWithDetails } from "@/server/db/schema";
import type { WidgetColSpan } from "./home-layout-modal";

export type WidgetViewMode = "grid" | "list" | "compact" | "table" | "cards";
export type WidgetItemLimit = number | "all" | "auto";

export function getDomainGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 42%, 20%) 0%, hsl(${h2}, 52%, 11%) 100%)`;
}

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
  tabRef?: "T1" | "T2" | "T3" | "T4" | string;
  tabScope?: "universal" | "custom";
  isPinned?: boolean;
  onPinToggle?: (pinned: boolean) => void;
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
  widgetConfig?: any;
  children: React.ReactNode;
}

export function DashboardWidgetBox({
  id,
  title,
  icon,
  badgeText,
  tabRef,
  tabScope,
  isPinned: propsIsPinned,
  onPinToggle,
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
  widgetConfig,
  children,
}: DashboardWidgetBoxProps) {
  // User-Customizable Card Cover Style (Persisted in localStorage, housed in view dropdown)
  const [boxCoverStyle, setBoxCoverStyle] = React.useState<"thumbnail" | "icon" | "monogram">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_card_cover_style_" + id);
        if (stored === "thumbnail" || stored === "icon" || stored === "monogram") return stored;
      } catch {}
    }
    return "thumbnail";
  });

  const handleSetBoxCoverStyle = (style: "thumbnail" | "icon" | "monogram") => {
    setBoxCoverStyle(style);
    try {
      localStorage.setItem("markly_card_cover_style_" + id, style);
    } catch {}
    window.dispatchEvent(new CustomEvent("markly-card-cover-changed", { detail: { id, style } }));
  };

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

  // Track whether the user has manually resized this box
  const [hasCustomDimensions, setHasCustomDimensions] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return (
          localStorage.getItem("markly_box_colspan_" + id) !== null ||
          localStorage.getItem("markly_box_h_" + id) !== null ||
          localStorage.getItem("markly_box_rowspan_" + id) !== null ||
          localStorage.getItem("markly_box_custom_" + id) === "true"
        );
      } catch {}
    }
    return false;
  });

  React.useEffect(() => {
    if (!hasCustomDimensions && colSpan && colSpan !== colSpanState) {
      setColSpanState(colSpan);
    }
  }, [colSpan, hasCustomDimensions]);

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
    if (!hasCustomDimensions && rowSpan && rowSpan !== rowSpanState) {
      setRowSpanState(rowSpan);
    }
  }, [rowSpan, hasCustomDimensions]);

  // Box Pinning: When pinned, user cannot change format or resize, but can delete and use presets
  const [isPinned, setIsPinned] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_box_pinned_" + id);
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return Boolean(propsIsPinned);
  });

  React.useEffect(() => {
    if (propsIsPinned !== undefined) {
      setIsPinned(propsIsPinned);
    }
  }, [propsIsPinned]);

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isPinned;
    setIsPinned(next);
    onPinToggle?.(next);
    try {
      localStorage.setItem("markly_box_pinned_" + id, String(next));
    } catch {}
  };

  // Hover details state for box title
  const [isTitleHovered, setIsTitleHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<any>(null);

  const handleTitleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsTitleHovered(true);
  };

  const handleTitleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsTitleHovered(false);
    }, 250);
  };

  const toggleRowSpan = () => {
    if (isPinned) return;
    const next: 1 | 2 = rowSpanState === 1 ? 2 : 1;
    setRowSpanState(next);
    setHasCustomDimensions(true);
    try {
      localStorage.setItem("markly_box_rowspan_" + id, String(next));
      localStorage.setItem("markly_box_custom_" + id, "true");
    } catch {}
    onRowSpanChange?.(next);
  };

  const [hasCustomDefault, setHasCustomDefault] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("markly_box_custom_default_" + id) !== null;
      } catch {}
    }
    return false;
  });

  const [customDefaultSavedToast, setCustomDefaultSavedToast] = React.useState(false);

  const handleSetCustomDefault = () => {
    try {
      const config = {
        colSpan: colSpanState,
        rowSpan: rowSpanState,
        boxHeight,
        itemLimit: activeLimit,
        viewMode,
      };
      localStorage.setItem("markly_box_custom_default_" + id, JSON.stringify(config));
      setHasCustomDefault(true);
      setCustomDefaultSavedToast(true);
      setTimeout(() => setCustomDefaultSavedToast(false), 2500);
    } catch {}
  };

  const handleClearCustomDefault = () => {
    try {
      localStorage.removeItem("markly_box_custom_default_" + id);
      setHasCustomDefault(false);
    } catch {}
  };

  const handlePinThisBoxToHome = () => {
    try {
      const stored = localStorage.getItem("markly_home_widgets");
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      const isStudio = id.startsWith("studio_") || (badgeText && String(badgeText).toLowerCase().includes("studio"));
      const targetId = isStudio ? id : `custom:${id}_${Date.now()}`;
      list = list.filter((w: any) => w.id !== targetId && w.id !== id);
      list.unshift({
        id: targetId,
        label: title,
        visible: true,
        kind: isStudio ? "studio" : "custom",
        category: (resolvedTabRef === "T1" ? "sites_studio" : resolvedTabRef === "T2" ? "plot_studio" : resolvedTabRef === "T3" ? "chart_studio" : "intel_studio") as any,
        colSpan: colSpanState,
        rowSpan: rowSpanState,
      });
      localStorage.setItem("markly_home_widgets", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      setCustomDefaultSavedToast(true);
      setTimeout(() => setCustomDefaultSavedToast(false), 2500);
    } catch (e) {
      console.error("Failed to pin box to home:", e);
    }
  };

  const handleResetBoxDimensions = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const customDef = localStorage.getItem("markly_box_custom_default_" + id);
      if (customDef) {
        const parsed = JSON.parse(customDef);
        if (parsed.colSpan) {
          setColSpanState(parsed.colSpan);
          onColSpanChange?.(parsed.colSpan);
          localStorage.setItem("markly_box_colspan_" + id, String(parsed.colSpan));
        }
        if (parsed.rowSpan) {
          setRowSpanState(parsed.rowSpan);
          onRowSpanChange?.(parsed.rowSpan);
          localStorage.setItem("markly_box_rowspan_" + id, String(parsed.rowSpan));
        }
        if (parsed.boxHeight) {
          setBoxHeight(parsed.boxHeight);
          localStorage.setItem("markly_box_h_" + id, String(parsed.boxHeight));
        } else {
          setBoxHeight(null);
          localStorage.removeItem("markly_box_h_" + id);
        }
        setHasCustomDimensions(false);
        return;
      }
      localStorage.removeItem("markly_box_colspan_" + id);
      localStorage.removeItem("markly_box_h_" + id);
      localStorage.removeItem("markly_box_rowspan_" + id);
      localStorage.removeItem("markly_box_custom_" + id);
    } catch {}
    setHasCustomDimensions(false);
    setBoxHeight(null);
    const defColSpan = colSpan || initialColSpan || (span === "2" ? 12 : 6);
    const defRowSpan = rowSpan || 1;
    setColSpanState(defColSpan);
    setRowSpanState(defRowSpan);
    onColSpanChange?.(defColSpan);
    onRowSpanChange?.(defRowSpan);
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
  const [isResizing, setIsResizing] = React.useState<
    "width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw" | null
  >(null);
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
    (
      direction: "width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw",
      startEvent: React.MouseEvent
    ) => {
      if (isPinned) return;
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
      if (direction === "width" || direction === "e" || direction === "w") {
        document.body.style.cursor = "ew-resize";
      } else if (direction === "height" || direction === "s" || direction === "n") {
        document.body.style.cursor = "ns-resize";
      } else if (direction === "ne" || direction === "sw") {
        document.body.style.cursor = "nesw-resize";
      } else {
        document.body.style.cursor = "nwse-resize";
      }

      const onMouseMove = (moveEvent: MouseEvent) => {
        // Horizontal resizing (from right edge "e"/"width", left edge "w", or corners)
        if (
          direction === "width" ||
          direction === "both" ||
          direction === "e" ||
          direction === "w" ||
          direction === "se" ||
          direction === "sw" ||
          direction === "ne" ||
          direction === "nw"
        ) {
          // If dragging from left side (w, sw, nw), pulling left (negative clientX - startX) widens
          const deltaX =
            direction === "w" || direction === "sw" || direction === "nw"
              ? startX - moveEvent.clientX
              : moveEvent.clientX - startX;
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

        // Vertical resizing (from bottom edge "s"/"height", top edge "n", or corners)
        if (
          direction === "height" ||
          direction === "both" ||
          direction === "s" ||
          direction === "n" ||
          direction === "se" ||
          direction === "sw" ||
          direction === "ne" ||
          direction === "nw"
        ) {
          // If dragging from top side (n, ne, nw), pulling up (startY - clientY) increases height
          const deltaY =
            direction === "n" || direction === "ne" || direction === "nw"
              ? startY - moveEvent.clientY
              : moveEvent.clientY - startY;
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
          localStorage.setItem("markly_box_custom_" + id, "true");
          setHasCustomDimensions(true);
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
    if (isPinned) return;
    const cycleOrder: WidgetColSpan[] = [12, 6, 4, 3];
    const currentIdx = cycleOrder.indexOf(colSpanState);
    const nextSpan = currentIdx !== -1 && currentIdx < cycleOrder.length - 1 ? cycleOrder[currentIdx + 1] : cycleOrder[0];
    setColSpanState(nextSpan);
    setHasCustomDimensions(true);
    try {
      localStorage.setItem("markly_box_colspan_" + id, String(nextSpan));
      localStorage.setItem("markly_box_custom_" + id, "true");
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

  // Resolve Tab Reference (T1: Sites, T2: Observable Plot, T3: Classic Charts, T4: Intelligence Systems)
  const resolvedTabRef = React.useMemo(() => {
    if (tabRef) return tabRef;
    const lower = `${id} ${title} ${badgeText || ""}`.toLowerCase();
    if (
      lower.includes("observable") ||
      lower.includes("plot") ||
      lower.includes("mark") ||
      lower.includes("marks") ||
      lower.includes("grammar")
    ) {
      return "T2";
    }
    if (
      lower.includes("intel") ||
      lower.includes("graph") ||
      lower.includes("force") ||
      lower.includes("obsidian") ||
      lower.includes("spectrum") ||
      lower.includes("engagement") ||
      lower.includes("heatmap") ||
      lower.includes("wall") ||
      lower.includes("system") ||
      lower.includes("systems") ||
      lower.includes("topic") ||
      lower.includes("topics") ||
      lower.includes("tag") ||
      lower.includes("tags") ||
      lower.includes("frequency") ||
      lower.includes("cloud")
    ) {
      return "T4";
    }
    if (
      lower.includes("site") ||
      lower.includes("sites") ||
      lower.includes("matrix") ||
      lower.includes("folder") ||
      lower.includes("folders") ||
      lower.includes("recent") ||
      lower.includes("favorite") ||
      lower.includes("favorites") ||
      lower.includes("unsorted") ||
      lower.includes("scratchpad") ||
      lower.includes("inbox") ||
      lower.includes("collection") ||
      lower.includes("quick")
    ) {
      return "T1";
    }
    if (
      lower.includes("classic") ||
      lower.includes("rechart") ||
      lower.includes("recharts") ||
      lower.includes("bar") ||
      lower.includes("bars") ||
      lower.includes("line") ||
      lower.includes("lines") ||
      lower.includes("area") ||
      lower.includes("donut") ||
      lower.includes("radar") ||
      lower.includes("pie") ||
      lower.includes("velocity") ||
      lower.includes("domain") ||
      lower.includes("domains") ||
      lower.includes("distribution") ||
      lower.includes("metric") ||
      lower.includes("metrics") ||
      lower.includes("analytics") ||
      lower.includes("pattern") ||
      lower.includes("patterns") ||
      lower.includes("chart") ||
      lower.includes("charts")
    ) {
      return "T3";
    }
    return null;
  }, [tabRef, id, title, badgeText]);

  const resolvedTabCategoryName = React.useMemo(() => {
    switch (resolvedTabRef) {
      case "T1":
        return "T1: Sites Reference Matrix";
      case "T2":
        return "T2: ObservableHQ Plot Graphics";
      case "T3":
        return "T3: Classic Charts Studio";
      case "T4":
        return "T4: Workspace Intelligence Systems";
      default:
        return "Universal Visual Studio";
    }
  }, [resolvedTabRef]);

  return (
    <div
      ref={boxRef}
      id={id}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        gridColumn: typeof window !== "undefined" && window.innerWidth >= 768 ? `span ${colSpanState} / span ${colSpanState}` : undefined,
        gridRow: typeof window !== "undefined" && window.innerWidth >= 768 && rowSpanState === 2 ? "span 2" : undefined,
        height: isCollapsed ? "auto" : boxHeight ? `${boxHeight}px` : undefined,
        minHeight: isCollapsed ? undefined : boxHeight ? `${boxHeight}px` : minHeight ? `${minHeight}px` : rowSpanState === 2 ? "440px" : "auto",
      }}
      className={`min-w-0 rounded-xl border border-border bg-card shadow-2xs flex flex-col transition-[border-color,background-color] duration-150 group/box relative ${colSpanClass} ${
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
            draggable={!isResizing && !isPinned}
            onDragStart={isPinned ? undefined : onDragStart}
            className={`p-0.5 rounded transition-colors ${
              isPinned
                ? "text-muted-foreground/20 cursor-not-allowed"
                : "cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground hover:bg-secondary"
            }`}
            title={isPinned ? "Box is pinned: unpin to reorder" : "Drag to place section anywhere in N rows / N cols"}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="h-6 w-6 rounded-md bg-secondary text-foreground flex items-center justify-center flex-shrink-0 border border-border/60">
            {icon}
          </div>
          <div
            className="relative flex items-center gap-1.5 truncate cursor-pointer select-text group/title"
            onClick={toggleCollapsed}
            onMouseEnter={handleTitleMouseEnter}
            onMouseLeave={handleTitleMouseLeave}
          >
            <h2 className="text-xs font-semibold text-foreground truncate group-hover/title:text-primary transition-colors">{title}</h2>
            {badgeText !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60 tabular-nums">
                {badgeText}
              </span>
            )}
            {isPinned && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold flex items-center gap-1 shrink-0"
                title="Pinned: resizing and format changes locked"
              >
                <Pin className="h-2.5 w-2.5 fill-amber-500" />
                <span>Pinned</span>
              </span>
            )}
            {customDefaultSavedToast && (
              <span className="text-[10px] text-emerald-500 font-mono font-semibold flex items-center gap-1 animate-in fade-in shrink-0 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                <Check className="h-2.5 w-2.5" />
                <span>Default Saved</span>
              </span>
            )}

            {/* Hover Details Popover Card: Displays Tn, configured constraints, and Add Visuals sync */}
            {isTitleHovered && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-2xl z-50 text-xs text-foreground animate-in fade-in zoom-in-95 pointer-events-auto select-none"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleTitleMouseEnter}
                onMouseLeave={handleTitleMouseLeave}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {resolvedTabRef && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border tracking-wider shrink-0 ${
                          resolvedTabRef === "T1"
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            : resolvedTabRef === "T2"
                            ? "bg-cyan-500/15 text-cyan-500 border-cyan-500/30"
                            : resolvedTabRef === "T3"
                            ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                            : "bg-purple-500/15 text-purple-500 border-purple-500/30"
                        }`}
                      >
                        {resolvedTabRef}
                      </span>
                    )}
                    <span className="font-semibold text-xs text-foreground truncate">{title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {resolvedTabRef === "T1"
                      ? "Sites Reference"
                      : resolvedTabRef === "T2"
                      ? "Observable Plot"
                      : resolvedTabRef === "T3"
                      ? "Classic Charts"
                      : "Intelligence"}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Category Studio:</span>
                    <span className="font-mono text-foreground font-medium">{resolvedTabCategoryName}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Column Width:</span>
                    <span className="font-mono text-foreground">{colSpanState}/12 cols ({spanLabel})</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Box Height:</span>
                    <span className="font-mono text-foreground">
                      {boxHeight ? `${boxHeight}px custom` : rowSpanState === 2 ? "2x Bento Tall" : "1x Standard"}
                    </span>
                  </div>
                  {activeLimit && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Item Limit:</span>
                      <span className="font-mono text-foreground">
                        {activeLimit === "auto" ? "Adaptive Auto-Fit" : activeLimit === "all" ? "All Sites" : `${activeLimit} sites`}
                      </span>
                    </div>
                  )}
                  {viewMode && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>View Format:</span>
                      <span className="font-mono text-foreground capitalize">{viewMode}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Tab Scope:</span>
                    <span className="font-mono text-foreground">
                      {tabScope === "custom" ? "Custom Tab" : tabScope === "universal" ? "Universal Tab" : "Adaptive"}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitleHovered(false);
                      window.dispatchEvent(
                        new CustomEvent("markly-open-visual-builder", {
                          detail: {
                            activeCategory:
                              resolvedTabRef === "T1"
                                ? "sites"
                                : resolvedTabRef === "T2"
                                ? "plot"
                                : resolvedTabRef === "T3"
                                ? "chart"
                                : "intel",
                            widgetId: id,
                            editConfig: widgetConfig,
                          },
                        })
                      );
                    }}
                    className="flex-1 py-1 px-2 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] font-semibold text-foreground flex items-center justify-center gap-1 cursor-pointer transition-colors border border-border/60"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                    <span>Edit in Add Visuals</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitleHovered(false);
                      const baseConfig = widgetConfig || {};
                      window.dispatchEvent(
                        new CustomEvent("markly-open-save-preset-dialog", {
                          detail: {
                            name: title,
                            category: "box",
                            sourceLocation: `Visual Box: ${title}`,
                            data: {
                              ...baseConfig,
                              id,
                              title,
                              colSpan: colSpanState,
                              rowSpan: rowSpanState,
                              boxHeight,
                              itemLimit: activeLimit,
                              viewMode: viewMode || baseConfig.viewMode,
                              tabRef: resolvedTabRef,
                              category:
                                baseConfig.category ||
                                (resolvedTabRef === "T1"
                                  ? "sites_studio"
                                  : resolvedTabRef === "T2"
                                  ? "plot_studio"
                                  : resolvedTabRef === "T3"
                                  ? "chart_studio"
                                  : "intel_studio"),
                            },
                          },
                        })
                      );
                    }}
                    className="flex-1 py-1 px-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Box className="h-2.5 w-2.5" />
                    <span>Save as Preset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: View Switcher, Adaptive Column Width Popover, Extra Actions, Pin Button, Icon-Only > Link */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {extraHeaderAction}

          {/* Pin Box Button */}
          <button
            type="button"
            onClick={handleTogglePin}
            className={`h-6 w-6 rounded border transition-colors flex items-center justify-center cursor-pointer shadow-2xs ${
              isPinned
                ? "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25"
                : "border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            title={
              isPinned
                ? "Pinned: Cannot resize or change layout format. Click to unpin."
                : "Pin box: Lock size and format (delete and presets remain active)"
            }
          >
            <Pin className={`h-3 w-3 ${isPinned ? "fill-amber-500 text-amber-500" : ""}`} />
          </button>

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
                {viewMode === "cards" && <LayoutGrid className="h-3 w-3 text-primary" />}
                {viewMode === "list" && <List className="h-3 w-3 text-primary" />}
                {viewMode === "table" && <TableIcon className="h-3 w-3 text-primary" />}
                {viewMode === "compact" && <Rows3 className="h-3 w-3 text-primary" />}
                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
              </button>

              {viewBoxMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-card p-1.5 shadow-lg z-50 text-xs text-foreground animate-in zoom-in-95 space-y-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    View Mode
                  </div>
                  {[
                    { id: "cards", label: "Visual Cards", icon: LayoutGrid },
                    { id: "grid", label: "Grid Cards", icon: LayoutGrid },
                    { id: "list", label: "Document List", icon: List },
                    { id: "table", label: "Data Table", icon: TableIcon },
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

                  {/* Card Cover Variation Selector (Housed cleanly inside view dropdown, no toolbar clutter) */}
                  {(viewMode === "cards" || viewMode === "grid") && (
                    <div className="border-t border-border/60 pt-1.5 mt-1 px-1 space-y-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Cover Variation
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "thumbnail", label: "Snapshot" },
                          { id: "monogram", label: "Gradient" },
                          { id: "icon", label: "Logo" },
                        ].map((cv) => (
                          <button
                            key={cv.id}
                            type="button"
                            onClick={() => handleSetBoxCoverStyle(cv.id as any)}
                            className={`px-1 py-1 rounded text-[10px] font-medium border text-center cursor-pointer transition-colors ${
                              boxCoverStyle === cv.id
                                ? "bg-primary text-primary-foreground border-primary font-semibold"
                                : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                            }`}
                          >
                            {cv.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom Widget Menu: Edit, Duplicate, Delete, Dimensions (3-dots menu) */}
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
                      handlePinThisBoxToHome();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                    title="Pin this visual box directly onto Dashboard Home"
                  >
                    <Pin className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pin to Dashboard Home</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false);
                      const baseConfig = widgetConfig || {};
                      window.dispatchEvent(
                        new CustomEvent("markly-open-save-preset-dialog", {
                          detail: {
                            name: title,
                            category: "box",
                            sourceLocation: `Visual Box: ${title}`,
                            data: {
                              ...baseConfig,
                              id,
                              title,
                              colSpan: colSpanState,
                              rowSpan: rowSpanState,
                              boxHeight,
                              itemLimit: activeLimit,
                              viewMode: viewMode || baseConfig.viewMode,
                              cardCoverStyle: boxCoverStyle,
                              category: baseConfig.category || baseConfig.kind || "chart_studio",
                              kind: baseConfig.kind || baseConfig.category || "custom",
                              siteConfig: baseConfig.siteConfig,
                              plotConfig: baseConfig.plotConfig,
                              chartConfig: baseConfig.chartConfig || baseConfig.vizConfig,
                              intelConfig: baseConfig.intelConfig,
                            },
                          },
                        })
                      );
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                    title="Place or allocate this box into a Universal or Custom Tab"
                  >
                    <Folder className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Place into Tab...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false);
                      const baseConfig = widgetConfig || {};
                      window.dispatchEvent(
                        new CustomEvent("markly-open-save-preset-dialog", {
                          detail: {
                            name: title,
                            category: "box",
                            sourceLocation: `Visual Box: ${title}`,
                            data: {
                              ...baseConfig,
                              id,
                              title,
                              colSpan: colSpanState,
                              rowSpan: rowSpanState,
                              boxHeight,
                              itemLimit: activeLimit,
                              viewMode: viewMode || baseConfig.viewMode,
                              cardCoverStyle: boxCoverStyle,
                              category: baseConfig.category || baseConfig.kind || "chart_studio",
                              kind: baseConfig.kind || baseConfig.category || "custom",
                              siteConfig: baseConfig.siteConfig,
                              plotConfig: baseConfig.plotConfig,
                              chartConfig: baseConfig.chartConfig || baseConfig.vizConfig,
                              intelConfig: baseConfig.intelConfig,
                            },
                          },
                        })
                      );
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                    title="Save this box into the Universal Preset Library with customizable name"
                  >
                    <Box className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Save as Preset Box...</span>
                  </button>

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

                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false);
                      handleSetCustomDefault();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-foreground hover:bg-secondary transition-colors cursor-pointer text-[11px]"
                    title="Remember this box's current width, height, and limits as your personal default"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Set as custom default</span>
                  </button>

                  {hasCustomDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleResetBoxDimensions();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-primary hover:bg-primary/10 transition-colors cursor-pointer text-[11px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset to custom default</span>
                    </button>
                  )}

                  {hasCustomDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleClearCustomDefault();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-[11px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear custom default</span>
                    </button>
                  )}

                  {!hasCustomDefault && hasCustomDimensions && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleResetBoxDimensions();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-primary hover:bg-primary/10 transition-colors cursor-pointer text-[11px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset default size</span>
                    </button>
                  )}

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

          {/* Reset Circle button: If box has custom dimensions and does NOT have a 3-dots menu */}
          {!(onEditWidget || onDuplicateWidget || onDeleteWidget || onRowSpanChange) && hasCustomDimensions && (
            <button
              type="button"
              onClick={handleResetBoxDimensions}
              className="h-6 w-6 rounded border border-border/60 hover:bg-secondary text-primary hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Reset custom size"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
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
          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin rounded-b-xl animate-in fade-in duration-150 relative">
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

      {/* Resizing Handles (East, West, South, North, Corners) - Hidden when Box is Pinned */}
      {!isPinned && (
        <>
          {/* Right Edge: Horizontal Width Resize Handle (East) */}
          <div
            onMouseDown={(e) => startResize("e", e)}
            onDoubleClick={handleCycleColSpan}
            className="absolute top-2 -right-2 bottom-2 w-4 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
            title="Drag right edge to resize column width (Double-click to cycle 1/4 -> 1/3 -> 1/2 -> Full)"
          >
            <div
              className={`w-1 h-14 rounded-full transition-all ${
                isResizing === "width" || isResizing === "both" || isResizing === "e" || isResizing === "se" || isResizing === "ne"
                  ? "bg-primary w-1.5 shadow-sm"
                  : "bg-muted-foreground/40 hover:bg-primary hover:w-1.5"
              }`}
            />
          </div>

          {/* Left Edge: Horizontal Width Resize Handle (West) */}
          <div
            onMouseDown={(e) => startResize("w", e)}
            onDoubleClick={handleCycleColSpan}
            className="absolute top-2 -left-2 bottom-2 w-4 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
            title="Drag left edge to resize column width"
          >
            <div
              className={`w-1 h-14 rounded-full transition-all ${
                isResizing === "w" || isResizing === "sw" || isResizing === "nw"
                  ? "bg-primary w-1.5 shadow-sm"
                  : "bg-muted-foreground/40 hover:bg-primary hover:w-1.5"
              }`}
            />
          </div>

          {/* Bottom Edge: Height Resize Handle (South) */}
          {!isCollapsed && (
            <div
              onMouseDown={(e) => startResize("s", e)}
              onDoubleClick={toggleRowSpan}
              className="absolute -bottom-2 left-2 right-2 h-4 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
              title="Drag bottom edge to resize box height (Double click to toggle 1x standard / 2x Bento tall)"
            >
              <div
                className={`h-1 w-20 rounded-full transition-all ${
                  isResizing === "height" || isResizing === "both" || isResizing === "s" || isResizing === "se" || isResizing === "sw"
                    ? "bg-primary h-1.5 shadow-sm"
                    : "bg-muted-foreground/40 hover:bg-primary hover:h-1.5"
                }`}
              />
            </div>
          )}

          {/* Top Edge: Height Resize Handle (North) */}
          {!isCollapsed && (
            <div
              onMouseDown={(e) => startResize("n", e)}
              onDoubleClick={toggleRowSpan}
              className="absolute -top-2 left-2 right-2 h-4 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
              title="Drag top edge to resize box height"
            >
              <div
                className={`h-1 w-20 rounded-full transition-all ${
                  isResizing === "n" || isResizing === "ne" || isResizing === "nw"
                    ? "bg-primary h-1.5 shadow-sm"
                    : "bg-muted-foreground/40 hover:bg-primary hover:h-1.5"
                }`}
              />
            </div>
          )}

          {/* Bottom-Right Corner (South-East) */}
          {!isCollapsed && (
            <div
              onMouseDown={(e) => startResize("se", e)}
              className="absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize z-30 flex items-end justify-end p-1 opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
              title="Drag bottom-right corner to freely resize width and height"
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

          {/* Bottom-Left Corner (South-West) */}
          {!isCollapsed && (
            <div
              onMouseDown={(e) => startResize("sw", e)}
              className="absolute -bottom-1 -left-1 w-6 h-6 cursor-nesw-resize z-30 flex items-end justify-start p-1 opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
              title="Drag bottom-left corner to freely resize width and height"
            >
              <svg className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="14" r="1.5" />
                <circle cx="7" cy="14" r="1.5" />
                <circle cx="12" cy="14" r="1.5" />
                <circle cx="2" cy="9" r="1.5" />
                <circle cx="7" cy="9" r="1.5" />
                <circle cx="2" cy="4" r="1.5" />
              </svg>
            </div>
          )}

          {/* Top-Right Corner (North-East) */}
          {!isCollapsed && (
            <div
              onMouseDown={(e) => startResize("ne", e)}
              className="absolute -top-1 -right-1 w-6 h-6 cursor-nesw-resize z-30 flex items-start justify-end p-1 opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
              title="Drag top-right corner to freely resize width and height"
            >
              <svg className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="14" cy="2" r="1.5" />
                <circle cx="9" cy="2" r="1.5" />
                <circle cx="4" cy="2" r="1.5" />
                <circle cx="14" cy="7" r="1.5" />
                <circle cx="9" cy="7" r="1.5" />
                <circle cx="14" cy="12" r="1.5" />
              </svg>
            </div>
          )}

          {/* Top-Left Corner (North-West) */}
          {!isCollapsed && (
            <div
              onMouseDown={(e) => startResize("nw", e)}
              className="absolute -top-1 -left-1 w-6 h-6 cursor-nwse-resize z-30 flex items-start justify-start p-1 opacity-0 group-hover/box:opacity-100 hover:!opacity-100 transition-opacity select-none"
              title="Drag top-left corner to freely resize width and height"
            >
              <svg className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="2" r="1.5" />
                <circle cx="7" cy="2" r="1.5" />
                <circle cx="12" cy="2" r="1.5" />
                <circle cx="2" cy="7" r="1.5" />
                <circle cx="7" cy="7" r="1.5" />
                <circle cx="2" cy="12" r="1.5" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export interface BookmarkItemsViewProps {
  items: BookmarkWithDetails[];
  mode: WidgetViewMode;
  cardCoverStyle?: "thumbnail" | "icon" | "monogram";
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
  cardCoverStyle = "thumbnail",
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

    if (mode === "cards") {
      const cols = containerWidth >= 1100 ? 4 : containerWidth >= 750 ? 3 : containerWidth >= 480 ? 2 : 1;
      const rows = Math.max(1, Math.floor((availableHeight - 16) / 190));
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

  const handleItemClick = (bm: BookmarkWithDetails) => {
    if (onOpenPreview) {
      onOpenPreview(bm);
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("markly-open-preview", { detail: bm }));
    }
    if (onEditBookmark) {
      onEditBookmark(bm);
    }
  };

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
            onClick={() => handleItemClick(bm)}
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
              onClick={() => handleItemClick(bm)}
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

  // 3. Table View (Data Table with Header, Favicon, Domain, Visits, Date & Quick Actions)
  if (mode === "table") {
    return (
      <div ref={containerRef} className="w-full overflow-x-auto min-h-0 text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-2 px-3">Title &amp; Link</th>
              <th className="py-2 px-2.5">Domain</th>
              <th className="py-2 px-2.5 text-center">Visits</th>
              <th className="py-2 px-2.5 text-right">Added</th>
              <th className="py-2 px-2.5 text-right">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {displayItems.map((bm) => (
              <tr
                key={bm.id}
                onClick={() => handleItemClick(bm)}
                className="hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <td className="py-2 px-3 max-w-[260px] truncate">
                  <div className="flex items-center gap-2 truncate">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-4 w-4 rounded object-contain shrink-0"
                    />
                    <span className="font-medium text-foreground truncate group-hover:text-primary">
                      {bm.title}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-2.5 text-muted-foreground font-mono text-[11px] truncate max-w-[140px]">
                  {bm.domain}
                </td>
                <td className="py-2 px-2.5 text-center font-mono text-[11px] tabular-nums text-foreground/80">
                  {bm.visitCount || 0}
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatTimeAgo(bm.createdAt)}
                </td>
                <td className="py-2 px-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(bm)}
                        className={`h-5 w-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                          bm.isFavorite ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground"
                        }`}
                      >
                        <Star className={`h-2.5 w-2.5 ${bm.isFavorite ? "fill-amber-500" : ""}`} />
                      </button>
                    )}
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleSiteVisit(bm)}
                      className="h-5 w-5 rounded bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 4. Cards View (Notion-Style Visual Cards with 3 Cover Variations: Snapshot / Logo / Gradient)
  if (mode === "cards") {
    const cover = cardCoverStyle || "thumbnail";
    return (
      <div
        ref={containerRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 p-2.5 min-h-0 w-full"
      >
        {displayItems.map((bm) => {
          const gradientBg = getDomainGradient(bm.domain || bm.title || "markly");

          return (
            <div
              key={bm.id}
              onClick={() => handleItemClick(bm)}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-xs hover:border-border-hover hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
            >
              {/* Card Cover: Snapshot / Logo / Gradient */}
              <div className="relative h-28 w-full bg-secondary overflow-hidden border-b border-border/60">
                {cover === "monogram" ? (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-3 relative select-none"
                    style={{ background: gradientBg }}
                  >
                    <div className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg mb-1 flex items-center justify-center">
                      <BookmarkIcon
                        src={bm.iconUrl}
                        alt={bm.title}
                        domain={bm.domain}
                        className="h-6 w-6 rounded object-contain"
                      />
                    </div>
                    <div className="text-xs font-semibold text-white/95 truncate max-w-[85%] text-center">
                      {bm.title}
                    </div>
                    <div className="text-[10px] font-mono text-white/60 truncate max-w-[80%] text-center">
                      {bm.domain}
                    </div>
                  </div>
                ) : cover === "icon" ? (
                  <div className="h-full w-full bg-muted/30 flex flex-col items-center justify-center gap-1.5 p-3">
                    <div className="p-2.5 rounded-xl bg-card border border-border shadow-xs">
                      <BookmarkIcon
                        src={bm.iconUrl}
                        alt={bm.title}
                        domain={bm.domain}
                        className="h-7 w-7 rounded object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[80%]">
                      {bm.domain}
                    </span>
                  </div>
                ) : (
                  /* Snapshot: Live screenshot via mshots with microlink fallback */
                  <div className="relative w-full h-full bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        bm.imageUrl && !bm.imageUrl.includes("avatar-") && !bm.imageUrl.includes("thum.io")
                          ? bm.imageUrl
                          : `https://s0.wp.com/mshots/v1/${encodeURIComponent(bm.url)}?w=800`
                      }
                      alt={bm.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top relative z-10"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.fallbackTried) {
                          target.dataset.fallbackTried = "true";
                          target.src = `https://api.microlink.io/?url=${encodeURIComponent(bm.url)}&screenshot=true&meta=false&embed=screenshot.url`;
                        } else {
                          target.style.display = "none";
                        }
                      }}
                    />
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-3 select-none"
                      style={{ background: gradientBg }}
                    >
                      <div className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg mb-1 flex items-center justify-center">
                        <BookmarkIcon
                          src={bm.iconUrl}
                          alt={bm.title}
                          domain={bm.domain}
                          className="h-6 w-6 rounded object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-white truncate max-w-[85%]">{bm.title}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <BookmarkIcon
                    src={bm.iconUrl}
                    alt={bm.title}
                    domain={bm.domain}
                    className="h-4 w-4 rounded object-contain flex-shrink-0"
                  />
                  <div className="truncate min-w-0">
                    <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {bm.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      {bm.domain}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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
            </div>
          );
        })}
      </div>
    );
  }

  // 5. Compact View (Dense 1-Line Rows)
  return (
    <div ref={containerRef} className="divide-y divide-border/60 min-h-0 w-full">
      {displayItems.map((bm) => (
        <div
          key={bm.id}
          onClick={() => handleItemClick(bm)}
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

