"use client";

import * as React from "react";
import {
  BarChart3,
  Plus,
  Sparkles,
  TrendingUp,
  Folder,
  Layers,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import type { HomeWidgetConfig } from "@/components/home/home-layout-modal";
import type { VizConfig } from "@/lib/viz";
import { VizChart } from "./viz-chart";
import { VizBuilderDialog } from "./viz-builder-dialog";

export interface VisualsPageViewProps {
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectFolder?: (folderId: string | null) => void;
  onNavigateHome?: () => void;
}

export function VisualsPageView({
  bookmarks,
  folders,
  onSelectDomain,
  onSelectTag,
  onSelectFolder,
  onNavigateHome,
}: VisualsPageViewProps) {
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] = React.useState<VizConfig | null>(null);

  // Load custom visual widgets from localStorage
  const [customWidgets, setCustomWidgets] = React.useState<HomeWidgetConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_home_widgets");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((w) => w.kind === "custom" || w.id.startsWith("custom:"));
          }
        }
      } catch {}
    }
    return [];
  });

  const handleSaveVisual = (newConfig: VizConfig) => {
    try {
      const stored = localStorage.getItem("markly_home_widgets");
      const current = stored ? JSON.parse(stored) : [];
      let updated: any[];

      const existingIdx = current.findIndex((w: any) => w.vizConfig?.id === newConfig.id || w.id === `custom:${newConfig.id}`);
      if (existingIdx !== -1) {
        updated = current.map((w: any, idx: number) =>
          idx === existingIdx
            ? { ...w, label: newConfig.title, vizConfig: newConfig }
            : w
        );
      } else {
        const customCount = current.filter((w: any) => w.kind === "custom" || (typeof w.id === "string" && w.id.startsWith("custom:"))).length;
        if (customCount >= 30) {
          alert("Maximum limit of 30 custom visuals reached. Please remove an existing visual first.");
          return;
        }
        const newWidget: HomeWidgetConfig = {
          id: `custom:${newConfig.id}`,
          label: newConfig.title,
          visible: true,
          kind: "custom",
          vizConfig: newConfig,
          colSpan: 6,
          span: "1",
        };
        updated = [...current, newWidget];
      }

      localStorage.setItem("markly_home_widgets", JSON.stringify(updated));
      setCustomWidgets(updated.filter((w: any) => w.kind === "custom" || w.id.startsWith("custom:")));
    } catch {}
    setBuilderOpen(false);
    setEditingConfig(null);
  };

  const handleDeleteWidget = (id: string) => {
    try {
      const stored = localStorage.getItem("markly_home_widgets");
      if (stored) {
        const current = JSON.parse(stored);
        const filtered = current.filter((w: any) => w.id !== id);
        localStorage.setItem("markly_home_widgets", JSON.stringify(filtered));
        setCustomWidgets(filtered.filter((w: any) => w.kind === "custom" || w.id.startsWith("custom:")));
      }
    } catch {}
  };

  // Builtin foundational charts for the Visuals page
  const coreVisuals: VizConfig[] = [
    {
      version: 1,
      id: "core_bookmarks_monthly",
      title: "Monthly Ingestion Velocity",
      chartType: "area",
      dimension: "created_month",
      measure: "count",
      filters: {},
      sort: { by: "dimension", direction: "asc" },
      limit: 12,
      otherBucket: false,
    },
    {
      version: 1,
      id: "core_top_domains",
      title: "Ecosystem Domain Share",
      chartType: "bar",
      dimension: "domain",
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 8,
      otherBucket: true,
    },
    {
      version: 1,
      id: "core_folder_breakdown",
      title: "Top-Level Collection Distribution",
      chartType: "donut",
      dimension: "folder_top",
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 7,
      otherBucket: true,
    },
    {
      version: 1,
      id: "core_link_status",
      title: "Link Health Overview",
      chartType: "donut",
      dimension: "status",
      measure: "count",
      filters: {},
      sort: { by: "measure", direction: "desc" },
      limit: 4,
      otherBucket: false,
    },
  ];

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground border border-border inline-flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-primary" />
                Workspace Intelligence
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {bookmarks.length} links tracked
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Visuals & Analytics
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Inspect bookmark collection trends, domain ecosystems, health status, and build custom visual widgets.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onNavigateHome && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateHome}
                className="text-xs h-8 cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <span>Dashboard Home</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditingConfig(null);
                setBuilderOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Visual</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Custom User Visuals Section */}
      {customWidgets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Your Custom Visuals ({customWidgets.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Live on Dashboard Home
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customWidgets.map((widget) => (
              <div
                key={widget.id}
                className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-xs font-semibold text-foreground truncate">
                      {widget.vizConfig?.title || widget.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (widget.vizConfig) {
                          setEditingConfig(widget.vizConfig);
                          setBuilderOpen(true);
                        }
                      }}
                      className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-secondary cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWidget(widget.id)}
                      className="text-[11px] font-mono text-destructive hover:text-destructive/80 px-2 py-0.5 rounded hover:bg-destructive/10 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  {widget.vizConfig ? (
                    <VizChart
                      config={widget.vizConfig}
                      bookmarks={bookmarks}
                      folders={folders}
                      height={220}
                      onSelectDomain={onSelectDomain}
                      onSelectTag={onSelectTag}
                      onSelectFolder={onSelectFolder}
                      bare={true}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workspace Foundation Visuals Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Core Workspace Analytics
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreVisuals.map((viz) => (
            <div
              key={viz.id}
              className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="text-xs font-semibold text-foreground truncate">
                    {viz.title}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {viz.chartType}
                </span>
              </div>

              <div className="pt-1">
                <VizChart
                  config={viz}
                  bookmarks={bookmarks}
                  folders={folders}
                  height={220}
                  onSelectDomain={onSelectDomain}
                  onSelectTag={onSelectTag}
                  onSelectFolder={onSelectFolder}
                  bare={false}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Builder Dialog */}
      <VizBuilderDialog
        open={builderOpen}
        onOpenChange={(op) => {
          setBuilderOpen(op);
          if (!op) setEditingConfig(null);
        }}
        initialConfig={editingConfig}
        bookmarks={bookmarks}
        folders={folders}
        onSave={handleSaveVisual}
      />
    </div>
  );
}
