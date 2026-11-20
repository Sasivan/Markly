import { describe, it, expect, beforeEach, vi } from "vitest";
import { SearchPresetAdapter } from "@/lib/presets/adapters/search-adapter";
import { searchQuerySnapshotSchema, presetRecordSchema } from "@/lib/presets/schemas";
import { PresetRepository } from "@/lib/presets/repository";
import { PresetService } from "@/lib/presets/service";
import type { PresetRecord, SearchQuerySnapshot } from "@/lib/presets/types";

describe("Search Presets and Search Results View Integration", () => {
  const storage: Record<string, string> = {};
  const dispatchedEvents: Array<{ type: string; detail: any }> = [];

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
    dispatchedEvents.length = 0;

    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
      dispatchEvent: (e: any) => {
        dispatchedEvents.push({ type: e.type, detail: e.detail });
        return true;
      },
    });
  });

  it("validates search query snapshot with full multi-view and filter options", () => {
    const snapshot: SearchQuerySnapshot = {
      version: 2,
      kind: "search-query",
      query: "react typescript",
      filters: {
        folderId: "folder-dev",
        domain: "github.com",
        tag: "frontend",
        status: "alive",
        onlyFavorites: true,
      },
      presentation: {
        viewMode: "table",
        coverStyle: "monogram",
        sortBy: "title",
      },
      visuals: {
        showAnalytics: true,
        showFacets: true,
      },
    };

    const parsed = searchQuerySnapshotSchema.safeParse(snapshot);
    expect(parsed.success).toBe(true);
  });

  it("captures full search query snapshot using SearchPresetAdapter", async () => {
    const snapshot = SearchPresetAdapter.capture(
      "machine learning",
      { domain: "arxiv.org", status: "alive" },
      { viewMode: "grid", coverStyle: "thumbnail", sortBy: "recent" },
      { showAnalytics: true, showFacets: true }
    );

    expect(snapshot.version).toBe(2);
    expect(snapshot.kind).toBe("search-query");
    expect(snapshot.query).toBe("machine learning");
    expect(snapshot.filters?.domain).toBe("arxiv.org");
    expect(snapshot.presentation?.viewMode).toBe("grid");
    expect(snapshot.presentation?.coverStyle).toBe("thumbnail");
    expect(snapshot.visuals?.showAnalytics).toBe(true);
  });

  it("applies search preset by persisting active preset and dispatching markly-execute-search", async () => {
    const snapshot: SearchQuerySnapshot = {
      version: 2,
      kind: "search-query",
      query: "design tokens",
      presentation: {
        viewMode: "cards",
        coverStyle: "icon",
      },
    };

    const result = SearchPresetAdapter.apply(snapshot);
    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);

    // Verify localStorage item was stored
    const stored = storage["markly_active_search_preset"];
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored);
    expect(parsed.query).toBe("design tokens");

    // Verify window event was dispatched
    const event = dispatchedEvents.find((e) => e.type === "markly-execute-search");
    expect(event).toBeDefined();
    expect(event?.detail.query).toBe("design tokens");
    expect(event?.detail.presentation?.coverStyle).toBe("icon");
  });

  it("lists all search presets with getByCategory", async () => {
    const repo = PresetRepository.getInstance();
    const searchPresets = await repo.getByCategory("search");
    expect(Array.isArray(searchPresets)).toBe(true);
    expect(searchPresets.length).toBeGreaterThan(0);

    const first = searchPresets[0];
    expect(first.category).toBe("search");
    expect(first.kind).toBe("search-query");
    expect((first.snapshot as SearchQuerySnapshot).query).toBeDefined();
  });

  it("creates, saves and applies a user search preset through PresetService", async () => {
    const snapshot = SearchPresetAdapter.capture(
      "tag:react is:favorite",
      { tag: "react", onlyFavorites: true },
      { viewMode: "table", coverStyle: "monogram" }
    );

    const presetRecord: PresetRecord = {
      id: "user-preset-search-1",
      schemaVersion: 2,
      kind: "search-query",
      category: "search",
      name: "Favorite React Libraries",
      description: "Fast filter for react bookmarks",
      tags: ["react", "frontend"],
      ownership: "user",
      isBuiltIn: false,
      source: { surface: "search", capturedAt: Date.now() },
      snapshot,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    await PresetService.savePreset(presetRecord);

    const retrieved = await PresetRepository.getInstance().getById("user-preset-search-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Favorite React Libraries");

    // Apply created preset through PresetService
    const applyResult = await PresetService.applyPreset(retrieved!, { kind: "home" });
    expect(applyResult.success).toBe(true);

    const event = dispatchedEvents.find((e) => e.type === "markly-execute-search");
    expect(event).toBeDefined();
    expect(event?.detail.query).toBe("tag:react is:favorite");
  });
});
