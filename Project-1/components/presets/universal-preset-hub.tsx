"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SlidersHorizontal,
  Home,
  Folder,
  BarChart3,
  Search,
  Plus,
  Trash2,
  Check,
  Star,
  Sparkles,
  RotateCcw,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
  Box,
  Send,
  Pin,
  ExternalLink,
} from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";

export type PresetCategory = "home" | "folder" | "visuals" | "search" | "box";

export interface UniversalPresetItem {
  id: string;
  name: string;
  description?: string;
  category: PresetCategory;
  tabRef?: "T1" | "T2" | "T3" | "T4";
  isDefault?: boolean;
  createdAt: number;
  data: any;
}

// Global helper to save any preset from anywhere in the application
export function saveUniversalPreset(item: Omit<UniversalPresetItem, "createdAt">): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("markly_universal_presets_hub");
    const list: UniversalPresetItem[] = stored ? JSON.parse(stored) : [];
    const entry: UniversalPresetItem = {
      ...item,
      createdAt: Date.now(),
    };
    const updated = [entry, ...list.filter((p) => p.id !== item.id)];
    localStorage.setItem("markly_universal_presets_hub", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("markly-preset-hub-updated"));
  } catch (e) {
    console.error("saveUniversalPreset error:", e);
  }
}

// Built-in starter presets for Homepage
const DEFAULT_HOME_PRESETS: UniversalPresetItem[] = [
  {
    id: "preset_home_balanced",
    name: "Balanced Hub (Default)",
    description: "Standard layout with quick access, folders, favorites, momentum velocity and domains.",
    category: "home",
    isDefault: true,
    createdAt: 1700000000000,
    data: null, // default
  },
  {
    id: "preset_home_analytics",
    name: "Analytics & Plots Heavy",
    description: "Focus on data visualization: Observable plots, ecosystem charts, velocity momentum.",
    category: "home",
    createdAt: 1700000001000,
    data: [
      { id: "analytics_velocity", visible: true, span: "2", colSpan: 12, rowSpan: 1 },
      { id: "analytics_domains", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "analytics_radar", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "analytics_tags", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "recent", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "favorites", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "folders", visible: true, span: "2", colSpan: 12, rowSpan: 1 },
    ],
  },
  {
    id: "preset_home_minimal",
    name: "Minimalist Focus",
    description: "Ultra clean: Fast quick access and starred bookmarks only.",
    category: "home",
    createdAt: 1700000002000,
    data: [
      { id: "favorites", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "recent", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "folders", visible: true, span: "2", colSpan: 12, rowSpan: 1 },
    ],
  },
];

// Built-in starter presets for Folder Panels
const DEFAULT_FOLDER_PRESETS: UniversalPresetItem[] = [
  {
    id: "preset_folder_overview",
    name: "Full Analytics & Sites (Default)",
    description: "Sites list, tag distribution, activity spectrum, favicon wall, and force graph.",
    category: "folder",
    isDefault: true,
    createdAt: 1700000000000,
    data: null,
  },
  {
    id: "preset_folder_graph_heavy",
    name: "Knowledge Graph Matrix",
    description: "Large force-directed Obsidian graph with depth 3 and tag cloud.",
    category: "folder",
    createdAt: 1700000001000,
    data: [
      { id: "viz_graph", title: "Folder Knowledge Graph", kind: "graph", colSpan: 12, rowSpan: 2 },
      { id: "viz_tags", title: "Tag Cloud Spectrum", kind: "tags", colSpan: 6, rowSpan: 1 },
      { id: "viz_sites", title: "Sites in Collection", kind: "sites", colSpan: 6, rowSpan: 1 },
    ],
  },
];

