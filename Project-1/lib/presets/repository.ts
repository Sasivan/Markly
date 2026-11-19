/**
 * Markly Unified Preset System — Central Preset Repository
 * Handles persistent storage (LocalStorage with remote API readiness)
 * and immutable system built-ins lifecycle.
 */

import type { PresetRecord, PresetKind, PresetCategory } from "./types";
import { presetRecordSchema } from "./schemas";
import { BUILTIN_SYSTEM_PRESETS } from "./builtins";

export const PRESETS_STORAGE_KEY = "markly_universal_presets_hub";
export const BUILTIN_TOMBSTONE_KEY = "markly_deleted_builtin_presets";
export const SCOPED_DEFAULTS_KEY = "markly_preset_scoped_defaults";

export class PresetRepository {
  private static instance: PresetRepository;

  public static getInstance(): PresetRepository {
    if (!PresetRepository.instance) {
      PresetRepository.instance = new PresetRepository();
    }
    return PresetRepository.instance;
  }

  /**
   * Retrieves all active presets (built-ins minus tombstones + user-created).
   */
  public async getAll(): Promise<PresetRecord[]> {
    if (typeof window === "undefined") return BUILTIN_SYSTEM_PRESETS;

    const tombstones = this.getTombstones();
    const activeBuiltIns = BUILTIN_SYSTEM_PRESETS.filter((b) => !tombstones.has(b.id));

    try {
      const stored = window.localStorage.getItem(PRESETS_STORAGE_KEY);
      if (!stored) {
        window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(activeBuiltIns));
        return activeBuiltIns;
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return activeBuiltIns;

      // Migrate & filter out tombstones
      const validRecords: PresetRecord[] = [];
      const seenIds = new Set<string>();

      for (const item of parsed) {
        if (!item || tombstones.has(item.id) || seenIds.has(item.id)) continue;
        const normalized = this.normalizeLegacyRecord(item);
        if (normalized) {
          validRecords.push(normalized);
          seenIds.add(normalized.id);
        }
      }

      // Ensure active built-ins exist
      for (const builtIn of activeBuiltIns) {
        if (!seenIds.has(builtIn.id)) {
          validRecords.push(builtIn);
          seenIds.add(builtIn.id);
        }
      }

      return validRecords;
    } catch {
      return activeBuiltIns;
    }
  }

  /**
   * Finds a preset by ID.
   */
  public async getById(id: string): Promise<PresetRecord | null> {
    const all = await this.getAll();
    return all.find((p) => p.id === id) || null;
  }

  /**
   * Filters presets by kind or category.
   */
  public async getByKind(kind: PresetKind): Promise<PresetRecord[]> {
    const all = await this.getAll();
    return all.filter((p) => p.kind === kind);
  }

  public async getByCategory(category: PresetCategory): Promise<PresetRecord[]> {
    const all = await this.getAll();
    return all.filter((p) => p.category === category);
  }

  public static async getByCategory(category: PresetCategory): Promise<PresetRecord[]> {
    return PresetRepository.getInstance().getByCategory(category);
  }

  public static async getAll(): Promise<PresetRecord[]> {
    return PresetRepository.getInstance().getAll();
  }

  /**
   * Saves or updates a preset record.
   */
  public async save(record: PresetRecord): Promise<void> {
    if (typeof window === "undefined") return;

    // Validate with Zod before writing
    const validated = presetRecordSchema.parse(record);
    const all = await this.getAll();

    const idx = all.findIndex((p) => p.id === validated.id);
    let updated: PresetRecord[];

    if (idx >= 0) {
      // Cannot overwrite built-ins directly unless saving as a user preset
      if (all[idx].isBuiltIn && validated.ownership !== "user") {
        throw new Error("System built-in presets cannot be overwritten. Duplicate it instead.");
      }
      updated = all.map((p) =>
        p.id === validated.id
          ? {
              ...validated,
              version: (p.version || 1) + 1,
              updatedAt: Date.now(),
            }
          : p
      );
    } else {
      updated = [
        {
          ...validated,
          createdAt: validated.createdAt || Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
        ...all,
      ];
    }

    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("markly-presets-updated"));
  }

