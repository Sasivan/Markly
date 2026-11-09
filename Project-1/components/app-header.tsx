"use client";

import * as React from "react";
import { Sparkles, ArrowUpDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import type { Folder } from "@/server/db/schema";

interface AppHeaderProps {
  onOpenAddModal: () => void;
  onOpenImportExport: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activeView?: string;
  activeFolder?: Folder | null;
}

export function AppHeader({
  onOpenAddModal,
  onOpenImportExport,
  isSidebarCollapsed,
  onToggleSidebar,
  activeView = "home",
  activeFolder,
}: AppHeaderProps) {
  const viewLabels: Record<string, string> = {
    home: "Workspace Home",
    all: "Quick Access",
    collections: "Folder Collections",
    favorites: "Starred Favorites",
    recent: "Recently Added",
    unsorted: "Inbox / Needs Organization",
    archive: "Archived Bookmarks",
  };

  const currentLabel = activeFolder ? activeFolder.name : (viewLabels[activeView] || activeView);

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur z-10 flex-shrink-0">
      {/* Left side: Outside Sidebar Toggle Button + Clean View Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+\\)" : "Collapse Sidebar (Ctrl+\\)"}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-700 dark:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-slate-600 dark:text-neutral-400" />
          )}
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white truncate">
          <span className="text-slate-400 dark:text-neutral-500">/</span>
          <span className="truncate">{currentLabel}</span>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenImportExport}
          className="text-xs h-8 px-2.5 gap-1.5 cursor-pointer font-medium"
          title="Import / Export / Health Scanner"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Import & Export</span>
        </Button>

        <ThemeToggle />

        <Button
          size="sm"
          variant="default"
          onClick={() => onOpenAddModal()}
          className="text-xs h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs cursor-pointer active:translate-y-0.5"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Add Bookmark
        </Button>
      </div>
    </header>
  );
}