// Built-in starter presets for Individual Boxes (Universal reusable units)
const DEFAULT_BOX_PRESETS: UniversalPresetItem[] = [
  {
    id: "preset_box_t1_matrix",
    name: "Bento Sites Matrix",
    description: "T1 Sites Reference box with cards layout and quick navigation.",
    category: "box",
    tabRef: "T1",
    createdAt: 1700000000000,
    data: {
      id: "studio_sites_matrix",
      title: "Sites Matrix Reference Studio",
      category: "sites_studio",
      kind: "sites_studio",
      colSpan: 12,
      rowSpan: 2,
    },
  },
  {
    id: "preset_box_t2_plot",
    name: "Observable Ranked BarX Plot",
    description: "T2 Observable Plot Grammar of Graphics with Tableau 10 scale.",
    category: "box",
    tabRef: "T2",
    createdAt: 1700000001000,
    data: {
      id: "studio_observable_plot",
      title: "Observable Plot Layered Graphics Studio (22 Variations)",
      category: "plot_studio",
      kind: "plot_studio",
      colSpan: 12,
      rowSpan: 2,
    },
  },
  {
    id: "preset_box_t3_classic",
    name: "Classic Domain Breakdown",
    description: "T3 Multi-pattern Classic Charts with 18 variations.",
    category: "box",
    tabRef: "T3",
    createdAt: 1700000002000,
    data: {
      id: "studio_classic_charts",
      title: "Classic Charts Layered Studio (18 Variations)",
      category: "chart_studio",
      kind: "chart_studio",
      colSpan: 12,
      rowSpan: 2,
    },
  },
  {
    id: "preset_box_t4_intel",
    name: "Workspace Intelligence Systems",
    description: "T4 Obsidian Force Graph, Tag Heatmap, and Spectrum Suite.",
    category: "box",
    tabRef: "T4",
    createdAt: 1700000003000,
    data: {
      id: "studio_intel_systems",
      title: "Workspace Intelligence Systems Studio (7 Variations)",
      category: "intel_studio",
      kind: "intel_studio",
      colSpan: 12,
      rowSpan: 2,
    },
  },
];

export interface UniversalPresetHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCategory?: PresetCategory;
  currentFolderId?: string | null;
  folderName?: string;
  onRunSearch?: (query: string) => void;
}

