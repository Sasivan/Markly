"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { BookmarkWithDetails } from "@/server/db/schema";

interface ActivityHeatmap365Props {
  bookmarks: BookmarkWithDetails[];
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  bare?: boolean;
}

interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  date: Date;
  count: number;
  bookmarks: BookmarkWithDetails[];
}

export function ActivityHeatmap365({
  bookmarks,
  onOpenPreview,
  bare = false,
}: ActivityHeatmap365Props) {
  const [selectedDay, setSelectedDay] = React.useState<DayActivity | null>(null);
  const [hoveredDay, setHoveredDay] = React.useState<DayActivity | null>(null);

  // Generate 52 weeks of day slots ending at today
  const { weeks, monthLabels, totalYearActivity, maxDayCount } = React.useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Build lookup map for all bookmark creations & visits in past 365 days
    const activityMap = new Map<string, { count: number; items: BookmarkWithDetails[] }>();

    for (const b of bookmarks) {
      if (b.isArchived) continue;

      // 1. Creation date
      if (b.createdAt) {
        const d = new Date(b.createdAt);
        const k = d.toISOString().slice(0, 10);
        const existing = activityMap.get(k) || { count: 0, items: [] };
        existing.count += 1;
        if (!existing.items.some((x) => x.id === b.id)) {
          existing.items.push(b);
        }
        activityMap.set(k, existing);
      }

      // 2. Last visited / clicked date
      const visitTime = b.lastClickedAt || b.lastVisitedAt;
      if (visitTime) {
        const d = new Date(visitTime);
        const k = d.toISOString().slice(0, 10);
        const existing = activityMap.get(k) || { count: 0, items: [] };
        existing.count += (b.visitCount && b.visitCount > 1 ? 2 : 1);
        if (!existing.items.some((x) => x.id === b.id)) {
          existing.items.push(b);
        }
        activityMap.set(k, existing);
      }
    }

    // 52 weeks = 364 days, aligned to start on Sunday
    const dayOfWeekToday = today.getDay(); // 0 is Sunday, 6 is Saturday
    // Total days to include: 52 full weeks (364 days) + current week up to today
    const totalDays = 52 * 7 + (dayOfWeekToday + 1);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1);
    startDate.setHours(0, 0, 0, 0);

    const weeksArr: DayActivity[][] = [];
    let currentWeek: DayActivity[] = [];
    let totalActivity = 0;
    let maxCount = 0;

    const monthMap: { month: string; colIndex: number }[] = [];
    let lastMonth = -1;

    const cur = new Date(startDate);
    let colIdx = 0;

    while (cur <= today) {
      const dateStr = cur.toISOString().slice(0, 10);
      const data = activityMap.get(dateStr);
      const count = data?.count || 0;
      const items = data?.items || [];

      totalActivity += count;
      if (count > maxCount) maxCount = count;

      const dayObj: DayActivity = {
        dateStr,
        date: new Date(cur),
        count,
        bookmarks: items,
      };

      currentWeek.push(dayObj);

      // Check month boundary for header labels
      const m = cur.getMonth();
      if (m !== lastMonth && cur.getDate() <= 14) {
        monthMap.push({
          month: cur.toLocaleString("default", { month: "short" }),
          colIndex: colIdx,
        });
        lastMonth = m;
      }

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
        colIdx += 1;
      }

      cur.setDate(cur.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    return {
      weeks: weeksArr,
      monthLabels: monthMap,
      totalYearActivity: totalActivity,
      maxDayCount: Math.max(4, maxCount),
    };
  }, [bookmarks]);

  // Color intensity scale (0 to 4)
  const getLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  };

  const getCellColorClass = (level: number): string => {
    switch (level) {
      case 0:
        return "bg-secondary border-border hover:border-border-strong";
      case 1:
        return "bg-primary/20 border-primary/30 hover:border-primary/60";
      case 2:
        return "bg-primary/40 border-primary/50 hover:border-primary/80";
      case 3:
        return "bg-primary/70 border-primary/80 hover:border-primary text-white";
      case 4:
        return "bg-primary border-primary text-white";
      default:
        return "bg-secondary border-border";
    }
  };

  return (
    <div className={bare ? "p-4 space-y-3" : "rounded-xl border border-border bg-card p-4 shadow-surface"}>
      {/* Header */}
      {!bare && (
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span className="truncate">365-Day Library Activity Heatmap</span>
                <span className="text-2xs font-mono font-normal text-muted-foreground">
                  ({totalYearActivity} actions logged)
                </span>
              </h3>
              <p className="text-2xs text-muted-foreground">
                Cadence of saved bookmarks, links visited, and updates across the past year.
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="hidden shrink-0 items-center gap-1 font-mono text-3xs text-muted-foreground sm:flex">
            <span>Less</span>
            <span className="inline-block h-2.5 w-2.5 rounded-xs border border-border bg-secondary" />
            <span className="inline-block h-2.5 w-2.5 rounded-xs border border-primary/30 bg-primary/20" />
            <span className="inline-block h-2.5 w-2.5 rounded-xs border border-primary/50 bg-primary/40" />
            <span className="inline-block h-2.5 w-2.5 rounded-xs border border-primary/80 bg-primary/70" />
            <span className="inline-block h-2.5 w-2.5 rounded-xs border border-primary bg-primary" />
            <span>More</span>
          </div>
        </div>
      )}

      {/* Heatmap Grid Container */}
      <div className="mk-scroll mt-3 overflow-x-auto pb-2">
        <div className="min-w-[460px] sm:min-w-0">
          {/* Months header — positioned against the week columns */}
          <div className="relative mb-1.5 ml-6 h-3.5 font-mono text-3xs text-muted-foreground">
            {monthLabels.map((lbl, idx) => (
              <span
                key={idx}
                className="absolute top-0"
                style={{ left: `${(lbl.colIndex / Math.max(weeks.length, 1)) * 100}%` }}
              >
                {lbl.month}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between pr-1 font-mono text-3xs text-muted-foreground select-none">
              <span className="leading-none">Mon</span>
              <span className="leading-none">Wed</span>
              <span className="leading-none">Fri</span>
            </div>

            {/* Weeks Columns — cells stretch to fill the available width */}
            <div className="flex min-w-0 flex-1 gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  {week.map((day) => {
                    const level = getLevel(day.count);
                    const isSelected = selectedDay?.dateStr === day.dateStr;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`aspect-square w-full cursor-pointer rounded-xs border transition-colors ${getCellColorClass(
                          level
                        )} ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        title={`${day.dateStr}: ${day.count} bookmark events`}
                        aria-label={`${day.dateStr}: ${day.count} bookmark events`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip & Details Bar */}
      <div className="mt-2 pt-2 border-t border-border/40 min-h-6 flex items-center justify-between text-xs">
        {hoveredDay || selectedDay ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-foreground font-medium">
              {(hoveredDay || selectedDay)!.date.toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-muted-foreground font-mono">
              • {(hoveredDay || selectedDay)!.count} events
            </span>
            {(hoveredDay || selectedDay)!.bookmarks.length > 0 && (
              <span className="text-2xs text-primary">
                ({(hoveredDay || selectedDay)!.bookmarks.length} bookmark{(hoveredDay || selectedDay)!.bookmarks.length > 1 ? "s" : ""} recorded)
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-2xs">
            Hover or click any square to inspect events and bookmarks on that day.
          </span>
        )}

        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-2xs text-muted-foreground hover:text-foreground cursor-pointer underline"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Selected Day's Bookmarks List (If clicked) */}
      {selectedDay && selectedDay.bookmarks.length > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-secondary/50 border border-border space-y-1.5 mk-fade-in">
          <div className="text-2xs font-medium text-foreground flex items-center justify-between">
            <span>Bookmarks active on {selectedDay.dateStr}:</span>
            <span className="font-mono text-muted-foreground text-3xs">
              {selectedDay.bookmarks.length} site{selectedDay.bookmarks.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {selectedDay.bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => onOpenPreview?.(bm)}
                className="flex items-center justify-between p-1.5 rounded-md bg-card border border-border hover:border-primary/50 cursor-pointer transition-colors text-xs"
              >
                <div className="truncate mr-2">
                  <div className="font-medium text-foreground truncate">{bm.title || bm.url}</div>
                  <div className="text-3xs text-muted-foreground font-mono truncate">{bm.url}</div>
                </div>
                <span className="text-3xs text-primary font-mono flex-shrink-0">Preview</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

