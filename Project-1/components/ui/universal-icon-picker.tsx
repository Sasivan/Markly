"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Folder,
  FolderTree,
  FolderArchive,
  Star,
  Globe,
  Tag,
  Bookmark,
  Layers,
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  Activity,
  Code,
  Terminal,
  Cpu,
  Database,
  Cloud,
  FileText,
  FileCode,
  BookOpen,
  Compass,
  Sparkles,
  Zap,
  Flame,
  Heart,
  Smile,
  Shield,
  Lock,
  Key,
  Archive,
  Trash2,
  Share2,
  Box,
  Layout,
  LayoutGrid,
  Grid,
  Check,
  X,
  Dices,
  type LucideIcon,
} from "lucide-react";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Button } from "@/components/ui/button";

export interface UniversalIconPickerProps {
  icon?: string;
  value?: string;
  color?: string;
  onChange: (iconName: string) => void;
  label?: string;
  compact?: boolean;
}

interface IconMeta {
  name: string;
  category: "Folders" | "Analytics" | "Dev & Tech" | "Badges" | "System";
  icon: LucideIcon;
  keywords: string[];
}

const UNIVERSAL_ICONS: IconMeta[] = [
  // Folders & Collections
  { name: "folder", category: "Folders", icon: Folder, keywords: ["folder", "directory", "collection"] },
  { name: "folder-tree", category: "Folders", icon: FolderTree, keywords: ["tree", "subfolders", "hierarchy"] },
  { name: "folder-archive", category: "Folders", icon: FolderArchive, keywords: ["archive", "vault", "storage"] },
  { name: "box", category: "Folders", icon: Box, keywords: ["box", "package", "container"] },
  { name: "layout", category: "Folders", icon: Layout, keywords: ["layout", "dashboard", "workspace"] },
  { name: "layout-grid", category: "Folders", icon: LayoutGrid, keywords: ["grid", "board", "cards"] },

  // Analytics & Visuals
  { name: "bar-chart-3", category: "Analytics", icon: BarChart3, keywords: ["chart", "bars", "analytics", "stats", "bar-chart"] },
  { name: "line-chart", category: "Analytics", icon: LineChart, keywords: ["line", "trend", "velocity", "momentum"] },
  { name: "pie-chart", category: "Analytics", icon: PieChart, keywords: ["pie", "donut", "distribution", "share"] },
  { name: "area-chart", category: "Analytics", icon: AreaChart, keywords: ["area", "volume", "stream"] },
  { name: "activity", category: "Analytics", icon: Activity, keywords: ["activity", "pulse", "health", "velocity"] },
  { name: "layers", category: "Analytics", icon: Layers, keywords: ["layers", "stack", "graph", "knowledge"] },
  { name: "compass", category: "Analytics", icon: Compass, keywords: ["compass", "explore", "discover", "home"] },

  // Dev & Tech
  { name: "code", category: "Dev & Tech", icon: Code, keywords: ["code", "developer", "html", "syntax"] },
  { name: "terminal", category: "Dev & Tech", icon: Terminal, keywords: ["terminal", "cli", "shell", "bash"] },
  { name: "cpu", category: "Dev & Tech", icon: Cpu, keywords: ["cpu", "hardware", "chip", "performance"] },
  { name: "database", category: "Dev & Tech", icon: Database, keywords: ["database", "sql", "storage", "tables"] },
  { name: "cloud", category: "Dev & Tech", icon: Cloud, keywords: ["cloud", "hosting", "aws", "network"] },
  { name: "globe", category: "Dev & Tech", icon: Globe, keywords: ["globe", "web", "internet", "domain", "sites"] },

  // Badges & Symbols
  { name: "star", category: "Badges", icon: Star, keywords: ["star", "favorite", "priority", "bookmark"] },
  { name: "sparkles", category: "Badges", icon: Sparkles, keywords: ["sparkles", "ai", "magic", "smart", "clean"] },
  { name: "zap", category: "Badges", icon: Zap, keywords: ["zap", "fast", "lightning", "action"] },
  { name: "flame", category: "Badges", icon: Flame, keywords: ["flame", "hot", "trending", "active"] },
  { name: "heart", category: "Badges", icon: Heart, keywords: ["heart", "love", "favorite", "saved"] },
  { name: "shield", category: "Badges", icon: Shield, keywords: ["shield", "security", "admin", "verified"] },
  { name: "tag", category: "Badges", icon: Tag, keywords: ["tag", "label", "topic", "category"] },

  // System & Organization
  { name: "archive", category: "System", icon: Archive, keywords: ["archive", "old", "storage"] },
  { name: "trash-2", category: "System", icon: Trash2, keywords: ["trash", "bin", "delete", "recycle"] },
  { name: "share-2", category: "System", icon: Share2, keywords: ["share", "public", "collaborate"] },
  { name: "key", category: "System", icon: Key, keywords: ["key", "credentials", "api", "auth"] },
  { name: "lock", category: "System", icon: Lock, keywords: ["lock", "private", "confidential"] },
  { name: "book-open", category: "System", icon: BookOpen, keywords: ["book", "docs", "documentation", "learning"] },
];

