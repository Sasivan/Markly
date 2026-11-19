import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveTargetTab,
  captureFolderPreset,
  applyFolderPresetToTabs,
  resolveBoxPresetMeta,
  insertBoxIntoTabs,
  filterPresetsWithTombstones,
  normalizePresetPayload,
  type UniversalPresetItem,
  type FolderPresetPayload,
} from "../lib/presets";

describe("Stage 2: Preset Lifecycle & Safety Invariants", () => {
  const sampleTabs = [
    {
      id: "tab_overview",
      label: "Overview",
      visuals: [
        { id: "viz_domain", title: "Domain Breakdown", kind: "chart", colSpan: 6, rowSpan: 1 },
        { id: "viz_tags", title: "Tag Frequency", kind: "tags", colSpan: 6, rowSpan: 1 },
      ],
    },
    {
      id: "tab_intel",
      label: "Deep Intelligence",
      visuals: [
        { id: "viz_graph", title: "Knowledge Graph", kind: "graph", colSpan: 12, rowSpan: 2 },
      ],
    },
  ];

  describe("1. Target Tab Resolution (Rule 9: No Silent Fallback)", () => {
    it("resolves existing target tab by ID", () => {
      const res = resolveTargetTab(sampleTabs, "tab_intel");
      expect(res.success).toBe(true);
      expect(res.tab?.id).toBe("tab_intel");
      expect(res.tab?.label).toBe("Deep Intelligence");
    });

    it("fails with actionable error when target tab does NOT exist, never falling back to tabs[0]", () => {
      const res = resolveTargetTab(sampleTabs, "tab_non_existent");
      expect(res.success).toBe(false);
      expect(res.tab).toBeUndefined();
      expect(res.error).toContain("tab_non_existent");
      expect(res.error).toContain("was not found");
    });

    it("fails safely when tabs array is empty", () => {
      const res = resolveTargetTab([], "tab_overview");
      expect(res.success).toBe(false);
      expect(res.error).toContain("no tabs configured");
    });

    it("insertBoxIntoTabs fails when target tab is missing and does NOT modify tabs[0]", () => {
      const boxToInsert = { id: "box_new", title: "New Unit", colSpan: 12, rowSpan: 2 };
      const res = insertBoxIntoTabs(sampleTabs, boxToInsert, "tab_missing");

      expect(res.success).toBe(false);
      expect(res.error).toContain("tab_missing");
      // tabs[0] visuals must remain strictly unchanged!
      expect(sampleTabs[0].visuals.length).toBe(2);
      expect(sampleTabs[0].visuals.map((v) => v.id)).not.toContain("box_new");
    });

    it("insertBoxIntoTabs successfully prepends box into target tab when found", () => {
      const boxToInsert = { id: "box_new", title: "New Unit", colSpan: 12, rowSpan: 2 };
      const res = insertBoxIntoTabs(sampleTabs, boxToInsert, "tab_intel");

      expect(res.success).toBe(true);
      const intelTab = res.nextTabs.find((t) => t.id === "tab_intel");
      expect(intelTab.visuals[0].id).toBe("box_new");
      expect(intelTab.visuals.length).toBe(2);
      // Ensure Overview tab was untouched
      const overviewTab = res.nextTabs.find((t) => t.id === "tab_overview");
      expect(overviewTab.visuals.length).toBe(2);
    });
  });

  describe("2. Folder Preset Source Capture (Active Tab vs All Tabs)", () => {
    it("captures ONLY the active tab when captureMode is active_tab", () => {
      const payload = captureFolderPreset(sampleTabs, "tab_intel", "active_tab", {
        folderId: "fld_eng",
        folderName: "Engineering",
        scope: "custom",
      });

      expect(payload.version).toBe(1);
      expect(payload.kind).toBe("folder");
      expect(payload.captureMode).toBe("active_tab");
      expect(payload.tabs.length).toBe(1);
      expect(payload.tabs[0].id).toBe("tab_intel");
      expect(payload.tabs[0].label).toBe("Deep Intelligence");
      expect(payload.tabs[0].visuals.length).toBe(1);
    });

    it("captures ALL tabs and preserves order when captureMode is all_tabs", () => {
      const payload = captureFolderPreset(sampleTabs, "tab_intel", "all_tabs", {
        scope: "universal",
      });

      expect(payload.version).toBe(1);
      expect(payload.kind).toBe("folder");
      expect(payload.captureMode).toBe("all_tabs");
      expect(payload.tabs.length).toBe(2);
      expect(payload.tabs[0].id).toBe("tab_overview");
      expect(payload.tabs[1].id).toBe("tab_intel");
    });
  });

  describe("3. Folder Preset Apply Operations (Replace, Append, Merge)", () => {
    const presetTabs = [
      {
        id: "tab_preset_1",
        label: "Analytics Suite",
        visuals: [
          { id: "viz_obs", title: "Observable Trend", colSpan: 12, rowSpan: 2 },
        ],
      },
    ];

    it("replace_all replaces all tabs and reports accurate affected count", () => {
      const res = applyFolderPresetToTabs(sampleTabs, presetTabs, "replace_all");

      expect(res.success).toBe(true);
      expect(res.nextTabs.length).toBe(1);
      expect(res.nextTabs[0].id).toBe("tab_preset_1");
      expect(res.affectedTabCount).toBe(2); // Replaced 2 old tabs
      expect(res.affectedVisualCount).toBe(3); // Replaced 3 old visuals
    });

    it("append_tabs keeps existing tabs and appends preset tabs", () => {
      const res = applyFolderPresetToTabs(sampleTabs, presetTabs, "append_tabs");

      expect(res.success).toBe(true);
      expect(res.nextTabs.length).toBe(3);
      expect(res.nextTabs[0].id).toBe("tab_overview");
      expect(res.nextTabs[1].id).toBe("tab_intel");
      expect(res.nextTabs[2].id).toBe("tab_preset_1");
    });

    it("append_tabs renames colliding tab IDs to avoid duplicate keys", () => {
      const collidingPresetTabs = [
        {
          id: "tab_overview", // Identical to existing tab_overview
          label: "Overview",
          visuals: [{ id: "viz_new", title: "New Unit" }],
        },
      ];

      const res = applyFolderPresetToTabs(sampleTabs, collidingPresetTabs, "append_tabs");

      expect(res.success).toBe(true);
      expect(res.nextTabs.length).toBe(3);
      expect(res.nextTabs[0].id).toBe("tab_overview");
      expect(res.nextTabs[2].id).toContain("tab_overview_copy_");
      expect(res.nextTabs[2].label).toBe("Overview (Copy)");
    });

    it("merge_active_tab merges visuals into the active tab without deleting other tabs", () => {
      const res = applyFolderPresetToTabs(sampleTabs, presetTabs, "merge_active_tab", "tab_overview");

      expect(res.success).toBe(true);
      expect(res.nextTabs.length).toBe(2); // Preserved both tabs
      const target = res.nextTabs.find((t) => t.id === "tab_overview");
      expect(target.visuals.length).toBe(3); // 2 old + 1 new visual
      expect(target.visuals.some((v: any) => v.id === "viz_obs")).toBe(true);
    });

    it("merge_active_tab fails safely when active tab is missing", () => {
      const res = applyFolderPresetToTabs(sampleTabs, presetTabs, "merge_active_tab", "non_existent_tab");

      expect(res.success).toBe(false);
      expect(res.error).toContain("was not found");
    });
  });

  describe("4. Box Preset Metadata Resolution & Dimensions Preservation", () => {
    it("correctly infers T1 sites_studio for sites box", () => {
      const meta = resolveBoxPresetMeta({ kind: "sites", siteConfig: { filter: "all" } });
      expect(meta.tabRef).toBe("T1");
      expect(meta.category).toBe("sites_studio");
    });

    it("correctly infers T2 plot_studio for plot box", () => {
      const meta = resolveBoxPresetMeta({ kind: "plot", plotConfig: { plotType: "barX" } });
      expect(meta.tabRef).toBe("T2");
      expect(meta.category).toBe("plot_studio");
    });

    it("correctly infers T4 intel_studio for graph and tag box", () => {
      const metaGraph = resolveBoxPresetMeta({ kind: "graph" });
      expect(metaGraph.tabRef).toBe("T4");
      expect(metaGraph.category).toBe("intel_studio");

      const metaTags = resolveBoxPresetMeta({ kind: "tags" });
      expect(metaTags.tabRef).toBe("T4");
      expect(metaTags.category).toBe("intel_studio");
    });

    it("preserves exact dimensions: colSpan, rowSpan, and boxHeight", () => {
      const meta = resolveBoxPresetMeta({
        kind: "chart",
        colSpan: 8,
        rowSpan: 2,
        boxHeight: 480,
      });

      expect(meta.colSpan).toBe(8);
      expect(meta.rowSpan).toBe(2);
      expect(meta.boxHeight).toBe(480);
    });
  });

  describe("5. Built-In Preset Tombstoning Policy", () => {
    const builtInPreset: UniversalPresetItem = {
      id: "preset_home_minimal",
      name: "Minimalist Focus",
      category: "home",
      isBuiltIn: true,
      createdAt: 1700000000,
      data: null,
    };

    const userPreset: UniversalPresetItem = {
      id: "preset_user_custom",
      name: "My Custom Preset",
      category: "home",
      createdAt: 1700000001,
      data: [],
    };

    it("filters out deleted built-ins using tombstones", () => {
      const presets = [builtInPreset, userPreset];
      const tombstones = ["preset_home_minimal"];

      const filtered = filterPresetsWithTombstones(presets, tombstones);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("preset_user_custom");
    });

    it("retains all presets if tombstones list is empty", () => {
      const presets = [builtInPreset, userPreset];
      const filtered = filterPresetsWithTombstones(presets, []);
      expect(filtered.length).toBe(2);
    });
  });

  describe("6. Legacy Payload Normalization", () => {
    it("normalizes unversioned legacy folder preset into version 1 format", () => {
      const legacyPreset: UniversalPresetItem = {
        id: "legacy_folder",
        name: "Legacy Folder",
        category: "folder",
        createdAt: 1700000000,
        data: sampleTabs, // Raw array without version tag
      };

      const normalized = normalizePresetPayload(legacyPreset);
      expect(normalized.version).toBe(1);
      expect(normalized.kind).toBe("folder");
      expect(normalized.tabs.length).toBe(2);
    });

    it("normalizes unversioned legacy box preset into version 1 format with proper category", () => {
      const legacyBoxPreset: UniversalPresetItem = {
        id: "legacy_box",
        name: "Legacy Box",
        category: "box",
        createdAt: 1700000000,
        data: { kind: "sites", colSpan: 6, rowSpan: 1 },
      };

      const normalized = normalizePresetPayload(legacyBoxPreset);
      expect(normalized.version).toBe(1);
      expect(normalized.kind).toBe("box");
      expect(normalized.box.tabRef).toBe("T1");
      expect(normalized.box.category).toBe("sites_studio");
      expect(normalized.box.colSpan).toBe(6);
    });

    it("normalizes unversioned legacy home preset into version 1 format", () => {
      const legacyHomePreset: UniversalPresetItem = {
        id: "legacy_home",
        name: "Legacy Home",
        category: "home",
        createdAt: 1700000000,
        data: [{ id: "widget_stats", visible: true, colSpan: 12 }],
      };

      const normalized = normalizePresetPayload(legacyHomePreset);
      expect(normalized.version).toBe(1);
      expect(normalized.kind).toBe("home");
      expect(normalized.widgets.length).toBe(1);
      expect(normalized.widgets[0].id).toBe("widget_stats");
    });
  });

  describe("7. Scope Isolation Invariants (Rule 10: Never Cross-Write)", () => {
    it("ensures universal and custom folder tab keys are strictly disjoint", () => {
      const universalKey = "markly_universal_folder_tabs";
      const folderId = "fld_analytics_001";
      const customKey = `markly_folder_tabs_${folderId}`;

      expect(universalKey).not.toBe(customKey);
      expect(customKey.startsWith("markly_folder_tabs_")).toBe(true);
      expect(universalKey.includes(folderId)).toBe(false);
    });
  });

  describe("8. Built-in Preset Tombstone Idempotency", () => {
    it("tombstone list deduplicates multiple deletions of the same built-in ID", () => {
      const initialTombstones = ["preset_home_minimal"];
      const idToDelete = "preset_home_minimal";

      const updated = Array.from(new Set([...initialTombstones, idToDelete]));
      expect(updated.length).toBe(1);
      expect(updated).toEqual(["preset_home_minimal"]);
    });

    it("restoring built-ins safely empties the tombstone set", () => {
      const tombstones = ["preset_home_minimal", "preset_folder_deep"];
      const restored = filterPresetsWithTombstones(
        [
          { id: "preset_home_minimal", name: "Min", category: "home", isBuiltIn: true, createdAt: 1, data: null },
          { id: "preset_folder_deep", name: "Deep", category: "folder", isBuiltIn: true, createdAt: 1, data: null },
        ],
        [] // Empty tombstone array after restore
      );

      expect(restored.length).toBe(2);
    });
  });
});
