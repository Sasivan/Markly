"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { FolderTreeNode } from "@/server/db/schema";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface FolderTreemapProps {
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string) => void;
}

export function FolderTreemap({ folderTree, onSelectFolder }: FolderTreemapProps) {
  // Transform recursive folder tree to ECharts treemap data format
  const treemapData = React.useMemo(() => {
    function mapNode(node: FolderTreeNode): any {
      const children = (node.children || []).map(mapNode);
      const displayIcon = node.icon && !node.icon.startsWith("iconoir:") ? node.icon : "📁";
      return {
        name: `${displayIcon} ${node.name}`,
        value: node.totalDescendantBookmarkCount || 1,
        folderId: node.id,
        children: children.length > 0 ? children : undefined,
      };
    }

    return folderTree.map(mapNode);
  }, [folderTree]);

  const option = {
    tooltip: {
      formatter: (info: any) => {
        const val = info.value;
        const name = info.name;
        return `<div style="font-size:12px;font-weight:500;">${name}</div><div style="font-size:11px;color:#888;">${val} ${val === 1 ? 'bookmark' : 'bookmarks'}</div>`;
      },
    },
    series: [
      {
        type: "treemap",
        data: treemapData,
        roam: false,
        nodeClick: false,
        breadcrumb: {
          show: true,
          itemStyle: {
            color: "#3b82f6",
          },
        },
        levels: [
          {
            itemStyle: {
              borderColor: "#e5e7eb",
              borderWidth: 2,
              gapWidth: 2,
            },
          },
          {
            colorSaturation: [0.35, 0.6],
            itemStyle: {
              borderColorSaturation: 0.7,
              gapWidth: 1,
              borderWidth: 1,
            },
          },
        ],
      },
    ],
  };

  const onEvents = {
    click: (params: any) => {
      if (params.data?.folderId) {
        onSelectFolder(params.data.folderId);
      }
    },
  };

  return (
    <div className="h-64 w-full">
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        onEvents={onEvents}
        notMerge={true}
      />
    </div>
  );
}

