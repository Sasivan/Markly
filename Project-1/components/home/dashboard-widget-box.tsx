"use client";

import * as React from "react";
import {
  GripVertical,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List,
  Rows3,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Star,
  ExternalLink,
  Archive,
  Bookmark,
} from "lucide-react";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import type { BookmarkWithDetails } from "@/server/db/schema";
import type { HomeWidgetKey } from "./home-layout-modal";

export type WidgetViewMode = "grid" | "list" | "compact";

interface DashboardWidgetBoxProps {
  id: HomeWidgetKey;
  title: string;
  icon: React.ReactNode;
  badgeText?: string | number;
  span?: "1" | "2";
  viewMode?: WidgetViewMode;
  availableViews?: WidgetViewMode[];
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onToggleSpan: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onViewAll?: () => void;
  viewAllLabel?: string;
  extraHeaderAction?: React.ReactNode;
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
  onDragStart,
  onDragOver,
  onDrop,
  children,
}: DashboardWidgetBoxProps) {
  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col transition-all duration-200 group/box ${
        span === "2" ? "lg:col-span-2" : "lg:col-span-1"
      }`}
    >
      {/* Box Header Toolbar */}
      <div className="px-4 py-3 border-b border-border bg-card/90 flex flex-wrap items-center justify-between gap-2.5 select-none">
        {/* Left: Drag Handle, Icon Badge, Title, Item Count */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground p-0.5 rounded hover:bg-secondary transition-colors"
            title="Drag to place section anywhere"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="h-7 w-7 rounded-lg bg-secondary text-foreground flex items-center justify-center flex-shrink-0 border border-border/60">
            {icon}
          </div>
          <div className="flex items-center gap-2 truncate">
            <h2 className="text-xs font-semibold text-foreground truncate">{title}</h2>
            {badgeText !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60 tabular-nums">
                {badgeText}
              </span>
            )}
          </div>
        </div>

        {/* Right: View Switcher, Span Toggle, Move Up/Down, Extra Actions, View All Link */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {extraHeaderAction}

          {/* Multiple View Toggle for this box (Grid / List / Compact) */}
          {availableViews && availableViews.length > 0 && onViewModeChange && viewMode && (
            <div className="flex items-center bg-secondary p-0.5 rounded-md border border-border/60">
              {availableViews.includes("grid") && (
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    viewMode === "grid"
                      ? "bg-card text-foreground shadow-xs font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid View (Cards)"
                >
                  <LayoutGrid className="h-3 w-3" />
                </button>
              )}
              {availableViews.includes("list") && (
                <button
                  type="button"
                  onClick={() => onViewModeChange("list")}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    viewMode === "list"
                      ? "bg-card text-foreground shadow-xs font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List View (Detailed Rows)"
                >
                  <List className="h-3 w-3" />
                </button>
              )}
              {availableViews.includes("compact") && (
                <button
                  type="button"
                  onClick={() => onViewModeChange("compact")}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    viewMode === "compact"
                      ? "bg-card text-foreground shadow-xs font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Compact View (Dense 1-Line Rows)"
                >
                  <Rows3 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Width / Span Toggle: 1 Col (Half) vs 2 Col (Full) */}
          <button
            type="button"
            onClick={onToggleSpan}
            className={`h-6 px-1.5 rounded border border-border/60 text-[10px] font-mono font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              span === "2"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            title={span === "2" ? "Full Width (Click to make Half Width)" : "Half Width (Click to make Full Width)"}
          >
            {span === "2" ? (
              <>
                <Minimize2 className="h-3 w-3" />
                <span className="hidden sm:inline">Full</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                <span className="hidden sm:inline">Half</span>
              </>
            )}
          </button>

          {/* Move Up / Move Down Position Controls */}
          <div className="flex items-center gap-0.5 opacity-60 group-hover/box:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="h-6 w-6 rounded border border-border/60 bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer transition-colors"
              title="Move box up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="h-6 w-6 rounded border border-border/60 bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer transition-colors"
              title="Move box down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

          {/* View All link */}
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium flex items-center gap-1 pl-1"
            >
              <span className="hidden sm:inline">{viewAllLabel}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Box Body */}
      <div className="flex-1">
        {children}
      </div>
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

  // 1. Grid View (Responsive Bookmark Tile Cards)
  if (mode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {items.map((bm) => (
          <div
            key={bm.id}
            onClick={() => (onOpenPreview ? onOpenPreview(bm) : onEditBookmark?.(bm))}
            className="rounded-xl border border-border bg-card hover:bg-secondary/30 p-3 shadow-xs hover:border-border-hover transition-colors flex items-center justify-between gap-3 group cursor-pointer"
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
              className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group text-xs"
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
          className="px-4 py-1.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer group text-xs"
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

