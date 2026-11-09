"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { FolderTreeNode } from "@/server/db/schema";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface FolderSunburstProps {
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string) => void;
}

export function FolderSunburst({ folderTree, onSelectFolder }: FolderSunburstProps) {
  const sunburstData = React.useMemo(() => {
    function mapNode(node: FolderTreeNode): any {
      const children = (node.children || []).map(mapNode);
      return {
        name: node.name,
        value: Math.max(node.totalDescendantBookmarkCount, 1),
        folderId: node.id,
        children: children.length > 0 ? children : undefined,
      };
    }

    return folderTree.map(mapNode);
  }, [folderTree]);

  const option = {
    tooltip: {
      formatter: (info: any) => {
        return `<div style="font-size:12px;font-weight:500;">${info.name}</div><div style="font-size:11px;color:#888;">${info.value} bookmarks</div>`;
      },
    },
    series: {
      type: "sunburst",
      data: sunburstData,
      radius: [0, "90%"],
      sort: undefined,
      emphasis: {
        focus: "ancestor",
      },
      levels: [
        {},
        {
          r0: "15%",
          r: "40%",
          itemStyle: { borderWidth: 2 },
          label: { rotate: "tangential", fontSize: 11 },
        },
        {
          r0: "40%",
          r: "70%",
          label: { align: "right", fontSize: 10 },
        },
        {
          r0: "70%",
          r: "90%",
          label: { position: "outside", padding: 3, silent: false, fontSize: 9 },
          itemStyle: { borderWidth: 2 },
        },
      ],
    },
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