export function UniversalPresetHub({
  open,
  onOpenChange,
  activeCategory: initialCategory = "home",
  currentFolderId,
  folderName,
  onRunSearch,
}: UniversalPresetHubProps) {
  const [activeTab, setActiveTab] = React.useState<PresetCategory>(initialCategory);
  const [newPresetName, setNewPresetName] = React.useState("");
  const [newPresetDesc, setNewPresetDesc] = React.useState("");
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  // Folder preset application scope (Universal for all folders vs Custom for this folder)
  const [folderScope, setFolderScope] = React.useState<"universal" | "custom">("universal");

  // Box preset destination selector
  const [boxTargetPlacement, setBoxTargetPlacement] = React.useState<string>("home");

  // Resizable Modal Hook with Cross-Session Persistence
  const {
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "universal_preset_hub",
    defaultVerticalWidth: 700,
    defaultHorizontalWidth: 840,
    defaultVerticalHeight: 620,
    defaultHorizontalHeight: 600,
    minWidth: 480,
    minHeight: 440,
  });

  // Sync tab when modal opens
  React.useEffect(() => {
    if (open && initialCategory) {
      setActiveTab(initialCategory);
    }
  }, [open, initialCategory]);

  // Load custom saved presets from localStorage
  const [savedPresets, setSavedPresets] = React.useState<UniversalPresetItem[]>([]);

  const loadPresets = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("markly_universal_presets_hub");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with built-in box defaults if missing
          const existingIds = new Set(parsed.map((p: any) => p.id));
          const missingBoxes = DEFAULT_BOX_PRESETS.filter((b) => !existingIds.has(b.id));
          if (missingBoxes.length > 0) {
            const merged = [...parsed, ...missingBoxes];
            setSavedPresets(merged);
            localStorage.setItem("markly_universal_presets_hub", JSON.stringify(merged));
            return;
          }
          setSavedPresets(parsed);
          return;
        }
      }
    } catch {}
    // Seed with defaults
    const combined = [...DEFAULT_HOME_PRESETS, ...DEFAULT_FOLDER_PRESETS, ...DEFAULT_BOX_PRESETS];
    setSavedPresets(combined);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(combined));
    } catch {}
  }, []);

  React.useEffect(() => {
    if (open) {
      loadPresets();
    }
  }, [open, loadPresets]);

  // Listen for background updates to the preset hub
  React.useEffect(() => {
    const handleUpdate = () => loadPresets();
    window.addEventListener("markly-preset-hub-updated", handleUpdate);
    return () => window.removeEventListener("markly-preset-hub-updated", handleUpdate);
  }, [loadPresets]);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // 1. SAVE CURRENT SETUP AS A PRESET
  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;

    let payload: any = null;
    let assignedTabRef: "T1" | "T2" | "T3" | "T4" | undefined = undefined;

    if (activeTab === "home") {
      try {
        const stored = localStorage.getItem("markly_home_widgets");
        payload = stored ? JSON.parse(stored) : null;
      } catch {}
    } else if (activeTab === "folder") {
      try {
        const key =
          folderScope === "custom" && currentFolderId
            ? `markly_folder_tabs_${currentFolderId}`
            : "markly_universal_folder_tabs";
        const stored = localStorage.getItem(key);
        payload = stored ? JSON.parse(stored) : null;
      } catch {}
    } else if (activeTab === "visuals") {
      try {
        const hidden = localStorage.getItem("markly_hidden_visual_studio_units");
        payload = { hiddenStudioUnits: hidden ? JSON.parse(hidden) : [] };
      } catch {}
    } else if (activeTab === "search") {
      const input = document.getElementById("markly-home-search-input") as HTMLInputElement;
      payload = { query: input?.value || newPresetName.trim() };
    } else if (activeTab === "box") {
      // Capture the most recently focused or default Studio Box
      payload = {
        id: `box_${Date.now()}`,
        title: newPresetName.trim(),
        category: "chart_studio",
        colSpan: 12,
        rowSpan: 2,
      };
      assignedTabRef = "T3";
    }

    const newPreset: UniversalPresetItem = {
      id: `preset_${activeTab}_${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || undefined,
      category: activeTab,
      tabRef: assignedTabRef,
      isDefault: false,
      createdAt: Date.now(),
      data: payload,
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(updated));
    } catch {}

    setNewPresetName("");
    setNewPresetDesc("");
    showStatus(`Saved "${newPreset.name}" to your preset library!`);
  };

  // 2. APPLY PRESET
  const handleApplyPreset = (preset: UniversalPresetItem) => {
    if (preset.category === "home") {
      if (preset.data) {
        localStorage.setItem("markly_home_widgets", JSON.stringify(preset.data));
      } else {
        localStorage.removeItem("markly_home_widgets");
      }
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      showStatus(`Applied Homepage layout: "${preset.name}"!`);
    } else if (preset.category === "folder") {
      if (preset.data) {
        if (folderScope === "custom" && currentFolderId) {
          localStorage.setItem(`markly_folder_tabs_${currentFolderId}`, JSON.stringify(preset.data));
          showStatus(`Applied "${preset.name}" to current folder only!`);
        } else {
          localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(preset.data));
          showStatus(`Applied "${preset.name}" Universally to all folders!`);
        }
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated"));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      } else {
        if (folderScope === "custom" && currentFolderId) {
          localStorage.removeItem(`markly_folder_tabs_${currentFolderId}`);
        } else {
          localStorage.removeItem("markly_universal_folder_tabs");
        }
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated"));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Restored standard folder defaults!`);
      }
    } else if (preset.category === "visuals") {
      if (preset.data?.hiddenStudioUnits) {
        localStorage.setItem("markly_hidden_visual_studio_units", JSON.stringify(preset.data.hiddenStudioUnits));
      } else {
        localStorage.removeItem("markly_hidden_visual_studio_units");
      }
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      showStatus(`Applied Visuals studio setup: "${preset.name}"!`);
    } else if (preset.category === "search") {
      if (preset.data?.query) {
        onRunSearch?.(preset.data.query);
        onOpenChange(false);
      }
    } else if (preset.category === "box") {
      handleInsertBoxPreset(preset, boxTargetPlacement);
    }
  };

  // 3. INSERT INDIVIDUAL BOX PRESET INTO TARGET DESTINATION
  const handleInsertBoxPreset = (preset: UniversalPresetItem, target: string) => {
    const boxData = preset.data || {};
    const boxId = boxData.id || `box_${Date.now()}`;
    const boxTitle = preset.name;
    const category = boxData.category || "chart_studio";
    const kind = boxData.kind || category;
    const colSpan = boxData.colSpan || 12;
    const rowSpan = boxData.rowSpan || 2;

    if (target === "home") {
      try {
        const stored = localStorage.getItem("markly_home_widgets");
        let list = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];
        list = list.filter((w: any) => w.id !== boxId);
        list.unshift({
          id: boxId,
          label: boxTitle,
          visible: true,
          kind: boxId.startsWith("studio_") ? "studio" : "custom",
          category: category,
          colSpan: colSpan,
          rowSpan: rowSpan,
          siteConfig: boxData.siteConfig,
          plotConfig: boxData.plotConfig,
          chartConfig: boxData.chartConfig,
          intelConfig: boxData.intelConfig,
        });
        localStorage.setItem("markly_home_widgets", JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
        showStatus(`Placed "${boxTitle}" onto Dashboard Home!`);
      } catch (e) {
        console.error(e);
      }
    } else if (target === "universal_folders") {
      try {
        const raw = localStorage.getItem("markly_universal_folder_tabs");
        let tabs = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(tabs) || tabs.length === 0) {
          tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
        }
        tabs[0].visuals = (tabs[0].visuals || []).filter((v: any) => v.id !== boxId);
        tabs[0].visuals.unshift({
          id: boxId,
          title: boxTitle,
          kind: kind,
          category: category,
          colSpan: colSpan,
          rowSpan: rowSpan,
          siteConfig: boxData.siteConfig,
          plotConfig: boxData.plotConfig,
          chartConfig: boxData.chartConfig,
          intelConfig: boxData.intelConfig,
        });
        localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(tabs));
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated"));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Placed "${boxTitle}" into Universal Folder Tabs!`);
      } catch (e) {
        console.error(e);
      }
    } else if (target === "current_folder" && currentFolderId) {
      try {
        const key = `markly_folder_tabs_${currentFolderId}`;
        const raw = localStorage.getItem(key);
        let tabs = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(tabs) || tabs.length === 0) {
          tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
        }
        tabs[0].visuals = (tabs[0].visuals || []).filter((v: any) => v.id !== boxId);
        tabs[0].visuals.unshift({
          id: boxId,
          title: boxTitle,
          kind: kind,
          category: category,
          colSpan: colSpan,
          rowSpan: rowSpan,
          siteConfig: boxData.siteConfig,
          plotConfig: boxData.plotConfig,
          chartConfig: boxData.chartConfig,
          intelConfig: boxData.intelConfig,
        });
        localStorage.setItem(key, JSON.stringify(tabs));
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated"));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Placed "${boxTitle}" into current folder tabs!`);
      } catch (e) {
        console.error(e);
      }
    } else if (target === "visuals") {
      try {
        const hidden = localStorage.getItem("markly_hidden_visual_studio_units");
        if (hidden) {
          const parsed = JSON.parse(hidden);
          const filtered = parsed.filter((id: string) => id !== boxId);
          localStorage.setItem("markly_hidden_visual_studio_units", JSON.stringify(filtered));
          window.dispatchEvent(new CustomEvent("markly-unhide-studio-unit", { detail: { id: boxId } }));
        }
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Activated "${boxTitle}" in Visuals Studio!`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 4. SET AS CUSTOM DEFAULT
  const handleSetAsDefault = (preset: UniversalPresetItem) => {
    const updated = savedPresets.map((p) => {
      if (p.category === preset.category) {
        return { ...p, isDefault: p.id === preset.id };
      }
      return p;
    });
    setSavedPresets(updated);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(updated));
      if (preset.category === "home" && preset.data) {
        localStorage.setItem("markly_homepage_custom_default_layout", JSON.stringify(preset.data));
      } else if (preset.category === "folder" && preset.data) {
        localStorage.setItem("markly_folder_custom_default_tabs", JSON.stringify(preset.data));
      }
    } catch {}
    showStatus(`"${preset.name}" is now your default ${preset.category} layout!`);
  };

  // 5. DELETE PRESET (Deletable anywhere)
  const handleDeletePreset = (id: string, name: string) => {
    const updated = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(updated);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(updated));
    } catch {}
    showStatus(`Deleted preset: "${name}".`);
  };

  const currentTabPresets = savedPresets.filter((p) => p.category === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl flex flex-col max-w-[96vw] max-h-[94vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        {/* Header */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border bg-secondary/30 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-2xs">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Universal Presets &amp; Layout Sets</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                    {savedPresets.length} presets
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Save, place, and restore layouts and individual boxes across Home, Folders, Visuals, and Search.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasCustomSize && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="h-7 px-2 rounded-lg border border-border/80 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                  title="Reset dialog dimensions to standard size"
                >
                  Reset Size
                </button>
              )}
              {statusMsg && (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{statusMsg}</span>
                </span>
              )}
            </div>
          </div>

          {/* Navigation Category Tabs (5 Universal Categories) */}
          <div className="flex items-center gap-1 mt-4 p-1 bg-secondary/60 rounded-xl border border-border/60 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                activeTab === "home"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="h-3.5 w-3.5 text-blue-500" />
              <span>Homepage</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("folder")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                activeTab === "folder"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Folder className="h-3.5 w-3.5 text-emerald-500" />
              <span>Folder Tabs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("box")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                activeTab === "box"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Box className="h-3.5 w-3.5 text-indigo-500" />
              <span>Saved Visual Boxes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visuals")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                activeTab === "visuals"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
              <span>Visual Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                activeTab === "search"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5 text-amber-500" />
              <span>Search</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Scope Selector for Folder Presets */}
          {activeTab === "folder" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-secondary/40 rounded-xl border border-border text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-emerald-500" />
                <span>Target Folder Scope:</span>
              </span>
              <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setFolderScope("universal")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    folderScope === "universal"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Universal (All Folders Synced)
                </button>
                <button
                  type="button"
                  onClick={() => setFolderScope("custom")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    folderScope === "custom"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom: {folderName || "Current Folder"}
                </button>
              </div>
            </div>
          )}

          {/* Target Placement Selector for Individual Boxes */}
          {activeTab === "box" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-indigo-500" />
                <span>Place Box Into:</span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={boxTargetPlacement}
                  onChange={(e) => setBoxTargetPlacement(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium cursor-pointer"
                >
                  <option value="home">Dashboard Home</option>
                  <option value="universal_folders">Universal (All Folders)</option>
                  {currentFolderId && (
                    <option value="current_folder">Current Folder ({folderName || "Selected"})</option>
                  )}
                  <option value="visuals">Visuals Studio Page</option>
                </select>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Click Insert on any box below
                </span>
              </div>
            </div>
          )}

          {/* Section A: Create New Preset From Current State */}
          <div className="p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Save Current {activeTab.toUpperCase()} Configuration as Preset</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Captures live dimensions, order, and filters
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={`Preset Name (e.g. My Custom ${activeTab})...`}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="sm:col-span-4">
                <Input
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  placeholder="Optional note / tag..."
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  size="sm"
                  onClick={handleSaveCurrentAsPreset}
                  disabled={!newPresetName.trim()}
                  className="h-8 w-full text-xs cursor-pointer gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Save</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Section B: Preset Cards List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Available {activeTab.toUpperCase()} Presets ({currentTabPresets.length})
              </span>
              <span>{activeTab === "box" ? "Place into any page or tab" : "Click Apply to switch configuration"}</span>
            </div>

            {currentTabPresets.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No presets found for this category yet. Save your current layout above!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {currentTabPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-2xs group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Tab Reference Tag if available */}
                        {preset.tabRef && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                              preset.tabRef === "T1"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                : preset.tabRef === "T2"
                                ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30"
                                : preset.tabRef === "T3"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                : "bg-purple-500/10 text-purple-500 border-purple-500/30"
                            }`}
                          >
                            {preset.tabRef}
                          </span>
                        )}
                        <span className="text-xs font-bold text-foreground truncate">
                          {preset.name}
                        </span>
                        {preset.isDefault && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold flex items-center gap-1">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            Default
                          </span>
                        )}
                      </div>
                      {preset.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {preset.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {activeTab === "box" ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleInsertBoxPreset(preset, boxTargetPlacement)}
                          className="h-7 px-3 text-xs cursor-pointer gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                        >
                          <Send className="h-3 w-3" />
                          <span>Insert Box</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApplyPreset(preset)}
                          className="h-7 px-3 text-xs cursor-pointer gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                        >
                          <ArrowRight className="h-3 w-3" />
                          <span>Apply</span>
                        </Button>
                      )}

                      {activeTab !== "box" && activeTab !== "search" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetAsDefault(preset)}
                          disabled={preset.isDefault}
                          title="Set as Custom Default"
                          className="h-7 px-2 text-xs cursor-pointer gap-1"
                        >
                          <Star className={`h-3 w-3 ${preset.isDefault ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                          <span className="hidden sm:inline">Set Default</span>
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id, preset.name)}
                        title="Delete preset"
                        className="h-7 w-7 rounded-lg border border-border/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
