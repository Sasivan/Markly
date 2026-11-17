"use client";

import * as React from "react";
import { Layers, Pin, FolderPlus, BookmarkPlus, Check, Sparkles, Activity, Tag, Globe, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { saveUniversalPreset } from "@/components/presets/universal-preset-hub";
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
  const [graphDepth, setGraphDepth] = React.useState<number>(2);
  const [tagSort, setTagSort] = React.useState<"count" | "alpha">("count");
  const [minTagCount, setMinTagCount] = React.useState<number>(1);
  const [wallDensity, setWallDensity] = React.useState<"compact" | "standard" | "cozy">("standard");
  const [wallSort, setWallSort] = React.useState<"visits" | "recent" | "alpha">("visits");
  const [selectedFolderFilter, setSelectedFolderFilter] = React.useState<string>("all");
  const [onlyAlive, setOnlyAlive] = React.useState<boolean>(false);

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
    let list = bookmarks;
    if (scope === "favorites") list = list.filter((b) => b.isFavorite);
    if (scope === "recent") list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50);
    if (selectedFolderFilter !== "all") list = list.filter((b) => b.folderId === selectedFolderFilter);
    if (onlyAlive) list = list.filter((b) => (b.status || "alive") === "alive");
    return list;
  }, [bookmarks, scope, selectedFolderFilter, onlyAlive]);

  // Distinct computed tags list
  const computedTags = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredBookmarks.forEach((b) => {
      (b.tags || []).forEach((t: any) => {
        const name = typeof t === "string" ? t : t.name;
        counts.set(name, (counts.get(name) || 0) + 1);
      });
    });
    let list = Array.from(counts.entries())
      .filter(([_, cnt]) => cnt >= minTagCount)
      .map(([name, count]) => ({ name, count }));
    if (tagSort === "count") list.sort((a, b) => b.count - a.count);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [filteredBookmarks, minTagCount, tagSort]);

  // Distinct computed domains list
  const computedDomains = React.useMemo(() => {
    const map = new Map<string, { domain: string; count: number; visits: number; iconUrl?: string | null; sampleSites: BookmarkWithDetails[] }>();
    filteredBookmarks.forEach((b) => {
      const d = b.domain || "unknown";
      const existing = map.get(d) || { domain: d, count: 0, visits: 0, iconUrl: b.iconUrl, sampleSites: [] };
      existing.count += 1;
      existing.visits += b.visitCount || 0;
      if (existing.sampleSites.length < 3) existing.sampleSites.push(b);
      map.set(d, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredBookmarks]);

  // Distinct computed health stats
  const computedHealth = React.useMemo(() => {
    let alive = 0;
    let broken = 0;
    let unchecked = 0;
    filteredBookmarks.forEach((b) => {
      const s = (b.status as string) || "alive";
      if (s === "alive") alive++;
      else if (s === "dead" || s === "broken" || s === "error") broken++;
      else unchecked++;
    });
    const total = filteredBookmarks.length || 1;
    return {
      alive,
      broken,
      unchecked,
      total: filteredBookmarks.length,
      alivePct: Math.round((alive / total) * 100),
      brokenPct: Math.round((broken / total) * 100),
      uncheckedPct: Math.round((unchecked / total) * 100),
    };
  }, [filteredBookmarks]);

  const handleSaveAsPreset = () => {
    try {
      saveUniversalPreset({
        id: `preset_box_intel_${Date.now()}`,
        name: activeMeta.label,
        description: `T4 Intelligence Suite (${activeMeta.type}) - ${activeMeta.desc}`,
        category: "box",
        tabRef: "T4",
        data: {
          id: `intel_${Date.now()}`,
          title: activeMeta.label,
          kind: intelType,
          category: "intel",
          intelConfig: {
            type: intelType,
            scope,
            graphDepth,
          },
          colSpan: 12,
          rowSpan: 2,
        },
      });
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
    setSavedPresetMsg("Pinned to Dashboard Home!");
    setTimeout(() => setSavedPresetMsg(null), 3000);
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
      tabRef="T4"
      title="Intelligence Systems Studio (7 Variations)"
      icon={<FolderIconRenderer icon={icon} color={accentColor} className="h-4 w-4" />}
      initialColSpan={initialColSpan}
      rowSpan={rowSpan}
      onColSpanChange={onColSpanChange}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      minHeight={620}
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
      <div className="p-3.5 space-y-3.5 select-none text-foreground min-w-0">
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

        {/* Controls Bar: Contextual controls per system type */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border text-xs">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs cursor-pointer font-medium"
            >
              <option value="all">All Bookmarks</option>
              <option value="favorites">Starred Favorites</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Folder Scope</label>
            <select
              value={selectedFolderFilter}
              onChange={(e) => setSelectedFolderFilter(e.target.value)}
              className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs cursor-pointer font-medium truncate"
            >
              <option value="all">All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          {intelType === "graph" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Graph Depth</label>
              <select
                value={graphDepth}
                onChange={(e) => setGraphDepth(Number(e.target.value))}
                className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs cursor-pointer font-medium"
              >
                <option value={1}>1 - Direct Links Only</option>
                <option value={2}>2 - Standard Neighbors</option>
                <option value={3}>3 - Deep Exploration</option>
                <option value={4}>4 - Entire Ecosystem</option>
              </select>
            </div>
          )}

          {intelType === "tags" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Tag Sort</label>
              <select
                value={tagSort}
                onChange={(e) => setTagSort(e.target.value as any)}
                className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs cursor-pointer font-medium"
              >
                <option value="count">Highest Count First</option>
                <option value="alpha">Alphabetical (A - Z)</option>
              </select>
            </div>
          )}

          {intelType === "wall" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Wall Density</label>
              <select
                value={wallDensity}
                onChange={(e) => setWallDensity(e.target.value as any)}
                className="w-full h-7 px-2 rounded-lg border border-border bg-background text-xs cursor-pointer font-medium"
              >
                <option value="compact">Compact (Dense)</option>
                <option value="standard">Standard (Bento)</option>
                <option value="cozy">Cozy (Spacious)</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 pt-3 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={onlyAlive}
                onChange={(e) => setOnlyAlive(e.target.checked)}
                className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
              />
              <span>Alive Only</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-1.5 col-span-2 sm:col-span-1 pt-1">
            <UniversalColorPicker color={accentColor} onChange={setAccentColor} compact={true} contextKey="studio_intel_color" />
            <UniversalIconPicker icon={icon} color={accentColor} onChange={setIcon} compact={true} contextKey="studio_intel_icon" />
          </div>
        </div>

        {/* Live Interactive Visualization Container */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between pb-1.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              Live Interactive System: {activeMeta.label}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{filteredBookmarks.length} sites evaluated</span>
          </div>

          <div
            className="min-h-[300px] w-full flex-1 rounded-xl border border-border/80 bg-background/50 p-2 overflow-hidden flex flex-col items-center justify-center transition-colors"
            style={{ borderColor: `${accentColor}30` }}
          >
            {intelType === "graph" ? (
              <div className="w-full h-full min-h-[320px] flex-1">
                <KnowledgeGraph
                  mode={selectedFolderFilter !== "all" ? "folder" : "global"}
                  folderId={selectedFolderFilter !== "all" ? selectedFolderFilter : undefined}
                  depth={graphDepth}
                />
              </div>
            ) : intelType === "tree" ? (
              <div className="w-full h-full min-h-[280px] p-4 overflow-y-auto space-y-2">
                <div className="text-xs font-semibold text-muted-foreground pb-1 border-b border-border">
                  Folder Hierarchy Dendritic Tree ({folders.length} Collections)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {folders.map((f) => {
                    const count = filteredBookmarks.filter((b) => b.folderId === f.id).length;
                    const subfolders = folders.filter((sub) => sub.parentId === f.id);
                    return (
                      <div key={f.id} className="p-2.5 rounded-xl border border-border bg-card/80 flex flex-col justify-between gap-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate">📁 {f.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-primary font-semibold">
                            {count} sites
                          </span>
                        </div>
                        {subfolders.length > 0 && (
                          <div className="text-[10px] text-muted-foreground pl-3 border-l-2 border-primary/40 truncate">
                            ↳ {subfolders.length} subfolders: {subfolders.map((s) => s.name).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : intelType === "heatmap" ? (
              <div className="w-full p-2">
                <ActivityHeatmap365 bookmarks={filteredBookmarks} bare />
              </div>
            ) : intelType === "tags" ? (
              <div className="w-full flex flex-wrap gap-1.5 p-4 max-h-64 overflow-y-auto">
                {computedTags.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground w-full">No tags found for current criteria.</div>
                ) : (
                  computedTags.map((t) => (
                    <span
                      key={t.name}
                      className="px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-xs font-medium flex items-center gap-1.5 hover:border-primary/50 cursor-pointer shadow-2xs"
                    >
                      <Tag className="h-3 w-3" style={{ color: accentColor }} />
                      <span>{t.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-background px-1 rounded">{t.count}</span>
                    </span>
                  ))
                )}
              </div>
            ) : intelType === "domains" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full max-h-72 overflow-y-auto p-2">
                {computedDomains.map((dom) => (
                  <div key={dom.domain} className="p-2.5 rounded-xl border border-border bg-card/80 text-xs flex flex-col justify-between gap-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={dom.iconUrl || `https://www.google.com/s2/favicons?domain=${dom.domain}&sz=32`}
                          alt=""
                          className="h-4 w-4 rounded shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <span className="font-bold text-xs truncate">{dom.domain}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
                        {dom.count} sites
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {dom.visits} total visits • {dom.sampleSites.map((s) => s.title).join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : intelType === "health" ? (
              <div className="w-full p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Alive (200 OK)</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{computedHealth.alivePct}%</span>
                    </div>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{computedHealth.alive}</span>
                    <span className="text-[10px] text-muted-foreground">Active accessible bookmarks</span>
                  </div>

                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Broken / Error</span>
                      <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">{computedHealth.brokenPct}%</span>
                    </div>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">{computedHealth.broken}</span>
                    <span className="text-[10px] text-muted-foreground">Unreachable or dead links</span>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Unchecked / Fresh</span>
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{computedHealth.uncheckedPct}%</span>
                    </div>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">{computedHealth.unchecked}</span>
                    <span className="text-[10px] text-muted-foreground">Pending health verification</span>
                  </div>
                </div>

                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${computedHealth.alivePct}%` }} />
                  <div className="bg-rose-500 h-full" style={{ width: `${computedHealth.brokenPct}%` }} />
                  <div className="bg-amber-500 h-full" style={{ width: `${computedHealth.uncheckedPct}%` }} />
                </div>
              </div>
            ) : (
              /* Bento Wall */
              <div className={`grid ${wallDensity === "compact" ? "grid-cols-4 sm:grid-cols-8 gap-1.5" : wallDensity === "cozy" ? "grid-cols-2 sm:grid-cols-4 gap-3" : "grid-cols-3 sm:grid-cols-6 gap-2"} w-full max-h-72 overflow-y-auto p-2`}>
                {filteredBookmarks.slice(0, 36).map((b) => (
                  <div key={b.id} className="p-2 rounded-xl border border-border bg-card/80 text-xs flex items-center gap-2 truncate shadow-2xs hover:border-primary/50 cursor-pointer transition-colors">
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
