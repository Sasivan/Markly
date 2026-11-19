/**
 * Markly Unified Preset System — Individual Visual Box Adapter
 * Inserts or replaces a visual box across Home, Universal Tabs,
 * Custom Folder Tabs, or Visuals Studio Page.
 */

import type { VisualBoxSnapshot, TabDestinationTarget, ApplyResult } from "../types";
import { RemoteWidgetStore } from "@/lib/viz/store";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";

export class VisualBoxPresetAdapter {
  private static widgetStore = new RemoteWidgetStore();

  /**
   * Inserts or replaces a visual box into Dashboard Home.
   */
  public static async insertIntoHome(
    box: VisualBoxSnapshot,
    replaceTargetId?: string
  ): Promise<ApplyResult> {
    try {
      const existingWidgets = await this.widgetStore.loadWidgets();
      const generatedId = replaceTargetId || `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const newWidget: HomeWidgetConfig = {
        id: generatedId,
        label: box.title,
        visible: true,
        span: box.colSpan === 12 ? "2" : "1",
        colSpan: (box.colSpan as any) || 12,
        rowSpan: box.rowSpan || 2,
        kind: box.kind.startsWith("studio_") ? "studio" : "custom",
        category: box.category,
        icon: box.icon,
        color: box.color,
        siteConfig: box.siteConfig,
        plotConfig: box.plotConfig,
        chartConfig: box.chartConfig,
        intelConfig: box.intelConfig,
      };

      let nextWidgets: HomeWidgetConfig[];
      if (replaceTargetId) {
        nextWidgets = existingWidgets.map((w) => (w.id === replaceTargetId ? newWidget : w));
      } else {
        nextWidgets = [newWidget, ...existingWidgets.filter((w) => w.id !== generatedId)];
      }

      await this.widgetStore.saveWidgets(nextWidgets);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      }

      return {
        success: true,
        affectedCount: 1,
        details: { target: "home", id: generatedId },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to insert visual box into Homepage",
      };
    }
  }

  /**
   * Inserts or replaces a visual box into a folder tab (Universal or Custom).
   * ZERO SILENT FALLBACK: If target tab does not exist, returns actionable error.
   */
  public static insertIntoFolder(
    box: VisualBoxSnapshot,
    targetScope: "universal" | "custom",
    targetFolderId: string | null | undefined,
    tabTarget: TabDestinationTarget,
    replaceVisualId?: string
  ): ApplyResult {
    if (typeof window === "undefined") {
      return { success: false, error: "Cannot insert visual box outside browser" };
    }

    if (targetScope === "custom" && !targetFolderId) {
      return { success: false, error: "Target folder ID is required for Custom folder insertion." };
    }

    const storageKey =
      targetScope === "custom"
        ? `markly_folder_tabs_${targetFolderId}`
        : "markly_universal_folder_tabs";

    let tabs: any[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) tabs = JSON.parse(raw);
      if (!Array.isArray(tabs) || tabs.length === 0) {
        tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      }
    } catch {
      tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
    }

    const boxToInsert = {
      id: replaceVisualId || `viz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: box.title,
      kind: box.kind,
      category: box.category,
      icon: box.icon,
      color: box.color,
      colSpan: box.colSpan || 12,
      rowSpan: box.rowSpan || 2,
      boxHeight: box.boxHeight || null,
      siteConfig: box.siteConfig,
      plotConfig: box.plotConfig,
      chartConfig: box.chartConfig,
      intelConfig: box.intelConfig,
    };

    if (tabTarget.mode === "new") {
      const newTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      tabs.push({
        id: newTabId,
        label: tabTarget.label || "New Tab",
        visuals: [boxToInsert],
      });
    } else {
      let targetTabId = tabTarget.mode === "existing" ? tabTarget.tabId : tabs[0]?.id;
      if (!targetTabId) {
        return { success: false, error: "No target tab available in destination." };
      }

      const targetIdx = tabs.findIndex((t) => t.id === targetTabId);
      if (targetIdx === -1) {
        return {
          success: false,
          error: `Target tab '${targetTabId}' does not exist in destination. Silently falling back to tab 0 is forbidden.`,
        };
      }

      const existingVisuals = tabs[targetIdx].visuals || [];
      if (replaceVisualId) {
        tabs[targetIdx].visuals = existingVisuals.map((v: any) =>
          v.id === replaceVisualId ? boxToInsert : v
        );
      } else {
        tabs[targetIdx].visuals = [boxToInsert, ...existingVisuals.filter((v: any) => v.id !== boxToInsert.id)];
      }
    }

    // Persist STRICTLY to chosen scope
    window.localStorage.setItem(storageKey, JSON.stringify(tabs));

    if (targetScope === "custom" && targetFolderId) {
      window.dispatchEvent(
        new CustomEvent("markly-folder-tabs-updated", {
          detail: { folderId: targetFolderId, tabs },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("markly-universal-tabs-updated", { detail: tabs })
      );
    }

    window.dispatchEvent(new CustomEvent("markly-workspace-updated"));

    return {
      success: true,
      affectedCount: 1,
      details: { storageKey, id: boxToInsert.id },
    };
  }
}
