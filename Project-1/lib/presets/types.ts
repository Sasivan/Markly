/**
 * Markly Unified Preset System — Strongly Typed Contracts & Models
 * Schema Version: 2
 */

import type { VizConfig } from "@/lib/viz/schema";
import type { UniversalVisualConfig } from "@/components/viz/universal-visual-builder-modal";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";

export type PresetKind =
  | "home-layout"
  | "visuals-page-layout"
  | "folder-tabs-layout"
  | "folder-tab-layout"
  | "visual-box"
  | "search-query";

export type PresetCategory = "home" | "folder" | "visuals" | "search" | "box";

export type PresetOwnership = "user" | "system";

export type FolderScope = "universal" | "custom";
export type FolderScopeAtCapture = "universal" | "custom" | "not-applicable";

export type FolderApplyMode =
  | "replace_all"
  | "append_tabs"
  | "merge_active_tab"
  | "create_new_tab";

export interface PresetSourceContext {
  surface: "home" | "visuals" | "folder" | "search" | "box";
  folderId?: string | null;
  folderName?: string;
  folderScope?: FolderScopeAtCapture;
  tabId?: string;
  tabLabel?: string;
  visualId?: string;
  capturedAt: number;
}

// -------------------------------------------------------------
// SNAPSHOT DEFINITIONS (Discriminated by PresetKind)
// -------------------------------------------------------------

export interface HomeWidgetSnapshot {
  id: string;
  label: string;
  visible: boolean;
  kind?: "builtin" | "custom" | "studio";
  category?: string;
  colSpan?: number;
  rowSpan?: 1 | 2;
  boxHeight?: number | null;
  itemLimit?: number | "all" | "auto";
  viewMode?: "cards" | "grid" | "list" | "compact" | "table";
  coverStyle?: "thumbnail" | "monogram" | "icon";
  icon?: string;
  color?: string;
  chartConfig?: VizConfig;
  plotConfig?: any;
  intelConfig?: any;
  siteConfig?: any;
  vizConfig?: VizConfig;
}

export interface HomeLayoutSnapshot {
  version: 2;
  kind: "home-layout";
  widgets: HomeWidgetSnapshot[];
  grid: { columns: 12 };
  captureIncludes: {
    widgetOrder: true;
    visibility: true;
    visualConfiguration: true;
    boxDimensions: true;
    itemLimits: true;
    viewModes: true;
  };
}

export interface VisualsPageSnapshot {
  version: 2;
  kind: "visuals-page-layout";
  coreVisuals: VizConfig[];
  hiddenStudioUnitIds: string[];
  studioLayout: Record<string, { colSpan: number; rowSpan?: 1 | 2 }>;
  studioSettings?: Record<string, unknown>;
  customVisualReferences?: string[];
}

export interface VisualBoxSnapshot {
  id?: string;
  sourceVisualId?: string;
  title: string;
  kind: string;
  category?: string;
  icon?: string;
  color?: string;
  colSpan?: number;
  rowSpan?: 1 | 2;
  boxHeight?: number | null;
  presentation?: {
    itemLimit?: number | "all" | "auto";
    viewMode?: "cards" | "grid" | "list" | "compact" | "table";
    coverStyle?: "thumbnail" | "monogram" | "icon";
  };
  siteConfig?: UniversalVisualConfig["siteConfig"];
  plotConfig?: UniversalVisualConfig["plotConfig"];
  chartConfig?: VizConfig;
  intelConfig?: UniversalVisualConfig["intelConfig"];
}

export interface FolderTabSnapshot {
  version: 2;
  kind: "folder-tab-layout";
  tab: {
    id: string;
    label: string;
    visuals: VisualBoxSnapshot[];
  };
  scopeAtCapture: FolderScopeAtCapture;
}

export interface FolderTabsSnapshot {
  version: 2;
  kind: "folder-tabs-layout";
  tabs: Array<{
    id: string;
    label: string;
    visuals: VisualBoxSnapshot[];
  }>;
  activeTabId?: string;
  scopeAtCapture: FolderScopeAtCapture;
  captureMode: "all_tabs" | "active_tab";
}