  /**
   * Deletes a user preset or tombstones a built-in.
   */
  public async delete(id: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const all = await this.getAll();
    const target = all.find((p) => p.id === id);
    if (!target) return false;

    if (target.isBuiltIn) {
      // Tombstone built-in so it won't be re-seeded
      const tombstones = this.getTombstones();
      tombstones.add(id);
      this.saveTombstones(tombstones);
    }

    const filtered = all.filter((p) => p.id !== id);
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("markly-presets-updated"));
    return true;
  }

  /**
   * Duplicates an existing preset under a new user ID.
   */
  public async duplicate(id: string, newName?: string): Promise<PresetRecord> {
    const source = await this.getById(id);
    if (!source) throw new Error(`Preset '${id}' not found`);

    const cloned: PresetRecord = {
      ...JSON.parse(JSON.stringify(source)),
      id: `preset_${source.category}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newName || `${source.name} (Copy)`,
      ownership: "user",
      isBuiltIn: false,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    await this.save(cloned);
    return cloned;
  }

  /**
   * Renames a preset.
   */
  public async rename(id: string, newName: string, newDescription?: string): Promise<PresetRecord> {
    const source = await this.getById(id);
    if (!source) throw new Error(`Preset '${id}' not found`);
    if (source.isBuiltIn) {
      throw new Error("Cannot rename a system built-in preset. Duplicate it first.");
    }

    const updated: PresetRecord = {
      ...source,
      name: newName.trim(),
      description: newDescription !== undefined ? newDescription.trim() : source.description,
      version: (source.version || 1) + 1,
      updatedAt: Date.now(),
    };

    await this.save(updated);
    return updated;
  }

  /**
   * Scoped Default Management (Home, Universal Folder, Custom Folder, Visuals)
   */
  public async setDefault(id: string, scopeTarget = "global"): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(SCOPED_DEFAULTS_KEY);
      const defaults = stored ? JSON.parse(stored) : {};
      defaults[scopeTarget] = id;
      window.localStorage.setItem(SCOPED_DEFAULTS_KEY, JSON.stringify(defaults));
      window.dispatchEvent(new CustomEvent("markly-presets-updated"));
    } catch {}
  }

  public async getDefault(scopeTarget = "global"): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(SCOPED_DEFAULTS_KEY);
      if (!stored) return null;
      const defaults = JSON.parse(stored);
      return defaults[scopeTarget] || null;
    } catch {
      return null;
    }
  }

  /**
   * Restores all deleted built-in presets by clearing tombstones.
   */
  public async restoreBuiltIns(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(BUILTIN_TOMBSTONE_KEY);
    window.dispatchEvent(new CustomEvent("markly-presets-updated"));
  }

  // -------------------------------------------------------------
  // Helpers & Normalizers
  // -------------------------------------------------------------

  private getTombstones(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(BUILTIN_TOMBSTONE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveTombstones(set: Set<string>): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BUILTIN_TOMBSTONE_KEY, JSON.stringify(Array.from(set)));
  }

  private normalizeLegacyRecord(raw: any): PresetRecord | null {
    if (!raw || !raw.id || !raw.name) return null;

    // Already v2
    if (raw.schemaVersion === 2 && raw.kind && raw.snapshot) {
      return raw as PresetRecord;
    }

    // Map v1 category to v2 kind
    const category: PresetCategory = raw.category || "home";
    let kind: PresetKind = "home-layout";
    let snapshot: any = null;

    if (category === "home") {
      kind = "home-layout";
      snapshot = {
        version: 2,
        kind: "home-layout",
        widgets: Array.isArray(raw.data?.widgets) ? raw.data.widgets : Array.isArray(raw.data) ? raw.data : [],
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
    } else if (category === "folder") {
      const rawTabs = raw.data?.tabs || (Array.isArray(raw.data) ? raw.data : []);
      const captureMode = raw.data?.captureMode || (rawTabs.length === 1 ? "active_tab" : "all_tabs");

      if (captureMode === "active_tab" && rawTabs.length === 1) {
        kind = "folder-tab-layout";
        snapshot = {
          version: 2,
          kind: "folder-tab-layout",
          tab: rawTabs[0],
          scopeAtCapture: raw.data?.scope || "universal",
        };
      } else {
        kind = "folder-tabs-layout";
        snapshot = {
          version: 2,
          kind: "folder-tabs-layout",
          tabs: rawTabs,
          activeTabId: raw.provenance?.tabId,
          scopeAtCapture: raw.data?.scope || "universal",
          captureMode: "all_tabs",
        };
      }
    } else if (category === "visuals") {
      kind = "visuals-page-layout";
      snapshot = {
        version: 2,
        kind: "visuals-page-layout",
        coreVisuals: [],
        hiddenStudioUnitIds: raw.data?.hiddenStudioUnits || [],
        studioLayout: {},
      };
    } else if (category === "box") {
      kind = "visual-box";
      const b = raw.data?.box || raw.data || {};
      snapshot = {
        title: b.title || raw.name,
        kind: b.kind || "chart",
        category: b.category,
        colSpan: b.colSpan || 12,
        rowSpan: b.rowSpan || 2,
        boxHeight: b.boxHeight || null,
        siteConfig: b.siteConfig,
        plotConfig: b.plotConfig,
        chartConfig: b.chartConfig,
        intelConfig: b.intelConfig,
      };
    } else if (category === "search") {
      kind = "search-query";
      snapshot = {
        version: 2,
        kind: "search-query",
        query: raw.data?.query || raw.name,
      };
    }

    return {
      id: raw.id,
      schemaVersion: 2,
      kind,
      category,
      name: raw.name,
      description: raw.description,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      ownership: raw.isBuiltIn ? "system" : "user",
      isDefault: Boolean(raw.isDefault),
      isBuiltIn: Boolean(raw.isBuiltIn),
      source: raw.provenance
        ? {
            surface: raw.provenance.sourceType || "home",
            folderId: raw.provenance.folderId,
            folderName: raw.provenance.folderName,
            folderScope: raw.provenance.scope,
            tabId: raw.provenance.tabId,
            tabLabel: raw.provenance.tabLabel,
            capturedAt: raw.provenance.timestamp || raw.createdAt || Date.now(),
          }
        : {
            surface: "home",
            capturedAt: raw.createdAt || Date.now(),
          },
      snapshot,
      createdAt: raw.createdAt || Date.now(),
      updatedAt: raw.createdAt || Date.now(),
      version: 1,
    };
  }
}
