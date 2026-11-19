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
  Pencil,
  X,
  Clock,
} from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";
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
  updatedAt?: number;
  sourceContext?: {
    surface?: string;
    folderName?: string;
    tabName?: string;
    folderScope?: string;
    captureMode?: "all_tabs" | "active_tab" | string;
  };
  data: any;
}

function formatPresetTimestamp(timestamp?: number): string {
  if (!timestamp) return "Default template";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
  {
    id: "preset_home_executive",
    name: "Executive Command Bento (Curated)",
    description: "Curated high-utility executive bento: Velocity momentum, ecosystems, starred sites, recent visits, folders, tags, and Observable studio.",
    category: "home",
    createdAt: 1700000003000,
    data: [
      { id: "analytics_velocity", visible: true, span: "2", colSpan: 12, rowSpan: 1 },
      { id: "analytics_domains", visible: true, span: "1", colSpan: 4, rowSpan: 1 },
      { id: "favorites", visible: true, span: "1", colSpan: 4, rowSpan: 1 },
      { id: "recent", visible: true, span: "1", colSpan: 4, rowSpan: 1 },
      { id: "folders", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "tags", visible: true, span: "1", colSpan: 6, rowSpan: 1 },
      { id: "studio_observable_plot", label: "Observable Plot Layered Graphics Studio (22 Variations)", visible: true, span: "2", colSpan: 12, rowSpan: 2, kind: "studio", category: "plot_studio" },
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
    id: "preset_folder_curated_suite",
    name: "Research & Intelligence Suite (Curated Universal)",
    description: "Optimal multi-tab space utilization: 1) Sites Matrix, 2) Knowledge Graph & Spectrum, 3) Observable Graphics & Classic Charts.",
    category: "folder",
    createdAt: 1700000001000,
    data: [
      {
        id: "tab_overview",
        label: "Overview & Reference Matrix",
        visuals: [
          { id: "studio_sites_matrix", title: "Sites Matrix Reference Studio", kind: "sites_studio", colSpan: 12, rowSpan: 2 },
          { id: "sites_quick", title: "Quick Access Sites", kind: "sites", siteFilter: "all", colSpan: 6, rowSpan: 1 },
          { id: "sites_starred", title: "Starred Folder Sites", kind: "sites", siteFilter: "favorites", colSpan: 6, rowSpan: 1 },
        ],
      },
      {
        id: "tab_intelligence",
        label: "Deep Intelligence & Graph",
        visuals: [
          { id: "viz_graph", title: "Knowledge Graph Master Suite", kind: "graph", colSpan: 12, rowSpan: 2, intelConfig: { type: "graph", graphDepth: 2 } },
          { id: "viz_spectrum", title: "Engagement Spectrum", kind: "engagement", colSpan: 6, rowSpan: 1 },
          { id: "viz_tags", title: "Topic Frequency & Distribution", kind: "tags", colSpan: 6, rowSpan: 1 },
        ],
      },
      {
        id: "tab_visuals",
        label: "Observable Studio & Charts",
        visuals: [
          { id: "studio_observable_plot", title: "Observable Plot Layered Graphics Studio (22 Variations)", kind: "plot_studio", colSpan: 12, rowSpan: 2 },
          { id: "studio_classic_charts", title: "Classic Charts Layered Studio (18 Variations)", kind: "chart_studio", colSpan: 12, rowSpan: 2 },
        ],
      },
    ],
  },
  {
    id: "preset_folder_graph_heavy",
    name: "Knowledge Graph Matrix",
    description: "Large force-directed Obsidian graph with depth 3 and tag cloud.",
    category: "folder",
    createdAt: 1700000002000,
    data: [
      { id: "viz_graph", title: "Folder Knowledge Graph", kind: "graph", colSpan: 12, rowSpan: 2 },
      { id: "viz_tags", title: "Tag Cloud Spectrum", kind: "tags", colSpan: 6, rowSpan: 1 },
      { id: "viz_sites", title: "Sites in Collection", kind: "sites", colSpan: 6, rowSpan: 1 },
    ],
  },
];

// Built-in starter presets for Search Queries
const DEFAULT_SEARCH_PRESETS: UniversalPresetItem[] = [
  {
    id: "preset_search_starred",
    name: "Starred Resources & Repositories",
    description: "Filter all favorite bookmarks and starred tools across workspace.",
    category: "search",
    createdAt: 1700000000000,
    data: { query: "is:favorite" },
  },
  {
    id: "preset_search_docs",
    name: "Developer Documentation & Specs",
    description: "Filter all bookmarks tagged with docs, api, or reference.",
    category: "search",
    createdAt: 1700000001000,
    data: { query: "tag:docs" },
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
  {
    id: "preset_box_t5_tree",
    name: "Folder Hierarchy & Collections Tree",
    description: "T5 Universal resizable collections tree: full hierarchy, site counts, search, and navigation.",
    category: "box",
    tabRef: "T1",
    createdAt: 1700000004000,
    data: {
      id: "studio_folder_tree",
      title: "Folder Hierarchy & Collections Tree",
      category: "tree_studio",
      kind: "tree_studio",
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
  folderTabs?: any[];
  activeTabId?: string;
  isFolderCustomScope?: boolean;
  onApplyFolderTabs?: (tabs: any[], appliedScope?: "universal" | "custom", targetTabId?: string) => void;
  onRunSearch?: (query: string) => void;
}

export function UniversalPresetHub({
  open,
  onOpenChange,
  activeCategory: initialCategory = "home",
  currentFolderId,
  folderName,
  folderTabs,
  activeTabId,
  isFolderCustomScope = false,
  onApplyFolderTabs,
  onRunSearch,
}: UniversalPresetHubProps) {
  const [activeTab, setActiveTab] = React.useState<PresetCategory>(initialCategory);
  const [newPresetName, setNewPresetName] = React.useState("");
  const [newPresetDesc, setNewPresetDesc] = React.useState("");
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  // Preset In-Place Edit State (Rename / Edit Description)
  const [editingPresetId, setEditingPresetId] = React.useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = React.useState<string>("");
  const [editingPresetDesc, setEditingPresetDesc] = React.useState<string>("");

  // Folder preset application scope (Universal for all folders vs Custom for this folder)
  const [folderScope, setFolderScope] = React.useState<"universal" | "custom">(
    isFolderCustomScope ? "custom" : "universal"
  );
  const [folderSaveMode, setFolderSaveMode] = React.useState<"all_tabs" | "active_tab">("all_tabs");
  const [folderApplyMode, setFolderApplyMode] = React.useState<"all_tabs" | "active_tab">("all_tabs");
  const [targetFolderTabId, setTargetFolderTabId] = React.useState<string>(activeTabId || "tab_default");
  const [searchQueryInput, setSearchQueryInput] = React.useState<string>("");
  const [sourceContextLabel, setSourceContextLabel] = React.useState<string | null>(null);
  const [pendingPresetData, setPendingPresetData] = React.useState<any>(null);

  // Box preset destination selector
  const [boxTargetPlacement, setBoxTargetPlacement] = React.useState<string>("home");

  // Available folder tabs computed dynamically from props or local storage fallback
  const availableTargetTabs = React.useMemo(() => {
    if (folderTabs && folderTabs.length > 0) return folderTabs;
    if (typeof window !== "undefined") {
      try {
        const key =
          (folderScope === "custom" || boxTargetPlacement === "current_folder") && currentFolderId
            ? `markly_folder_tabs_${currentFolderId}`
            : "markly_universal_folder_tabs";
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [{ id: "tab_default", label: "Overview", visuals: [] }];
  }, [folderTabs, folderScope, boxTargetPlacement, currentFolderId]);

  const getBoxInsertLabel = () => {
    if (boxTargetPlacement === "home") return "Insert to Home";
    if (boxTargetPlacement === "visuals") return "Insert to Visuals";
    if (targetFolderTabId === "__NEW_TAB__") return "+ Insert to New Tab";
    const found = availableTargetTabs.find((t: any) => t.id === targetFolderTabId);
    return `Insert to Tab: ${found?.label || "Overview"}`;
  };

  // Resizable Modal Hook with Cross-Session Persistence
  const {
    format,
    toggleFormat,
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

  // Sync tab & folder scope when modal opens
  React.useEffect(() => {
    if (open) {
      if (initialCategory) setActiveTab(initialCategory);
      setFolderScope(isFolderCustomScope ? "custom" : "universal");
      if (activeTabId) setTargetFolderTabId(activeTabId);
    }
  }, [open, initialCategory, activeTabId, isFolderCustomScope]);

  // Listen for open save preset dialog event from any button in the app
  React.useEffect(() => {
    const handleOpenSaveDialog = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      onOpenChange(true);
      if (detail.category) setActiveTab(detail.category);
      if (detail.name) setNewPresetName(detail.name);
      if (detail.description) setNewPresetDesc(detail.description);
      if (detail.sourceLocation) setSourceContextLabel(detail.sourceLocation);
      if (detail.data) setPendingPresetData(detail.data);
      if (detail.folderScope) setFolderScope(detail.folderScope);
      if (detail.folderSaveMode) setFolderSaveMode(detail.folderSaveMode);
      if (detail.activeTabId) setTargetFolderTabId(detail.activeTabId);
    };
    window.addEventListener("markly-open-save-preset-dialog", handleOpenSaveDialog);
    return () => window.removeEventListener("markly-open-save-preset-dialog", handleOpenSaveDialog);
  }, [onOpenChange]);

  // Load custom saved presets from localStorage
  const [savedPresets, setSavedPresets] = React.useState<UniversalPresetItem[]>([]);

  const loadPresets = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const allBuiltIns = [
      ...DEFAULT_HOME_PRESETS,
      ...DEFAULT_FOLDER_PRESETS,
      ...DEFAULT_BOX_PRESETS,
      ...DEFAULT_SEARCH_PRESETS,
    ];
    try {
      const stored = localStorage.getItem("markly_universal_presets_hub");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with built-in defaults if missing
          const existingIds = new Set(parsed.map((p: any) => p.id));
          const missing = allBuiltIns.filter((b) => !existingIds.has(b.id));
          if (missing.length > 0) {
            const merged = [...parsed, ...missing];
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
    setSavedPresets(allBuiltIns);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(allBuiltIns));
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

  // Preset In-Place Edit Actions
  const handleStartEditPreset = (preset: UniversalPresetItem) => {
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.name);
    setEditingPresetDesc(preset.description || "");
  };

  const handleSaveEditPreset = () => {
    if (!editingPresetId || !editingPresetName.trim()) return;
    const updated = savedPresets.map((p) => {
      if (p.id === editingPresetId) {
        return {
          ...p,
          name: editingPresetName.trim(),
          description: editingPresetDesc.trim() || undefined,
          updatedAt: Date.now(),
        };
      }
      return p;
    });
    setSavedPresets(updated);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new CustomEvent("markly-preset-hub-updated"));
    showStatus(`Updated preset "${editingPresetName.trim()}"!`);
    setEditingPresetId(null);
  };

  const handleCancelEditPreset = () => {
    setEditingPresetId(null);
    setEditingPresetName("");
    setEditingPresetDesc("");
  };

  // 1. SAVE CURRENT SETUP AS A PRESET
  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;

    let payload: any = pendingPresetData;
    let assignedTabRef: "T1" | "T2" | "T3" | "T4" | undefined = undefined;

    if (activeTab === "folder") {
      let baseTabs = pendingPresetData;
      if (!baseTabs || !Array.isArray(baseTabs)) {
        if (folderTabs && folderTabs.length > 0) {
          baseTabs = folderTabs;
        } else {
          const key =
            folderScope === "custom" && currentFolderId
              ? `markly_folder_tabs_${currentFolderId}`
              : "markly_universal_folder_tabs";
          const stored = localStorage.getItem(key);
          baseTabs = stored ? JSON.parse(stored) : null;
        }
      }
      if (folderSaveMode === "active_tab") {
        const active = (baseTabs || []).find((t: any) => t.id === activeTabId) || (baseTabs || [])[0];
        payload = active ? [active] : baseTabs;
      } else {
        payload = baseTabs;
      }
    } else if (!payload) {
      if (activeTab === "home") {
        try {
          const stored = localStorage.getItem("markly_home_widgets");
          payload = stored ? JSON.parse(stored) : null;
        } catch {}
      } else if (activeTab === "visuals") {
        try {
          const hidden = localStorage.getItem("markly_hidden_visual_studio_units");
          payload = { hiddenStudioUnits: hidden ? JSON.parse(hidden) : [] };
        } catch {}
      } else if (activeTab === "search") {
        const input = document.getElementById("markly-home-search-input") as HTMLInputElement;
        payload = { query: searchQueryInput.trim() || input?.value || newPresetName.trim() };
      } else if (activeTab === "box") {
        payload = {
          id: `box_${Date.now()}`,
          title: newPresetName.trim(),
          category: "chart_studio",
          colSpan: 12,
          rowSpan: 2,
        };
        assignedTabRef = "T3";
      }
    }

    const newPreset: UniversalPresetItem = {
      id: `preset_${activeTab}_${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || (sourceContextLabel ? `Captured from: ${sourceContextLabel}` : undefined),
      category: activeTab,
      tabRef: assignedTabRef || (activeTab === "box" ? "T3" : undefined),
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceContext: {
        surface: activeTab,
        folderName: folderName,
        tabName: folderTabs?.find((t) => t.id === activeTabId)?.label,
        folderScope: activeTab === "folder" ? folderScope : undefined,
        captureMode: activeTab === "folder" ? folderSaveMode : undefined,
      },
      data: payload,
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    try {
      localStorage.setItem("markly_universal_presets_hub", JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new CustomEvent("markly-preset-hub-updated"));

    setNewPresetName("");
    setNewPresetDesc("");
    setPendingPresetData(null);
    setSourceContextLabel(null);
    setSearchQueryInput("");
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
        let nextTabs: any[];
        let activeTargetId: string | undefined = undefined;

        let baseTabs = folderTabs && folderTabs.length > 0 ? folderTabs : availableTargetTabs;
        if (!baseTabs || !Array.isArray(baseTabs) || baseTabs.length === 0) {
          baseTabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
        }

        if (folderApplyMode === "active_tab") {
          const currentActive = activeTabId || baseTabs[0]?.id || "tab_default";
          activeTargetId = currentActive;
          const presetVisuals = Array.isArray(preset.data)
            ? (preset.data[0]?.visuals || [])
            : (preset.data.visuals || []);
          nextTabs = baseTabs.map((t: any) =>
            t.id === currentActive
              ? { ...t, visuals: presetVisuals }
              : t
          );
        } else {
          nextTabs = Array.isArray(preset.data)
            ? preset.data
            : [{ id: "tab_default", label: "Overview", visuals: preset.data.visuals || [] }];
          activeTargetId = nextTabs[0]?.id || "tab_default";
        }

        if (folderScope === "custom" && currentFolderId) {
          localStorage.setItem(`markly_folder_tabs_${currentFolderId}`, JSON.stringify(nextTabs));
          onApplyFolderTabs?.(nextTabs, "custom", activeTargetId);
          showStatus(`Applied "${preset.name}" to ${folderApplyMode === "active_tab" ? "active tab" : "all tabs"} (${folderName || "Folder"})!`);
        } else {
          localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(nextTabs));
          onApplyFolderTabs?.(nextTabs, "universal", activeTargetId);
          showStatus(`Applied "${preset.name}" to Universal ${folderApplyMode === "active_tab" ? "active tab" : "all tabs"}!`);
        }
        if (activeTargetId) {
          window.dispatchEvent(new CustomEvent("markly-folder-tab-switched", { detail: { tabId: activeTargetId } }));
        }
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: nextTabs }));
        window.dispatchEvent(new CustomEvent("markly-folder-tabs-updated", { detail: { folderId: currentFolderId, tabs: nextTabs, scope: folderScope } }));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      } else {
        // DEFAULT PRESET (data === null)
        const defaultTabs = [
          {
            id: "tab_default",
            label: "Overview",
            visuals: [
              { id: "studio_observable_plot", title: "Observable Plot Layered Graphics Studio (22 Variations)", kind: "plot_studio", colSpan: 12, rowSpan: 2 },
              { id: "studio_intel_systems", title: "Workspace Intelligence Systems Studio (7 Variations)", kind: "intel_studio", colSpan: 12, rowSpan: 2 },
              { id: "studio_classic_charts", title: "Classic Charts Layered Studio (18 Variations)", kind: "chart_studio", colSpan: 12, rowSpan: 2 },
              { id: "studio_sites_matrix", title: "Sites Matrix Reference Studio", kind: "sites_studio", colSpan: 12, rowSpan: 2 },
            ],
          },
        ];
        if (folderScope === "custom" && currentFolderId) {
          localStorage.removeItem(`markly_folder_tabs_${currentFolderId}`);
        } else {
          localStorage.removeItem("markly_universal_folder_tabs");
        }
        onApplyFolderTabs?.(defaultTabs, folderScope, "tab_default");
        window.dispatchEvent(new CustomEvent("markly-folder-tab-switched", { detail: { tabId: "tab_default" } }));
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: defaultTabs }));
        window.dispatchEvent(new CustomEvent("markly-folder-tabs-updated", { detail: { folderId: currentFolderId, tabs: defaultTabs, scope: folderScope } }));
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
        window.dispatchEvent(new CustomEvent("markly-execute-search", { detail: { query: preset.data.query } }));
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
        let tabs = raw ? JSON.parse(raw) : (folderTabs && folderTabs.length > 0 ? folderTabs : availableTargetTabs);
        if (!Array.isArray(tabs) || tabs.length === 0) {
          tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
        }
        let targetTab: any;
        if (targetFolderTabId === "__NEW_TAB__") {
          targetTab = {
            id: `tab_${Date.now()}`,
            label: boxTitle.slice(0, 20),
            visuals: [],
          };
          tabs.push(targetTab);
        } else {
          targetTab = tabs.find((t: any) => t.id === targetFolderTabId) || tabs[0];
        }
        targetTab.visuals = (targetTab.visuals || []).filter((v: any) => v.id !== boxId);
        targetTab.visuals.unshift({
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
        onApplyFolderTabs?.(tabs, "universal", targetTab.id);
        window.dispatchEvent(new CustomEvent("markly-folder-tab-switched", { detail: { tabId: targetTab.id } }));
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: tabs }));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Placed "${boxTitle}" into Universal Folder > "${targetTab.label}" tab!`);
      } catch (e) {
        console.error(e);
      }
    } else if (target === "current_folder" && currentFolderId) {
      try {
        const key = `markly_folder_tabs_${currentFolderId}`;
        const raw = localStorage.getItem(key);
        let tabs = raw ? JSON.parse(raw) : (folderTabs && folderTabs.length > 0 ? folderTabs : availableTargetTabs);
        if (!Array.isArray(tabs) || tabs.length === 0) {
          tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
        }
        let targetTab: any;
        if (targetFolderTabId === "__NEW_TAB__") {
          targetTab = {
            id: `tab_${Date.now()}`,
            label: boxTitle.slice(0, 20),
            visuals: [],
          };
          tabs.push(targetTab);
        } else {
          targetTab = tabs.find((t: any) => t.id === targetFolderTabId) || tabs[0];
        }
        targetTab.visuals = (targetTab.visuals || []).filter((v: any) => v.id !== boxId);
        targetTab.visuals.unshift({
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
        onApplyFolderTabs?.(tabs, "custom", targetTab.id);
        window.dispatchEvent(new CustomEvent("markly-folder-tab-switched", { detail: { tabId: targetTab.id } }));
        window.dispatchEvent(new CustomEvent("markly-folder-tabs-updated", { detail: { folderId: currentFolderId, tabs: tabs, scope: "custom" } }));
        window.dispatchEvent(new CustomEvent("markly-universal-tabs-updated", { detail: tabs }));
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Placed "${boxTitle}" into ${folderName || "Folder"} > "${targetTab.label}" tab!`);
      } catch (e) {
        console.error(e);
      }
    } else if (target === "visuals") {
      try {
        const hidden = localStorage.getItem("markly_hidden_visual_studio_units");
        if (hidden) {
          const list = JSON.parse(hidden).filter((i: string) => i !== boxId);
          localStorage.setItem("markly_hidden_visual_studio_units", JSON.stringify(list));
        }
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        showStatus(`Placed "${boxTitle}" onto Visuals Studio page!`);
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
              <ModalFormatControls
                format={format}
                onToggleFormat={toggleFormat}
                hasCustomSize={hasCustomSize}
                onRestoreDefaults={handleRestoreDefaults}
              />
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2.5 bg-secondary/40 rounded-xl border border-border text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Scope:</span>
                </span>
                <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setFolderScope("universal")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                      folderScope === "universal"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Universal (All Folders)
                  </button>
                  {currentFolderId && (
                    <button
                      type="button"
                      onClick={() => setFolderScope("custom")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                        folderScope === "custom"
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Custom: {folderName || "Current Folder"}
                    </button>
                  )}
                </div>
              </div>

              {/* Apply Mode: All Tabs vs Single Active Tab */}
              {folderTabs && folderTabs.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">Apply To:</span>
                  <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setFolderApplyMode("all_tabs")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                        folderApplyMode === "all_tabs"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Tabs ({folderTabs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFolderApplyMode("active_tab")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                        folderApplyMode === "active_tab"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Active Tab ({folderTabs.find((t) => t.id === activeTabId)?.label || "Current"})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Target Placement Selector for Individual Boxes */}
          {activeTab === "box" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-indigo-500" />
                <span>Place Box Into:</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
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

                {(boxTargetPlacement === "universal_folders" || boxTargetPlacement === "current_folder") && (
                  <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-lg border border-border">
                    <span className="text-[11px] text-muted-foreground font-semibold">Tab:</span>
                    <select
                      value={targetFolderTabId}
                      onChange={(e) => setTargetFolderTabId(e.target.value)}
                      className="h-6 px-1.5 rounded border border-border/60 bg-secondary/50 text-foreground text-xs cursor-pointer font-medium"
                    >
                      {availableTargetTabs.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.label || t.id}
                        </option>
                      ))}
                      <option value="__NEW_TAB__">+ Create New Tab with Box</option>
                    </select>
                  </div>
                )}

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

            {sourceContextLabel && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-mono text-primary">
                <span className="text-muted-foreground">Captured from:</span>
                <span className="font-semibold">{sourceContextLabel}</span>
              </div>
            )}

            {activeTab === "folder" && ((folderTabs && folderTabs.length > 0) || (Array.isArray(pendingPresetData) && pendingPresetData.length > 0)) && (
              <div className="flex items-center gap-3 text-xs bg-secondary/30 p-2 rounded-lg border border-border/40">
                <span className="text-muted-foreground font-semibold">Save Scope:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="folderSaveMode"
                    checked={folderSaveMode === "all_tabs"}
                    onChange={() => setFolderSaveMode("all_tabs")}
                    className="h-3.5 w-3.5 text-primary accent-primary cursor-pointer"
                  />
                  <span>All Tabs ({folderTabs?.length || (Array.isArray(pendingPresetData) ? pendingPresetData.length : 1)})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="folderSaveMode"
                    checked={folderSaveMode === "active_tab"}
                    onChange={() => setFolderSaveMode("active_tab")}
                    className="h-3.5 w-3.5 text-primary accent-primary cursor-pointer"
                  />
                  <span>Active Tab Only ({folderTabs?.find((t) => t.id === activeTabId)?.label || "Active Tab"})</span>
                </label>
              </div>
            )}

            {activeTab === "search" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Search Query to Save</label>
                <input
                  type="text"
                  value={searchQueryInput}
                  onChange={(e) => setSearchQueryInput(e.target.value)}
                  placeholder="e.g. tag:docs is:favorite or github"
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-1.5 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

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
                    {editingPresetId === preset.id ? (
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            placeholder="Preset Name..."
                            className="h-7 text-xs bg-background flex-1"
                            autoFocus
                          />
                        </div>
                        <Input
                          value={editingPresetDesc}
                          onChange={(e) => setEditingPresetDesc(e.target.value)}
                          placeholder="Optional description / note..."
                          className="h-7 text-xs bg-background"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={handleSaveEditPreset}
                            disabled={!editingPresetName.trim()}
                            className="h-6 px-2.5 text-xs cursor-pointer gap-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save Changes</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEditPreset}
                            className="h-6 px-2 text-xs cursor-pointer"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                            {/* Metadata Badges */}
                            {preset.sourceContext?.captureMode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60">
                                {preset.sourceContext.captureMode === "active_tab" ? "Single Tab" : "All Tabs"}
                              </span>
                            )}
                            {preset.sourceContext?.folderScope && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60 capitalize">
                                {preset.sourceContext.folderScope}
                              </span>
                            )}
                            {preset.category === "folder" && Array.isArray(preset.data) && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                                {preset.data.length} {preset.data.length === 1 ? "Tab" : "Tabs"}
                              </span>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {preset.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/75 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Last edited: {formatPresetTimestamp(preset.updatedAt || preset.createdAt)}
                            </span>
                            {preset.sourceContext?.folderName && (
                              <span>• Source: {preset.sourceContext.folderName}</span>
                            )}
                          </div>
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
                              <span>{getBoxInsertLabel()}</span>
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

                          {/* Edit Preset Name & Description */}
                          <button
                            type="button"
                            onClick={() => handleStartEditPreset(preset)}
                            title="Edit preset details"
                            className="h-7 w-7 rounded-lg border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>

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
                      </>
                    )}
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