export interface SearchQuerySnapshot {
  version: 2;
  kind: "search-query";
  query: string;
  filters?: {
    folderId?: string | null;
    domain?: string | null;
    tag?: string | null;
    status?: string;
    onlyFavorites?: boolean;
    includeArchived?: boolean;
  };
  presentation?: {
    viewMode?: "cards" | "grid" | "list" | "compact" | "table";
    coverStyle?: "thumbnail" | "monogram" | "icon";
    sortBy?: "recent" | "created" | "visits" | "title";
  };
  visuals?: {
    showAnalytics?: boolean;
    showFacets?: boolean;
  };
}

export type PresetSnapshot =
  | HomeLayoutSnapshot
  | VisualsPageSnapshot
  | FolderTabsSnapshot
  | FolderTabSnapshot
  | VisualBoxSnapshot
  | SearchQuerySnapshot;

export interface PresetSnapshotMap {
  "home-layout": HomeLayoutSnapshot;
  "visuals-page-layout": VisualsPageSnapshot;
  "folder-tabs-layout": FolderTabsSnapshot;
  "folder-tab-layout": FolderTabSnapshot;
  "visual-box": VisualBoxSnapshot;
  "search-query": SearchQuerySnapshot;
}

// -------------------------------------------------------------
// CANONICAL PRESET RECORD
// -------------------------------------------------------------

export interface PresetRecord<TKind extends PresetKind = PresetKind> {
  id: string;
  schemaVersion: 2;
  kind: TKind;
  category: PresetCategory;
  name: string;
  description?: string;
  tags: string[];
  ownership: PresetOwnership;
  ownerUserId?: string;
  isDefault?: boolean;
  isBuiltIn?: boolean;
  source: PresetSourceContext;
  snapshot: PresetSnapshotMap[TKind];
  createdAt: number;
  updatedAt: number;
  version: number;
}

// -------------------------------------------------------------
// DESTINATIONS & APPLY TARGETS
// -------------------------------------------------------------

export type TabDestinationTarget =
  | { mode: "active" }
  | { mode: "existing"; tabId: string }
  | { mode: "new"; label: string };

export type PresetDestination =
  | { kind: "home" }
  | { kind: "visuals-page" }
  | { kind: "folder-universal"; tabTarget: TabDestinationTarget; applyMode: FolderApplyMode }
  | { kind: "folder-custom"; folderId: string; folderName?: string; tabTarget: TabDestinationTarget; applyMode: FolderApplyMode };

export interface ApplyResult {
  success: boolean;
  affectedCount?: number;
  error?: string;
  details?: Record<string, unknown>;
}

// -------------------------------------------------------------
// LEGACY COMPATIBILITY CONTRACTS
// -------------------------------------------------------------

export interface PresetSourceProvenance {
  sourceType: "home" | "folder" | "visuals" | "box" | "search";
  folderId?: string | null;
  folderName?: string;
  tabId?: string;
  tabLabel?: string;
  scope?: "universal" | "custom";
  captureMode?: "active_tab" | "all_tabs";
  timestamp: number;
}

export interface HomePresetPayload {
  version: 1;
  kind: "home";
  widgets: any[];
}

export interface FolderPresetPayload {
  version: 1;
  kind: "folder";
  scope: "universal" | "custom";
  captureMode: "active_tab" | "all_tabs";
  tabs: Array<{
    id: string;
    label: string;
    visuals: any[];
  }>;
}

export interface BoxPresetPayload {
  version: 1;
  kind: "box";
  box: {
    id: string;
    title: string;
    kind: string;
    category?: string;
    tabRef?: "T1" | "T2" | "T3" | "T4";
    colSpan?: number;
    rowSpan?: number;
    boxHeight?: number | null;
    siteConfig?: any;
    plotConfig?: any;
    chartConfig?: any;
    intelConfig?: any;
  };
}

export interface VisualsPresetPayload {
  version: 1;
  kind: "visuals";
  hiddenStudioUnits: string[];
}

export interface SearchPresetPayload {
  version: 1;
  kind: "search";
  query: string;
}

export type PresetPayload =
  | HomePresetPayload
  | FolderPresetPayload
  | BoxPresetPayload
  | VisualsPresetPayload
  | SearchPresetPayload;

export interface UniversalPresetItem {
  id: string;
  name: string;
  description?: string;
  category: PresetCategory;
  tabRef?: "T1" | "T2" | "T3" | "T4";
  isDefault?: boolean;
  isBuiltIn?: boolean;
  provenance?: PresetSourceProvenance;
  createdAt: number;
  data: PresetPayload | any;
}
