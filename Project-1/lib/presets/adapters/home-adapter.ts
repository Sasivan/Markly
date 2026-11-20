/**
 * Markly Unified Preset System — Homepage Layout Adapter
 * Captures canonical layout with sidecar presentation settings
 * and applies through RemoteWidgetStore (Supabase + Local Cache).
 */

import type { HomeLayoutSnapshot, HomeWidgetSnapshot, ApplyResult } from "../types";
import { RemoteWidgetStore } from "@/lib/viz/store";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";

export class HomePresetAdapter {
  private static widgetStore = new RemoteWidgetStore();

  /**
   * Captures the complete effective Homepage layout, including widget order,
   * visibility, full visual configs, and sidecar presentation overrides.
   */
  public static async capture(): Promise<HomeLayoutSnapshot> {
    const rawWidgets = await this.widgetStore.loadWidgets();

    let widgetViews: Record<string, string> = {};
    let itemLimits: Record<string, string | number> = {};

    if (typeof window !== "undefined") {
      try {
        const v = window.localStorage.getItem("markly_home_widget_views");
        if (v) widgetViews = JSON.parse(v);
      } catch {}
      try {
        const l = window.localStorage.getItem("markly_widget_item_limits");
        if (l) itemLimits = JSON.parse(l);
      } catch {}
    }

    const widgetsSnapshot: HomeWidgetSnapshot[] = rawWidgets.map((w: HomeWidgetConfig) => {
      let colSpan: number | undefined = w.colSpan;
      let rowSpan: 1 | 2 | undefined = w.rowSpan;
      let boxHeight: number | null | undefined = null;

      if (typeof window !== "undefined") {
        try {
          const cs = window.localStorage.getItem(`markly_box_colspan_${w.id}`);
          if (cs) colSpan = parseInt(cs, 10);
          const rs = window.localStorage.getItem(`markly_box_rowspan_${w.id}`);
          if (rs) rowSpan = parseInt(rs, 10) as 1 | 2;
          const h = window.localStorage.getItem(`markly_box_h_${w.id}`);
          if (h) boxHeight = parseInt(h, 10);
        } catch {}
      }

      return {
        id: w.id,
        label: w.label,
        visible: w.visible !== false,
        kind: w.kind || "builtin",
        category: w.category,
        colSpan: colSpan || (w.span === "2" ? 12 : 6),
        rowSpan: rowSpan || 1,
        boxHeight,
        itemLimit: (itemLimits[w.id] as any) || "auto",
        viewMode: (widgetViews[w.id] as any) || "grid",
        icon: w.icon,
        color: w.color,
        chartConfig: w.chartConfig,
        plotConfig: w.plotConfig,
        intelConfig: w.intelConfig,
        siteConfig: w.siteConfig,
        vizConfig: w.vizConfig,
      };
    });

    return {
      version: 2,
      kind: "home-layout",
      widgets: widgetsSnapshot,
      grid: { columns: 12 },
      captureIncludes: {
        widgetOrder: true,
        visibility: true,
        visualConfiguration: true,
        boxDimensions: true,
        itemLimits: true,
        viewModes: true,
      },
    };
  }

  /**
   * Restores a full Homepage layout through RemoteWidgetStore.
   */
  public static async apply(snapshot: HomeLayoutSnapshot): Promise<ApplyResult> {
    if (!snapshot || !Array.isArray(snapshot.widgets)) {
      return { success: false, error: "Invalid homepage layout snapshot" };
    }

    try {
      const widgetViews: Record<string, string> = {};
      const itemLimits: Record<string, string | number> = {};

      const restoredWidgets: HomeWidgetConfig[] = snapshot.widgets.map((s) => {
        if (s.viewMode) widgetViews[s.id] = s.viewMode;
        if (s.itemLimit) itemLimits[s.id] = s.itemLimit;

        if (typeof window !== "undefined") {
          try {
            if (s.colSpan) window.localStorage.setItem(`markly_box_colspan_${s.id}`, String(s.colSpan));
            if (s.rowSpan) window.localStorage.setItem(`markly_box_rowspan_${s.id}`, String(s.rowSpan));
            if (s.boxHeight) window.localStorage.setItem(`markly_box_h_${s.id}`, String(s.boxHeight));
          } catch {}
        }

        return {
          id: s.id,
          label: s.label,
          visible: s.visible !== false,
          span: s.colSpan === 12 ? "2" : "1",
          colSpan: (s.colSpan as any) || 6,
          rowSpan: s.rowSpan || 1,
          kind: s.kind || "builtin",
          category: s.category,
          chartConfig: s.chartConfig,
          plotConfig: s.plotConfig,
          intelConfig: s.intelConfig,
          siteConfig: s.siteConfig,
          vizConfig: s.vizConfig,
          icon: s.icon,
          color: s.color,
        };
      });

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("markly_home_widget_views", JSON.stringify(widgetViews));
          window.localStorage.setItem("markly_widget_item_limits", JSON.stringify(itemLimits));
        } catch {}
      }

      // Persist to RemoteWidgetStore (saves locally immediately, then syncs to Supabase)
      await this.widgetStore.saveWidgets(restoredWidgets);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      }

      return {
        success: true,
        affectedCount: restoredWidgets.length,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to restore homepage layout",
      };
    }
  }
}
