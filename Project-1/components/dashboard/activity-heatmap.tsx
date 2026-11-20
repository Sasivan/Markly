"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface ActivityHeatmapProps {
  timeline: { date: string; count: number }[];
}

export function ActivityHeatmap({ timeline }: ActivityHeatmapProps) {
  const currentYear = new Date().getFullYear();

  // Format data as [dateStr, count]
  const data = React.useMemo(() => {
    return timeline.map((item) => [item.date, item.count]);
  }, [timeline]);

  const option = {
    tooltip: {
      position: "top",
      formatter: (p: any) => {
        const val = p.data[1] || 0;
        return `<div style="font-size:11px;"><strong>${p.data[0]}</strong>: ${val} ${val === 1 ? 'bookmark' : 'bookmarks'} added</div>`;
      },
    },
    visualMap: {
      min: 0,
      max: 6,
      type: "piecewise",
      orient: "horizontal",
      left: "center",
      top: 0,
      textStyle: { fontSize: 10 },
      inRange: {
        color: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
      },
    },
    calendar: {
      top: 40,
      left: 30,
      right: 30,
      cellSize: ["auto", 13],
      range: currentYear,
      itemStyle: {
        borderWidth: 0.5,
        borderColor: "#fff",
      },
      yearLabel: { show: false },
      dayLabel: { firstDay: 1, nameMap: "en", fontSize: 9 },
      monthLabel: { fontSize: 10 },
    },
    series: {
      type: "heatmap",
      coordinateSystem: "calendar",
      data: data,
    },
  };

  return (
    <div className="h-44 w-full">
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={true}
      />
    </div>
  );
}

