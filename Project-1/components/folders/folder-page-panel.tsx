"use client";

import * as React from "react";
import {
  Folder as FolderIcon,
  FolderTree,
  FolderInput,
  Plus,
  Edit2,
  Palette,
  Trash2,
  ArrowLeft,
  Home,
  ArrowRight,
  Check,
  X,
  Copy,
  Share2,
  ExternalLink,
  LayoutGrid,
  List,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { ShareCollectionModal } from "./share-collection-modal";
import { ObservablePlotStudioBox } from "@/components/viz/observable-plot-studio-box";
import { ClassicChartsStudioBox } from "@/components/viz/classic-charts-studio-box";
import { IntelligenceSystemsStudioBox } from "@/components/viz/intelligence-systems-studio-box";
import { SitesMatrixStudioBox } from "@/components/viz/sites-matrix-studio-box";
import type { Folder as FolderType, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

interface FolderPagePanelProps {
  currentFolder: FolderType;
  folders: FolderType[];
  bookmarks?: BookmarkWithDetails[];
  directBookmarksCount: number;
  totalDescendantBookmarksCount: number;
  childFolders: FolderType[];
  bookmarksCountMap: Record<string, number>;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onNavigateHome: () => void;
  onNewSubfolder: (parentId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onCustomizeFolder: (folder: FolderType) => void;
  onMoveFolder: (folder: FolderType) => void;
  onCopyFolder?: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onAddBookmarkToFolder?: (folderId: string) => void;
}

export function FolderPagePanel({
  currentFolder,
  folders,
  directBookmarksCount,
  totalDescendantBookmarksCount,
  childFolders,
  bookmarksCountMap,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onSelectFolder,
  onNavigateHome,
  onNewSubfolder,
  onRenameFolder,
  onCustomizeFolder,
  onMoveFolder,
  onCopyFolder,
  onDeleteFolder,
  onAddBookmarkToFolder,
  bookmarks = [],
}: FolderPagePanelProps) {
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editName, setEditName] = React.useState(currentFolder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 3 Subfolder View Modes: chips | cards | list
  const [subfolderViewMode, setSubfolderViewMode] = React.useState<"chips" | "cards" | "list">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_subfolder_view_mode") as any;
        if (stored && ["chips", "cards", "list"].includes(stored)) return stored;
      } catch {}
    }
    return "chips";
  });

  const [folderVisuals, setFolderVisuals] = React.useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_folder_visuals_${currentFolder.id}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem(`markly_folder_visuals_${currentFolder.id}`);
        setFolderVisuals(stored ? JSON.parse(stored) : []);
      } catch {}
    };
    handleUpdate();
    window.addEventListener("markly-workspace-updated", handleUpdate);
    return () => window.removeEventListener("markly-workspace-updated", handleUpdate);
  }, [currentFolder.id]);

  const handleDeleteFolderVisual = (visualId: string) => {
    try {
      const storageKey = `markly_folder_visuals_${currentFolder.id}`;
      const next = folderVisuals.filter((v) => v.id !== visualId);
      setFolderVisuals(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
    } catch {}
  };

  const handleSubfolderViewChange = (mode: "chips" | "cards" | "list") => {
    setSubfolderViewMode(mode);
    try {
      localStorage.setItem("markly_subfolder_view_mode", mode);
    } catch {}
  };

  React.useEffect(() => {
    setEditName(currentFolder.name);
    setIsEditingName(false);
  }, [currentFolder.id, currentFolder.name]);

  React.useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== currentFolder.name) {
      onRenameFolder(currentFolder.id, trimmed);
    } else {
      setEditName(currentFolder.name);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(currentFolder.name);
      setIsEditingName(false);
    }
  };

  const [confirmOpenModalOpen, setConfirmOpenModalOpen] = React.useState(false);
  const [emptyFolderNotice, setEmptyFolderNotice] = React.useState(false);

  const targetBookmarksToOpen = React.useMemo(() => {
    return includeSubfolders
      ? bookmarks
      : bookmarks.filter((b) => b.folderId === currentFolder.id);
  }, [includeSubfolders, bookmarks, currentFolder.id]);

  const executeOpenAllInTabs = () => {
    targetBookmarksToOpen.forEach((b) => {
      if (b.url) {
        window.open(b.url, "_blank");
      }
    });
    setConfirmOpenModalOpen(false);
  };

  const handleOpenAllInTabs = () => {
    if (targetBookmarksToOpen.length === 0) {
      setEmptyFolderNotice(true);
      setTimeout(() => setEmptyFolderNotice(false), 3500);
      return;
    }

    if (targetBookmarksToOpen.length > 10) {
      setConfirmOpenModalOpen(true);
      return;
    }

    executeOpenAllInTabs();
  };

  const parentFolder = currentFolder.parentId
    ? folders.find((f) => f.id === currentFolder.parentId)
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-[#161616]/95 p-5 shadow-xs space-y-4">
      {/* Top Bar: Back navigation & Workspace Home button */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (parentFolder) {
                onSelectFolder(parentFolder.id, true);
              } else {
                onSelectFolder(null);
              }
            }}
            className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-700 shadow-2xs group flex-shrink-0"
            title={parentFolder ? `Go back to ${parentFolder.name}` : "Go back to Collections"}
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span className="truncate">
              {parentFolder ? `Back to ${parentFolder.name}` : "Back to Collections"}
            </span>
          </Button>

          <span className="text-muted-foreground/40 text-xs hidden sm:inline">•</span>

          {/* Breadcrumb Hierarchy */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            {parentFolder && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectFolder(parentFolder.id, true)}
                  className="hover:text-foreground cursor-pointer truncate hover:underline"
                >
                  {parentFolder.name}
                </button>
                <span>/</span>
              </>
            )}
            <span className="font-semibold text-foreground truncate">{currentFolder.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateHome}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800"
            title="Return to Workspace Homepage"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Workspace Home</span>
          </Button>
        </div>
      </div>

      {/* Main Folder Identity & Operations Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Folder Icon, Name, and Metrics */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onCustomizeFolder ? () => onCustomizeFolder(currentFolder) : undefined}
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-xs border border-slate-200/60 dark:border-neutral-700/60 cursor-pointer group relative transition-transform hover:scale-105"
            style={{ backgroundColor: `${currentFolder.color}20`, borderColor: `${currentFolder.color}50` }}
            title="Click to customize folder icon & accent color"
          >
            <FolderIconRenderer
              icon={currentFolder.icon}
              color={currentFolder.color}
              className="h-6 w-6 transition-transform group-hover:scale-110"
            />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
              ✎
            </span>
          </button>

          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-lg font-bold bg-background border border-blue-500 rounded-md px-2 py-0.5 text-foreground focus:outline-none ring-2 ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="h-7 w-7 rounded-md bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 cursor-pointer"
                  title="Save name"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(currentFolder.name);
                    setIsEditingName(false);
                  }}
                  className="h-7 w-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {currentFolder.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  title="Rename folder"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Folder Metrics */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              <button
                type="button"
                onClick={() => onToggleIncludeSubfolders(false)}
                className={`font-mono px-2 py-0.5 rounded-md text-xs font-medium border tabular-nums cursor-pointer transition-colors outline-none focus:outline-none ${
                  !includeSubfolders
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border hover:bg-muted"
                }`}
                title="Filter to direct sites in this folder only"
              >
                {directBookmarksCount} direct {directBookmarksCount === 1 ? "site" : "sites"}
              </button>
              <span>•</span>
              {childFolders.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("subfolders-zone");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="font-mono bg-secondary hover:bg-muted px-2 py-0.5 rounded-md text-xs font-medium text-foreground border border-border tabular-nums cursor-pointer transition-colors outline-none focus:outline-none"
                  title="View subfolders below"
                >
                  {childFolders.length} {childFolders.length === 1 ? "subfolder" : "subfolders"}
                </button>
              ) : (
                <span className="font-mono bg-secondary px-2 py-0.5 rounded-md text-xs font-medium text-foreground border border-border tabular-nums">
                  0 subfolders
                </span>
              )}
              <span>•</span>
              <button
                type="button"
                onClick={() => onToggleIncludeSubfolders(true)}
                className={`font-mono px-2 py-0.5 rounded-md text-xs font-medium border tabular-nums cursor-pointer transition-colors outline-none focus:outline-none ${
                  includeSubfolders
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border hover:bg-muted"
                }`}
                title="Include all nested subfolder sites"
              >
                {totalDescendantBookmarksCount} total {totalDescendantBookmarksCount === 1 ? "site" : "sites"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Folder Options Toolbar (Icon-Only Buttons) */}
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
          {/* Quick Add Bookmark to this folder */}
          {onAddBookmarkToFolder && (
            <Button
              size="sm"
              onClick={() => onAddBookmarkToFolder(currentFolder.id)}
              className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer flex items-center justify-center shadow-xs rounded-lg"
              title={`Add new bookmark into ${currentFolder.name}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          {/* 1-Click Open All in Browser Tabs (Feature 2.2) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAllInTabs}
            className="h-8 w-8 p-0 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs flex items-center justify-center"
            title={`Open all ${includeSubfolders ? bookmarks.length : directBookmarksCount} links in browser tabs`}
          >
            <ExternalLink className="h-4 w-4 text-blue-500" />
          </Button>

          {/* Subfolder Toggle Icon */}
          <button
            type="button"
            onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
            title={
              includeSubfolders
                ? "Subfolders included: ON (Click to show this folder only)"
                : "This folder only: OFF (Click to include subfolders)"
            }
            className={`h-8 w-8 p-0 rounded-lg flex items-center justify-center cursor-pointer text-xs font-medium transition-colors border ${
              includeSubfolders
                ? "bg-secondary text-foreground border-border shadow-xs"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
            }`}
          >
            {includeSubfolders ? (
              <FolderTree className="h-4 w-4 text-primary" />
            ) : (
              <FolderIcon className="h-4 w-4" />
            )}
          </button>

          {/* Move Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveFolder(currentFolder)}
            className="h-8 w-8 p-0 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs flex items-center justify-center"
            title="Move this folder to another location or root"
          >
            <FolderInput className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Copy Folder Button */}
          {onCopyFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyFolder(currentFolder)}
              className="h-8 w-8 p-0 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs flex items-center justify-center"
              title="Copy this folder and its contents to another project folder"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          {/* Share Collection Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            className="h-8 w-8 p-0 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs flex items-center justify-center"
            title="Share this collection publicly"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Customize Icon & Color Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCustomizeFolder(currentFolder)}
            className="h-8 w-8 p-0 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs flex items-center justify-center"
            title="Customize folder icon and color"
          >
            <Palette className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Delete Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteFolder(currentFolder)}
            className="h-8 w-8 p-0 cursor-pointer border-destructive/20 hover:bg-destructive/10 text-destructive shadow-xs flex items-center justify-center"
            title="Delete this folder"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subfolders Section with 3 View Options (Chips, Cards, List) */}
      {childFolders.length > 0 && (
        <div id="subfolders-zone" className="pt-2.5 border-t border-border space-y-2 text-xs">
          {/* Header Row: Subfolder Label + 3 View Switcher Icons on Right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <FolderIcon className="h-3.5 w-3.5" />
              <span>Subfolders</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-foreground tabular-nums">
                {childFolders.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNewSubfolder(currentFolder.id)}
                className="h-6 px-2 rounded-md border border-dashed border-border hover:bg-secondary text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors"
                title="Create new subfolder"
              >
                <Plus className="h-3 w-3" />
                <span>Subfolder</span>
              </button>

              {/* 3 View Switcher Icons: Chips, Cards, List */}
              <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border/50">
                <button
                  type="button"
                  onClick={() => handleSubfolderViewChange("chips")}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    subfolderViewMode === "chips"
                      ? "bg-card text-primary shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Chips View (Compact Inline Tags)"
                >
                  <Tag className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSubfolderViewChange("cards")}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    subfolderViewMode === "cards"
                      ? "bg-card text-primary shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Cards View (Visual Folder Grid)"
                >
                  <LayoutGrid className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSubfolderViewChange("list")}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    subfolderViewMode === "list"
                      ? "bg-card text-primary shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List View (Clean Detailed Rows)"
                >
                  <List className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Mode 1: Chips View */}
          {subfolderViewMode === "chips" && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {childFolders.map((child) => {
                const count = bookmarksCountMap[child.id] || 0;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectFolder(child.id, false)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card hover:bg-secondary text-xs text-foreground hover:text-primary transition-colors cursor-pointer group shadow-2xs"
                    title={`Filter directly to subfolder ${child.name}`}
                  >
                    <div
                      className="h-3.5 w-3.5 rounded flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: `${child.color}25` }}
                    >
                      <FolderIconRenderer icon={child.icon} color={child.color} className="h-2.5 w-2.5" />
                    </div>
                    <span className="font-medium truncate max-w-[140px]">{child.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode 2: Cards / Grid View */}
          {subfolderViewMode === "cards" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {childFolders.map((child) => {
                const count = bookmarksCountMap[child.id] || 0;
                return (
                  <div
                    key={child.id}
                    onClick={() => onSelectFolder(child.id, false)}
                    className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary/40 cursor-pointer transition-colors flex items-center justify-between gap-2 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${child.color}25` }}
                      >
                        <FolderIconRenderer icon={child.icon} color={child.color} className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate block">
                          {child.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                          {count} {count === 1 ? "site" : "sites"}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode 3: List View */}
          {subfolderViewMode === "list" && (
            <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden mt-1">
              {childFolders.map((child) => {
                const count = bookmarksCountMap[child.id] || 0;
                return (
                  <div
                    key={child.id}
                    onClick={() => onSelectFolder(child.id, false)}
                    className="px-3 py-2 flex items-center justify-between hover:bg-secondary/40 cursor-pointer transition-colors text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${child.color}25` }}
                      >
                        <FolderIconRenderer icon={child.icon} color={child.color} className="h-3 w-3" />
                      </div>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {child.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded tabular-nums">
                        {count} {count === 1 ? "site" : "sites"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Folder Analytics & Multi-Variation Visual Studios */}
      {folderVisuals.length > 0 && (
        <div className="space-y-4 pt-1">
          {folderVisuals.map((v) => {
            const isPlot = v.kind === "plot_studio" || v.id === "studio_observable_plot";
            const isClassic = v.kind === "chart_studio" || v.id?.startsWith("studio_classic_charts");
            const isIntel = v.kind === "intel_studio" || v.id?.startsWith("studio_intel_systems");
            const isSites = v.kind === "sites_studio" || v.id?.startsWith("studio_sites_matrix");

            if (isPlot) {
              return (
                <ObservablePlotStudioBox
                  key={v.id}
                  id={v.id}
                  bookmarks={bookmarks || []}
                  folders={folders}
                  initialColSpan={v.colSpan || 12}
                  rowSpan={v.rowSpan || 2}
                  onDeleteWidget={() => handleDeleteFolderVisual(v.id)}
                />
              );
            }
            if (isClassic) {
              return (
                <ClassicChartsStudioBox
                  key={v.id}
                  id={v.id}
                  bookmarks={bookmarks || []}
                  folders={folders}
                  initialColSpan={v.colSpan || 12}
                  rowSpan={v.rowSpan || 2}
                  onDeleteWidget={() => handleDeleteFolderVisual(v.id)}
                />
              );
            }
            if (isIntel) {
              return (
                <IntelligenceSystemsStudioBox
                  key={v.id}
                  id={v.id}
                  bookmarks={bookmarks || []}
                  folders={folders}
                  initialColSpan={v.colSpan || 12}
                  rowSpan={v.rowSpan || 2}
                  onDeleteWidget={() => handleDeleteFolderVisual(v.id)}
                />
              );
            }
            if (isSites) {
              return (
                <SitesMatrixStudioBox
                  key={v.id}
                  id={v.id}
                  bookmarks={bookmarks || []}
                  folders={folders}
                  initialColSpan={v.colSpan || 12}
                  rowSpan={v.rowSpan || 2}
                  onDeleteWidget={() => handleDeleteFolderVisual(v.id)}
                />
              );
            }
            return null;
          })}
        </div>
      )}
      {/* 3.1: Share Collection Modal */}
      <ShareCollectionModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        folder={currentFolder}
        bookmarks={bookmarks}
      />

      {/* In-App Confirmation Modal for opening large number of tabs */}
      <Dialog open={confirmOpenModalOpen} onOpenChange={setConfirmOpenModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl animate-in zoom-in-95">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Open Multiple Links
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Open all {targetBookmarksToOpen.length} bookmarks in separate browser tabs? (Please ensure popups are allowed for this site).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpenModalOpen(false)}
              className="text-xs h-9 px-4 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={executeOpenAllInTabs}
              className="text-xs h-9 px-4 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open {targetBookmarksToOpen.length} Tabs</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

