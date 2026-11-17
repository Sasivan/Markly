"use client";

import * as React from "react";
import { LayoutGrid, Pin, FolderPlus, BookmarkPlus, Check, Sparkles, Star, Clock, Inbox, Globe, List, Rows3, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox, BookmarkItemsView, type WidgetViewMode, type WidgetItemLimit } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export type SitesVariationType = "all_grid" | "all_list" | "all_compact" | "favorites" | "recent" | "unsorted" | "domain_clustered";

export const SITES_VARIATIONS: Array<{
  type: SitesVariationType;
  label: string;
  category: "Layouts" | "Sources" | "Clustered";
  desc: string;
  viewMode: WidgetViewMode;
  source: "all" | "favorites" | "recent" | "unsorted";
}> = [
  { type: "all_grid", label: "Bento Cards Grid", category: "Layouts", desc: "Interactive cards with rich favicon, domain & stats", viewMode: "grid", source: "all" },
  { type: "all_list", label: "Notion Document List", category: "Layouts", desc: "Dense row list with timestamps & direct action links", viewMode: "list", source: "all" },
  { type: "all_compact", label: "Ultra-Compact Glyphs", category: "Layouts", desc: "High-density mini pill badges", viewMode: "compact", source: "all" },
  { type: "favorites", label: "Starred Favorites Hub", category: "Sources", desc: "Priority starred sites with quick access", viewMode: "grid", source: "favorites" },
  { type: "recent", label: "Recently Visited Stream", category: "Sources", desc: "Chronological visit momentum stream", viewMode: "list", source: "recent" },
  { type: "unsorted", label: "Inbox / Unfiled Queue", category: "Sources", desc: "Unorganized links requiring classification", viewMode: "compact", source: "unsorted" },
  { type: "domain_clustered", label: "Domain Clustered Matrix", category: "Clustered", desc: "Grouped by parent host and web domain", viewMode: "grid", source: "all" },
];

export interface SitesMatrixStudioBoxProps {
  id?: string;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  initialColSpan?: WidgetColSpan;
  rowSpan?: 1 | 2;
  onColSpanChange?: (span: WidgetColSpan) => void;
  onRowSpanChange?: (span: 1 | 2) => void;
  onDeleteWidget?: () => void;
  onPinHome?: (visual: {
    id: string;
    title: string;
    kind: "sites";
    siteConfig: any;
  }) => void;
  onAddToFolder?: (visual: {
    id: string;
    title: string;
    kind: "sites";
    siteConfig: any;
  }) => void;
}

