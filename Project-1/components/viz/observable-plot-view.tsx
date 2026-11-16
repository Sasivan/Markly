"use client";

import * as React from "react";
import * as Plot from "@observablehq/plot";

export interface ObservablePlotConfig {
  type: "barY" | "barX" | "dot" | "line" | "area" | "cell";
  x?: string;
  y?: string;
  fill?: string;
  stroke?: string;
  r?: string | number;
  fx?: string;
  fy?: string;
  colorScheme?: string;
  title?: string;
  height?: number;
  width?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  grid?: boolean;
  tip?: boolean;
}

export interface ObservablePlotViewProps {
  data: any[];
  config: ObservablePlotConfig;
  className?: string;
  onItemClick?: (item: any) => void;
}

export function ObservablePlotView({
  data,
  config,
  className = "",
  onItemClick,
}: ObservablePlotViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(500);

  // ResizeObserver for responsive auto-width
  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) {
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }

    try {
      const marks: Plot.Markish[] = [];
      const hasGrid = config.grid !== false;
      const height = config.height || 260;
      const width = config.width || containerWidth;
      const tipEnabled = config.tip !== false;

      // Rule at zero for nice baseline
      if (config.type === "barY" || config.type === "area" || config.type === "line") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
      }
      if (config.type === "barX") {
        marks.push(Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
      }

      const xField = config.x || "x";
      const yField = config.y || "y";
      const fillField = config.fill || "currentColor";

      switch (config.type) {
        case "barY":
          marks.push(
            Plot.barY(data, {
              x: xField,
              y: yField,
              fill: config.fill ? fillField : "#3b82f6",
              rx: 4,
              tip: tipEnabled,
            })
          );
          break;

        case "barX":
          marks.push(
            Plot.barX(data, {
              y: yField,
              x: xField,
              fill: config.fill ? fillField : "#3b82f6",
              rx: 4,
              sort: { y: "-x" },
              tip: tipEnabled,
            })
          );
          break;

        case "dot":
          marks.push(
            Plot.dot(data, {
              x: xField,
              y: yField,
              fill: config.fill ? fillField : "#6366f1",
              r: config.r ? (typeof config.r === "string" ? config.r : config.r) : 5,
              fillOpacity: 0.8,
              stroke: "#ffffff",
              strokeWidth: 1,
              tip: tipEnabled,
            })
          );
          break;

        case "line":
          marks.push(
            Plot.lineY(data, {
              x: xField,
              y: yField,
              stroke: config.stroke || "#3b82f6",
              strokeWidth: 2.5,
              curve: "natural",
              tip: tipEnabled,
            })
          );
          marks.push(
            Plot.dot(data, {
              x: xField,
              y: yField,
              fill: config.stroke || "#3b82f6",
              r: 3.5,
            })
          );
          break;

        case "area":
          marks.push(
            Plot.areaY(data, {
              x: xField,
              y: yField,
              fill: config.fill || "#3b82f6",
              fillOpacity: 0.25,
              curve: "natural",
            })
          );
          marks.push(
            Plot.lineY(data, {
              x: xField,
              y: yField,
              stroke: config.stroke || "#3b82f6",
              strokeWidth: 2,
              curve: "natural",
              tip: tipEnabled,
            })
          );
          break;

        case "cell":
          marks.push(
            Plot.cell(data, {
              x: xField,
              y: yField,
              fill: config.fill || "count",
              rx: 3,
              inset: 1,
              tip: tipEnabled,
            })
          );
          break;
      }

      const plot = Plot.plot({
        width,
        height,
        marginTop: config.marginTop ?? 20,
        marginRight: config.marginRight ?? 25,
        marginBottom: config.marginBottom ?? 35,
        marginLeft: config.marginLeft ?? (config.type === "barX" ? 90 : 45),
        grid: hasGrid,
        style: {
          background: "transparent",
          color: "currentColor",
          fontSize: "11px",
          fontFamily: "inherit",
        },
        color: config.colorScheme
          ? { scheme: config.colorScheme as any, legend: config.type === "cell" }
          : undefined,
        marks,
      });

      containerRef.current.replaceChildren(plot);

      return () => {
        plot.remove();
      };
    } catch (err) {
      console.error("Observable Plot render error:", err);
    }
  }, [data, config, containerWidth]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden flex items-center justify-center text-foreground ${className}`}
    />
  );
}
