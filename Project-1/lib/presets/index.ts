/**
 * Markly Preset Architecture & Lifecycle Engine — Barrel Export
 */

export * from "./types";
export * from "./schemas";
export * from "./repository";
export * from "./service";
export * from "./resolver";
export * from "./builtins";
export * from "./adapters/home-adapter";
export * from "./adapters/folder-tabs-adapter";
export * from "./adapters/visual-box-adapter";
export * from "./adapters/visuals-page-adapter";
export * from "./adapters/search-adapter";

import type { UniversalPresetItem, PresetSourceProvenance, FolderPresetPayload } from "./types";
import { BUILTIN_TOMBSTONE_KEY } from "./repository";

export { BUILTIN_TOMBSTONE_KEY };

/**
 * Legacy compatibility filter
 */
export function filterPresetsWithTombstones(
  presets: UniversalPresetItem[],
  tombstones: string[]
): UniversalPresetItem[] {
  if (!tombstones || tombstones.length === 0) return presets;
  const tombSet = new Set(tombstones);
  return presets.filter((p) => !tombSet.has(p.id));
}

/**
 * Resolves target tab inside a tab array by stable ID.
 * Never silently falls back to tabs[0].
 */
export function resolveTargetTab(
  tabs: any[],
  targetTabId?: string | null
): {
  success: boolean;
  tab?: any;
  error?: string;
} {
  if (!tabs || tabs.length === 0) {
    return {
      success: false,
      error: "Destination folder has no tabs configured.",
    };
  }
  if (!targetTabId) {
    return {
      success: false,
      error: "Target tab was not specified.",
    };
  }
  const found = tabs.find((t: any) => t.id === targetTabId);
  if (!found) {
    return {
      success: false,
      error: `Target tab '${targetTabId}' was not found in destination.`,
    };
  }
  return { success: true, tab: found };
}

/**
 * Captures a typed Folder preset payload with strict active_tab vs all_tabs isolation.
 */
export function captureFolderPreset(
  tabs: any[],
  activeTabId: string | undefined,
  captureMode: "active_tab" | "all_tabs",
  provenance?: Partial<PresetSourceProvenance>
): FolderPresetPayload {
  let capturedTabs: any[];
  if (captureMode === "active_tab") {
    const active = (tabs || []).find((t: any) => t.id === activeTabId) || tabs?.[0];
    capturedTabs = active ? [JSON.parse(JSON.stringify(active))] : [];
  } else {
    capturedTabs = JSON.parse(JSON.stringify(tabs || []));
  }

  return {
    version: 1,
    kind: "folder",
    scope: provenance?.scope || "universal",
    captureMode,
    tabs: capturedTabs,
  };
}

/**
 * Applies folder preset tabs onto destination tabs according to the chosen operation mode.
 */
