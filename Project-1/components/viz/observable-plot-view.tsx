"use client";

import * as React from "react";
import * as Plot from "@observablehq/plot";
import { WidgetBoxContext } from "@/components/home/dashboard-widget-box";

export type ObservablePlotType =
  // Bars & Columns
  | "barX"
  | "barY"
  | "stackedBarY"
  | "stackedBarX"
  | "groupedBar"
  | "lollipop"
  | "box"
  | "waffle"
  // Points & Scatter
  | "dot"
  | "bubble"
  | "tick"
  | "rule"
  // Lines & Trends
  | "line"
  | "stepLine"
  | "multiLine"
  | "difference"
  | "linearRegression"
  | "bollinger"
  // Areas & Densities
  | "area"
  | "stackedArea"
  | "histogram"
  | "density"
  | "contour"
  // Heatmaps, Meshes & Grids
  | "cell"
  | "matrix"
  | "hexbin"
  | "delaunay"
  | "voronoi"
  // Specialized & Geometric
  | "arrow"
  | "vector"
  | "link"
  | "text"
  | "tree"
  | "auto";

export type ObservableCurveType =
  | "natural"
  | "linear"
  | "step"
  | "step-after"
  | "step-before"
  | "bump-x"
  | "basis"
  | "catmull-rom"
  | "monotone-x";

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
  colorType?: "categorical" | "sequential" | "diverging" | "linear" | "ordinal";
  xType?: "linear" | "log" | "sqrt" | "time" | "utc" | "ordinal" | "band" | "point";
  yType?: "linear" | "log" | "sqrt" | "ordinal" | "band";
  xLabel?: string;
  yLabel?: string;
  title?: string;
  subtitle?: string;
  caption?: string;
  height?: number;
  width?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  inset?: number;
  padding?: number;
  grid?: boolean;
  tip?: boolean;
  crosshair?: boolean;
  legend?: boolean;
  curve?: ObservableCurveType;
  marker?: boolean;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  ariaLabel?: string;
  ariaDescription?: string;
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
  const [containerHeight, setContainerHeight] = React.useState<number>(260);
  const boxCtx = React.useContext(WidgetBoxContext);

  // ResizeObserver for responsive width & height
  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
        if (entry.contentRect.height > 80) {
          setContainerHeight(Math.floor(entry.contentRect.height));
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
      const height = config.height || (boxCtx.boxHeight ? Math.max(160, boxCtx.boxHeight - 65) : Math.max(220, containerHeight));
      const width = config.width || containerWidth;
      const tipEnabled = config.tip !== false;
      const curve = config.curve || "natural";

      const xField = config.x || "x";
      const yField = config.y || "y";
      const fillField = config.fill || "currentColor";
      const strokeColor = config.stroke || "#2f5fb3";
      const markerOptions = config.marker ? { markerEnd: "arrow" as any, markerStart: "dot" as any } : {};

      const useColorScheme = Boolean(config.colorScheme && config.colorScheme !== "none");
      const dynamicFill = (d: any) => d.dimension || d.group || d[yField] || d[xField];

      // Auto: Let Observable Plot infer best marks and layout
      if (config.type === "auto") {
        marks.push(
          Plot.auto(data, {
            x: xField,
            y: yField,
            color: config.z ? { value: config.z } : undefined,
          })
        );
      }

      // 1. Horizontal Ranked Bar (Sorted Descending)
      else if (config.type === "barX") {
        marks.push(Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barX(data, {
            y: yField,
            x: xField,
            fill: useColorScheme ? (config.z || dynamicFill) : (config.fill || "#2f5fb3"),
            rx: 4,
            sort: { y: "-x" },
            tip: tipEnabled,
          })
        );
      }

      // 2. Vertical Column Bar
      else if (config.type === "barY") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barY(data, {
            x: xField,
            y: yField,
            fill: useColorScheme ? (config.z || dynamicFill) : (config.fill || "#2f5fb3"),
            rx: 4,
            tip: tipEnabled,
          })
        );
      }

      // 3. Stacked Bar Y (Stacked vertical columns by folder/category)
      else if (config.type === "stackedBarY") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barY(
            data,
            Plot.stackY({
              x: xField,
              y: yField,
              fill: config.z || "group",
              rx: 3,
              tip: tipEnabled,
            })
          )
        );
      }

      // 4. Stacked Bar X (Stacked horizontal bars by category)
      else if (config.type === "stackedBarX") {
        marks.push(Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barX(
            data,
            Plot.stackX({
              y: yField,
              x: xField,
              fill: config.z || "group",
              rx: 3,
              tip: tipEnabled,
            })
          )
        );
      }

      // 5. Grouped Bar (Faceted side-by-side columns)
      else if (config.type === "groupedBar") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.barY(data, {
            x: xField,
            y: yField,
            fx: config.fx || config.z || "group",
            fill: config.z || "group",
            rx: 3,
            tip: tipEnabled,
          })
        );
      }

      // 6. Box Plot (Box & Whisker distribution)
      else if (config.type === "box") {
        marks.push(
          Plot.boxY(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            fillOpacity: 0.35,
            stroke: strokeColor,
            tip: tipEnabled,
          })
        );
      }

      // 7. Waffle Chart (Unit square distribution)
      else if (config.type === "waffle") {
        marks.push(
          Plot.waffleY(data, {
            y: yField,
            fill: config.z || "group",
            rx: 2,
            tip: tipEnabled,
          })
        );
      }

      // 8. Scatter Dot Plot
      else if (config.type === "dot") {
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: useColorScheme ? (config.z || dynamicFill) : (config.fill || "#2f5fb3"),
            r: config.r ? (typeof config.r === "string" ? config.r : config.r) : 6,
            fillOpacity: 0.85,
            stroke: "currentColor",
            strokeWidth: 0.75,
            tip: tipEnabled,
          })
        );
      }

      // 9. Bubble Chart (3D size mapped scatter)
      else if (config.type === "bubble") {
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            r: (d: any) => Math.min(24, Math.max(5, Math.sqrt(d.value || d.r || d.count || d.visitCount || 1) * 3.5)),
            fill: useColorScheme ? (config.z || dynamicFill) : (config.fill || "#2f5fb3"),
            fillOpacity: 0.8,
            stroke: "currentColor",
            strokeWidth: 1,
            tip: tipEnabled,
          })
        );
      }

      // 10. Tick Marks (1D Strip density plot)
      else if (config.type === "tick") {
        marks.push(
          Plot.tickX(data, {
            x: xField,
            stroke: useColorScheme ? (config.z || dynamicFill) : (config.fill || strokeColor),
            strokeWidth: 2,
            tip: tipEnabled,
          })
        );
      }

      // 11. Rule Spikes
      else if (config.type === "rule") {
        marks.push(
          Plot.ruleX(data, {
            x: xField,
            stroke: config.fill || strokeColor,
            strokeWidth: 2,
            tip: tipEnabled,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: config.fill || strokeColor,
            r: 5,
          })
        );
      }

      // 12. Smooth Trend Line
      else if (config.type === "line") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2.5,
            curve,
            ...(markerOptions as any),
            tip: tipEnabled,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            r: 3.5,
          })
        );
      }

      // 13. Step Line
      else if (config.type === "stepLine") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2,
            curve: "step",
            tip: tipEnabled,
          })
        );
      }

      // 14. Multi-Series Comparative Lines
      else if (config.type === "multiLine") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            z: config.z || "folder",
            stroke: config.z || "folder",
            strokeWidth: 2,
            curve,
            tip: tipEnabled,
          })
        );
      }

      // 15. Linear Regression Trendline with Scatter
      else if (config.type === "linearRegression") {
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: "currentColor",
            fillOpacity: 0.4,
            r: 3.5,
          })
        );
        marks.push(
          Plot.linearRegressionY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2.5,
            ci: 0.95,
            tip: tipEnabled,
          })
        );
      }

      // 16. Bollinger Moving Average Bands
      else if (config.type === "bollinger") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.bollingerY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2,
            n: 5,
            k: 2,
            tip: tipEnabled,
          })
        );
      }

      // 17. Area Trend Fill
      else if (config.type === "area") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.areaY(data, {
            x: xField,
            y: yField,
            fill: config.fill || strokeColor,
            fillOpacity: 0.25,
            curve,
          })
        );
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 2,
            curve,
            tip: tipEnabled,
          })
        );
      }

      // 18. Stacked Stream Area
      else if (config.type === "stackedArea") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.areaY(
            data,
            Plot.stackY({
              x: xField,
              y: yField,
              fill: config.z || "folder",
              fillOpacity: 0.8,
              curve,
              tip: tipEnabled,
            })
          )
        );
      }

      // 19. Difference Variance Envelope
      else if (config.type === "difference") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.areaY(data, {
            x: xField,
            y1: (d: any) => d.y1 || 0,
            y2: (d: any) => d.y2 || d.value || d.count || 1,
            fill: strokeColor,
            fillOpacity: 0.2,
            curve,
            tip: tipEnabled,
          })
        );
        marks.push(
          Plot.lineY(data, {
            x: xField,
            y: (d: any) => d.y2 || d.value || 1,
            stroke: strokeColor,
            strokeWidth: 2,
            curve,
          })
        );
      }

      // 20. Histogram Binned Distribution
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

      // 21. 2D Gaussian Density Contours
      else if (config.type === "density") {
        marks.push(
          Plot.density(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeWidth: 1.5,
            bandwidth: 12,
            thresholds: 8,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            r: 2,
            fillOpacity: 0.6,
          })
        );
      }

      // 22. Contour Isobar Map
      else if (config.type === "contour") {
        marks.push(
          Plot.contour(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            fill: strokeColor,
            fillOpacity: 0.1,
          })
        );
      }

      // 23. Discrete Heatmap Cells
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

      // 24. Cross-Dimension Value Matrix
      else if (config.type === "matrix") {
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

      // 25. Hexbin Density Clustering
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

      // 26. Delaunay Geometric Triangulation Mesh
      else if (config.type === "delaunay") {
        marks.push(
          Plot.delaunayMesh(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeOpacity: 0.35,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            r: 4,
            tip: tipEnabled,
          })
        );
      }

      // 27. Voronoi Polygonal Tessellation Cells
      else if (config.type === "voronoi") {
        marks.push(
          Plot.voronoi(data, {
            x: xField,
            y: yField,
            stroke: strokeColor,
            strokeOpacity: 0.5,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: strokeColor,
            r: 3,
            tip: tipEnabled,
          })
        );
      }

      // 28. Directed Vector Arrows
      else if (config.type === "arrow") {
        marks.push(
          Plot.arrow(data, {
            x1: xField,
            y1: yField,
            x2: (d: any) => (d.x2 !== undefined ? d.x2 : d.x + (d.dx || 5)),
            y2: (d: any) => (d.y2 !== undefined ? d.y2 : d.y + (d.dy || 5)),
            stroke: strokeColor,
            strokeWidth: 1.5,
            tip: tipEnabled,
          })
        );
      }

      // 29. Velocity Vectors
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

      // 30. Network Links between pairs
      else if (config.type === "link") {
        marks.push(
          Plot.link(data, {
            x1: xField,
            y1: yField,
            x2: (d: any) => d.x2 || d.x,
            y2: (d: any) => d.y2 || d.y,
            stroke: strokeColor,
            strokeOpacity: 0.6,
            strokeWidth: 1.5,
            tip: tipEnabled,
          })
        );
      }

      // 31. Sized Word / Text Cloud
      else if (config.type === "text") {
        marks.push(
          Plot.text(data, {
            x: xField,
            y: yField,
            text: (d: any) => d.dimension || d.domain || d.title || "Item",
            fontSize: (d: any) => Math.min(18, Math.max(10, Math.round((d.value || d.count || 1) * 2))),
            fill: config.fill || strokeColor,
            tip: tipEnabled,
          })
        );
      }

      // 32. Hierarchical Tree Layout
      else if (config.type === "tree") {
        marks.push(
          Plot.tree(data, {
            path: (d: any) => d.path || d.dimension || d.domain || "Workspace/Root",
            fill: strokeColor,
            stroke: strokeColor,
            tip: tipEnabled,
          })
        );
      }

      // 33. Lollipop Stems
      else if (config.type === "lollipop") {
        marks.push(Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.15 }));
        marks.push(
          Plot.ruleY(data, {
            x: xField,
            y: yField,
            stroke: useColorScheme ? (config.z || dynamicFill) : strokeColor,
            strokeWidth: 1.5,
          })
        );
        marks.push(
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: useColorScheme ? (config.z || dynamicFill) : strokeColor,
            r: 5,
            tip: tipEnabled,
          })
        );
      }

      // Fallback: Matrix
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

      // Native Crosshair Interaction (if enabled)
      if (config.crosshair) {
        marks.push(
          Plot.crosshair(data, {
            x: xField,
            y: yField,
          })
        );
      }

      // Plot.plot Grammar Options
      const plot = Plot.plot({
        width,
        height,
        marginTop: config.marginTop ?? 20,
        marginRight: config.marginRight ?? 35,
        marginBottom: config.marginBottom ?? 35,
        marginLeft: config.marginLeft ?? (config.type === "barX" || config.type === "stackedBarX" ? 175 : 55),
        inset: config.inset ?? 6,
        grid: hasGrid,
        ariaLabel: config.ariaLabel || config.title || `Observable ${config.type} plot`,
        ariaDescription: config.ariaDescription || `Interactive data visualization displaying ${data.length} records.`,
        style: {
          background: "transparent",
          color: "currentColor",
          fontSize: "11px",
          fontFamily: "inherit",
        },
        color: useColorScheme
          ? {
              scheme: config.colorScheme as any,
              type:
                config.colorType ||
                (["viridis", "magma", "inferno", "plasma", "cividis", "turbo", "warm", "cool", "blues", "greens", "reds", "spectral", "rdylbu"].includes(String(config.colorScheme).toLowerCase())
                  ? "linear"
                  : config.type === "cell" || config.type === "density" || config.type === "matrix"
                  ? "linear"
                  : "categorical"),
              legend: config.legend ?? true,
            }
          : undefined,
        x: {
          type: config.xType,
          label: config.xLabel ?? null,
        },
        y: {
          type: config.yType,
          label: config.yLabel ?? null,
        },
        marks,
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(plot);

        // Bind interactive click listener to mark nodes if onItemClick is passed
        if (onItemClick) {
          const markElements = containerRef.current.querySelectorAll("rect, circle, path");
          markElements.forEach((el, idx) => {
            el.addEventListener("click", () => {
              if (data[idx]) onItemClick(data[idx]);
            });
          });
        }
      }
    } catch (err) {
      console.error("Observable Plot render error:", err);
    }
  }, [data, config, containerWidth, onItemClick, boxCtx.boxHeight]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-x-auto flex items-center justify-center select-none ${className}`}
      style={{ minHeight: `${config.height || 260}px` }}
    />
  );
}
