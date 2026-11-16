"use client";

import * as React from "react";
import * as Plot from "@observablehq/plot";

export type ObservablePlotType =
  | "barX"
  | "barY"
  | "stackedBarY"
  | "stackedBarX"
  | "groupedBar"
  | "dot"
  | "bubble"
  | "line"
  | "stepLine"
  | "area"
  | "stackedArea"
  | "cell"
  | "histogram"
  | "rule"
  | "tick"
  | "vector"
  | "text"
  | "hexbin"
  | "difference"
  | "multiLine"
  | "lollipop"
  | "matrix";

export interface ObservablePlotConfig {
  type: ObservablePlotType;
  x?: string;
  y?: string;
  z?: string;
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
  curve?: "natural" | "linear" | "step" | "bump-x";
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

  // ResizeObserver for responsive width
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

      const xField = config.x || "x";
      const yField = config.y || "y";
      const fillField = config.fill || "currentColor";
      const strokeColor = config.stroke || "#3b82f6";

      // 1. BarX (Horizontal ranked bars)
      if (config.type === "barX") {
        marks.push(Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
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
      }

      // 2. BarY (Vertical columns)
      else if (config.type === "barY") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barY(data, {
            x: xField,
            y: yField,
            fill: config.fill ? fillField : "#3b82f6",
            rx: 4,
            tip: tipEnabled,
          })
        );
      }

      // 3. StackedBarY (Vertical stacked categories)
      else if (config.type === "stackedBarY") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barY(data, {
            x: xField,
            y: yField,
            fill: config.z || "folder",
            rx: 2,
            tip: tipEnabled,
          })
        );
      }

      // 4. StackedBarX (Horizontal stacked categories)
      else if (config.type === "stackedBarX") {
        marks.push(Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barX(data, {
            y: yField,
            x: xField,
            fill: config.z || "status",
            rx: 2,
            tip: tipEnabled,
          })
        );
      }

      // 5. GroupedBar (Faceted side-by-side dodge bars)
      else if (config.type === "groupedBar") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barY(data, {
            x: xField,
            y: yField,
            fx: config.fx || "folder",
            fill: config.fill ? fillField : "#0d9488",
            rx: 3,
            tip: tipEnabled,
          })
        );
      }

      // 6. Dot (Standard scatter plot)
      else if (config.type === "dot") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.1 }));
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: config.fill ? fillField : "#6366f1",
            r: 4.5,
            fillOpacity: 0.8,
            stroke: "currentColor",
            strokeOpacity: 0.2,
            tip: tipEnabled,
          })
        );
      }

      // 7. Bubble (Scatter plot with radius mapped to metric)
      else if (config.type === "bubble") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.1 }));
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: config.z || config.fill || "folder",
            r: config.r || yField,
            fillOpacity: 0.75,
            stroke: "#ffffff",
            strokeWidth: 1,
            tip: tipEnabled,
          })
        );
      }

      // 8. Line (Time series line curve)
      else if (config.type === "line") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2.5,
            curve: config.curve || "natural",
            tip: tipEnabled,
          })
        );
        marks.push(Plot.dot(data, { x: xField, y: yField, fill: strokeColor, r: 3.5 }));
      }

      // 9. StepLine (Stepped line graph)
      else if (config.type === "stepLine") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2.5,
            curve: "step",
            tip: tipEnabled,
          })
        );
      }

      // 10. Area (Gradient area trend)
      else if (config.type === "area") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
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
            stroke: strokeColor,
            strokeWidth: 2,
            curve: "natural",
            tip: tipEnabled,
          })
        );
      }

      // 11. StackedArea (Layered stacked area chart)
      else if (config.type === "stackedArea") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.areaY(data, {
            x: xField,
            y: yField,
            fill: config.z || "folder",
            fillOpacity: 0.6,
            curve: "natural",
            tip: tipEnabled,
          })
        );
      }

      // 12. Cell (2D matrix heatmap)
      else if (config.type === "cell") {
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
      }

      // 13. Histogram (Frequency distribution bins)
      else if (config.type === "histogram") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.rectY(
            data,
            Plot.binX(
              { y: "count" },
              { x: xField, rx: 3, tip: tipEnabled } as any
            )
          )
        );
      }

      // 14. Rule (Benchmark / target rule plot)
      else if (config.type === "rule") {
        marks.push(
          Plot.ruleX(data, {
            x: xField,
            stroke: config.fill || "#3b82f6",
            strokeWidth: 2,
            tip: tipEnabled,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: config.fill || "#3b82f6",
            r: 5,
          })
        );
      }

      // 15. Tick (1D strip density plot)
      else if (config.type === "tick") {
        marks.push(
          Plot.tickX(data, {
            x: xField,
            stroke: config.fill || "#3b82f6",
            strokeWidth: 1.5,
            tip: tipEnabled,
          })
        );
      }

      // 16. Vector (Velocity arrows)
      else if (config.type === "vector") {
        marks.push(
          Plot.vector(data, {
            x: xField,
            y: yField,
            length: (d: any) => Math.min(30, Math.max(10, d.value || d.visits || 15)),
            rotate: (d: any) => ((d.value || d.visits || 10) * 17) % 360,
            stroke: strokeColor,
            tip: tipEnabled,
          })
        );
      }

      // 17. Text (Weighted tag/label cloud)
      else if (config.type === "text") {
        marks.push(
          Plot.text(data, {
            x: xField,
            y: yField,
            text: (d: any) => d.dimension || d.domain || d.title || "Item",
            fontSize: (d: any) => Math.min(18, Math.max(10, Math.round((d.value || d.count || 1) * 2))),
            fill: config.fill || "#3b82f6",
            tip: tipEnabled,
          })
        );
      }

      // 18. Hexbin (Hexagonal density cluster)
      else if (config.type === "hexbin") {
        marks.push(
          Plot.dot(
            data,
            Plot.hexbin(
              { fill: "count", r: "count" },
              { x: xField, y: yField, tip: tipEnabled } as any
            )
          )
        );
      }

      // 19. Difference (Band / range curve)
      else if (config.type === "difference") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.areaY(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            fillOpacity: 0.3,
            curve: "natural",
          })
        );
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2,
            curve: "natural",
            tip: tipEnabled,
          })
        );
      }

      // 20. MultiLine (Multi-series comparative lines)
      else if (config.type === "multiLine") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            z: config.z || "folder",
            stroke: config.z || "folder",
            strokeWidth: 2,
            curve: "natural",
            tip: tipEnabled,
          })
        );
      }

      // 21. Lollipop (Stems with dot endpoints)
      else if (config.type === "lollipop") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.ruleY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 1.5,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            r: 5,
            tip: tipEnabled,
          })
        );
      }

      // 22. Matrix (Cross-dimension matrix)
      else {
        marks.push(
          Plot.cell(data, {
            x: xField,
            y: yField,
            fill: (d: any) => d.value || d.count || 1,
            rx: 2,
            inset: 1,
            tip: tipEnabled,
          })
        );
      }

      const plot = Plot.plot({
        width,
        height,
        marginTop: config.marginTop ?? 20,
        marginRight: config.marginRight ?? 30,
        marginBottom: config.marginBottom ?? 35,
        marginLeft: config.marginLeft ?? (config.type === "barX" || config.type === "stackedBarX" ? 95 : 45),
        grid: hasGrid,
        style: {
          background: "transparent",
          color: "currentColor",
          fontSize: "11px",
          fontFamily: "inherit",
        },
        color: config.colorScheme
          ? { scheme: config.colorScheme as any, legend: config.type === "cell" || config.type === "multiLine" || config.type === "stackedBarY" }
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
