import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PresetService,
  DestinationResolver,
  type PresetRecord,
  type PresetDestination,
} from "../lib/presets";
import {
  presetRecordSchema,
  homeLayoutSnapshotSchema,
  folderTabsSnapshotSchema,
  folderTabSnapshotSchema,
  visualBoxSnapshotSchema,
  visualsPageSnapshotSchema,
  searchQuerySnapshotSchema,
} from "../lib/presets/schemas";
import { HomePresetAdapter } from "../lib/presets/adapters/home-adapter";
import { FolderTabsPresetAdapter } from "../lib/presets/adapters/folder-tabs-adapter";
import { VisualBoxPresetAdapter } from "../lib/presets/adapters/visual-box-adapter";
import { VisualsPagePresetAdapter } from "../lib/presets/adapters/visuals-page-adapter";
import { SearchPresetAdapter } from "../lib/presets/adapters/search-adapter";
import { BUILTIN_SYSTEM_PRESETS } from "../lib/presets/builtins";
import { PRESETS_STORAGE_KEY, BUILTIN_TOMBSTONE_KEY } from "../lib/presets/repository";

describe("Markly Universal Preset Engine (V2 Architecture)", () => {
  const storage: Record<string, string> = {};
  const eventListeners: Record<string, Array<(e: any) => void>> = {};

  const mockLocalStorage = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
    clear: () => {
      for (const k of Object.keys(storage)) delete storage[k];
    },
  };

  beforeEach(() => {
    for (const k of Object.keys(storage)) delete storage[k];
    for (const k of Object.keys(eventListeners)) delete eventListeners[k];

    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
      addEventListener: (evt: string, cb: any) => {
        if (!eventListeners[evt]) eventListeners[evt] = [];
        eventListeners[evt].push(cb);
      },
      removeEventListener: (evt: string, cb: any) => {
        if (eventListeners[evt]) {
          eventListeners[evt] = eventListeners[evt].filter((fn) => fn !== cb);
        }
      },
      dispatchEvent: (e: any) => {
        const cbs = eventListeners[e.type] || [];
        cbs.forEach((cb) => cb(e));
        return true;
      },
    });

    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Zod Validation & Schema Integrity
  // =========================================================================
  describe("1. Zod Schema Validation for All 6 Preset Categories", () => {
    it("validates HomeLayoutSnapshot schema", () => {
      const validHomeSnapshot = {
        version: 2,
        kind: "home-layout",
        widgets: [
          { id: "folders", label: "Folders", visible: true, colSpan: 12, rowSpan: 1, kind: "builtin" },
        ],
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
      expect(() => homeLayoutSnapshotSchema.parse(validHomeSnapshot)).not.toThrow();
    });

    it("validates VisualsPageSnapshot schema", () => {
      const validVisualsSnapshot = {
        version: 2,
        kind: "visuals-page-layout",
        coreVisuals: [],
        hiddenStudioUnitIds: ["studio_intel_systems"],
        studioLayout: {
          studio_observable_plot: { colSpan: 12 },
        },
      };
      expect(() => visualsPageSnapshotSchema.parse(validVisualsSnapshot)).not.toThrow();
    });

    it("validates FolderTabsSnapshot schema (All Tabs)", () => {
      const validFolderTabs = {
        version: 2,
        kind: "folder-tabs-layout",
        captureMode: "all_tabs",
        scopeAtCapture: "universal",
        tabs: [
          {
            id: "tab_1",
            label: "Overview",
            visuals: [
              {
                title: "Matrix",
                kind: "sites",
                colSpan: 12,
                rowSpan: 2,
              },
            ],
          },
        ],
      };
      expect(() => folderTabsSnapshotSchema.parse(validFolderTabs)).not.toThrow();
    });

    it("validates FolderTabSnapshot schema (Single Tab)", () => {
      const validFolderTab = {
        version: 2,
        kind: "folder-tab-layout",
        scopeAtCapture: "custom",
        tab: {
          id: "tab_analytics",
          label: "Analytics",
          visuals: [
            {
              title: "Obsidian Graph",
              kind: "graph",
              colSpan: 12,
              rowSpan: 2,
            },
          ],
        },
      };
      expect(() => folderTabSnapshotSchema.parse(validFolderTab)).not.toThrow();
    });

    it("validates VisualBoxSnapshot schema", () => {
      const validBox = {
        title: "Tableau 10 BarX",
        kind: "plot",
        category: "plot_studio",
        colSpan: 12,
        rowSpan: 2,
        presentation: {
          itemLimit: "auto",
          viewMode: "grid",
        },
      };
      expect(() => visualBoxSnapshotSchema.parse(validBox)).not.toThrow();
    });

    it("validates SearchQuerySnapshot schema", () => {
      const validSearch = {
        version: 2,
        kind: "search-query",
        query: "tag:docs is:favorite",
      };
      expect(() => searchQuerySnapshotSchema.parse(validSearch)).not.toThrow();
    });

    it("validates full canonical PresetRecord structure", () => {
      const record = BUILTIN_SYSTEM_PRESETS[0];
      expect(() => presetRecordSchema.parse(record)).not.toThrow();
    });
  });

  // =========================================================================
  // 2. Adapters & Isolation Tests
  // =========================================================================
  describe("2. Adapters & Scope Isolation Invariants", () => {
    it("FolderTabsPresetAdapter captures All Tabs with deep clones", () => {
      const sampleTabs = [
        { id: "tab_1", label: "First", visuals: [{ id: "v1", title: "V1", kind: "chart" }] },
        { id: "tab_2", label: "Second", visuals: [{ id: "v2", title: "V2", kind: "sites" }] },
      ];

      const captured = FolderTabsPresetAdapter.capture(sampleTabs, "tab_1", "all_tabs", "universal");
      expect(captured.kind).toBe("folder-tabs-layout");
      if (captured.kind === "folder-tabs-layout") {
        expect(captured.tabs.length).toBe(2);
        expect(captured.tabs[0].label).toBe("First");
        expect(captured.tabs[1].label).toBe("Second");
      }
    });

    it("FolderTabsPresetAdapter captures Active Tab only when requested", () => {
      const sampleTabs = [
        { id: "tab_1", label: "First", visuals: [{ id: "v1", title: "V1", kind: "chart" }] },
        { id: "tab_2", label: "Second", visuals: [{ id: "v2", title: "V2", kind: "sites" }] },
      ];

      const captured = FolderTabsPresetAdapter.capture(sampleTabs, "tab_2", "active_tab", "custom");
      expect(captured.kind).toBe("folder-tab-layout");
      if (captured.kind === "folder-tab-layout") {
        expect(captured.tab.id).toBe("tab_2");
        expect(captured.tab.label).toBe("Second");
      }
    });

    it("applying preset to custom folder NEVER touches universal tabs storage (Rule 4)", async () => {
      // Seed universal storage
      const initialUniversal = [{ id: "tab_univ", label: "Universal Tab", visuals: [] }];
      localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(initialUniversal));

      const snapshot = {
        version: 2 as const,
        kind: "folder-tabs-layout" as const,
        captureMode: "all_tabs" as const,
        scopeAtCapture: "custom" as const,
        tabs: [{ id: "tab_custom", label: "Custom Only Tab", visuals: [] }],
      };

      const result = await FolderTabsPresetAdapter.apply(
        snapshot,
        "custom",
        "folder_123",
        "replace_all",
        { mode: "active" }
      );

      expect(result.success).toBe(true);
      // Custom folder must be updated
      const customStored = JSON.parse(localStorage.getItem("markly_folder_tabs_folder_123") || "[]");
      expect(customStored[0].label).toBe("Custom Only Tab");

      // Universal storage MUST remain strictly untouched
      const universalStored = JSON.parse(localStorage.getItem("markly_universal_folder_tabs") || "[]");
      expect(universalStored[0].label).toBe("Universal Tab");
    });

    it("applying preset to universal scope NEVER touches custom folder storage", async () => {
      const initialCustom = [{ id: "tab_cust", label: "Folder 456 Tab", visuals: [] }];
      localStorage.setItem("markly_folder_tabs_folder_456", JSON.stringify(initialCustom));

      const snapshot = {
        version: 2 as const,
        kind: "folder-tabs-layout" as const,
        captureMode: "all_tabs" as const,
        scopeAtCapture: "universal" as const,
        tabs: [{ id: "tab_new_univ", label: "New Universal", visuals: [] }],
      };

      const result = await FolderTabsPresetAdapter.apply(
        snapshot,
        "universal",
        null,
        "replace_all",
        { mode: "active" }
      );

      expect(result.success).toBe(true);
      // Universal storage updated
      const universalStored = JSON.parse(localStorage.getItem("markly_universal_folder_tabs") || "[]");
      expect(universalStored[0].label).toBe("New Universal");

      // Custom storage MUST remain untouched
      const customStored = JSON.parse(localStorage.getItem("markly_folder_tabs_folder_456") || "[]");
      expect(customStored[0].label).toBe("Folder 456 Tab");
    });

    it("VisualBoxPresetAdapter fails when inserting into an invalid existing tab without silent fallback", async () => {
      const tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(tabs));

      const boxSnapshot = {
        title: "Test Unit",
        kind: "chart",
        colSpan: 12,
        rowSpan: 2 as const,
      };

      // Target tab does not exist
      const res = await VisualBoxPresetAdapter.insertIntoFolder(
        boxSnapshot,
        "universal",
        null,
        { mode: "existing", tabId: "non_existent_tab_id" }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain("non_existent_tab_id");

      // tabs[0] must NOT have been silently modified!
      const currentTabs = JSON.parse(localStorage.getItem("markly_universal_folder_tabs") || "[]");
      expect(currentTabs[0].visuals.length).toBe(0);
    });

    it("VisualBoxPresetAdapter inserts box into specified existing tab successfully", async () => {
      const tabs = [
        { id: "tab_1", label: "Tab 1", visuals: [] },
        { id: "tab_2", label: "Tab 2", visuals: [] },
      ];
      localStorage.setItem("markly_universal_folder_tabs", JSON.stringify(tabs));

      const boxSnapshot = {
        title: "Test Unit",
        kind: "chart",
        colSpan: 12,
        rowSpan: 2 as const,
      };

      const res = await VisualBoxPresetAdapter.insertIntoFolder(
        boxSnapshot,
        "universal",
        null,
        { mode: "existing", tabId: "tab_2" }
      );

      expect(res.success).toBe(true);
      const updated = JSON.parse(localStorage.getItem("markly_universal_folder_tabs") || "[]");
      expect(updated[0].visuals.length).toBe(0); // Tab 1 untouched
      expect(updated[1].visuals.length).toBe(1); // Tab 2 has the box
      expect(updated[1].visuals[0].title).toBe("Test Unit");
    });

    it("SearchPresetAdapter dispatches custom event markly-execute-search", () => {
      let eventDetail: any = null;
      window.addEventListener("markly-execute-search", (e: any) => {
        eventDetail = e.detail;
      });

      const res = SearchPresetAdapter.apply({ version: 2, kind: "search-query", query: "tag:tools" });
      expect(res.success).toBe(true);
      expect(eventDetail?.query).toBe("tag:tools");
    });
  });

  // =========================================================================
  // 3. Destination Resolver
  // =========================================================================
  describe("3. DestinationResolver Dynamic Tab Queries", () => {
    it("returns default tab when storage is empty", () => {
      const tabs = DestinationResolver.getDestinationTabs("universal");
      expect(tabs.length).toBe(1);
      expect(tabs[0].id).toBe("tab_default");
    });

    it("retrieves live tabs from custom folder scope", () => {
      const stored = [
        { id: "tab_alpha", label: "Alpha", visuals: [{ id: "v1" }] },
        { id: "tab_beta", label: "Beta", visuals: [{ id: "v2" }, { id: "v3" }] },
      ];
      localStorage.setItem("markly_folder_tabs_project_x", JSON.stringify(stored));

      const tabs = DestinationResolver.getDestinationTabs("custom", "project_x");
      expect(tabs.length).toBe(2);
      expect(tabs[0].id).toBe("tab_alpha");
      expect(tabs[0].visualsCount).toBe(1);
      expect(tabs[1].id).toBe("tab_beta");
      expect(tabs[1].visualsCount).toBe(2);
    });

    it("validateTargetTab detects non-existent target tabs", () => {
      const validation = DestinationResolver.validateTargetTab("universal", null, "bogus_tab");
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Silent fallback is prohibited");
    });
  });

  // =========================================================================
  // 4. Preset Lifecycle & Management via PresetService
  // =========================================================================
  describe("4. Preset Lifecycle Operations (Duplicate, Rename, Delete, Scoped Default)", () => {
    it("retrieves all presets including built-ins", async () => {
      const presets = await PresetService.getAllPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.isBuiltIn)).toBe(true);
    });

    it("duplicates an existing preset with (Copy) suffix", async () => {
      const presets = await PresetService.getAllPresets();
      const first = presets[0];

      const duplicated = await PresetService.duplicatePreset(first.id);
      expect(duplicated.id).not.toBe(first.id);
      expect(duplicated.name).toBe(`${first.name} (Copy)`);
      expect(duplicated.isBuiltIn).toBe(false);
      expect(duplicated.ownership).toBe("user");

      const allUpdated = await PresetService.getAllPresets();
      expect(allUpdated.some((p) => p.id === duplicated.id)).toBe(true);
    });

    it("renames a preset and updates description", async () => {
      const presets = await PresetService.getAllPresets();
      const first = presets[0];

      const duplicated = await PresetService.duplicatePreset(first.id);
      const renamed = await PresetService.renamePreset(
        duplicated.id,
        "Executive Custom Board",
        "Updated custom description"
      );

      expect(renamed.name).toBe("Executive Custom Board");
      expect(renamed.description).toBe("Updated custom description");
      expect(renamed.version).toBe(2);
    });

    it("deleting a built-in preset creates a tombstone and removes it from view", async () => {
      const builtInId = BUILTIN_SYSTEM_PRESETS[0].id;
      const initial = await PresetService.getAllPresets();
      expect(initial.some((p) => p.id === builtInId)).toBe(true);

      const deleted = await PresetService.deletePreset(builtInId);
      expect(deleted).toBe(true);

      // Verify tombstone was stored
      const tombstones = JSON.parse(localStorage.getItem(BUILTIN_TOMBSTONE_KEY) || "[]");
      expect(tombstones).toContain(builtInId);

      // Should not appear in getAllPresets
      const updated = await PresetService.getAllPresets();
      expect(updated.some((p) => p.id === builtInId)).toBe(false);

      // Restore built-ins
      await PresetService.restoreBuiltIns();
      const restored = await PresetService.getAllPresets();
      expect(restored.some((p) => p.id === builtInId)).toBe(true);
    });

    it("sets and gets scoped defaults accurately", async () => {
      const presets = await PresetService.getAllPresets();
      const testPreset = presets[1];

      await PresetService.setScopedDefault(testPreset.id, "home");
      const defaultId = await PresetService.getScopedDefault("home");
      expect(defaultId).toBe(testPreset.id);

      // Setting folder-specific default
      await PresetService.setScopedDefault(testPreset.id, "folder:custom:folder_abc");
      const folderDefault = await PresetService.getScopedDefault("folder:custom:folder_abc");
      expect(folderDefault).toBe(testPreset.id);
    });
  });
});
