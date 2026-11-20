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

  // Obsidian Advanced Graph Filters & Aesthetics (Item 4)
  const [selectedFolderFilter, setSelectedFolderFilter] = React.useState<string>("all");
  const [nodeShape, setNodeShape] = React.useState<"circle" | "square" | "diamond" | "hexagon" | "by-type">("circle");
  const [colorScheme, setColorScheme] = React.useState<"default" | "folder" | "recency" | "status">("default");
  const [showOrphans, setShowOrphans] = React.useState(true);
  const [nodeScale, setNodeScale] = React.useState(1.0);

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

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(containerRef.current);
    }

    // Helper for drawing various node shapes (circle, square, diamond, hexagon)
    const drawShape = (c: CanvasRenderingContext2D, shape: string, x: number, y: number, r: number) => {
      c.beginPath();
      if (shape === "square") {
        c.rect(x - r, y - r, r * 2, r * 2);
      } else if (shape === "diamond") {
        c.moveTo(x, y - r * 1.25);
        c.lineTo(x + r * 1.25, y);
        c.lineTo(x, y + r * 1.25);
        c.lineTo(x - r * 1.25, y);
        c.closePath();
      } else if (shape === "hexagon") {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + r * 1.15 * Math.cos(angle);
          const hy = y + r * 1.15 * Math.sin(angle);
          if (i === 0) c.moveTo(hx, hy);
          else c.lineTo(hx, hy);
        }
        c.closePath();
      } else {
        // Default circle / dot
        c.arc(x, y, r, 0, Math.PI * 2);
      }
    };

    // Filter nodes by active settings (including folder filter & orphans)
    let activeNodes = nodes.filter((n) => {
      if (!visibleTypes[n.type]) return false;
      if (favoritesOnly && n.type === "bookmark" && !n.data?.isFavorite) return false;
      if (selectedFolderFilter !== "all") {
        if (n.type === "folder" && n.id !== selectedFolderFilter) return false;
        if (n.type === "bookmark" && n.data?.folderId !== selectedFolderFilter) return false;
      }
      return true;
    });

    const activeNodeIdSet = new Set(activeNodes.map((n) => n.id));
    let activeEdges = edges.filter(
      (e) => activeNodeIdSet.has(e.source) && activeNodeIdSet.has(e.target)
    );

    // Degree connection count for orphan filtering
    if (!showOrphans) {
      const degreeMap = new Map<string, number>();
      for (const e of activeEdges) {
        degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
        degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
      }
      activeNodes = activeNodes.filter((n) => (degreeMap.get(n.id) || 0) > 0);
      const remainingNodeIds = new Set(activeNodes.map((n) => n.id));
      activeEdges = activeEdges.filter(
        (e) => remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
      );
    }

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
        const r = (node.size || 10) * nodeScale;

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

        // Shape determination
        const effectiveShape =
          nodeShape === "by-type"
            ? node.type === "folder"
              ? "square"
              : node.type === "tag"
              ? "diamond"
              : node.type === "domain"
              ? "hexagon"
              : "circle"
            : nodeShape;

        // Color determination
        let nodeColor = node.color;
        if (colorScheme === "folder") {
          if (node.type === "folder") {
            nodeColor = node.data?.color || node.color;
          } else if (node.type === "bookmark" && node.data?.folderId) {
            const parentFolder = nodes.find((f) => f.id === node.data?.folderId);
            if (parentFolder) nodeColor = parentFolder.color || parentFolder.data?.color || node.color;
          }
        } else if (colorScheme === "recency") {
          if (node.type === "bookmark") {
            const last = node.data?.lastClickedAt || node.data?.lastVisitedAt;
            const diffDays = last ? (Date.now() - last) / 86400000 : 999;
            nodeColor = diffDays <= 7 ? "#10b981" : diffDays <= 30 ? "#3b82f6" : "#64748b";
          }
        } else if (colorScheme === "status") {
          if (node.type === "bookmark") {
            nodeColor = node.data?.status === "dead" ? "#ef4444" : "#10b981";
          }
        }

        // Selection or Search glow ring
        if (isSelected || matchesSearch) {
          drawShape(ctx, effectiveShape, nx, ny, r + 4);
          ctx.strokeStyle = isSelected ? "#3b82f6" : "#f59e0b";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Node Body
        drawShape(ctx, effectiveShape, nx, ny, r);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Favorite Amber Rim
        if (node.type === "bookmark" && node.data?.isFavorite) {
          drawShape(ctx, effectiveShape, nx, ny, r + 2);
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
      resizeObserver?.disconnect();
    };
  }, [nodes, edges, visibleTypes, favoritesOnly, nodeSpacing, linkDistance, showLabels, selectedNode, searchQuery, selectedFolderFilter, nodeShape, colorScheme, showOrphans, nodeScale]);

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
    <div className="relative flex flex-col md:flex-row w-full h-full min-h-[500px] flex-1 rounded-lg border border-border bg-card overflow-hidden">
      {/* LEFT: Canvas Viewport */}
      <div ref={containerRef} className="relative flex-1 h-full w-full min-h-[460px] overflow-hidden bg-background">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-xs text-xs font-mono text-muted-foreground">
            Constructing force layout graph...
          </div>
        )}

        {/* Floating Canvas Top Bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card/95 backdrop-blur-sm text-xs">
            <span className="font-semibold text-foreground capitalize">
              {mode === "global"
                ? "Global Knowledge Graph"
                : mode === "folder"
                ? `Folder Graph: ${folderName || "Selected Folder"}`
                : `Website Graph: ${domain}`}
            </span>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
              {nodes.length} nodes · {edges.length} edges
            </span>
          </div>
        </div>

        {/* Floating Canvas Quick Controls (Zoom / Reset / Export / Toggle Panel) */}
        {showControls && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-card/95 p-1 rounded-md border border-border shadow-xs">
            <button
              type="button"
              onClick={() => {
                cameraRef.current.zoom = Math.min(3.5, cameraRef.current.zoom * 1.25);
              }}
              title="Zoom In"
              className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                cameraRef.current.zoom = Math.max(0.2, cameraRef.current.zoom * 0.8);
              }}
              title="Zoom Out"
              className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={resetCamera}
              title="Reset View"
              className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={exportImage}
              title="Export PNG"
              className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-4 bg-border my-auto mx-0.5" />
            <button
              type="button"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              title={rightPanelOpen ? "Collapse Graph Panel" : "Open Graph Settings Panel"}
              className={`h-7 px-2 rounded-md flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${
                rightPanelOpen
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
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
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 p-1.5 rounded-md border border-border bg-card/95 backdrop-blur-sm text-xs font-mono shadow-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#7963E9]" />
            Folder
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#A78BFA]" />
            Site
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#4AA8E8]" />
            Domain
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#42C99A]" />
            Tag
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full border border-[#E8B75B] bg-transparent" />
            Favorite
          </span>
        </div>
      </div>

      {/* RIGHT: Inside Settings & Inspector Panel */}
      {showControls && rightPanelOpen && (
        <div className="w-full md:w-80 h-full border-t md:border-t-0 md:border-l border-border bg-card flex flex-col justify-between overflow-y-auto z-20 text-xs">
          <div className="p-4 space-y-5">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span>Graph Settings & Tools</span>
              </div>
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                title="Collapse Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Live Search & Node Highlight */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-muted-foreground">
                Find & Highlight Nodes
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Type to search in graph..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 rounded-md border border-border bg-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Node Type Toggles */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground">
                Visible Node Filters
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.folder}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, folder: e.target.checked })}
                      className="rounded h-3.5 w-3.5"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#7963E9]" />
                    <span className="font-medium text-foreground">Folders</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{countsByType.folder}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.bookmark}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, bookmark: e.target.checked })}
                      className="rounded h-3.5 w-3.5"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#A78BFA]" />
                    <span className="font-medium text-foreground">Bookmarks & Sites</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{countsByType.bookmark}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.domain}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, domain: e.target.checked })}
                      className="rounded h-3.5 w-3.5"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#4AA8E8]" />
                    <span className="font-medium text-foreground">Web Domains</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{countsByType.domain}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleTypes.tag}
                      onChange={(e) => setVisibleTypes({ ...visibleTypes, tag: e.target.checked })}
                      className="rounded h-3.5 w-3.5"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#42C99A]" />
                    <span className="font-medium text-foreground">Tags</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{countsByType.tag}</span>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={favoritesOnly}
                      onChange={(e) => setFavoritesOnly(e.target.checked)}
                      className="rounded h-3.5 w-3.5"
                    />
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-foreground">Favorites Only</span>
                  </div>
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showOrphans}
                      onChange={(e) => setShowOrphans(e.target.checked)}
                      className="rounded h-3.5 w-3.5"
                    />
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="font-medium text-foreground">Show Orphan Nodes</span>
                  </div>
                </label>
              </div>

              {/* Specific Folder Filter */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-medium text-muted-foreground">Filter to Folder:</label>
                <select
                  value={selectedFolderFilter}
                  onChange={(e) => setSelectedFolderFilter(e.target.value)}
                  className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground"
                >
                  <option value="all">All Folders (Full Graph)</option>
                  {nodes
                    .filter((n) => n.type === "folder")
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Obsidian Display & Styling Controls (Item 4) */}
            <div className="space-y-2.5 pt-2 border-t border-border/80">
              <div className="text-xs font-mono text-muted-foreground">
                Obsidian Node Styling
              </div>

              {/* Color Scheme */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Color Scheme:</span>
                  <span className="font-mono text-primary capitalize">{colorScheme}</span>
                </div>
                <select
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value as any)}
                  className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground"
                >
                  <option value="default">Default Type Colors</option>
                  <option value="folder">Inherit Folder Colors</option>
                  <option value="recency">Activity / Recency Tiers</option>
                  <option value="status">Link Health (Reachable vs Dead)</option>
                </select>
              </div>

              {/* Shape / Dot Variation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Node Shapes / Dots:</span>
                  <span className="font-mono text-primary capitalize">{nodeShape}</span>
                </div>
                <select
                  value={nodeShape}
                  onChange={(e) => setNodeShape(e.target.value as any)}
                  className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground"
                >
                  <option value="circle">Circles (Classic Dots)</option>
                  <option value="square">Rounded Squares</option>
                  <option value="diamond">Obsidian Diamonds</option>
                  <option value="hexagon">Tech Hexagons</option>
                  <option value="by-type">Shape by Entity Type</option>
                </select>
              </div>

              {/* Node Size Multiplier */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Dot Size Scale:</span>
                  <span className="font-mono text-xs">{nodeScale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.0"
                  step="0.1"
                  value={nodeScale}
                  onChange={(e) => setNodeScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-md appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* 3. Physics & Display Adjustments */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <div className="text-xs font-mono text-muted-foreground">
                Graph Forces & Display
              </div>

              {/* Depth Selector */}
              {mode !== "global" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Nesting Depth:</span>
                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border text-xs">
                    {[1, 2, 3].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDepth(d)}
                        className={`px-2 py-0.5 rounded-sm cursor-pointer font-mono font-medium transition-colors ${
                          depth === d
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
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
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Node Spacing (Force):</span>
                  <span className="font-mono text-xs">{nodeSpacing}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={nodeSpacing}
                  onChange={(e) => setNodeSpacing(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-muted rounded-md appearance-none cursor-pointer"
                />
              </div>

              {/* Link Distance Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Link Distance:</span>
                  <span className="font-mono text-xs">{linkDistance}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={linkDistance}
                  onChange={(e) => setLinkDistance(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-muted rounded-md appearance-none cursor-pointer"
                />
              </div>

              {/* Show Labels Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground font-medium">Always Show Labels:</span>
                <button
                  type="button"
                  onClick={() => setShowLabels(!showLabels)}
                  className={`h-6 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    showLabels
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {showLabels ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <span>{showLabels ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            {/* 4. Selected Node Inspector or Graph Overview */}
            <div className="pt-2 border-t border-border/80 space-y-2">
              <div className="text-xs font-mono text-muted-foreground">
                {selectedNode ? "Selected Node Inspector" : "Graph Intelligence"}
              </div>

              {selectedNode ? (
                <div className="rounded-md border border-border bg-card p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 truncate">
                      <span className="text-xs font-mono text-primary">
                        {selectedNode.type}
                      </span>
                      <h4 className="font-semibold text-foreground line-clamp-2">
                        {selectedNode.label}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {selectedNode.data?.url && (
                    <a
                      href={selectedNode.data.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{selectedNode.data.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  )}

                  {selectedNode.data?.visitCount !== undefined && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Visits: {selectedNode.data.visitCount}
                    </div>
                  )}

                  {/* Actions for Node */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    {selectedNode.data?.url && (
                      <>
                        <a
                          href={selectedNode.data.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 flex items-center gap-1 cursor-pointer transition-colors"
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
                          className="px-2.5 py-1 rounded-md border border-border text-foreground text-xs flex items-center gap-1 hover:bg-secondary cursor-pointer transition-colors"
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
                        className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 cursor-pointer transition-colors"
                      >
                        Open Folder
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-card p-3 space-y-1.5 text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Interactive Force Network</span>
                  </div>
                  <p className="text-xs">
                    Click any node to inspect details, or drag nodes to reposition. Double-click any bookmark node to launch its website directly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-border/60 bg-card flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>Obsidian Canvas Engine</span>
            <button
              type="button"
              onClick={exportImage}
              className="hover:text-foreground flex items-center gap-1 font-medium cursor-pointer transition-colors"
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
