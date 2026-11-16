"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Table, BarChart2, Info, ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import type { VizConfig, VizRow, VizResult } from "@/lib/viz";
import { runViz, VIZ_PALETTE } from "@/lib/viz";
import { ObservablePlotView } from "./observable-plot-view";
import { WidgetBoxContext } from "@/components/home/dashboard-widget-box";

export { VIZ_PALETTE };

export interface VizChartProps {
  config: VizConfig;
  bookmarks: BookmarkWithDetails[];
  folders?: Folder[];
  now?: number;
  timeZone?: string;
  weekStart?: "sunday" | "monday";
  height?: number;
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectFolder?: (folderId: string | null) => void;
  onFilterClick?: (dimension: string, value: string) => void;
  className?: string;
  bare?: boolean;
}

export function VizChart({
  config,
  bookmarks,
  folders = [],
  now,
  timeZone,
  weekStart,
  height = 260,
  onSelectDomain,
  onSelectTag,
  onSelectFolder,
  onFilterClick,
  className = "",
  bare = false,
}: VizChartProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [viewEngine, setViewEngine] = React.useState<"recharts" | "plot" | "table">(
    config.chartType === "table" ? "table" : "recharts"
  );
  const chartWrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const boxCtx = React.useContext(WidgetBoxContext);
  const effectiveHeight = height || (boxCtx.boxHeight ? Math.max(160, boxCtx.boxHeight - 65) : 260);

  React.useEffect(() => {
    if (config.chartType === "table") {
      setViewEngine("table");
    }
  }, [config.chartType]);

  const queryResult: VizResult = React.useMemo(() => {
    return runViz(bookmarks, config, { now, timeZone, weekStart, folders });
  }, [bookmarks, config, now, timeZone, weekStart, folders]);

  const handleItemClick = (dimValue: string) => {
    if (dimValue === "Other") return;

    if (config.dimension === "domain" && onSelectDomain) {
      onSelectDomain(dimValue);
      return;
    }
    if (config.dimension === "tag" && onSelectTag) {
      if (dimValue !== "Untagged") {
        onSelectTag(dimValue);
        return;
      }
    }
    if ((config.dimension === "folder_leaf" || config.dimension === "folder_top") && onSelectFolder) {
      if (dimValue === "Unsorted") {
        onSelectFolder(null);
      } else {
        const found = folders.find((f) => f.name.toLowerCase() === dimValue.toLowerCase());
        onSelectFolder(found ? found.id : null);
      }
      return;
    }
    onFilterClick?.(config.dimension, dimValue);
  };

  // Safe color accent
  const singleAccent = config.displayOptions?.colorAccent || VIZ_PALETTE[0];

  // Aria summary for accessibility
  const ariaSummary = React.useMemo(() => {
    if (queryResult.totalCount === 0) return "Visual chart: No bookmarks match query.";
    const topRow = queryResult.rows[0];
    return `Visual chart showing ${config.title}. Total count: ${queryResult.totalCount}. Highest value: ${
      topRow ? `${topRow.dimension} (${topRow.formattedValue})` : "none"
    }.`;
  }, [config.title, queryResult]);

  if (!isMounted) {
    return (
      <div
        ref={chartWrapperRef}
        style={{ height: `${effectiveHeight}px` }}
        className="w-full flex items-center justify-center bg-card/40 rounded-lg border border-border/50 text-xs text-muted-foreground animate-pulse"
      >
        <span>Loading visual data...</span>
      </div>
    );
  }

  // 1. Empty state
  if (queryResult.rows.length === 0) {
    return (
      <div
        ref={chartWrapperRef}
        style={{ height: `${effectiveHeight}px` }}
        className="w-full flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-border bg-muted/10 space-y-2 select-none"
      >
        <div className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center border border-border">
          <Info className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold text-foreground">No data available</p>
        <p className="text-[11px] text-muted-foreground max-w-xs">
          {queryResult.emptyReason || "No bookmarks match the current visual query filters."}
        </p>
      </div>
    );
  }

  // Custom quiet, high-contrast tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const row = queryResult.rows.find((r) => r.dimension === (label || p.payload?.dimension));

    return (
      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md space-y-1 select-none z-50">
        <div className="font-semibold text-foreground truncate max-w-48">
          {label || p.payload?.dimension || row?.dimension}
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px] font-mono text-muted-foreground">
          <span>{config.measure === "count" ? "Bookmarks:" : "Measure value:"}</span>
          <span className="font-semibold text-foreground">{row?.formattedValue ?? p.value}</span>
        </div>
        {row && config.measure !== "count" && (
          <div className="flex items-center justify-between gap-4 text-[11px] font-mono text-muted-foreground">
            <span>Bookmark count:</span>
            <span className="tabular-nums text-foreground">{row.count}</span>
          </div>
        )}
        {row && !queryResult.isMultiValued && (
          <div className="flex items-center justify-between gap-4 text-[11px] font-mono text-muted-foreground">
            <span>Share of total:</span>
            <span className="tabular-nums text-foreground">
              {queryResult.totalCount > 0
                ? `${((row.count / queryResult.totalCount) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={chartWrapperRef} className={`w-full flex flex-col space-y-2 select-none ${className}`} aria-label={ariaSummary}>
      {/* Sub-toolbar: Table toggle & hint */}
      {!bare && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1">
          <div className="flex items-center gap-1.5 truncate">
            {queryResult.rows.length === 1 && (
              <span className="text-amber-500 font-mono text-[10px]">
                Tip: Only 1 data point recorded for this filter.
              </span>
            )}
            {queryResult.isMultiValued && (
              <span className="text-muted-foreground font-mono text-[10px]">
                * Multi-tag items counted per tag.
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setViewEngine("recharts")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-colors ${
                viewEngine === "recharts"
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              title="Standard Recharts"
            >
              <BarChart2 className="h-3 w-3" />
              <span>Standard</span>
            </button>
            <button
              type="button"
              onClick={() => setViewEngine("plot")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-colors ${
                viewEngine === "plot"
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              title="Observable Plot (Grammar of Graphics)"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Plot</span>
            </button>
            <button
              type="button"
              onClick={() => setViewEngine("table")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-colors ${
                viewEngine === "table"
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              title="Raw data table"
            >
              <Table className="h-3 w-3" />
              <span>Table</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {viewEngine === "plot" ? (
        <div style={{ minHeight: `${effectiveHeight}px` }} className="w-full flex items-center justify-center p-2 rounded-lg border border-border/50 bg-secondary/10">
          <ObservablePlotView
            data={queryResult.rows}
            config={{
              type:
                config.chartType === "horizontal_bar"
                  ? "barX"
                  : config.chartType === "area"
                  ? "area"
                  : config.chartType === "line"
                  ? "line"
                  : "barY",
              x: config.chartType === "horizontal_bar" ? "value" : "dimension",
              y: config.chartType === "horizontal_bar" ? "dimension" : "value",
              fill: singleAccent,
              stroke: singleAccent,
              height: effectiveHeight,
            }}
          />
        </div>
      ) : viewEngine === "table" ? (
        <div
          style={{ height: `${effectiveHeight}px` }}
          className="w-full overflow-auto rounded-lg border border-border bg-card/60 text-xs text-foreground font-mono"
        >
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="py-2 px-3 font-semibold">Dimension</th>
                <th className="py-2 px-3 font-semibold text-right">Value</th>
                <th className="py-2 px-3 font-semibold text-right">Count</th>
                <th className="py-2 px-3 font-semibold text-right">% Total</th>
                <th className="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {queryResult.rows.map((row) => (
                <tr
                  key={row.dimension}
                  className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => handleItemClick(row.dimension)}
                >
                  <td className="py-2 px-3 font-medium text-foreground truncate max-w-44">
                    {row.dimension}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums text-foreground">
                    {row.formattedValue}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                    {row.count}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                    {queryResult.totalCount > 0
                      ? `${((row.count / queryResult.totalCount) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                  <td className="py-2 px-2 text-center text-muted-foreground group-hover:text-primary">
                    <ArrowUpRight className="h-3.5 w-3.5 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : config.chartType === "number" ? (
        // Number KPI Card
        <div
          style={{ height: `${effectiveHeight}px` }}
          className="w-full flex flex-col items-center justify-center p-6 text-center rounded-lg border border-border bg-card/60 space-y-1.5"
        >
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {config.title}
          </span>
          <span className="text-4xl font-bold font-mono tracking-tight text-foreground tabular-nums">
            {queryResult.grandTotalMeasure.toLocaleString("en-US")}
            {config.displayOptions?.unitLabel ? ` ${config.displayOptions.unitLabel}` : ""}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Across {queryResult.totalCount} {queryResult.totalCount === 1 ? "bookmark" : "bookmarks"}
          </span>
        </div>
      ) : config.chartType === "donut" ? (
        // Donut Chart (Max 8 slices)
        <div style={{ height: `${effectiveHeight}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={queryResult.rows.slice(0, 8)}
                dataKey="value"
                nameKey="dimension"
                cx="50%"
                cy="50%"
                innerRadius={effectiveHeight * 0.22}
                outerRadius={effectiveHeight * 0.38}
                paddingAngle={2}
                onClick={(entry: any) => handleItemClick(entry.dimension)}
                cursor="pointer"
              >
                {queryResult.rows.slice(0, 8).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isOther ? "#64748b" : VIZ_PALETTE[index % VIZ_PALETTE.length]}
                    className="hover:opacity-85 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {config.displayOptions?.showLegend !== false && (
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : config.chartType === "horizontal_bar" ? (
        // Horizontal Bar Chart
        <div style={{ height: `${effectiveHeight}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={queryResult.rows}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 24, bottom: 8 }}
            >
              {config.displayOptions?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
              )}
              <XAxis
                type="number"
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="dimension"
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar
                dataKey="value"
                fill={singleAccent}
                radius={[0, 4, 4, 0]}
                onClick={(data: any) => handleItemClick(data.dimension)}
                cursor="pointer"
                className="hover:opacity-85 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : config.chartType === "stacked_bar" && queryResult.series.length > 0 ? (
        // Stacked Bar Chart with SplitBy Series
        <div style={{ height: `${effectiveHeight}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={queryResult.rows.map((r) => ({
                dimension: r.dimension,
                ...(r.seriesValues || {}),
              }))}
              margin={{ top: 8, right: 12, left: -16, bottom: 8 }}
            >
              {config.displayOptions?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              )}
              <XAxis
                dataKey="dimension"
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md space-y-1 font-mono">
                      <div className="font-semibold text-foreground">{label}</div>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                          <span style={{ color: entry.color }}>{entry.name}:</span>
                          <span className="font-semibold text-foreground tabular-nums">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {queryResult.series.map((s, idx) => (
                <Bar
                  key={s}
                  dataKey={s}
                  stackId="a"
                  fill={VIZ_PALETTE[idx % VIZ_PALETTE.length]}
                  radius={idx === queryResult.series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
              {config.displayOptions?.showLegend !== false && (
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  formatter={(val) => <span className="text-foreground">{val}</span>}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : config.chartType === "line" ? (
        // Line Chart
        <div style={{ height: `${effectiveHeight}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={queryResult.rows} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
              {config.displayOptions?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              )}
              <XAxis
                dataKey="dimension"
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={singleAccent}
                strokeWidth={2}
                dot={{ r: 3, fill: singleAccent }}
                activeDot={{ r: 5, fill: singleAccent }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : config.chartType === "area" ? (
        // Area Chart
        <div style={{ height: `${effectiveHeight}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={queryResult.rows} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
              {config.displayOptions?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              )}
              <XAxis
                dataKey="dimension"
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={singleAccent}
                strokeWidth={2}
                fill={singleAccent}
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        // Default: Vertical Bar Chart
        <div style={{ height: `${effectiveHeight}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={queryResult.rows} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
              {config.displayOptions?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              )}
              <XAxis
                dataKey="dimension"
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={10}
                className="font-mono text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar
                dataKey="value"
                fill={singleAccent}
                radius={[4, 4, 0, 0]}
                onClick={(data: any) => handleItemClick(data.dimension)}
                cursor="pointer"
                className="hover:opacity-85 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
