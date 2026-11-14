"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Search,
  ExternalLink,
  Star,
  Copy,
  Check,
  Folder as FolderIcon,
  Globe,
  Tag,
  Bookmark as BookmarkIcon,
  X,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface GraphNode {
  id: string;
  label: string;
  type: "domain" | "folder" | "bookmark" | "tag";
  color: string;
  size: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  data?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  color: string;
}

interface KnowledgeGraphProps {
  mode: "global" | "folder" | "domain";
  folderId?: string | null;
  folderName?: string;
  domain?: string | null;
  depth?: number;
  showControls?: boolean;
  onSelectBookmark?: (bm: any) => void;
  onSelectFolder?: (folderId: string) => void;
  onSelectDomain?: (domain: string) => void;
  onEditBookmark?: (bm: any) => void;
  onToggleFavorite?: (bm: any) => void;
}

export function KnowledgeGraph({
  mode,
  folderId,
  folderName,
  domain,
  depth: initialDepth = 2,
  showControls = true,
  onSelectBookmark,
  onSelectFolder,
  onSelectDomain,
  onEditBookmark,
  onToggleFavorite,
}: KnowledgeGraphProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [nodes, setNodes] = React.useState<GraphNode[]>([]);
  const [edges, setEdges] = React.useState<GraphEdge[]>([]);
  const [depth, setDepth] = React.useState(initialDepth);

  // Right Side Inside Panel State
  const [rightPanelOpen, setRightPanelOpen] = React.useState(showControls);

  // Search & Type Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [visibleTypes, setVisibleTypes] = React.useState<Record<string, boolean>>({
    domain: mode !== "folder",
    folder: true,
    bookmark: true,
    tag: mode !== "folder",
  });

  // Adjustments & Physics Settings
  const [nodeSpacing, setNodeSpacing] = React.useState(50); // Controls repulsion
  const [linkDistance, setLinkDistance] = React.useState(80); // Controls spring resting distance
  const [showLabels, setShowLabels] = React.useState(true);

  // Selected node for Inspector
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  // Camera transform (Pan & Zoom)
  const cameraRef = React.useRef({ x: 0, y: 0, zoom: 1 });
  const hoveredNodeRef = React.useRef<GraphNode | null>(null);
  const draggedNodeRef = React.useRef<GraphNode | null>(null);
  const isPanningRef = React.useRef(false);
  const panStartRef = React.useRef({ x: 0, y: 0 });

  // 1. Fetch Graph Data from API
  const fetchGraphData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode,
        depth: depth.toString(),
      });
      if (folderId) params.append("folderId", folderId);
      if (domain) params.append("domain", domain);

      const res = await fetch(`/api/graph?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.graph) {
        // Dispersed circular layout initialization
        const count = data.graph.nodes.length || 1;
        const initializedNodes = data.graph.nodes.map((n: GraphNode, i: number) => {
          const angle = (i / count) * 2 * Math.PI;
          const radius = 100 + Math.random() * 200;
          return {
            ...n,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
          };
        });
        setNodes(initializedNodes);
        setEdges(data.graph.edges || []);
      }
    } catch (err) {
      console.error("Failed to load knowledge graph data:", err);
    } finally {
      setLoading(false);
    }
  }, [mode, folderId, domain, depth]);

  React.useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  React.useEffect(() => {
    const handleSync = () => {
      fetchGraphData();
    };
    window.addEventListener("markly-recycle-bin-updated", handleSync);
    window.addEventListener("markly-workspace-updated", handleSync);
    return () => {
      window.removeEventListener("markly-recycle-bin-updated", handleSync);
      window.removeEventListener("markly-workspace-updated", handleSync);
    };
  }, [fetchGraphData]);

  // 2. Physics Simulation Loop & Canvas Rendering
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isRunning = true;

    // Responsive canvas dimensions
    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Filter nodes by active settings
    const activeNodes = nodes.filter((n) => {
      if (!visibleTypes[n.type]) return false;
      if (favoritesOnly && n.type === "bookmark" && !n.data?.isFavorite) return false;
      return true;
    });

    const activeNodeIdSet = new Set(activeNodes.map((n) => n.id));
    const activeEdges = edges.filter(
      (e) => activeNodeIdSet.has(e.source) && activeNodeIdSet.has(e.target)
    );

    const nodeById = new Map<string, GraphNode>();
    for (const n of activeNodes) nodeById.set(n.id, n);

    // Neighbor adjacency map
    const neighborMap = new Map<string, Set<string>>();
    for (const e of activeEdges) {
      if (!neighborMap.has(e.source)) neighborMap.set(e.source, new Set());
      if (!neighborMap.has(e.target)) neighborMap.set(e.target, new Set());
      neighborMap.get(e.source)!.add(e.target);
      neighborMap.get(e.target)!.add(e.source);
    }

    const render = () => {
      if (!isRunning) return;

      // Spring physics parameters connected to sliders
      const repulsion = nodeSpacing * 10;
      const springLength = linkDistance;
      const springK = 0.04;
      const damping = 0.85;

      // Repulsion between nodes
      for (let i = 0; i < activeNodes.length; i++) {
        const n1 = activeNodes[i];
        if (n1 === draggedNodeRef.current) continue;

        for (let j = i + 1; j < activeNodes.length; j++) {
          const n2 = activeNodes[j];
          const dx = (n2.x || 0) - (n1.x || 0);
          const dy = (n2.y || 0) - (n1.y || 0);
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 360) {
            const force = repulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx = (n1.vx || 0) - fx;
            n1.vy = (n1.vy || 0) - fy;
            n2.vx = (n2.vx || 0) + fx;
            n2.vy = (n2.vy || 0) + fy;
          }
        }

        // Center gravity
        n1.vx = ((n1.vx || 0) - (n1.x || 0) * 0.003) * damping;
        n1.vy = ((n1.vy || 0) - (n1.y || 0) * 0.003) * damping;
        n1.x = (n1.x || 0) + (n1.vx || 0);
        n1.y = (n1.y || 0) + (n1.vy || 0);
      }

      // Spring forces along edges
      for (const edge of activeEdges) {
        const n1 = nodeById.get(edge.source);
        const n2 = nodeById.get(edge.target);
        if (!n1 || !n2) continue;

        const dx = (n2.x || 0) - (n1.x || 0);
        const dy = (n2.y || 0) - (n1.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const delta = dist - springLength;
        const force = delta * springK;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (n1 !== draggedNodeRef.current) {
          n1.vx = (n1.vx || 0) + fx;
          n1.vy = (n1.vy || 0) + fy;
        }
        if (n2 !== draggedNodeRef.current) {
          n2.vx = (n2.vx || 0) - fx;
          n2.vy = (n2.vy || 0) - fy;
        }
      }

      // Canvas Drawing
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Camera transform
      const cam = cameraRef.current;
      ctx.translate(w / 2 + cam.x * dpr, h / 2 + cam.y * dpr);
      ctx.scale(cam.zoom * dpr, cam.zoom * dpr);

      const hoveredNode = hoveredNodeRef.current;
      const hoveredNeighbors = hoveredNode ? neighborMap.get(hoveredNode.id) || new Set() : null;
      const isSearching = searchQuery.trim().length > 0;
      const searchTerms = searchQuery.toLowerCase().trim();

      // Draw Edges
      for (const edge of activeEdges) {
        const n1 = nodeById.get(edge.source);
        const n2 = nodeById.get(edge.target);
        if (!n1 || !n2) continue;

        const isHoverConnected =
          hoveredNode &&
          (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

        ctx.beginPath();
        ctx.moveTo(n1.x || 0, n1.y || 0);
        ctx.lineTo(n2.x || 0, n2.y || 0);

        if (isHoverConnected) {
          ctx.strokeStyle = "rgba(147, 51, 234, 0.85)";
          ctx.lineWidth = 2.2;
        } else if (hoveredNode) {
          ctx.strokeStyle = "rgba(100, 116, 139, 0.08)";
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = edge.color || "rgba(100, 116, 139, 0.35)";
          ctx.lineWidth = 1.1;
        }
        ctx.stroke();
      }

      // Draw Nodes
      for (const node of activeNodes) {
        const nx = node.x || 0;
        const ny = node.y || 0;
        const r = node.size || 10;

        const isHovered = hoveredNode?.id === node.id;
        const isNeighbor = hoveredNeighbors?.has(node.id);
        const isSelected = selectedNode?.id === node.id;
        const matchesSearch = isSearching && node.label.toLowerCase().includes(searchTerms);

        let alpha = 1;
        if (hoveredNode && !isHovered && !isNeighbor) {
          alpha = 0.2;
        } else if (isSearching && !matchesSearch) {
          alpha = 0.25;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Selection or Search glow ring
        if (isSelected || matchesSearch) {
          ctx.beginPath();
          ctx.arc(nx, ny, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? "#3b82f6" : "#f59e0b";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Node Body
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Favorite Amber Rim
        if (node.type === "bookmark" && node.data?.isFavorite) {
          ctx.beginPath();
          ctx.arc(nx, ny, r + 2, 0, Math.PI * 2);
          ctx.strokeStyle = "#E8B75B";
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        // Labels
        if (showLabels || isHovered || isSelected || matchesSearch) {
          ctx.font = isHovered || isSelected ? "bold 11px system-ui" : "10px system-ui";
          ctx.fillStyle = isHovered || isSelected ? "#3b82f6" : "#64748b";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const labelText =
            node.label.length > 20 && !isHovered ? `${node.label.slice(0, 18)}…` : node.label;
          ctx.fillText(labelText, nx, ny + r + 12);
        }

        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [nodes, edges, visibleTypes, favoritesOnly, nodeSpacing, linkDistance, showLabels, selectedNode, searchQuery]);

  // Coordinate Conversion Helper
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const cam = cameraRef.current;
    const worldX = (clientX - rect.width / 2) / cam.zoom - cam.x;
    const worldY = (clientY - rect.height / 2) / cam.zoom - cam.y;

    return { x: worldX, y: worldY };
  };

  // Find Node at Position
  const findNodeAt = (pos: { x: number; y: number }): GraphNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (!visibleTypes[node.type]) continue;
      const dx = (node.x || 0) - pos.x;
      const dy = (node.y || 0) - pos.y;
      if (dx * dx + dy * dy <= (node.size + 4) * (node.size + 4)) {
        return node;
      }
    }
    return null;
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    const clickedNode = findNodeAt(pos);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const pos = getCanvasMousePos(e);
      draggedNodeRef.current.x = pos.x;
      draggedNodeRef.current.y = pos.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isPanningRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / cameraRef.current.zoom;
      const dy = (e.clientY - panStartRef.current.y) / cameraRef.current.zoom;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const pos = getCanvasMousePos(e);
    const hovered = findNodeAt(pos);
    hoveredNodeRef.current = hovered;
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    cameraRef.current.zoom = Math.min(3.5, Math.max(0.2, cameraRef.current.zoom * zoomFactor));
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    const node = findNodeAt(pos);
    if (node && node.type === "bookmark" && node.data?.url) {
      window.open(node.data.url, "_blank");
    } else if (node && node.type === "folder") {
      onSelectFolder?.(node.data?.id || node.id.replace("fld_", ""));
    }
  };

  // Camera Reset
  const resetCamera = () => {
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
  };

  // Export PNG Image
  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `markly-graph-${mode}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Node Count by Type
  const countsByType = React.useMemo(() => {
    return {
      folder: nodes.filter((n) => n.type === "folder").length,
      bookmark: nodes.filter((n) => n.type === "bookmark").length,
      domain: nodes.filter((n) => n.type === "domain").length,
      tag: nodes.filter((n) => n.type === "tag").length,
    };
  }, [nodes]);

  return (
    <div className="relative flex flex-col md:flex-row w-full h-[620px] rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] overflow-hidden shadow-xs animate-in fade-in duration-200">
      {/* LEFT: Canvas Viewport */}
      <div ref={containerRef} className="relative flex-1 h-full overflow-hidden bg-slate-50/50 dark:bg-[#141414]">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-xs text-xs font-medium text-slate-500">
            Constructing force layout graph...
          </div>
        )}

        {/* Floating Canvas Top Bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-xs text-xs">
            <span className="font-bold text-slate-900 dark:text-white capitalize">
              {mode === "global"
                ? "Global Knowledge Graph"
                : mode === "folder"
                ? `Folder Graph: ${folderName || "Selected Folder"}`
                : `Website Graph: ${domain}`}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded">
              {nodes.length} nodes · {edges.length} edges
            </span>
          </div>
        </div>

        {/* Floating Canvas Quick Controls (Zoom / Reset / Export / Toggle Panel) */}
        {showControls && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 dark:bg-neutral-900/95 p-1 rounded-xl border border-slate-200/80 dark:border-neutral-800 shadow-xs">
            <button
              type="button"
              onClick={() => {
                cameraRef.current.zoom = Math.min(3.5, cameraRef.current.zoom * 1.25);
              }}
              title="Zoom In"
              className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                cameraRef.current.zoom = Math.max(0.2, cameraRef.current.zoom * 0.8);
              }}
              title="Zoom Out"
              className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={resetCamera}
              title="Reset View"
              className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={exportImage}
              title="Export PNG"
              className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-border my-auto mx-0.5" />
            <button
              type="button"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              title={rightPanelOpen ? "Collapse Graph Panel" : "Open Graph Settings Panel"}
              className={`h-7 px-2 rounded-lg flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${
                rightPanelOpen
                  ? "bg-blue-600 text-white"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        )}

        {/* HTML5 Force Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* Legend pills (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 p-1.5 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur text-[11px] font-medium shadow-xs">
          <span className="flex items-center gap-1 text-slate-600 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-[#7963E9]" />
            Folder
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-[#A78BFA]" />
            Site
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-[#4AA8E8]" />
            Domain
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-[#42C99A]" />
            Tag
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full border border-[#E8B75B] bg-transparent" />
            Favorite
          </span>
        </div>
      </div>

      {/* RIGHT: Inside Settings & Inspector Panel (Obsidian-Style) */}
      {showControls && rightPanelOpen && (
        <div className="w-full md:w-80 h-full border-t md:border-t-0 md:border-l border-border bg-white dark:bg-[#181818] flex flex-col justify-between overflow-y-auto z-20 animate-in slide-in-from-right duration-200 text-xs">
          <div className="p-4 space-y-5">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Graph Settings & Tools</span>
              </div>
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md"
                title="Collapse Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Live Search & Node Highlight */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                Find & Highlight Nodes
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Type to search in graph..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Node Type Toggles */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                Visible Node Filters
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.folder}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, folder: e.target.checked })}
                      className="rounded h-3.5 w-3.5 text-blue-600"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#7963E9]" />
                    <span className="font-medium text-slate-800 dark:text-neutral-200">Folders</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{countsByType.folder}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.bookmark}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, bookmark: e.target.checked })}
                      className="rounded h-3.5 w-3.5 text-blue-600"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#A78BFA]" />
                    <span className="font-medium text-slate-800 dark:text-neutral-200">Bookmarks & Sites</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{countsByType.bookmark}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.domain}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, domain: e.target.checked })}
                      className="rounded h-3.5 w-3.5 text-blue-600"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#4AA8E8]" />
                    <span className="font-medium text-slate-800 dark:text-neutral-200">Web Domains</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{countsByType.domain}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.tag}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, tag: e.target.checked })}
                      className="rounded h-3.5 w-3.5 text-blue-600"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#42C99A]" />
                    <span className="font-medium text-slate-800 dark:text-neutral-200">Tags</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{countsByType.tag}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={favoritesOnly}
                      onChange={(e) => setFavoritesOnly(e.target.checked)}
                      className="rounded h-3.5 w-3.5 text-amber-500"
                    />
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-slate-800 dark:text-neutral-200">Favorites Only</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Physics & Display Adjustments */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                Graph Forces & Display
              </div>

              {/* Depth Selector */}
              {mode !== "global" && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-neutral-400 font-medium">Nesting Depth:</span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-border text-[11px]">
                    {[1, 2, 3].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDepth(d)}
                        className={`px-2 py-0.5 rounded cursor-pointer font-mono font-medium ${
                          depth === d
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 dark:text-neutral-400 hover:text-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Node Spacing Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
                  <span>Node Spacing (Force):</span>
                  <span className="font-mono text-[11px]">{nodeSpacing}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={nodeSpacing}
                  onChange={(e) => setNodeSpacing(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Link Distance Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
                  <span>Link Distance:</span>
                  <span className="font-mono text-[11px]">{linkDistance}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={linkDistance}
                  onChange={(e) => setLinkDistance(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Show Labels Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 dark:text-neutral-400 font-medium">Always Show Labels:</span>
                <button
                  type="button"
                  onClick={() => setShowLabels(!showLabels)}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    showLabels
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      : "bg-slate-100 dark:bg-neutral-800 text-slate-500"
                  }`}
                >
                  {showLabels ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <span>{showLabels ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            {/* 4. Selected Node Inspector or Graph Overview */}
            <div className="pt-2 border-t border-border/80 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                {selectedNode ? "Selected Node Inspector" : "Graph Intelligence"}
              </div>

              {selectedNode ? (
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 truncate">
                      <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">
                        {selectedNode.type}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2">
                        {selectedNode.label}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {selectedNode.data?.url && (
                    <a
                      href={selectedNode.data.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{selectedNode.data.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  )}

                  {selectedNode.data?.visitCount !== undefined && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Visits: {selectedNode.data.visitCount}
                    </div>
                  )}

                  {/* Actions for Node */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                    {selectedNode.data?.url && (
                      <>
                        <a
                          href={selectedNode.data.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-blue-600 text-white font-medium text-[11px] hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Open</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedNode.data.url);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="px-2 py-1 rounded border border-blue-200 dark:border-blue-800 text-slate-700 dark:text-neutral-200 text-[11px] flex items-center gap-1 hover:bg-blue-100/50 cursor-pointer"
                        >
                          {copiedUrl ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedUrl ? "Copied" : "Copy"}</span>
                        </button>
                      </>
                    )}
                    {selectedNode.type === "folder" && (
                      <button
                        type="button"
                        onClick={() => onSelectFolder?.(selectedNode.data?.id || selectedNode.id.replace("fld_", ""))}
                        className="px-2 py-1 rounded bg-indigo-600 text-white font-medium text-[11px] hover:bg-indigo-700 cursor-pointer"
                      >
                        Open Folder
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 p-3 space-y-1.5 text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-neutral-200">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Interactive Force Network</span>
                  </div>
                  <p className="text-[11px]">
                    Click any node to inspect details, or drag nodes to reposition. Double-click any bookmark node to launch its website directly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-border/80 bg-slate-50/50 dark:bg-neutral-900/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Obsidian Canvas Engine</span>
            <button
              type="button"
              onClick={exportImage}
              className="hover:text-foreground flex items-center gap-1 font-medium cursor-pointer"
            >
              <Download className="h-3 w-3" />
              <span>Snapshot</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
