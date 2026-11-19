"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  Folder as FolderIcon,
  Globe,
  Tag,
  Star,
  Activity,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit2,
  Trash2,
  Archive,
  ArrowRight,
  Filter,
  X,
  LayoutGrid,
  List,
  Rows3,
  Table as TableIcon,
  Camera,
  Check,
  Plus,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import {
  BookmarkItemsView,
  type WidgetViewMode,
} from "@/components/home/dashboard-widget-box";
import { PresetService } from "@/lib/presets/service";
import { PresetRepository } from "@/lib/presets/repository";
import { SearchPresetAdapter } from "@/lib/presets/adapters/search-adapter";
import type { PresetRecord, SearchQuerySnapshot } from "@/lib/presets/types";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";

export type CardCoverStyle = "thumbnail" | "icon" | "monogram";
export type SearchViewMode = "cards" | "grid" | "list" | "table" | "compact";

function getDomainGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 42%, 20%) 0%, hsl(${h2}, 52%, 11%) 100%)`;
}

interface SearchResultsViewProps {
  query: string;
  onQueryChange?: (q: string) => void;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  onSelectFolder: (folderId: string | null) => void;
  onSelectView?: (view: any) => void;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: (id: string, title?: string) => void;
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
  onOpenAddModal?: (prefilledUrl?: string) => void;
  onNavigateHome?: () => void;
  initialViewMode?: SearchViewMode | "board" | string;
  initialCoverStyle?: CardCoverStyle;
  initialSnapshot?: SearchQuerySnapshot;
  onSavePreset?: () => void;
}

export function SearchResultsView({
  query,
  onQueryChange,
  bookmarks,
  folders,
  onSelectFolder,
  onSelectView,
  onOpenPreview,
  onEditBookmark,
  onToggleFavorite,
  onToggleArchive,
  onDeleteBookmark,
  onRecordVisit,
  onOpenAddModal,
  onNavigateHome,
  initialViewMode = "cards",
  initialCoverStyle = "thumbnail",
  initialSnapshot,
}: SearchResultsViewProps) {
  // Input query state
  const [searchInput, setSearchInput] = React.useState(query);
  React.useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const normalizedInitialMode: SearchViewMode =
    initialViewMode === "board" ? "cards" : (initialViewMode as SearchViewMode) || "cards";

  // Layout presentation state
  const [viewMode, setViewMode] = React.useState<SearchViewMode>(
    (initialSnapshot?.presentation?.viewMode as SearchViewMode) || normalizedInitialMode
  );
  const [coverStyle, setCoverStyle] = React.useState<CardCoverStyle>(
    initialSnapshot?.presentation?.coverStyle || initialCoverStyle || "thumbnail"
  );
  const [sortBy, setSortBy] = React.useState<"recent" | "created" | "visits" | "title">(
    initialSnapshot?.presentation?.sortBy || "recent"
  );

  // Facet filter overrides
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(
    initialSnapshot?.filters?.folderId ?? null
  );
  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(
    initialSnapshot?.filters?.domain ?? null
  );
  const [selectedTag, setSelectedTag] = React.useState<string | null>(
    initialSnapshot?.filters?.tag ?? null
  );
  const [statusFilter, setStatusFilter] = React.useState<"all" | "alive" | "dead" | "favorite" | "archived">(
    (initialSnapshot?.filters?.status as any) ||
      (initialSnapshot?.filters?.onlyFavorites ? "favorite" : "all")
  );

  // Saved Search Presets
  const [savedSearchPresets, setSavedSearchPresets] = React.useState<PresetRecord[]>([]);
  const [activePresetId, setActivePresetId] = React.useState<string | null>(null);

  const loadSearchPresets = React.useCallback(async () => {
    try {
      const all = await PresetRepository.getByCategory("search");
      setSavedSearchPresets(all);
    } catch (e) {
      console.error("Failed to load search presets:", e);
    }
  }, []);

  React.useEffect(() => {
    loadSearchPresets();
  }, [loadSearchPresets]);

  // Save Search Preset Modal State
  const [saveModalOpen, setSaveModalOpen] = React.useState(false);
  const [newPresetName, setNewPresetName] = React.useState("");
  const [newPresetDesc, setNewPresetDesc] = React.useState("");
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // 1. COMPREHENSIVE MULTI-DIMENSIONAL QUERY MATCHER
  const filteredResults = React.useMemo(() => {
    const rawQ = query.trim().toLowerCase();
    if (!rawQ && !selectedFolderId && !selectedDomain && !selectedTag && statusFilter === "all") {
      return bookmarks;
    }

    // Parse tokens and search directives
    const tokens = rawQ.split(/\s+/).filter(Boolean);
    const textTokens: string[] = [];
    let isFavDirective = false;
    let isArchivedDirective = false;
    let isDeadDirective = false;
    let tagDirective: string | null = null;
    let folderDirective: string | null = null;
    let domainDirective: string | null = null;

    for (const t of tokens) {
      if (t === "is:favorite" || t === "is:starred") isFavDirective = true;
      else if (t === "is:archived") isArchivedDirective = true;
      else if (t === "is:broken" || t === "is:dead") isDeadDirective = true;
      else if (t.startsWith("tag:")) tagDirective = t.slice(4).trim().toLowerCase();
      else if (t.startsWith("folder:")) folderDirective = t.slice(7).trim().toLowerCase();
      else if (t.startsWith("domain:")) domainDirective = t.slice(7).trim().toLowerCase();
      else textTokens.push(t);
    }

    return bookmarks.filter((bm) => {
      // 1. Directive filters
      if (isFavDirective && !bm.isFavorite) return false;
      if (isArchivedDirective && !bm.isArchived) return false;
      if (!isArchivedDirective && bm.isArchived && statusFilter !== "archived") return false;
      if (isDeadDirective && (bm as any).status !== "dead" && (bm as any).healthStatus !== "broken") return false;

      // 2. Interactive Facet filters
      if (selectedFolderId && bm.folderId !== selectedFolderId) return false;
      if (selectedDomain && (bm.domain || "").toLowerCase() !== selectedDomain.toLowerCase()) return false;
      if (selectedTag) {
        const hasTag = (bm.tags || []).some(
          (t) => (typeof t === "string" ? t : t.name).toLowerCase() === selectedTag.toLowerCase()
        );
        if (!hasTag) return false;
      }

      if (statusFilter === "favorite" && !bm.isFavorite) return false;
      if (statusFilter === "archived" && !bm.isArchived) return false;
      if (statusFilter === "alive" && ((bm as any).status === "dead" || (bm as any).healthStatus === "broken")) return false;
      if (statusFilter === "dead" && (bm as any).status !== "dead" && (bm as any).healthStatus !== "broken") return false;

      // 3. Keyword / Directive matchers
      const folder = bm.folderId ? folders.find((f) => f.id === bm.folderId) : null;
      const folderName = (folder?.name || "").toLowerCase();
      const domain = (bm.domain || "").toLowerCase();
      const tagNames = (bm.tags || []).map((t) => (typeof t === "string" ? t : t.name).toLowerCase());

      if (tagDirective && !tagNames.some((t) => t.includes(tagDirective!))) return false;
      if (folderDirective && !folderName.includes(folderDirective)) return false;
      if (domainDirective && !domain.includes(domainDirective)) return false;

      if (textTokens.length === 0) return true;

      const searchableBlob = [
        bm.title || "",
        bm.domain || "",
        bm.url || "",
        bm.description || "",
        folderName,
        ...tagNames,
      ]
        .join(" ")
        .toLowerCase();

      return textTokens.every((token) => searchableBlob.includes(token));
    });
  }, [bookmarks, folders, query, selectedFolderId, selectedDomain, selectedTag, statusFilter]);

  // 2. SORTED RESULTS
  const sortedResults = React.useMemo(() => {
    const list = [...filteredResults];
    if (sortBy === "recent") {
      list.sort((a, b) => {
        const tA = new Date(a.lastClickedAt || a.lastVisitedAt || a.createdAt).getTime();
        const tB = new Date(b.lastClickedAt || b.lastVisitedAt || b.createdAt).getTime();
        return tB - tA;
      });
    } else if (sortBy === "created") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "visits") {
      list.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    } else if (sortBy === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
    return list;
  }, [filteredResults, sortBy]);

  // 3. REFERENCE DATA & FACETS ANALYSIS (Visual Intelligence)
  const referenceData = React.useMemo(() => {
    const folderMap = new Map<string, number>();
    const domainMap = new Map<string, number>();
    const tagMap = new Map<string, number>();
    let deadLinksCount = 0;
    let starredCount = 0;
    let totalVisits = 0;

    for (const b of filteredResults) {
      if (b.folderId) {
        folderMap.set(b.folderId, (folderMap.get(b.folderId) || 0) + 1);
      }
      if (b.domain) {
        domainMap.set(b.domain, (domainMap.get(b.domain) || 0) + 1);
      }
      for (const t of b.tags || []) {
        const name = typeof t === "string" ? t : t.name;
        tagMap.set(name, (tagMap.get(name) || 0) + 1);
      }
      if ((b as any).status === "dead" || (b as any).healthStatus === "broken") {
        deadLinksCount++;
      }
      if (b.isFavorite) starredCount++;
      totalVisits += b.visitCount || 0;
    }

    const sortedDomains = Array.from(domainMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    const sortedFolders = Array.from(folderMap.entries())
      .map(([folderId, count]) => ({
        folder: folders.find((f) => f.id === folderId),
        folderId,
        count,
      }))
      .filter((f) => f.folder)
      .sort((a, b) => b.count - a.count);

    const sortedTags = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const liveHealthPct =
      filteredResults.length > 0
        ? Math.round(((filteredResults.length - deadLinksCount) / filteredResults.length) * 100)
        : 100;

    return {
      total: filteredResults.length,
      domains: sortedDomains,
      folders: sortedFolders,
      tags: sortedTags,
      deadLinksCount,
      starredCount,
      totalVisits,
      liveHealthPct,
    };
  }, [filteredResults, folders]);

  // 4. APPLY SAVED PRESET
  const handleApplySavedPreset = (preset: PresetRecord) => {
    setActivePresetId(preset.id);
    const snap = preset.snapshot as SearchQuerySnapshot;
    if (!snap) return;

    onQueryChange?.(snap.query || "");
    setSearchInput(snap.query || "");

    if (snap.presentation?.viewMode) setViewMode(snap.presentation.viewMode);
    if (snap.presentation?.coverStyle) setCoverStyle(snap.presentation.coverStyle);
    if (snap.presentation?.sortBy) setSortBy(snap.presentation.sortBy);

    if (snap.filters) {
      setSelectedFolderId(snap.filters.folderId || null);
      setSelectedDomain(snap.filters.domain || null);
      setSelectedTag(snap.filters.tag || null);
      setStatusFilter((snap.filters.status as any) || (snap.filters.onlyFavorites ? "favorite" : "all"));
    } else {
      setSelectedFolderId(null);
      setSelectedDomain(null);
      setSelectedTag(null);
      setStatusFilter("all");
    }

    showStatus(`Loaded search preset "${preset.name}"`);
  };

  // 5. SAVE CURRENT SEARCH AS PRESET
  const handleSaveSearchPreset = async () => {
    const name = newPresetName.trim() || `Search: ${query}`;
    const now = Date.now();
    const snapshot: SearchQuerySnapshot = SearchPresetAdapter.capture(
      query,
      {
        folderId: selectedFolderId,
        domain: selectedDomain,
        tag: selectedTag,
        status: statusFilter !== "all" ? statusFilter : undefined,
        onlyFavorites: statusFilter === "favorite",
      },
      {
        viewMode,
        coverStyle,
        sortBy,
      },
      {
        showAnalytics: true,
        showFacets: true,
      }
    );

    const newRecord: PresetRecord = {
      id: `preset_search_${now}`,
      schemaVersion: 2,
      kind: "search-query",
      category: "search",
      name,
      description: newPresetDesc.trim() || `Query: "${query}" with ${filteredResults.length} matches`,
      tags: ["user", "search-preset", ...(selectedTag ? [selectedTag] : [])],
      ownership: "user",
      source: {
        surface: "search",
        capturedAt: now,
      },
      snapshot,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    try {
      await PresetService.savePreset(newRecord);
      await loadSearchPresets();
      setActivePresetId(newRecord.id);
      setSaveModalOpen(false);
      setNewPresetName("");
      setNewPresetDesc("");
      showStatus(`Saved "${name}" to Search Presets!`);
    } catch (e: any) {
      console.error("Save search preset error:", e);
      showStatus(e?.message || "Failed to save preset");
    }
  };

  const hasActiveFacets =
    Boolean(selectedFolderId) || Boolean(selectedDomain) || Boolean(selectedTag) || statusFilter !== "all";

  const clearAllFacets = () => {
    setSelectedFolderId(null);
    setSelectedDomain(null);
    setSelectedTag(null);
    setStatusFilter("all");
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-12">
      {/* Search Header Bar with Live Input, Match Count & Quick Save */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground">
                  Search Results
                </h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tabular-nums">
                  {filteredResults.length} {filteredResults.length === 1 ? "match" : "matches"}
                </span>
                {statusMsg && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                    ✓ {statusMsg}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Querying all bookmarks, folder taxonomy, tags, and domain intelligence.
              </p>
            </div>
          </div>

          {/* Save Preset Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setNewPresetName(query ? `Search: ${query}` : "My Search Preset");
                setNewPresetDesc(`Saved search matching ${filteredResults.length} bookmarks`);
                setSaveModalOpen(true);
              }}
              className="text-xs h-8 px-3 gap-1.5 cursor-pointer border-border hover:bg-secondary font-medium shadow-2xs"
            >
              <Bookmark className="h-3.5 w-3.5 text-primary" />
              <span>Save as Preset</span>
            </Button>
          </div>
        </div>

        {/* Live Search Query Input Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onQueryChange?.(searchInput);
              }
            }}
            placeholder="Type search terms or operators like tag:tools, domain:github.com, is:favorite..."
            className="h-10 pl-10 pr-24 text-sm bg-background/80 rounded-xl border-border focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                onQueryChange?.("");
              }}
              className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
              title="Clear search query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Saved Search Presets Bar (Pill Chips) */}
        {savedSearchPresets.length > 0 && (
          <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Presets:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {savedSearchPresets.map((p) => {
                const isSel = activePresetId === p.id;
                const snap = p.snapshot as SearchQuerySnapshot;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplySavedPreset(p)}
                    className={`h-6 px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      isSel
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border/80 hover:bg-secondary"
                    }`}
                    title={p.description || `Apply preset: ${p.name}`}
                  >
                    <span>{p.name}</span>
                    {snap?.query && (
                      <span className="text-[10px] opacity-75 font-mono">
                        ({snap.query})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Visual Reference Analytics & KPI Summary (Adapted from Notion/Linear/GitHub search dashboards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Matches</span>
            <Bookmark className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground tabular-nums">
            {referenceData.total}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {referenceData.total === 1 ? "Matched link" : "Matched links"}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Folders</span>
            <FolderIcon className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-500 tabular-nums">
            {referenceData.folders.length}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Taxonomy groups
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Domains</span>
            <Globe className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-500 tabular-nums">
            {referenceData.domains.length}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Distinct hosts
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Starred</span>
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-500 tabular-nums">
            {referenceData.starredCount}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Priority favorites
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Link Health</span>
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground tabular-nums">
            {referenceData.liveHealthPct}%
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {referenceData.deadLinksCount > 0 ? `${referenceData.deadLinksCount} broken` : "All operational"}
          </div>
        </div>
      </div>

      {/* Interactive Reference Facets: Folders, Domains, Tags & Health */}
      <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3 shadow-2xs text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Interactive Facet Filters</span>
          </span>
          {hasActiveFacets && (
            <button
              type="button"
              onClick={clearAllFacets}
              className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* 1. Folders Facet */}
        {referenceData.folders.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0">Folder:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                  selectedFolderId === null
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                All ({referenceData.total})
              </button>
              {referenceData.folders.slice(0, 8).map((f) => {
                const isSel = selectedFolderId === f.folderId;
                return (
                  <button
                    key={f.folderId}
                    type="button"
                    onClick={() => setSelectedFolderId(isSel ? null : f.folderId)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                      isSel
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-2xs"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    <FolderIconRenderer icon={f.folder?.icon} color={f.folder?.color} className="h-3 w-3" />
                    <span>{f.folder?.name}</span>
                    <span className="text-[10px] font-mono opacity-80">({f.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Domains Facet */}
        {referenceData.domains.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-2">
            <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0">Domain:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedDomain(null)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                  selectedDomain === null
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                All ({referenceData.domains.length})
              </button>
              {referenceData.domains.slice(0, 8).map((d) => {
                const isSel = selectedDomain === d.domain;
                return (
                  <button
                    key={d.domain}
                    type="button"
                    onClick={() => setSelectedDomain(isSel ? null : d.domain)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer border ${
                      isSel
                        ? "bg-blue-500 text-white border-blue-500 shadow-2xs"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    <span>{d.domain}</span>
                    <span className="opacity-80">({d.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Tags Facet Cloud */}
        {referenceData.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-2">
            <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0">Tag:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                  selectedTag === null
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                All
              </button>
              {referenceData.tags.slice(0, 10).map((t) => {
                const isSel = selectedTag === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setSelectedTag(isSel ? null : t.name)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                      isSel
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-2xs"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    <span>#{t.name}</span>
                    <span className="opacity-80">({t.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Status Filter */}
        <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-2">
          <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0">Status:</span>
          <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border border-border">
            {[
              { id: "all", label: "All Items" },
              { id: "favorite", label: "Starred Only" },
              { id: "alive", label: "Operational" },
              { id: "dead", label: "Broken Links" },
              { id: "archived", label: "Archived" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  statusFilter === s.id
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header: Presentation View Switcher (5 Variations) & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">Showing:</span>
          <span className="font-mono text-muted-foreground">
            {sortedResults.length} of {bookmarks.length} total bookmarks
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 1-Click Card Cover Style Switcher when in Cards Mode */}
          {viewMode === "cards" && (
            <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border text-[11px] shrink-0">
              {[
                { id: "thumbnail" as const, label: "Snapshot", icon: Camera },
                { id: "monogram" as const, label: "Gradient", icon: Sparkles },
                { id: "icon" as const, label: "Logo", icon: Globe },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCoverStyle(s.id)}
                  className={`h-6 px-2 rounded-md font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    coverStyle === s.id
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={`Card Cover Style: ${s.label}`}
                >
                  <s.icon className="h-3 w-3" />
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 5 View Variations Switcher: Cards | Grid | List | Table | Compact */}
          <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border text-[11px] shrink-0">
            {[
              { id: "cards" as const, label: "Cards", icon: LayoutGrid },
              { id: "grid" as const, label: "Grid", icon: LayoutGrid },
              { id: "list" as const, label: "List", icon: List },
              { id: "table" as const, label: "Table", icon: TableIcon },
              { id: "compact" as const, label: "Compact", icon: Rows3 },
            ].map((v) => {
              const Icon = v.icon;
              const isSel = viewMode === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`h-6 px-2 rounded-md font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    isSel
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={`Switch to ${v.label} layout`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Order */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-7 px-2 rounded-lg border border-border bg-card text-foreground text-xs font-medium cursor-pointer"
          >
            <option value="recent">Recently Visited</option>
            <option value="created">Recently Added</option>
            <option value="visits">Most Visits</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Results Display Zone (Universal Variations) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs p-1">
        {sortedResults.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 border border-border text-muted-foreground mx-auto flex items-center justify-center">
              <Search className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No matching bookmarks found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No bookmarks in your library match &quot;{query}&quot; with current facet filters.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {hasActiveFacets && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllFacets}
                  className="text-xs h-8"
                >
                  Clear Filters
                </Button>
              )}
              {onOpenAddModal && (
                <Button
                  size="sm"
                  onClick={() => onOpenAddModal(query.startsWith("http") ? query : undefined)}
                  className="text-xs h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Bookmark</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <BookmarkItemsView
            items={sortedResults}
            mode={viewMode}
            cardCoverStyle={coverStyle}
            limit="all"
            onOpenPreview={onOpenPreview}
            onEditBookmark={onEditBookmark}
            onToggleFavorite={onToggleFavorite}
            onToggleArchive={onToggleArchive}
            onDeleteBookmark={onDeleteBookmark}
            handleSiteVisit={(bm) => {
              if (onRecordVisit) onRecordVisit(bm);
              window.open(bm.url, "_blank");
            }}
            getParentName={(bm) => {
              const folder = folders.find((f) => f.id === bm.folderId);
              return folder ? folder.name : bm.domain || "Workspace";
            }}
          />
        )}
      </div>

      {/* Save Preset Dialog */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md p-5 bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Save as Search Query Preset</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save this search query, current facet filters, and view mode to your library for instant 1-click execution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Preset Name
              </label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Starred AI Repositories"
                className="h-8 text-xs bg-background"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Description (Optional)
              </label>
              <Input
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                placeholder="Brief summary of search scope..."
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Snapshot Configuration Summary Card */}
            <div className="p-3 bg-secondary/40 rounded-xl border border-border space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Query:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">&quot;{query}&quot;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Layout:</span>
                <span className="text-foreground capitalize">{viewMode} ({coverStyle})</span>
              </div>
              {selectedFolderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Folder Scope:</span>
                  <span className="text-foreground">{folders.find((f) => f.id === selectedFolderId)?.name}</span>
                </div>
              )}
              {selectedDomain && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domain Filter:</span>
                  <span className="text-foreground">{selectedDomain}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSaveModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSearchPreset}
                disabled={!newPresetName.trim()}
                className="text-xs h-8 gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Preset</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