export function applyFolderPresetToTabs(
  destinationTabs: any[],
  presetTabs: any[],
  mode: any = "replace_all",
  activeTabId?: string
): {
  success: boolean;
  nextTabs: any[];
  affectedTabCount: number;
  affectedVisualCount: number;
  error?: string;
} {
  if (!presetTabs || !Array.isArray(presetTabs) || presetTabs.length === 0) {
    return {
      success: false,
      nextTabs: destinationTabs,
      affectedTabCount: 0,
      affectedVisualCount: 0,
      error: "Preset does not contain any tabs to apply.",
    };
  }

  const clonedPresetTabs = JSON.parse(JSON.stringify(presetTabs));
  const dest = Array.isArray(destinationTabs) ? JSON.parse(JSON.stringify(destinationTabs)) : [];

  if (mode === "replace_all") {
    const oldVisualCount = dest.reduce((acc: number, t: any) => acc + (t.visuals?.length || 0), 0);
    return {
      success: true,
      nextTabs: clonedPresetTabs,
      affectedTabCount: dest.length,
      affectedVisualCount: oldVisualCount,
    };
  }

  if (mode === "append_tabs") {
    const existingIds = new Set(dest.map((t: any) => t.id));
    const sanitizedNewTabs = clonedPresetTabs.map((t: any) => {
      if (existingIds.has(t.id)) {
        return {
          ...t,
          id: `${t.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          label: `${t.label} (Copy)`,
        };
      }
      return t;
    });
    return {
      success: true,
      nextTabs: [...dest, ...sanitizedNewTabs],
      affectedTabCount: sanitizedNewTabs.length,
      affectedVisualCount: sanitizedNewTabs.reduce((acc: number, t: any) => acc + (t.visuals?.length || 0), 0),
    };
  }

  if (mode === "merge_active_tab") {
    if (!activeTabId) {
      return {
        success: false,
        nextTabs: dest,
        affectedTabCount: 0,
        affectedVisualCount: 0,
        error: "No active tab specified for merge.",
      };
    }
    const targetIdx = dest.findIndex((t: any) => t.id === activeTabId);
    if (targetIdx === -1) {
      return {
        success: false,
        nextTabs: dest,
        affectedTabCount: 0,
        affectedVisualCount: 0,
        error: `Active tab '${activeTabId}' was not found in destination tabs.`,
      };
    }

    const incomingVisuals = clonedPresetTabs.flatMap((t: any) => t.visuals || []);
    const existingVisualIds = new Set((dest[targetIdx].visuals || []).map((v: any) => v.id));
    const deduplicatedVisuals = incomingVisuals.map((v: any) => {
      if (existingVisualIds.has(v.id)) {
        return {
          ...v,
          id: `${v.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        };
      }
      return v;
    });

    dest[targetIdx] = {
      ...dest[targetIdx],
      visuals: [...(dest[targetIdx].visuals || []), ...deduplicatedVisuals],
    };

    return {
      success: true,
      nextTabs: dest,
      affectedTabCount: 1,
      affectedVisualCount: deduplicatedVisuals.length,
    };
  }

  return {
    success: false,
    nextTabs: dest,
    affectedTabCount: 0,
    affectedVisualCount: 0,
    error: `Unsupported apply mode: ${mode}`,
  };
}

/**
 * Resolves metadata and studio references for a box preset.
 */
export function resolveBoxPresetMeta(
  boxData: any,
  fallbackTitle?: string
): {
  id: string;
  title: string;
  kind: string;
  category: string;
  tabRef: "T1" | "T2" | "T3" | "T4";
  colSpan: number;
  rowSpan: number;
  boxHeight?: number | null;
  siteConfig?: any;
  plotConfig?: any;
  chartConfig?: any;
  intelConfig?: any;
} {
  const rawKind = boxData?.kind || boxData?.category || "chart";
  let category = boxData?.category;
  let tabRef: "T1" | "T2" | "T3" | "T4" = boxData?.tabRef;

  if (!tabRef) {
    if (rawKind === "sites" || rawKind === "sites_studio") {
      tabRef = "T1";
      category = category || "sites_studio";
    } else if (rawKind === "plot" || rawKind === "plot_studio") {
      tabRef = "T2";
      category = category || "plot_studio";
    } else if (
      rawKind === "intel" ||
      rawKind === "intel_studio" ||
      rawKind === "graph" ||
      rawKind === "tags" ||
      rawKind === "engagement" ||
      rawKind === "wall"
    ) {
      tabRef = "T4";
      category = category || "intel_studio";
    } else {
      tabRef = "T3";
      category = category || "chart_studio";
    }
  }

  return {
    id: boxData?.id || `box_${Date.now()}`,
    title: boxData?.title || fallbackTitle || "Custom Box Unit",
    kind: rawKind,
    category: category || "chart_studio",
    tabRef,
    colSpan: boxData?.colSpan || 12,
    rowSpan: boxData?.rowSpan || 2,
    boxHeight: boxData?.boxHeight || null,
    siteConfig: boxData?.siteConfig,
    plotConfig: boxData?.plotConfig,
    chartConfig: boxData?.chartConfig,
    intelConfig: boxData?.intelConfig,
  };
}

/**
 * Injects a visual box into a folder tab strictly by ID, preventing silent fallback to tabs[0].
 */
export function insertBoxIntoTabs(
  tabs: any[],
  box: any,
  targetTabId: string
): {
  success: boolean;
  nextTabs: any[];
  error?: string;
} {
  const resolution = resolveTargetTab(tabs, targetTabId);
  if (!resolution.success) {
    return {
      success: false,
      nextTabs: tabs,
      error: resolution.error,
    };
  }

  const next = tabs.map((t: any) => {
    if (t.id === targetTabId) {
      const existingVisuals = (t.visuals || []).filter((v: any) => v.id !== box.id);
      return {
        ...t,
        visuals: [box, ...existingVisuals],
      };
    }
    return t;
  });

  return {
    success: true,
    nextTabs: next,
  };
}

/**
 * Safely parses any legacy or versioned preset payload into standardized format.
 */
export function normalizePresetPayload(preset: any): any {
  if (!preset || !preset.data) return null;
  if (preset.data.version === 1) {
    return preset.data;
  }
  if (preset.category === "folder") {
    const tabs = Array.isArray(preset.data)
      ? preset.data
      : [{ id: "tab_default", label: "Overview", visuals: preset.data.visuals || [] }];
    return {
      version: 1,
      kind: "folder",
      scope: "universal",
      captureMode: "all_tabs",
      tabs,
    };
  }
  if (preset.category === "home") {
    return {
      version: 1,
      kind: "home",
      widgets: Array.isArray(preset.data) ? preset.data : [],
    };
  }
  if (preset.category === "box") {
    return {
      version: 1,
      kind: "box",
      box: resolveBoxPresetMeta(preset.data, preset.name),
    };
  }
  return preset.data;
}
