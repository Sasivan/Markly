"use client";

import * as React from "react";
import { Layers, Pin, FolderPlus, BookmarkPlus, Check, Sparkles, Activity, Tag, Globe, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { ActivityHeatmap365 } from "@/components/home/activity-heatmap-365";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export type IntelVariationType = "graph" | "tree" | "tags" | "heatmap" | "wall" | "domains" | "health";

export const INTEL_VARIATIONS: Array<{
  type: IntelVariationType;
  label: string;
  category: "Graphs" | "Tags" | "Activity" | "Walls" | "Health";
  desc: string;
}> = [
  { type: "graph", label: "Knowledge Graph", category: "Graphs", desc: "Force-directed physics link graph" },
  { type: "tree", label: "2D Tree Hierarchy", category: "Graphs", desc: "Dendritic node hierarchy structure" },
  { type: "tags", label: "Tag Frequency Cloud", category: "Tags", desc: "Interactive weighted tag matrix" },
  { type: "heatmap", label: "365-Day Activity Heatmap", category: "Activity", desc: "GitHub-style year activity grid" },
  { type: "wall", label: "Visual Bento Wall", category: "Walls", desc: "High-density bookmark matrix wall" },
  { type: "domains", label: "Domain Ecosystems", category: "Graphs", desc: "Host clustering and domain network" },
  { type: "health", label: "Link Health Auditor", category: "Health", desc: "Active vs dead link health status" },
];

export interface IntelligenceSystemsStudioBoxProps {
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
    kind: IntelVariationType;
  }) => void;
  onAddToFolder?: (visual: {
    id: string;
    title: string;
    kind: IntelVariationType;
  }) => void;
}

