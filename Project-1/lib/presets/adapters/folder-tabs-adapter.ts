/**
 * Markly Unified Preset System — Folder Tabs Layout Adapter
 * Handles All-Tabs and Active-Tab capture/apply with strict
 * Universal vs Custom scope isolation and zero silent fallbacks.
 */

import type {
  FolderTabsSnapshot,
  FolderTabSnapshot,
  VisualBoxSnapshot,
  FolderApplyMode,
  TabDestinationTarget,
  ApplyResult,
} from "../types";

export class FolderTabsPresetAdapter {
  /**
   * Captures Folder Tabs from active state.
   */
  public static capture(
    tabs: any[],
    activeTabId?: string,
    captureMode: "all_tabs" | "active_tab" = "all_tabs",
    scope: "universal" | "custom" = "universal"
  ): FolderTabsSnapshot | FolderTabSnapshot {
    const clonedTabs = JSON.parse(JSON.stringify(tabs || []));

    const mapVisuals = (visuals: any[]): VisualBoxSnapshot[] => {
      return (visuals || []).map((v) => ({
        sourceVisualId: v.id,
        title: v.title || "Visual Box",
        kind: v.kind || "chart",
        category: v.category,
        icon: v.icon,
        color: v.color,
        colSpan: v.colSpan || 12,
        rowSpan: v.rowSpan || 2,
        boxHeight: v.boxHeight || null,
        presentation: {
          itemLimit: v.siteConfig?.limit ?? "auto",
          viewMode: v.siteConfig?.viewMode ?? "grid",
        },
        siteConfig: v.siteConfig,
        plotConfig: v.plotConfig,
        chartConfig: v.chartConfig,
        intelConfig: v.intelConfig,
      }));
    };

    if (captureMode === "active_tab") {
      const active = clonedTabs.find((t: any) => t.id === activeTabId) || clonedTabs[0];
      if (!active) {
        throw new Error("Cannot capture active tab: folder has no tabs.");
      }
      return {
        version: 2,
        kind: "folder-tab-layout",
        tab: {
          id: active.id,
          label: active.label || "Overview",
          visuals: mapVisuals(active.visuals),
        },
        scopeAtCapture: scope,
      };
    }

    return {
      version: 2,
      kind: "folder-tabs-layout",
      scopeAtCapture: scope,
      captureMode: "all_tabs",
      activeTabId,
      tabs: clonedTabs.map((t: any) => ({
        id: t.id,
        label: t.label || "Tab",
        visuals: mapVisuals(t.visuals),
      })),
    };
  }

  /**
   * Applies a folder preset (tabs or single tab) to a destination folder.
   * STRICT ISOLATION:
   * Universal scope writes ONLY to markly_universal_folder_tabs.
   * Custom scope writes ONLY to markly_folder_tabs_${folderId}.
   */
  public static apply(
    snapshot: FolderTabsSnapshot | FolderTabSnapshot,
    targetScope: "universal" | "custom",
    targetFolderId?: string | null,
    applyMode: FolderApplyMode = "replace_all",
    tabTarget?: TabDestinationTarget
  ): ApplyResult {
    if (typeof window === "undefined") {
      return { success: false, error: "Cannot apply preset outside browser environment" };
    }

    if (targetScope === "custom" && !targetFolderId) {
      return { success: false, error: "Custom folder destination requires an explicit folder ID." };
    }

    const storageKey =
      targetScope === "custom"
        ? `markly_folder_tabs_${targetFolderId}`
        : "markly_universal_folder_tabs";

    let destinationTabs: any[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) destinationTabs = JSON.parse(raw);
      if (!Array.isArray(destinationTabs) || destinationTabs.length === 0) {
        destinationTabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      }
    } catch {
      destinationTabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
    }

    // Determine incoming tabs
    let incomingTabs: any[] = [];
    if (snapshot.kind === "folder-tab-layout") {
      incomingTabs = [snapshot.tab];
    } else {
      incomingTabs = snapshot.tabs || [];
    }

    if (incomingTabs.length === 0) {
      return { success: false, error: "Preset contains no tabs to apply." };
    }

    let nextTabs: any[] = [];
    let affectedCount = 0;

    if (applyMode === "replace_all") {
      // Generate clean IDs for replacement tabs
      nextTabs = incomingTabs.map((t, idx) => ({
        id: t.id ? (t.id.startsWith("tab_") ? t.id : `tab_${t.id}`) : `tab_${Date.now()}_${idx}`,
        label: t.label || `Tab ${idx + 1}`,
        visuals: (t.visuals || []).map((v: any, vIdx: number) => ({
          ...v,
          id: v.sourceVisualId || v.id || `viz_${Date.now()}_${vIdx}`,
        })),
      }));
      affectedCount = nextTabs.length;
    } else if (applyMode === "append_tabs") {
      const existingIds = new Set(destinationTabs.map((t) => t.id));
      const appended = incomingTabs.map((t, idx) => {
        const id = existingIds.has(t.id) ? `${t.id}_copy_${Date.now()}_${idx}` : t.id;
        return {
          id,
          label: existingIds.has(t.id) ? `${t.label} (Copy)` : t.label,
          visuals: (t.visuals || []).map((v: any, vIdx: number) => ({
            ...v,
            id: `viz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${vIdx}`,
          })),
        };
      });
      nextTabs = [...destinationTabs, ...appended];
      affectedCount = appended.length;
    } else if (applyMode === "merge_active_tab") {
      let targetTabId: string | undefined;

      if (tabTarget?.mode === "existing") {
        targetTabId = tabTarget.tabId;
      } else if (tabTarget?.mode === "active") {
        // Find first tab or specified active tab
        targetTabId = destinationTabs[0]?.id;
      }

      if (!targetTabId) {
        return { success: false, error: "Target tab was not specified for merge operation." };
      }

      const targetIdx = destinationTabs.findIndex((t) => t.id === targetTabId);
      if (targetIdx === -1) {
        return {
          success: false,
          error: `Target tab '${targetTabId}' was not found in destination tabs. Silently falling back to tab 0 is forbidden.`,
        };
      }

      const incomingVisuals = incomingTabs.flatMap((t) => t.visuals || []).map((v: any) => ({
        ...v,
        id: `viz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }));

      destinationTabs[targetIdx] = {
        ...destinationTabs[targetIdx],
        visuals: [...(destinationTabs[targetIdx].visuals || []), ...incomingVisuals],
      };
      nextTabs = destinationTabs;
      affectedCount = incomingVisuals.length;
    } else if (applyMode === "create_new_tab") {
      const label = tabTarget?.mode === "new" ? tabTarget.label : incomingTabs[0]?.label || "New Tab";
      const newTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const incomingVisuals = incomingTabs.flatMap((t) => t.visuals || []).map((v: any) => ({
        ...v,
        id: `viz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }));

      nextTabs = [
        ...destinationTabs,
        {
          id: newTabId,
          label,
          visuals: incomingVisuals,
        },
      ];
      affectedCount = 1;
    }

    // Persist STRICTLY to selected scope
    window.localStorage.setItem(storageKey, JSON.stringify(nextTabs));

    if (targetScope === "custom" && targetFolderId) {
      window.dispatchEvent(
        new CustomEvent("markly-folder-tabs-updated", {
          detail: { folderId: targetFolderId, tabs: nextTabs },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("markly-universal-tabs-updated", { detail: nextTabs })
      );
    }

    window.dispatchEvent(new CustomEvent("markly-workspace-updated"));

    return {
      success: true,
      affectedCount,
      details: { storageKey, nextTabsCount: nextTabs.length },
    };
  }
}