export function UniversalIconPicker({
  icon,
  value,
  color,
  onChange,
  label = "Pick icon",
  compact = true,
}: UniversalIconPickerProps) {
  const activeIcon = icon || value || "folder";
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [customEmoji, setCustomEmoji] = React.useState("");

  // Trigger button & Portaled popover positioning refs
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Resizable dimensions state
  const [popupWidth, setPopupWidth] = React.useState<number>(330);
  const [popupHeight, setPopupHeight] = React.useState<number>(390);
  const [isResizing, setIsResizing] = React.useState<"width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw" | null>(null);

  // Recent Icons
  const [recentIcons, setRecentIcons] = React.useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_recent_icon_choices");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return ["folder", "star", "bar-chart-3", "globe", "sparkles", "layers"];
  });

  const selectIcon = (name: string) => {
    onChange(name);
    setRecentIcons((prev) => {
      const filtered = prev.filter((i) => i !== name);
      const next = [name, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("markly_recent_icon_choices", JSON.stringify(next));
      } catch {}
      return next;
    });
    setIsOpen(false);
  };

  const handleRollRandomIcon = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const randomIndex = Math.floor(Math.random() * UNIVERSAL_ICONS.length);
    const chosen = UNIVERSAL_ICONS[randomIndex];
    if (chosen) {
      selectIcon(chosen.name);
    }
  };

  // Synchronously compute fixed screen coordinates so the popup floats completely OUT of parent modals
  const calculateCoords = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const pad = 8;

    let top = rect.bottom + 4;
    if (top + popupHeight > window.innerHeight - pad) {
      if (rect.top - popupHeight - 4 > pad) {
        top = rect.top - popupHeight - 4;
      } else {
        top = Math.max(pad, window.innerHeight - popupHeight - pad);
      }
    }

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - popupWidth - pad);
    }

    return { top, left };
  }, [popupWidth, popupHeight]);

  const updateCoords = React.useCallback(() => {
    const c = calculateCoords();
    if (c) setCoords(c);
  }, [calculateCoords]);

  const handleToggle = () => {
    if (!isOpen) {
      const c = calculateCoords();
      if (c) setCoords(c);
    }
    setIsOpen(!isOpen);
  };

  React.useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords, true);
      };
    }
  }, [isOpen, updateCoords]);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Escape key handler
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Resizing handler for the portaled popup window
  const startPopupResize = (
    direction: "width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw",
    startEvent: React.MouseEvent
  ) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    setIsResizing(direction);

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const initialW = popupWidth;
    const initialH = popupHeight;
    const initialCoords = { ...coords };

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    if (direction === "width" || direction === "e" || direction === "w") {
      document.body.style.cursor = "ew-resize";
    } else if (direction === "height" || direction === "s" || direction === "n") {
      document.body.style.cursor = "ns-resize";
    } else if (direction === "ne" || direction === "sw") {
      document.body.style.cursor = "nesw-resize";
    } else {
      document.body.style.cursor = "nwse-resize";
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Horizontal resize
      if (
        direction === "width" ||
        direction === "both" ||
        direction === "e" ||
        direction === "se" ||
        direction === "ne"
      ) {
        const deltaX = moveEvent.clientX - startX;
        setPopupWidth(Math.min(700, Math.max(260, initialW + deltaX)));
      } else if (direction === "w" || direction === "sw" || direction === "nw") {
        const deltaX = startX - moveEvent.clientX;
        const newW = Math.min(700, Math.max(260, initialW + deltaX));
        const appliedDelta = newW - initialW;
        setPopupWidth(newW);
        setCoords((prev) => ({ ...prev, left: initialCoords.left - appliedDelta }));
      }

      // Vertical resize
      if (
        direction === "height" ||
        direction === "both" ||
        direction === "s" ||
        direction === "se" ||
        direction === "sw"
      ) {
        const deltaY = moveEvent.clientY - startY;
        setPopupHeight(Math.min(750, Math.max(260, initialH + deltaY)));
      } else if (direction === "n" || direction === "ne" || direction === "nw") {
        const deltaY = startY - moveEvent.clientY;
        const newH = Math.min(750, Math.max(260, initialH + deltaY));
        const appliedDelta = newH - initialH;
        setPopupHeight(newH);
        setCoords((prev) => ({ ...prev, top: initialCoords.top - appliedDelta }));
      }
    };

    const onMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const filteredIcons = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return UNIVERSAL_ICONS.filter((item) => {
      const matchCat = activeCategory === "All" || item.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [search, activeCategory]);

  return (
    <div className="relative inline-flex items-center">
      {/* Universal Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`${compact ? "h-8 w-8 justify-center" : "h-8 px-2 justify-between gap-1.5"} rounded-lg border border-border bg-card hover:bg-secondary flex items-center cursor-pointer transition-colors group shadow-2xs`}
        title={label}
      >
        <FolderIconRenderer
          icon={activeIcon}
          color={color || "#3b82f6"}
          className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
        />
      </button>

      {/* Portaled Resizable Window that pops completely OUT of any modal container */}
      {isOpen &&
        coords.top > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${popupWidth}px`,
              height: `${popupHeight}px`,
              zIndex: 99999,
            }}
            className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-3 flex flex-col justify-between select-none text-foreground transition-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-6 w-6 rounded-md border flex items-center justify-center shrink-0 shadow-2xs"
                  style={{ backgroundColor: `${color || "#3b82f6"}18`, borderColor: `${color || "#3b82f6"}40` }}
                >
                  <FolderIconRenderer icon={activeIcon} color={color || "#3b82f6"} className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-foreground">Select Icon</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/50 truncate max-w-[110px]">
                    {activeIcon}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleRollRandomIcon}
                  title="Roll random icon (Dices)"
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-primary hover:text-foreground cursor-pointer transition-colors"
                >
                  <Dices className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2 flex-shrink-0">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons (chart, star, code, web)..."
                className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 text-[10px] font-medium border-b border-border/40 flex-shrink-0">
              {["All", "Folders", "Analytics", "Dev & Tech", "Badges", "System"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Icon Grid */}
            <div className="grid grid-cols-6 gap-1.5 overflow-y-auto flex-1 p-1 bg-secondary/15 rounded-xl border border-border/40">
              {filteredIcons.map((item) => {
                const IconComp = item.icon;
                const isSelected = activeIcon.toLowerCase().trim() === item.name.toLowerCase().trim();
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectIcon(item.name)}
                    className={`h-9 rounded-lg border flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
                      isSelected
                        ? "border-primary bg-primary/20 text-primary shadow-xs ring-2 ring-primary/60 font-semibold"
                        : "border-border/50 bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    title={item.name}
                  >
                    <IconComp className="h-4 w-4" style={{ color: isSelected ? color : undefined }} />
                  </button>
                );
              })}
            </div>

            {/* Custom Emoji / Unicode Glyph Input */}
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-1.5 flex-shrink-0">
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Or enter emoji 🚀"
                maxLength={4}
                className="flex-1 h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!customEmoji.trim()}
                onClick={() => {
                  if (customEmoji.trim()) selectIcon(customEmoji.trim());
                }}
                className="h-7 px-2 text-xs cursor-pointer"
              >
                Use Glyph
              </Button>
            </div>

            {/* Recent Icons */}
            {recentIcons.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center gap-1 flex-shrink-0">
                <span className="text-[9px] font-mono text-muted-foreground uppercase mr-1">Recent:</span>
                <div className="flex items-center gap-1">
                  {recentIcons.map((rec) => (
                    <button
                      key={rec}
                      type="button"
                      onClick={() => selectIcon(rec)}
                      className="h-5 w-5 rounded hover:bg-secondary flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
                      title={rec}
                    >
                      <FolderIconRenderer icon={rec} color={color || "#3b82f6"} className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Right Edge (East) */}
            <div
              onMouseDown={(e) => startPopupResize("e", e)}
              className="absolute top-2 -right-1.5 bottom-2 w-3 cursor-ew-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag right edge to resize width"
            >
              <div className="w-1 h-8 rounded-full bg-primary" />
            </div>

            {/* Left Edge (West) */}
            <div
              onMouseDown={(e) => startPopupResize("w", e)}
              className="absolute top-2 -left-1.5 bottom-2 w-3 cursor-ew-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag left edge to resize width"
            >
              <div className="w-1 h-8 rounded-full bg-primary" />
            </div>

            {/* Bottom Edge (South) */}
            <div
              onMouseDown={(e) => startPopupResize("s", e)}
              className="absolute -bottom-1.5 left-2 right-2 h-3 cursor-ns-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag bottom edge to resize height"
            >
              <div className="h-1 w-12 rounded-full bg-primary" />
            </div>

            {/* Top Edge (North) */}
            <div
              onMouseDown={(e) => startPopupResize("n", e)}
              className="absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag top edge to resize height"
            >
              <div className="h-1 w-12 rounded-full bg-primary" />
            </div>

            {/* Bottom-Right Corner (South-East) */}
            <div
              onMouseDown={(e) => startPopupResize("se", e)}
              className="absolute -bottom-1 -right-1 w-5 h-5 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="14" cy="14" r="1.5" />
                <circle cx="9" cy="14" r="1.5" />
                <circle cx="14" cy="9" r="1.5" />
              </svg>
            </div>

            {/* Bottom-Left Corner (South-West) */}
            <div
              onMouseDown={(e) => startPopupResize("sw", e)}
              className="absolute -bottom-1 -left-1 w-5 h-5 cursor-nesw-resize z-30 flex items-end justify-start p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="14" r="1.5" />
                <circle cx="7" cy="14" r="1.5" />
                <circle cx="2" cy="9" r="1.5" />
              </svg>
            </div>

            {/* Top-Right Corner (North-East) */}
            <div
              onMouseDown={(e) => startPopupResize("ne", e)}
              className="absolute -top-1 -right-1 w-5 h-5 cursor-nesw-resize z-30 flex items-start justify-end p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="14" cy="2" r="1.5" />
                <circle cx="9" cy="2" r="1.5" />
                <circle cx="14" cy="7" r="1.5" />
              </svg>
            </div>

            {/* Top-Left Corner (North-West) */}
            <div
              onMouseDown={(e) => startPopupResize("nw", e)}
              className="absolute -top-1 -left-1 w-5 h-5 cursor-nwse-resize z-30 flex items-start justify-start p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="2" r="1.5" />
                <circle cx="7" cy="2" r="1.5" />
                <circle cx="2" cy="7" r="1.5" />
              </svg>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
