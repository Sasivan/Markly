/**
 * Markly Unified Preset System — Visuals Studio Page Adapter
 * Captures and applies complete page configuration: Core Visuals,
 * Hidden Studio Units, Studio Column Spans, and Studio Layout.
 */

import type { VisualsPageSnapshot, ApplyResult } from "../types";
import type { VizConfig } from "@/lib/viz/schema";

export class VisualsPagePresetAdapter {
  /**
   * Captures the complete Visuals Studio page configuration.
   */
  public static capture(): VisualsPageSnapshot {
    let coreVisuals: VizConfig[] = [];
    let hiddenStudioUnitIds: string[] = [];
    const studioLayout: Record<string, { colSpan: number }> = {};

    if (typeof window !== "undefined") {
      try {
        const storedCore = window.localStorage.getItem("markly_core_visuals_list");
        if (storedCore) coreVisuals = JSON.parse(storedCore);
      } catch {}

      try {
        const storedHidden = window.localStorage.getItem("markly_hidden_visual_studio_units");
        if (storedHidden) hiddenStudioUnitIds = JSON.parse(storedHidden);
      } catch {}

      const studioKeys = [
        "studio_observable_plot",
        "studio_classic_charts",
        "studio_intel_systems",
        "studio_sites_matrix",
      ];
      for (const key of studioKeys) {
        try {
          const span = window.localStorage.getItem(`markly_box_colspan_${key}`);
          if (span) studioLayout[key] = { colSpan: parseInt(span, 10) };
        } catch {}
      }
    }

    return {
      version: 2,
      kind: "visuals-page-layout",
      coreVisuals,
      hiddenStudioUnitIds,
      studioLayout,
    };
  }

  /**
   * Restores complete Visuals Studio page configuration.
   */
  public static apply(snapshot: VisualsPageSnapshot): ApplyResult {
    if (typeof window === "undefined") {
      return { success: false, error: "Cannot apply preset outside browser" };
    }

    try {
      if (Array.isArray(snapshot.coreVisuals)) {
        window.localStorage.setItem(
          "markly_core_visuals_list",
          JSON.stringify(snapshot.coreVisuals)
        );
      }

      if (Array.isArray(snapshot.hiddenStudioUnitIds)) {
        window.localStorage.setItem(
          "markly_hidden_visual_studio_units",
          JSON.stringify(snapshot.hiddenStudioUnitIds)
        );
      }

      if (snapshot.studioLayout) {
        for (const [key, layout] of Object.entries(snapshot.studioLayout)) {
          if (layout.colSpan) {
            window.localStorage.setItem(`markly_box_colspan_${key}`, String(layout.colSpan));
          }
        }
      }

      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));

      return {
        success: true,
        affectedCount: (snapshot.coreVisuals?.length || 0) + (snapshot.hiddenStudioUnitIds?.length || 0),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to restore visuals page layout",
      };
    }
  }
}
