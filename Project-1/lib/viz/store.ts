import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";
import { safeParseStoredWidgets, MAX_CUSTOM_WIDGETS, MAX_VIZ_CONFIG_BYTES } from "./schema";

export interface WidgetStore {
  loadWidgets(): Promise<HomeWidgetConfig[]>;
  saveWidgets(widgets: HomeWidgetConfig[]): Promise<void>;
}

const STORAGE_KEY = "markly_home_widgets";

/**
 * LocalStorage implementation of WidgetStore
 */
export class LocalStorageWidgetStore implements WidgetStore {
  async loadWidgets(): Promise<HomeWidgetConfig[]> {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return safeParseStoredWidgets(parsed);
    } catch {
      return [];
    }
  }

  async saveWidgets(widgets: HomeWidgetConfig[]): Promise<void> {
    if (typeof window === "undefined") return;
    const sanitized = safeParseStoredWidgets(widgets);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  }
}

/**
 * Remote Supabase implementation of WidgetStore with LocalStorage fallback/cache
 */
export class RemoteWidgetStore implements WidgetStore {
  private localFallback = new LocalStorageWidgetStore();

  async loadWidgets(): Promise<HomeWidgetConfig[]> {
    try {
      const res = await fetch("/api/home-widgets", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.widgets)) {
          const parsed = safeParseStoredWidgets(json.widgets);
          if (parsed.length > 0) {
            // Update local cache
            await this.localFallback.saveWidgets(parsed);
            return parsed;
          }
        }
      }
    } catch {
      // Network or offline fallback
    }

    return this.localFallback.loadWidgets();
  }

  async saveWidgets(widgets: HomeWidgetConfig[]): Promise<void> {
    const sanitized = safeParseStoredWidgets(widgets);

    // Save locally immediately for optimistic UI
    await this.localFallback.saveWidgets(sanitized);

    try {
      await fetch("/api/home-widgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: sanitized }),
      });
    } catch {
      // Server sync will retry on next write/refresh
    }
  }
}

