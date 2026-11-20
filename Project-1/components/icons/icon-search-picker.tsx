"use client";

import * as React from "react";
import * as IconoirIcons from "iconoir-react";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

// All valid Iconoir icon names
const ALL_ICONOIR_NAMES = Object.keys(IconoirIcons).filter((key) => {
  const val = (IconoirIcons as Record<string, unknown>)[key];
  return typeof val === "object" || typeof val === "function";
});

// Curated popular Iconoir icons for instant picking
const CURATED_ICONOIR: { name: string; category: string }[] = [
  // Folders
  { name: "Folder", category: "Folders" },
  { name: "FolderPlus", category: "Folders" },
  { name: "FolderSettings", category: "Folders" },
  { name: "FolderWarning", category: "Folders" },
  { name: "MediaImageFolder", category: "Folders" },
  { name: "MediaVideoFolder", category: "Folders" },
  { name: "Archive", category: "Folders" },

  // Developer & Code
  { name: "Code", category: "Developer" },
  { name: "CodeBrackets", category: "Developer" },
  { name: "CodeBracketsSquare", category: "Developer" },
  { name: "Terminal", category: "Developer" },
  { name: "TerminalTag", category: "Developer" },
  { name: "Cpu", category: "Developer" },
  { name: "Git", category: "Developer" },
  { name: "GitBranch", category: "Developer" },
  { name: "GitCommit", category: "Developer" },
  { name: "GitMerge", category: "Developer" },
  { name: "GitPullRequest", category: "Developer" },
  { name: "Github", category: "Developer" },
  { name: "Codepen", category: "Developer" },
  { name: "Database", category: "Developer" },
  { name: "DatabaseBackup", category: "Developer" },
  { name: "DatabaseSearch", category: "Developer" },
  { name: "DatabaseStats", category: "Developer" },
  { name: "Server", category: "Developer" },
  { name: "ServerConnection", category: "Developer" },
  { name: "Network", category: "Developer" },

  // Web & Cloud
  { name: "Globe", category: "Web" },
  { name: "Cloud", category: "Web" },
  { name: "CloudBookmark", category: "Web" },
  { name: "CloudSync", category: "Web" },
  { name: "CloudUpload", category: "Web" },
  { name: "CloudDownload", category: "Web" },
  { name: "Wifi", category: "Web" },
  { name: "RssFeed", category: "Web" },
  { name: "Search", category: "Web" },
  { name: "Send", category: "Web" },
  { name: "Download", category: "Web" },
  { name: "Upload", category: "Web" },

  // Design & UI
  { name: "Palette", category: "Design" },
  { name: "DesignNib", category: "Design" },
  { name: "DesignPencil", category: "Design" },
  { name: "ColorFilter", category: "Design" },
  { name: "ColorPicker", category: "Design" },
  { name: "LayoutLeft", category: "Design" },
  { name: "LayoutRight", category: "Design" },
  { name: "EditPencil", category: "Design" },
  { name: "Crop", category: "Design" },
  { name: "Spark", category: "Design" },
  { name: "MagicWand", category: "Design" },

  // Productivity
  { name: "Bookmark", category: "Productivity" },
  { name: "BookmarkBook", category: "Productivity" },
  { name: "Book", category: "Productivity" },
  { name: "BookStack", category: "Productivity" },
  { name: "Calendar", category: "Productivity" },
  { name: "Clock", category: "Productivity" },
  { name: "Check", category: "Productivity" },
  { name: "CheckCircle", category: "Productivity" },
  { name: "TaskList", category: "Productivity" },
  { name: "Pin", category: "Productivity" },
  { name: "Notes", category: "Productivity" },
  { name: "ReportColumns", category: "Productivity" },
  { name: "StatsReport", category: "Productivity" },
  { name: "GraphUp", category: "Productivity" },
  { name: "Coins", category: "Productivity" },
  { name: "Wallet", category: "Productivity" },
  { name: "CreditCard", category: "Productivity" },

  // Media
  { name: "MediaVideo", category: "Media" },
  { name: "VideoCamera", category: "Media" },
  { name: "MusicNote", category: "Media" },
  { name: "MusicDoubleNote", category: "Media" },
  { name: "Headset", category: "Media" },
  { name: "Camera", category: "Media" },
  { name: "MediaImage", category: "Media" },
  { name: "Podcast", category: "Media" },
  { name: "Tv", category: "Media" },
  { name: "SoundHigh", category: "Media" },

  // System & Core
  { name: "Shield", category: "System" },
  { name: "ShieldCheck", category: "System" },
  { name: "Lock", category: "System" },
  { name: "Key", category: "System" },
  { name: "Fingerprint", category: "System" },
  { name: "Eye", category: "System" },
  { name: "Settings", category: "System" },
  { name: "Tools", category: "System" },
  { name: "Star", category: "System" },
  { name: "Heart", category: "System" },
  { name: "Flash", category: "System" },
];

