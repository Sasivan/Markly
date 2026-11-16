"use client";

import * as React from "react";
import * as IconoirIcons from "iconoir-react";
import {
  Folder,
  FolderTree,
  FolderArchive,
  BarChart,
  BarChart2,
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  Activity,
  Sparkles,
  Zap,
  Flame,
  Star,
  Heart,
  Globe,
  Tag,
  Bookmark,
  Layers,
  Compass,
  Code,
  Terminal,
  Cpu,
  Database,
  Cloud,
  FileText,
  FileCode,
  BookOpen,
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
  TrendingUp,
  Inbox,
  History,
  Palette,
  Dices,
  Smile,
  type LucideIcon,
} from "lucide-react";

interface FolderIconRendererProps {
  icon?: string | null;
  className?: string;
  color?: string;
}

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  // Bar & Charts
  "bar-chart": BarChart3,
  "bar-chart-3": BarChart3,
  "bar-chart-2": BarChart2,
  "barchart": BarChart3,
  "barchart3": BarChart3,
  "line-chart": LineChart,
  "linechart": LineChart,
  "pie-chart": PieChart,
  "piechart": PieChart,
  "area-chart": AreaChart,
  "areachart": AreaChart,
  "activity": Activity,
  "trending-up": TrendingUp,

  // Folders & Hierarchy
  "folder": Folder,
  "folder-tree": FolderTree,
  "foldertree": FolderTree,
  "folder-archive": FolderArchive,
  "folderarchive": FolderArchive,
  "box": Box,
  "layout": Layout,
  "layout-grid": LayoutGrid,
  "layoutgrid": LayoutGrid,
  "grid": Grid,
  "inbox": Inbox,
  "archive": Archive,
  "layers": Layers,

  // Tech & Dev
  "code": Code,
  "terminal": Terminal,
  "cpu": Cpu,
  "database": Database,
  "cloud": Cloud,
  "globe": Globe,
  "compass": Compass,
  "history": History,

  // Badges & Symbols
  "star": Star,
  "sparkles": Sparkles,
  "zap": Zap,
  "flame": Flame,
  "heart": Heart,
  "shield": Shield,
  "tag": Tag,
  "bookmark": Bookmark,
  "smile": Smile,
  "palette": Palette,
  "dices": Dices,

  // Files & Security
  "file-text": FileText,
  "file-code": FileCode,
  "book-open": BookOpen,
  "bookopen": BookOpen,
  "key": Key,
  "lock": Lock,
  "trash": Trash2,
  "trash-2": Trash2,
  "trash2": Trash2,
  "share": Share2,
  "share-2": Share2,
  "share2": Share2,
};

export function FolderIconRenderer({
  icon,
  className = "h-4 w-4",
  color,
}: FolderIconRendererProps) {
  const effectiveColor = color && color !== "gray" && color !== "inherit" ? color : undefined;

  if (!icon || icon === "📁" || icon === "📂") {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: effectiveColor }}
      >
        <Folder className={className} />
      </span>
    );
  }

  if (icon === "📥" || icon === "Inbox") {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: effectiveColor }}
      >
        <Archive className={className} />
      </span>
    );
  }

  // 1. Check direct Lucide Icon Map (kebab-case, lowercase, clean)
  const normalizedKey = icon.toLowerCase().trim().replace(/^iconoir:/, "").replace(/^lucide:/, "");
  const LucideComponent = LUCIDE_ICON_MAP[normalizedKey];
  if (LucideComponent) {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: effectiveColor }}
      >
        <LucideComponent className={className} />
      </span>
    );
  }

  // 2. Check Iconoir Icons
  const cleanName = icon.startsWith("iconoir:") ? icon.replace("iconoir:", "") : icon;
  const iconsDict = IconoirIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;

  let IconComponent = iconsDict[cleanName];
  if (!IconComponent && cleanName.length > 0) {
    const pascalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    IconComponent = iconsDict[pascalName];
  }

  if (IconComponent) {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: effectiveColor }}
      >
        <IconComponent className={className} />
      </span>
    );
  }

  // 3. If it looks like an emoji (1 to 4 Unicode chars with no alphanumeric ASCII)
  const isEmoji = /^\p{Emoji}+$/u.test(icon) || icon.length <= 2;
  if (isEmoji) {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0 leading-none select-none"
        style={{ color: effectiveColor }}
      >
        {icon}
      </span>
    );
  }

  // 4. Default fallback: Never display raw text like "bar-chart" or "folder-tree"
  const FallbackIcon = normalizedKey.includes("chart") || normalizedKey.includes("bar") ? BarChart3 : Folder;
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{ color: effectiveColor }}
    >
      <FallbackIcon className={className} />
    </span>
  );
}