export function SitesMatrixStudioBox({
  id = "studio_sites_matrix",
  bookmarks,
  folders,
  initialColSpan = 12,
  rowSpan = 2,
  onColSpanChange,
  onRowSpanChange,
  onDeleteWidget,
  onPinHome,
  onAddToFolder,
}: SitesMatrixStudioBoxProps) {
  const [activeCategory, setActiveCategory] = React.useState<"All" | "Layouts" | "Sources" | "Clustered">("All");
  const [variationType, setVariationType] = React.useState<SitesVariationType>("all_grid");
  const [itemLimit, setItemLimit] = React.useState<WidgetItemLimit>("auto");
  const [accentColor, setAccentColor] = React.useState<string>("#10b981");
  const [icon, setIcon] = React.useState<string>("globe");
  const [overrideViewMode, setOverrideViewMode] = React.useState<WidgetViewMode | null>(null);
  const [savedPresetMsg, setSavedPresetMsg] = React.useState<string | null>(null);

  // Folder Destination Dialog
  const [folderModalOpen, setFolderModalOpen] = React.useState(false);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);

  const filteredVariations = React.useMemo(() => {
    if (activeCategory === "All") return SITES_VARIATIONS;
    return SITES_VARIATIONS.filter((v) => v.category === activeCategory);
  }, [activeCategory]);

  const activeMeta = React.useMemo(() => {
    return SITES_VARIATIONS.find((v) => v.type === variationType) || SITES_VARIATIONS[0];
  }, [variationType]);

  const activeViewMode: WidgetViewMode = overrideViewMode || activeMeta.viewMode;

  const targetBookmarks = React.useMemo(() => {
    if (activeMeta.source === "favorites") return bookmarks.filter((b) => b.isFavorite && !b.isArchived);
    if (activeMeta.source === "recent") return [...bookmarks.filter((b) => !b.isArchived)].sort((a, b) => (b.lastVisitedAt || b.createdAt || 0) - (a.lastVisitedAt || a.createdAt || 0));
    if (activeMeta.source === "unsorted") return bookmarks.filter((b) => !b.folderId && !b.isArchived);
    return bookmarks.filter((b) => !b.isArchived);
  }, [bookmarks, activeMeta.source]);

  const siteConfig = React.useMemo(() => ({
    source: activeMeta.source,
    layout: activeViewMode,
    limit: itemLimit,
    accentColor,
    icon,
  }), [activeMeta.source, activeViewMode, itemLimit, accentColor, icon]);

  const handleSaveAsPreset = () => {
    try {
      const stored = localStorage.getItem("markly_custom_sites_presets");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `preset_sites_${Date.now()}`,
        title: `${activeMeta.label} Preset`,
        config: siteConfig,
        createdAt: Date.now(),
      });
      localStorage.setItem("markly_custom_sites_presets", JSON.stringify(list));
      setSavedPresetMsg("Saved to preset library!");
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  const handleExecutePinHome = () => {
    onPinHome?.({
      id: `home_sites_${Date.now()}`,
      title: activeMeta.label,
      kind: "sites",
      siteConfig,
    });
  };

  const handleConfirmAddToFolder = () => {
    if (!selectedFolderId) return;
    const storageKey = `markly_folder_visuals_${selectedFolderId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `folder_sites_${Date.now()}`,
        title: activeMeta.label,
        kind: "sites",
        colSpan: 12,
        rowSpan: 2,
        siteConfig,
      });
      localStorage.setItem(storageKey, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("markly-folder-visuals-updated", { detail: { folderId: selectedFolderId } }));
      setFolderModalOpen(false);
      setSavedPresetMsg(`Added to ${folders.find((f) => f.id === selectedFolderId)?.name || "Folder"}!`);
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  return (
    <DashboardWidgetBox
      id={id}
      title="Sites Matrix Studio (7 Variations)"
      icon={<FolderIconRenderer icon={icon} color={accentColor} className="h-4 w-4" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      minHeight={560}
      badgeText="7 MATRIX PATTERNS"
      extraHeaderAction={
        <div className="flex items-center gap-1.5">
          {savedPresetMsg && (
            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 animate-in fade-in">
              <Check className="h-3 w-3" />
              <span>{savedPresetMsg}</span>
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAsPreset}
            className="text-xs h-7 px-2 cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
            title="Save current sites matrix layout as a preset"
          >
            <BookmarkPlus className="h-3 w-3 text-amber-500" />
            <span className="hidden sm:inline">Save Preset</span>
          </Button>
          {onPinHome && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExecutePinHome}
              className="text-xs h-7 px-2 cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
              title="Pin this sites matrix to Dashboard Home"
            >
              <Pin className="h-3 w-3 text-cyan-500" />
              <span>Pin Home</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFolderModalOpen(true)}
            className="text-xs h-7 px-2 cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
            title="Put this sites box into any folder"
          >
            <FolderPlus className="h-3 w-3 text-emerald-500" />
            <span>+ Folder</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 space-y-3.5 select-none text-foreground">
        {/* Category Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {(["All", "Layouts", "Sources", "Clustered"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === cat
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase hidden sm:inline">
            {filteredVariations.length} types shown
          </span>
        </div>

        {/* Variations Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {filteredVariations.map((v) => {
            const isSel = variationType === v.type;
            return (
              <button
                key={v.type}
                type="button"
                onClick={() => setVariationType(v.type)}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1 ${
                  isSel
                    ? "border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/40"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isSel ? "text-emerald-500" : "text-foreground"}`}>
                    {v.label}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-muted-foreground/60">{v.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{v.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Controls Bar: Item Limit, Accent & Icon */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item Limit:</span>
            <div className="flex items-center gap-1">
              {(["auto", 6, 12, 24, "all"] as const).map((lim) => (
                <button
                  key={String(lim)}
                  type="button"
                  onClick={() => setItemLimit(lim as WidgetItemLimit)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    itemLimit === lim ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {String(lim)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <UniversalColorPicker color={accentColor} onChange={setAccentColor} compact={true} />
            <UniversalIconPicker icon={icon} color={accentColor} onChange={setIcon} compact={true} />
          </div>
        </div>

        {/* Live Interactive Sites Matrix Container */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              Live Interactive Matrix: {activeMeta.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{targetBookmarks.length} sites loaded</span>
              {/* Visual Format Selector (Cards, List, Table, Compact) */}
              <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border">
                {[
                  { mode: "grid" as const, label: "Cards", icon: LayoutGrid },
                  { mode: "list" as const, label: "List", icon: List },
                  { mode: "table" as const, label: "Table", icon: TableIcon },
                  { mode: "compact" as const, label: "Compact", icon: Rows3 },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = activeViewMode === m.mode;
                  return (
                    <button
                      key={m.mode}
                      type="button"
                      onClick={() => setOverrideViewMode(m.mode)}
                      className={`h-6 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                        isSel
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={`Switch to ${m.label} layout`}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="min-h-[290px] w-full rounded-xl border border-border/80 bg-background/50 p-3 overflow-y-auto max-h-80 transition-colors"
            style={{ borderColor: `${accentColor}30` }}
          >
            <BookmarkItemsView
              items={targetBookmarks}
              mode={activeViewMode}
              limit={itemLimit}
            />
          </div>
        </div>
      </div>

      {/* Put in Folder Destination Selector Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="max-w-md p-5 bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Put Sites Matrix Into Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select which folder page should display this {activeMeta.label} unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground block">Target Folder</label>
            <UniversalFolderSelect
              folders={folders}
              value={selectedFolderId}
              onChange={setSelectedFolderId}
              allowRoot={false}
              placeholder="Choose destination folder..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button size="sm" variant="outline" onClick={() => setFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFolderId}
              onClick={handleConfirmAddToFolder}
              className="bg-emerald-600 text-white font-semibold"
            >
              Add to Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardWidgetBox>
  );
}