export function IntelligenceSystemsStudioBox({
  id = "studio_intel_systems",
  bookmarks,
  folders,
  initialColSpan = 12,
  rowSpan = 2,
  onColSpanChange,
  onRowSpanChange,
  onDeleteWidget,
  onPinHome,
  onAddToFolder,
}: IntelligenceSystemsStudioBoxProps) {
  const [activeCategory, setActiveCategory] = React.useState<"All" | "Graphs" | "Tags" | "Activity" | "Walls" | "Health">("All");
  const [intelType, setIntelType] = React.useState<IntelVariationType>("graph");
  const [scope, setScope] = React.useState<"all" | "favorites" | "recent">("all");
  const [accentColor, setAccentColor] = React.useState<string>("#8b5cf6");
  const [icon, setIcon] = React.useState<string>("layers");
  const [savedPresetMsg, setSavedPresetMsg] = React.useState<string | null>(null);

  // Folder Destination Dialog
  const [folderModalOpen, setFolderModalOpen] = React.useState(false);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);

  const filteredVariations = React.useMemo(() => {
    if (activeCategory === "All") return INTEL_VARIATIONS;
    return INTEL_VARIATIONS.filter((v) => v.category === activeCategory);
  }, [activeCategory]);

  const activeMeta = React.useMemo(() => {
    return INTEL_VARIATIONS.find((v) => v.type === intelType) || INTEL_VARIATIONS[0];
  }, [intelType]);

  const filteredBookmarks = React.useMemo(() => {
    if (scope === "favorites") return bookmarks.filter((b) => b.isFavorite);
    if (scope === "recent") return [...bookmarks].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50);
    return bookmarks;
  }, [bookmarks, scope]);

  const handleSaveAsPreset = () => {
    try {
      const stored = localStorage.getItem("markly_custom_intel_presets");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `preset_intel_${Date.now()}`,
        title: `${activeMeta.label} Preset`,
        type: intelType,
        scope,
        createdAt: Date.now(),
      });
      localStorage.setItem("markly_custom_intel_presets", JSON.stringify(list));
      setSavedPresetMsg("Saved to preset library!");
      setTimeout(() => setSavedPresetMsg(null), 3000);
    } catch {}
  };

  const handleExecutePinHome = () => {
    onPinHome?.({
      id: `home_intel_${Date.now()}`,
      title: activeMeta.label,
      kind: intelType,
    });
  };

  const handleConfirmAddToFolder = () => {
    if (!selectedFolderId) return;
    const storageKey = `markly_folder_visuals_${selectedFolderId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `folder_intel_${Date.now()}`,
        title: activeMeta.label,
        kind: intelType,
        colSpan: 12,
        rowSpan: 2,
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
      title="Intelligence Systems Studio (7 Variations)"
      icon={<FolderIconRenderer icon={icon} color={accentColor} className="h-4 w-4" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      minHeight={560}
      badgeText="7 SYSTEMS"
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
            title="Save current intelligence view as a preset"
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
              title="Pin this intelligence system to Dashboard Home"
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
            title="Put this system into any folder"
          >
            <FolderPlus className="h-3 w-3 text-purple-500" />
            <span>+ Folder</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 space-y-3.5 select-none text-foreground">
        {/* Category Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {(["All", "Graphs", "Tags", "Activity", "Walls", "Health"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === cat
                    ? "bg-purple-600 text-white shadow-xs"
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
            const isSel = intelType === v.type;
            return (
              <button
                key={v.type}
                type="button"
                onClick={() => setIntelType(v.type)}
                style={
                  isSel
                    ? { borderColor: accentColor, backgroundColor: `${accentColor}15` }
                    : undefined
                }
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1 ${
                  isSel
                    ? "shadow-xs ring-1 ring-primary/40 font-semibold"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isSel ? "text-purple-500" : "text-foreground"}`}>
                    {v.label}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-muted-foreground/60">{v.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{v.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Controls Bar: Scope, Accent & Icon */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scope:</span>
            <div className="flex items-center gap-1">
              {(["all", "favorites", "recent"] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScope(sc)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-colors capitalize ${
                    scope === sc ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sc === "all" ? "All Bookmarks" : sc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <UniversalColorPicker color={accentColor} onChange={setAccentColor} compact={true} contextKey="studio_intel_color" />
            <UniversalIconPicker icon={icon} color={accentColor} onChange={setIcon} compact={true} contextKey="studio_intel_icon" />
          </div>
        </div>

        {/* Live Interactive Visualization Container */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between pb-1.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              Live Interactive System: {activeMeta.label}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{filteredBookmarks.length} nodes computed</span>
          </div>

          <div
            className="min-h-[290px] w-full rounded-xl border border-border/80 bg-background/50 p-2 overflow-hidden flex items-center justify-center transition-colors"
            style={{ borderColor: `${accentColor}30` }}
          >
            {intelType === "graph" || intelType === "tree" ? (
              <div className="w-full h-[280px]">
                <KnowledgeGraph mode="global" depth={2} />
              </div>
            ) : intelType === "heatmap" ? (
              <div className="w-full p-2">
                <ActivityHeatmap365 bookmarks={filteredBookmarks} bare />
              </div>
            ) : intelType === "tags" ? (
              <div className="w-full flex flex-wrap gap-1.5 p-4 max-h-64 overflow-y-auto">
                {Array.from(new Set(filteredBookmarks.flatMap((b) => b.tags || []))).map((t: any) => {
                  const name = typeof t === "string" ? t : t.name;
                  const count = filteredBookmarks.filter((b) => (b.tags || []).some((x: any) => (typeof x === "string" ? x : x.name) === name)).length;
                  return (
                    <span
                      key={name}
                      className="px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-xs font-medium flex items-center gap-1.5 hover:border-primary/50 cursor-pointer"
                    >
                      <Tag className="h-3 w-3 text-purple-500" />
                      <span>{name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-background px-1 rounded">{count}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              /* Bento Wall or Domain List */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-h-64 overflow-y-auto p-2">
                {filteredBookmarks.slice(0, 16).map((b) => (
                  <div key={b.id} className="p-2 rounded-lg border border-border bg-card/80 text-xs flex items-center gap-2 truncate">
                    <img
                      src={b.iconUrl || `https://www.google.com/s2/favicons?domain=${b.domain}&sz=32`}
                      alt=""
                      className="h-4 w-4 rounded shrink-0"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="truncate font-medium">{b.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Put in Folder Destination Selector Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="max-w-md p-5 bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Put Intelligence System Into Folder
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
              className="bg-purple-600 text-white font-semibold"
            >
              Add to Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardWidgetBox>
  );
}
