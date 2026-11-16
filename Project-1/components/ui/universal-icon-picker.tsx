"use client";

import * as React from "react";
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
  { name: "bar-chart-3", category: "Analytics", icon: BarChart3, keywords: ["chart", "bars", "analytics", "stats"] },
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
}: UniversalIconPickerProps) {
  const activeIcon = icon || value || "folder";
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [customEmoji, setCustomEmoji] = React.useState("");
  const popoverRef = React.useRef<HTMLDivElement>(null);

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

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

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
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Universal Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 rounded-lg border border-border bg-card hover:bg-secondary flex items-center gap-1.5 cursor-pointer transition-colors group shadow-2xs"
        title={label}
      >
        <FolderIconRenderer
          icon={activeIcon}
          color={color || "#3b82f6"}
          className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
        />
      </button>

      {/* Standardized Open-Source Icon Selection Dialog */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-76 rounded-2xl border border-border bg-card shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
            <span className="text-xs font-semibold text-foreground">Select Icon or Glyph</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons (chart, star, code, web)..."
              className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 text-[10px] font-medium border-b border-border/40">
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
          <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-secondary/15 rounded-xl border border-border/40">
            {filteredIcons.map((item) => {
              const IconComp = item.icon;
              const isSelected = icon === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => selectIcon(item.name)}
                  className={`h-9 rounded-lg border flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
                    isSelected
                      ? "border-primary bg-primary/15 text-primary shadow-2xs ring-1 ring-primary/50"
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
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-1.5">
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
            <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center gap-1">
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
        </div>
      )}
    </div>
  );
}