// Popular emojis for user convenience
const POPULAR_EMOJIS = [
  "📁", "📂", "🗂️", "📦", "💻", "⚡", "🗄️", "⚙️", "🤖", "🌿", "🧩", "🐛",
  "🌐", "☁️", "🔗", "🧭", "🎨", "✨", "🖋️", "📐", "📷", "🖼️", "💼", "📅",
  "⏱️", "✅", "📥", "🎯", "🎵", "🎬", "📈", "📊", "💰", "🛡️", "🔒", "⭐",
  "❤️", "🔥", "🚀", "💡", "🛠️", "📚", "🔖", "🏆", "🌟", "🏷️", "🧪", "🎮"
];

const CATEGORIES = ["All", "Developer", "Folders", "Web", "Design", "Productivity", "Media", "System"] as const;

interface IconSearchPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconStr: string) => void;
}

export function IconSearchPicker({ selectedIcon, onSelectIcon }: IconSearchPickerProps) {
  const [mode, setMode] = React.useState<"iconoir" | "emoji">("iconoir");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("All");

  // Recently used icons (stored in localStorage)
  const [recentIcons, setRecentIcons] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("markly_recent_icons");
      if (stored) {
        setRecentIcons(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleSelectWithRecent = (iconStr: string) => {
    onSelectIcon(iconStr);
    try {
      const updated = [iconStr, ...recentIcons.filter((i) => i !== iconStr)].slice(0, 14);
      setRecentIcons(updated);
      localStorage.setItem("markly_recent_icons", JSON.stringify(updated));
    } catch {}
  };

  // Filter Iconoir icons
  const filteredIconoirNames = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    if (q) {
      // Dynamic search across all 1,670+ Iconoir icons
      return ALL_ICONOIR_NAMES.filter((name) =>
        name.toLowerCase().includes(q)
      ).slice(0, 72); // show up to 72 matches for optimal performance
    }

    // Curated filtered by category
    if (category === "All") {
      return CURATED_ICONOIR.map((item) => item.name);
    }
    return CURATED_ICONOIR.filter((item) => item.category === category).map((item) => item.name);
  }, [search, category]);

  // Filter emojis
  const filteredEmojis = React.useMemo(() => {
    return POPULAR_EMOJIS;
  }, []);

  const cleanSelectedName = selectedIcon?.startsWith("iconoir:")
    ? selectedIcon.replace("iconoir:", "")
    : selectedIcon;

  return (
    <div className="space-y-2.5">
      {/* Top Mode Selector: Iconoir (1,671 SVGs) vs Emojis */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-secondary border border-border">
          <button
            type="button"
            onClick={() => setMode("iconoir")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === "iconoir"
                ? "bg-card text-foreground shadow-surface"
                : "text-muted-foreground hover:text-foreground dark:hover:text-white"
            }`}
          >
            Iconoir SVGs ({ALL_ICONOIR_NAMES.length})
          </button>
          <button
            type="button"
            onClick={() => setMode("emoji")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === "emoji"
                ? "bg-card text-foreground shadow-surface"
                : "text-muted-foreground hover:text-foreground dark:hover:text-white"
            }`}
          >
            Emojis
          </button>
        </div>

        <span className="text-2xs text-muted-foreground font-medium">
          {mode === "iconoir" ? "1,671 Vector Icons" : "Notion Emojis"}
        </span>
      </div>

      {mode === "iconoir" && (
        <>
          {/* Search Input for Iconoir */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="Search 1,670+ icons (e.g. folder, code, git, database, cloud, terminal)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 bg-secondary border-border"
            />
          </div>

          {/* Quick Categories Filter (only when not actively searching) */}
          {!search.trim() && (
            <div className="flex flex-wrap items-center gap-1 pb-1 text-2xs overflow-x-hidden">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    category === cat
                      ? "bg-primary text-white font-medium shadow-surface"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Iconoir Icons Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto overflow-x-hidden p-1.5 rounded-xl border border-border bg-secondary">
            {filteredIconoirNames.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                No matching Iconoir icons found for &quot;{search}&quot;
              </div>
            ) : (
              filteredIconoirNames.map((name) => {
                const isSelected =
                  cleanSelectedName === name || selectedIcon === `iconoir:${name}`;
                const IconComponent = (IconoirIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];

                if (!IconComponent) return null;

                return (
                  <button
                    type="button"
                    key={name}
                    onClick={() => handleSelectWithRecent(`iconoir:${name}`)}
                    className={`h-9 w-full rounded-lg flex flex-col items-center justify-center p-1 text-muted-foreground cursor-pointer transition-colors active:translate-y-0.5 ${
                      isSelected
                        ? "bg-primary text-white shadow-sm ring-2 ring-ring ring-offset-1"
                        : "bg-card border border-border hover:border-border-strong hover:bg-accent shadow-surface"
                    }`}
                    title={name}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {mode === "emoji" && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-52 overflow-y-auto overflow-x-hidden p-1.5 rounded-xl border border-border bg-secondary">
          {filteredEmojis.map((emoji) => {
            const isSelected = selectedIcon === emoji;
            return (
              <button
                type="button"
                key={emoji}
                onClick={() => handleSelectWithRecent(emoji)}
                className={`h-9 w-full rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors active:translate-y-0.5 ${
                  isSelected
                    ? "bg-primary text-white shadow-sm ring-2 ring-ring ring-offset-1"
                    : "bg-card border border-border hover:border-border-strong hover:bg-accent shadow-surface"
                }`}
              >
                <span>{emoji}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Recently Used Icons Row Below SVGs/Emojis */}
      {recentIcons.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <div className="flex items-center justify-between text-2xs text-muted-foreground font-medium px-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Recently Used Icons
            </span>
            <button
              type="button"
              onClick={() => {
                setRecentIcons([]);
                try {
                  localStorage.removeItem("markly_recent_icons");
                } catch {}
              }}
              className="text-3xs text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {recentIcons.map((rec) => {
              const isSelected = selectedIcon === rec || selectedIcon === `iconoir:${rec}`;
              const isIconoir = rec.startsWith("iconoir:") || ALL_ICONOIR_NAMES.includes(rec);
              const iconName = rec.replace("iconoir:", "");
              const IconComp = isIconoir
                ? (IconoirIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName]
                : null;

              return (
                <button
                  type="button"
                  key={rec}
                  onClick={() => onSelectIcon(rec)}
                  className={`h-7 w-7 flex-shrink-0 rounded-md flex items-center justify-center transition-colors cursor-pointer active:translate-y-0.5 ${
                    isSelected
                      ? "bg-primary text-white ring-2 ring-ring"
                      : "bg-card border border-border hover:border-border-strong text-muted-foreground"
                  }`}
                  title={rec}
                >
                  {IconComp ? <IconComp className="h-3.5 w-3.5" /> : <span className="text-xs">{rec}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
