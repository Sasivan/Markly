"use client";

import * as React from "react";
import {
  BarChart3,
  PieChart,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Sparkles,
  Layers,
  Activity,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VizChart } from "@/components/viz/viz-chart";
import { VizBuilderDialog } from "@/components/viz/viz-builder-dialog";
import type { VizConfig, VizChartType } from "@/lib/viz";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";

export interface FolderFilter {
  type: "domain" | "status" | "tag" | "folder";
  value: string;
}

interface FolderVisualAnalyticsProps {
  folderId: string;
  folderName: string;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  activeFilter: FolderFilter | null;
  onFilterChange: (filter: FolderFilter | null) => void;
}

export function FolderVisualAnalytics({
  folderId,
  folderName,
  bookmarks,
  folders,
  activeFilter,
  onFilterChange,
}: FolderVisualAnalyticsProps) {
  // Collapsible section state (persisted per folder)
  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_viz_expanded_${folderId}`);
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return true;
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`markly_folder_viz_expanded_${folderId}`, String(next));
      } catch {}
      return next;
    });
  };

  // Default visuals for any folder
  const defaultFolderVisuals: VizConfig[] = React.useMemo(() => [
    {
      version: 1,
      id: `fld_domain_${folderId}`,
      title: "Domain Breakdown",
      chartType: "bar",
      dimension: "domain",
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 6,
      otherBucket: true,
    },
    {
      version: 1,
      id: `fld_status_${folderId}`,
      title: "Link Health Status",
      chartType: "donut",
      dimension: "status",
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 4,
      otherBucket: false,
    },
    {
      version: 1,
      id: `fld_tag_${folderId}`,
      title: "Tag Distribution",
      chartType: "donut",
      dimension: "tag",
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 6,
      otherBucket: true,
    },
  ], [folderId]);

  // Load persisted visuals for this folder
  const [visuals, setVisuals] = React.useState<VizConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_visuals_${folderId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return defaultFolderVisuals;
  });

  // Keep in sync with folderId change
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(`markly_folder_visuals_${folderId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setVisuals(parsed);
          return;
        }
      }
    } catch {}
    setVisuals(defaultFolderVisuals);
  }, [folderId, defaultFolderVisuals]);

  const saveVisuals = (updated: VizConfig[]) => {
    setVisuals(updated);
    try {
      localStorage.setItem(`markly_folder_visuals_${folderId}`, JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteVisual = (id: string) => {
    const updated = visuals.filter((v) => v.id !== id);
    saveVisuals(updated);
  };

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = React.useState(false);
  const presetMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
        setPresetMenuOpen(false);
      }
    }
    if (presetMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [presetMenuOpen]);

  const handleAddPreset = (type: "bar" | "donut" | "line" | "area" | "table", dim: any, title: string) => {
    const newConfig: VizConfig = {
      version: 1,
      id: `fld_${Date.now()}`,
      title,
      chartType: type,
      dimension: dim,
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: type === "donut" ? 6 : 8,
      otherBucket: true,
    };
    saveVisuals([...visuals, newConfig]);
    setPresetMenuOpen(false);
  };

  const handleSaveCustomVisual = (config: VizConfig) => {
    saveVisuals([...visuals, config]);
    setBuilderOpen(false);
  };

  // Interactive Chart Click Handlers
  const handleSelectDomain = (domain: string) => {
    if (activeFilter?.type === "domain" && activeFilter.value === domain) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "domain", value: domain });
    }
  };

  const handleSelectTag = (tag: string) => {
    if (activeFilter?.type === "tag" && activeFilter.value === tag) {
      onFilterChange(null);
    } else {
      onFilterChange({ type: "tag", value: tag });
    }
  };

  // If there are no bookmarks, don't show empty analytics
  if (bookmarks.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden transition-all duration-200">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/60 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-left min-w-0"
        >
          <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span>Visual Analytics & Intelligence</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60">
                {visuals.length} {visuals.length === 1 ? "chart" : "charts"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              Interactive charts for <strong className="text-foreground">{folderName}</strong>. Click any bar or slice to filter the list below.
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active Filter Clear Pill */}
          {activeFilter && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-md text-xs animate-in fade-in">
              <Filter className="h-3 w-3" />
              <span className="font-medium text-[11px]">
                {activeFilter.type}: <strong>{activeFilter.value}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange(null)}
                className="hover:text-destructive cursor-pointer ml-1 p-0.5"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Add Visual Dropdown */}
          <div className="relative" ref={presetMenuRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetMenuOpen(!presetMenuOpen)}
              className="h-7 px-2 text-xs gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Add Visual</span>
            </Button>

            {presetMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 text-xs text-foreground animate-in zoom-in-95 space-y-1">
                <div className="font-semibold px-2 py-1 text-[11px] text-muted-foreground border-b border-border mb-1">
                  Add Visual to {folderName}
                </div>
                <button
                  type="button"
                  onClick={() => handleAddPreset("bar", "domain", "Top Domains Bar")}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center gap-2 text-xs"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  <span>Top Domains Bar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPreset("donut", "status", "Health Status Donut")}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center gap-2 text-xs"
                >
                  <PieChart className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Health Status Donut</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPreset("donut", "tag", "Tag Distribution Donut")}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center gap-2 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Tag Distribution Donut</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPreset("area", "created_month", "Monthly Ingestion")}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center gap-2 text-xs"
                >
                  <Activity className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Monthly Ingestion Trend</span>
                </button>
                <div className="border-t border-border pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPresetMenuOpen(false);
                      setBuilderOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium cursor-pointer flex items-center gap-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Custom Visual Builder...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={toggleExpanded}
            className="h-7 w-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
            title={isExpanded ? "Collapse Analytics" : "Expand Analytics"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Body: Charts Grid */}
      {isExpanded && (
        <div className="p-3.5 bg-card">
          {visuals.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
              <p>No visual analytics active for this folder.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveVisuals(defaultFolderVisuals)}
                className="text-xs cursor-pointer"
              >
                Restore Default Charts
              </Button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${visuals.length === 1 ? "md:grid-cols-1" : visuals.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-3`}>
              {visuals.map((viz) => (
                <div
                  key={viz.id}
                  className="rounded-lg border border-border/70 bg-secondary/15 p-3 flex flex-col justify-between group hover:border-border transition-colors relative"
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between pb-2 mb-1 border-b border-border/40">
                    <span className="text-xs font-semibold text-foreground truncate pr-2">
                      {viz.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteVisual(viz.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-opacity"
                      title="Remove chart from folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Render Visual */}
                  <div className="flex-1 min-h-[160px]">
                    <VizChart
                      config={viz}
                      bookmarks={bookmarks}
                      folders={folders}
                      height={160}
                      onSelectDomain={handleSelectDomain}
                      onSelectTag={handleSelectTag}
                      bare={true}
                    />
                  </div>

                  <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/30 mt-1">
                    <span>Click element to filter</span>
                    <span className="uppercase">{viz.chartType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Visual Builder Dialog */}
      <VizBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveCustomVisual}
      />
    </div>
  );
}
