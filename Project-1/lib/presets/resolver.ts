/**
 * Markly Unified Preset System — Destination & Scope Resolver
 * Resolves destination tabs dynamically per scope/folder so pickers
 * never display stale or invalid tabs from another context.
 */

export interface AvailableFolderTab {
  id: string;
  label: string;
  visualsCount: number;
}

export class DestinationResolver {
  /**
   * Retrieves the live tabs configured for the specified destination scope.
   */
  public static getDestinationTabs(
    scope: "universal" | "custom",
    folderId?: string | null
  ): AvailableFolderTab[] {
    if (typeof window === "undefined") return [];

    const storageKey =
      scope === "custom" && folderId
        ? `markly_folder_tabs_${folderId}`
        : "markly_universal_folder_tabs";

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return [{ id: "tab_default", label: "Overview", visualsCount: 0 }];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [{ id: "tab_default", label: "Overview", visualsCount: 0 }];
      }
      return parsed.map((t: any) => ({
        id: t.id,
        label: t.label || "Tab",
        visualsCount: Array.isArray(t.visuals) ? t.visuals.length : 0,
      }));
    } catch {
      return [{ id: "tab_default", label: "Overview", visualsCount: 0 }];
    }
  }

  /**
   * Validates whether a requested target tab exists in the destination scope.
   */
  public static validateTargetTab(
    scope: "universal" | "custom",
    folderId: string | null | undefined,
    targetTabId: string
  ): { valid: boolean; error?: string } {
    const tabs = this.getDestinationTabs(scope, folderId);
    const exists = tabs.some((t) => t.id === targetTabId);

    if (!exists) {
      return {
        valid: false,
        error: `Target tab '${targetTabId}' does not exist in destination ${scope} tabs. Silent fallback is prohibited.`,
      };
    }
    return { valid: true };
  }
}
