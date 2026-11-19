/**
 * Markly Unified Preset System — Search Query Adapter
 */

import type { SearchQuerySnapshot, ApplyResult } from "../types";

export class SearchPresetAdapter {
  public static capture(
    query: string,
    filters?: SearchQuerySnapshot["filters"],
    presentation?: SearchQuerySnapshot["presentation"],
    visuals?: SearchQuerySnapshot["visuals"]
  ): SearchQuerySnapshot {
    return {
      version: 2,
      kind: "search-query",
      query: query.trim(),
      filters,
      presentation,
      visuals,
    };
  }

  public static apply(snapshot: SearchQuerySnapshot): ApplyResult {
    if (typeof window === "undefined") {
      return { success: false, error: "Cannot execute search outside browser" };
    }

    if (!snapshot || !snapshot.query) {
      return { success: false, error: "Empty search query" };
    }

    try {
      localStorage.setItem("markly_active_search_preset", JSON.stringify(snapshot));
    } catch {}

    window.dispatchEvent(
      new CustomEvent("markly-execute-search", { detail: snapshot })
    );

    return {
      success: true,
      affectedCount: 1,
      details: { query: snapshot.query, snapshot },
    };
  }
}
