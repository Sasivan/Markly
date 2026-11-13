"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Folder, BookmarkWithDetails } from "@/server/db/schema";

// Dynamically import ForceGraph2D with ssr: false
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
      Loading Network Physics Simulation...
    </div>
  ),
});

interface NetworkGraphProps {
  folders: Folder[];
  bookmarks: BookmarkWithDetails[];
  onSelectFolder?: (folderId: string) => void;
}

export function NetworkGraph({
  folders,
  bookmarks,
  onSelectFolder,
}: NetworkGraphProps) {
  // Construct nodes and links
  const graphData = React.useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    // Folder hub nodes
    for (const f of folders) {
      nodes.push({
        id: `f_${f.id}`,
        name: f.name,
        type: "folder",
        color: f.color || "#3b82f6",
        val: 12,
        folderId: f.id,
      });

      // Link subfolder to parent folder
      const pid = f.parentId ?? (f as any).parent_id;
      if (pid) {
        links.push({
          source: `f_${pid}`,
          target: `f_${f.id}`,
          color: "#94a3b8",
        });
      }
    }

    // Bookmark leaf nodes (sample top 40 for optimal graph readability and physics)
    for (const b of bookmarks.slice(0, 40)) {
      nodes.push({
        id: `b_${b.id}`,
        name: b.title,
        domain: b.domain,
        type: "bookmark",
        url: b.url,
        iconUrl: b.iconUrl,
        val: 5,
        color: "#64748b",
      });

      if (b.folderId) {
        links.push({
          source: `f_${b.folderId}`,
          target: `b_${b.id}`,
          color: "#cbd5e1",
        });
      }
    }

    return { nodes, links };
  }, [folders, bookmarks]);

  return (
    <div className="h-72 w-full rounded-lg overflow-hidden border border-border/60 bg-muted/10 relative">
      <ForceGraph2D
        graphData={graphData}
        nodeLabel={(node: any) => `${node.type === "folder" ? "📁 Folder: " : "🔗 "}${node.name}`}
        nodeAutoColorBy="type"
        linkColor={() => "#94a3b840"}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const size = node.val || 6;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.type === "folder" ? (node.color || "#3b82f6") : "#475569";
          ctx.fill();

          // Node label
          if (globalScale > 0.8) {
            const label = node.name;
            const fontSize = node.type === "folder" ? 11 / globalScale : 9 / globalScale;
            ctx.font = `${node.type === "folder" ? "bold" : "normal"} ${fontSize}px sans-serif`;
            ctx.fillStyle = node.type === "folder" ? "#0f172a" : "#64748b";
            ctx.textAlign = "center";
            ctx.fillText(label.slice(0, 16), node.x, node.y + size + fontSize);
          }
        }}
        onNodeClick={(node: any) => {
          if (node.type === "folder" && node.folderId && onSelectFolder) {
            onSelectFolder(node.folderId);
          } else if (node.type === "bookmark" && node.url) {
            window.open(node.url, "_blank");
          }
        }}
        height={288}
      />
    </div>
  );
}

