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
  Activity,
  PanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VizChart } from "@/components/viz/viz-chart";
import { VizBuilderDialog } from "@/components/viz/viz-builder-dialog";
import type { VizConfig, VizChartType } from "@/lib/viz";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";

export interface FolderFilter {
  type: "domain" | "status" | "tag" | "folder";
  value: string;
}

interface Tab {
  id: string;
  label: string;
  visuals: VizConfig[];
}

interface FolderVisualAnalyticsProps {
  folderId: string;
  folderName: string;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  activeFilter: FolderFilter | null;
  onFilterChange: (filter: FolderFilter | null) => void;
}

const DEFAULT_TAB_LABEL = "Overview";

function makeDefaultVisuals(folderId: string): VizConfig[] {
  return [
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
  ];
}

function loadTabs(folderId: string, defaultVisuals: VizConfig[]): Tab[] {
  if (typeof window === "undefined") {
    return [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: defaultVisuals }];
  }
  try {
    const stored = localStorage.getItem(`markly_folder_tabs_${folderId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as Tab[];
    }
    // Legacy: check old flat list
    const legacy = localStorage.getItem(`markly_folder_visuals_${folderId}`);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        return [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: parsed }];
      }
    }
  } catch {}
  return [{ id: "tab_default", label: DEFAULT_TAB_LABEL, visuals: defaultVisuals }];
}

function persistTabs(folderId: string, tabs: Tab[]) {
  try {
    localStorage.setItem(`markly_folder_tabs_${folderId}`, JSON.stringify(tabs));
    // Keep legacy key in sync with active tab's visuals (tab[0]) for exports
    if (tabs.length > 0) {
      localStorage.setItem(`markly_folder_visuals_${folderId}`, JSON.stringify(tabs[0].visuals));
    }
  } catch {}
}

export function FolderVisualAnalytics({
  folderId,
  folderName,
  bookmarks,
  folders,
  activeFilter,
  onFilterChange,
}: FolderVisualAnalyticsProps) {
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

  const defaultVisuals = React.useMemo(() => makeDefaultVisuals(folderId), [folderId]);

  const [tabs, setTabs] = React.useState<Tab[]>(() => loadTabs(folderId, defaultVisuals));
  const [activeTabId, setActiveTabId] = React.useState<string>(() => tabs[0]?.id ?? "tab_default");
  const [renamingTabId, setRenamingTabId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  React.useEffect(() => {
    const loaded = loadTabs(folderId, makeDefaultVisuals(folderId));
    setTabs(loaded);
    setActiveTabId(loaded[0]?.id ?? "tab_default");
  }, [folderId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const updateTabs = (next: Tab[]) => {
    setTabs(next);
    persistTabs(folderId, next);
  };

  const handleAddTab = () => {
    const newId = `tab_${Date.now()}`;
    const newTab: Tab = { id: newId, label: `Tab ${tabs.length + 1}`, visuals: [] };
    const next = [...tabs, newTab];
    updateTabs(next);
    setActiveTabId(newId);
  };

  const handleDeleteTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const next = tabs.filter((t) => t.id !== tabId);
    updateTabs(next);
    if (activeTabId === tabId) setActiveTabId(next[0]?.id ?? "");
  };

  const startRename = (tab: Tab) => {
    setRenamingTabId(tab.id);
    setRenameValue(tab.label);
  };

  const commitRename = () => {
    if (!renamingTabId) return;
    const next = tabs.map((t) =>
      t.id === renamingTabId ? { ...t, label: renameValue.trim() || t.label } : t
    );
    updateTabs(next);
    setRenamingTabId(null);
  };

  const setTabVisuals = (tabId: string, visuals: VizConfig[]) => {
    const next = tabs.map((t) => (t.id === tabId ? { ...t, visuals } : t));
    updateTabs(next);
  };

  const handleDeleteVisual = (vizId: string) => {
    if (!activeTab) return;
    setTabVisuals(activeTab.id, activeTab.visuals.filter((v) => v.id !== vizId));
  };

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingViz, setEditingViz] = React.useState<VizConfig | null>(null);
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

  const handleAddPreset = (type: VizChartType, dim: any, title: string) => {
    if (!activeTab) return;
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
    setTabVisuals(activeTab.id, [...activeTab.visuals, newConfig]);
    setPresetMenuOpen(false);
  };

  const handleSaveCustomVisual = (config: VizConfig) => {
    if (!activeTab) return;
    const exists = activeTab.visuals.find((v) => v.id === config.id);
    if (exists) {
      setTabVisuals(activeTab.id, activeTab.visuals.map((v) => (v.id === config.id ? config : v)));
    } else {
      setTabVisuals(activeTab.id, [...activeTab.visuals, config]);
    }
    setBuilderOpen(false);
    setEditingViz(null);
  };

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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60">
                {activeTab?.visuals.length ?? 0} charts · {tabs.length} tab{tabs.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              Tabbed visual analytics for <strong className="text-foreground">{folderName}</strong>. Click any bar or slice to filter the list below.
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
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
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 text-xs text-foreground animate-in zoom-in-95 space-y-1">
                <div className="font-semibold px-2 py-1 text-[11px] text-muted-foreground border-b border-border mb-1">
                  Add to &ldquo;{activeTab?.label ?? "Tab"}&rdquo;
                </div>
                {[
                  { type: "bar" as VizChartType, dim: "domain", title: "Top Domains Bar", icon: BarChart3, color: "text-primary" },
                  { type: "donut" as VizChartType, dim: "status", title: "Health Status Donut", icon: PieChart, color: "text-emerald-500" },
                  { type: "donut" as VizChartType, dim: "tag", title: "Tag Distribution", icon: Sparkles, color: "text-amber-500" },
                  { type: "area" as VizChartType, dim: "created_month", title: "Monthly Ingestion", icon: Activity, color: "text-indigo-500" },
                  { type: "horizontal_bar" as VizChartType, dim: "domain", title: "Most Visited Domains", icon: BarChart3, color: "text-teal-500" },
                  { type: "donut" as VizChartType, dim: "folder_leaf", title: "Subfolder Breakdown", icon: PieChart, color: "text-violet-500" },
                ].map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.title}
                      type="button"
                      onClick={() => handleAddPreset(p.type, p.dim, p.title)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center gap-2 text-xs"
                    >
                      <Icon className={`h-3.5 w-3.5 ${p.color}`} />
                      <span>{p.title}</span>
                    </button>
                  );
                })}
                <div className="border-t border-border pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPresetMenuOpen(false);
                      setEditingViz(null);
                      setBuilderOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium cursor-pointer flex items-center gap-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Custom Visual Builder…</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Tab Button */}
          <button
            type="button"
            onClick={handleAddTab}
            className="h-7 w-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors border border-border/60"
            title="Add a new visual tab"
          >
            <PanelTop className="h-3.5 w-3.5" />
          </button>

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

      {/* Tabs Bar */}
      {isExpanded && tabs.length > 0 && (
        <div className="flex items-center gap-0.5 px-3 pt-2 border-b border-border/40 overflow-x-auto bg-card">
          {tabs.map((tab) => (
            <div key={tab.id} className="flex items-center group/tab shrink-0">
              {renamingTabId === tab.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingTabId(null);
                  }}
                  className="text-xs px-2 py-1 rounded border border-primary bg-background text-foreground w-24 outline-none mb-1"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                  className={`text-xs px-3 py-1.5 rounded-t-md font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
                    activeTabId === tab.id
                      ? "border-primary text-foreground bg-secondary/60"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                  title="Double-click to rename"
                >
                  {tab.label}
                  <span className="ml-1 text-[10px] font-mono text-muted-foreground">
                    ({tab.visuals.length})
                  </span>
                </button>
              )}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteTab(tab.id)}
                  className="ml-0.5 opacity-0 group-hover/tab:opacity-100 h-4 w-4 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-opacity mb-1"
                  title="Delete this tab"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddTab}
            className="ml-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded cursor-pointer hover:bg-secondary transition-colors shrink-0 mb-1"
            title="Add tab"
          >
            + Tab
          </button>
        </div>
      )}

      {/* Body: Charts Grid for Active Tab */}
      {isExpanded && activeTab && (
        <div className="p-3.5 bg-card">
          {activeTab.visuals.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground space-y-3">
              <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p>No visuals in &ldquo;{activeTab.label}&rdquo; yet.</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTabVisuals(activeTab.id, makeDefaultVisuals(folderId))}
                  className="text-xs cursor-pointer"
                >
                  Restore Default Charts
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setEditingViz(null);
                    setBuilderOpen(true);
                  }}
                  className="text-xs cursor-pointer gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Visual
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-3 ${
                activeTab.visuals.length === 1
                  ? "md:grid-cols-1"
                  : activeTab.visuals.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-3"
              }`}
            >
              {activeTab.visuals.map((viz) => (
                <div
                  key={viz.id}
                  className="rounded-lg border border-border/70 bg-secondary/15 p-3 flex flex-col justify-between group hover:border-border transition-colors relative"
                >
                  <div className="flex items-center justify-between pb-2 mb-1 border-b border-border/40">
                    <span className="text-xs font-semibold text-foreground truncate pr-2">
                      {viz.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingViz(viz);
                          setBuilderOpen(true);
                        }}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit visual"
                      >
                        <Sparkles className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVisual(viz.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Remove chart"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

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
        onOpenChange={(op) => {
          setBuilderOpen(op);
          if (!op) setEditingViz(null);
        }}
        initialConfig={editingViz}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveCustomVisual}
      />
    </div>
  );
}
