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
} from "lucide-react";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";

export type PresetCategory = "home" | "folder" | "visuals" | "search";

export interface UniversalPresetItem {
  id: string;
  name: string;
  description?: string;
  category: PresetCategory;
  isDefault?: boolean;
  createdAt: number;
  data: any;
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

export interface UniversalPresetHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCategory?: PresetCategory;
  currentFolderId?: string | null;
  onRunSearch?: (query: string) => void;
}

export function UniversalPresetHub({
  open,
  onOpenChange,
  activeCategory: initialCategory = "home",
  currentFolderId,
  onRunSearch,
}: UniversalPresetHubProps) {
  const [activeTab, setActiveTab] = React.useState<PresetCategory>(initialCategory);
  const [newPresetName, setNewPresetName] = React.useState("");
  const [newPresetDesc, setNewPresetDesc] = React.useState("");
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

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
        if (Array.isArray(parsed)) {
          setSavedPresets(parsed);
          return;
        }
      }
    } catch {}
    // Seed with defaults
    const combined = [...DEFAULT_HOME_PRESETS, ...DEFAULT_FOLDER_PRESETS];
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

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // 1. SAVE CURRENT SETUP AS A PRESET
  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;

    let payload: any = null;

    if (activeTab === "home") {
      try {
        const stored = localStorage.getItem("markly_home_widgets");
        payload = stored ? JSON.parse(stored) : null;
      } catch {}
    } else if (activeTab === "folder") {
      try {
        const key = currentFolderId ? `markly_folder_tabs_${currentFolderId}` : "markly_universal_folder_tabs";
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
    }

    const newPreset: UniversalPresetItem = {
      id: `preset_${activeTab}_${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || undefined,
      category: activeTab,
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
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      } else {
        localStorage.removeItem("markly_home_widgets");
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      }
      showStatus(`Applied Homepage layout: "${preset.name}"!`);
    } else if (preset.category === "folder") {
      if (preset.data) {
        if (currentFolderId) {
          localStorage.setItem(`markly_folder_tabs_${currentFolderId}`, JSON.stringify(preset.data));
        }
        localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(preset.data));
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated"));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
      showStatus(`Applied Folder Tabs preset: "${preset.name}"!`);
    } else if (preset.category === "visuals") {
      if (preset.data?.hiddenStudioUnits) {
        localStorage.setItem("markly_hidden_visual_studio_units", JSON.stringify(preset.data.hiddenStudioUnits));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
      showStatus(`Applied Visuals page layout: "${preset.name}"!`);
    } else if (preset.category === "search") {
      if (preset.data?.query) {
        onRunSearch?.(preset.data.query);
        onOpenChange(false);
      }
    }
  };

  // 3. SET AS CUSTOM DEFAULT
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

  // 4. DELETE PRESET (Deletable anywhere)
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl flex flex-col max-h-[88vh]">
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
                    {savedPresets.length} saved
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Save, switch, and customize layout arrangements for Homepage, Folders, Visuals, and Search.
                </DialogDescription>
              </div>
            </div>

            {statusMsg && (
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{statusMsg}</span>
              </span>
            )}
          </div>

          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-1 mt-4 p-1 bg-secondary/60 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === "home"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="h-3.5 w-3.5 text-blue-500" />
              <span>Homepage Layouts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("folder")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === "folder"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Folder className="h-3.5 w-3.5 text-emerald-500" />
              <span>Folder Tab Sets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visuals")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === "visuals"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
              <span>Visual Studio Sets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === "search"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5 text-amber-500" />
              <span>Saved Searches</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Section A: Create New Preset From Current State */}
          <div className="p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Save Current {activeTab.toUpperCase()} Setup as New Preset</span>
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
                Available {activeTab.toUpperCase()} Layout Presets ({currentTabPresets.length})
              </span>
              <span>Click Apply to switch configuration instantly</span>
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
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApplyPreset(preset)}
                        className="h-7 px-3 text-xs cursor-pointer gap-1 bg-primary hover:bg-primary/90"
                      >
                        <ArrowRight className="h-3 w-3" />
                        <span>Apply</span>
                      </Button>

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
