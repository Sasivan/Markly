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
  Table as TableIcon,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder as FolderType, FolderTreeNode } from "@/server/db/schema";

interface FolderPagePanelProps {
  currentFolder: FolderType;
  folders: FolderType[];
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
  onDeleteFolder: (folder: FolderType) => void;
  onAddBookmarkToFolder?: (folderId: string) => void;
  viewMode?: "table" | "board" | "cards" | "list" | "compact";
  onChangeViewMode?: (mode: "table" | "board" | "cards" | "list" | "compact") => void;
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
  onDeleteFolder,
  onAddBookmarkToFolder,
  viewMode = "table",
  onChangeViewMode,
}: FolderPagePanelProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editName, setEditName] = React.useState(currentFolder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-xs border border-slate-200/60 dark:border-neutral-700/60"
            style={{ backgroundColor: `${currentFolder.color}20` }}
          >
            <FolderIconRenderer
              icon={currentFolder.icon}
              color={currentFolder.color}
              className="h-6 w-6"
            />
          </div>

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
              <span className="font-mono bg-slate-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                {directBookmarksCount} direct {directBookmarksCount === 1 ? "site" : "sites"}
              </span>
              <span>•</span>
              <span className="font-mono bg-slate-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                {childFolders.length} {childFolders.length === 1 ? "subfolder" : "subfolders"}
              </span>
              <span>•</span>
              <span className="font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                {totalDescendantBookmarksCount} total {totalDescendantBookmarksCount === 1 ? "site" : "sites"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Folder Options Toolbar */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {/* Quick Add Bookmark to this folder */}
          {onAddBookmarkToFolder && (
            <Button
              size="sm"
              onClick={() => onAddBookmarkToFolder(currentFolder.id)}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer flex items-center gap-1.5 shadow-xs"
              title={`Add new bookmark directly into ${currentFolder.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Bookmark</span>
            </Button>
          )}

          {/* Multi-View Mode Switcher */}
          {onChangeViewMode && (
            <div className="flex items-center bg-slate-100 dark:bg-neutral-850 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 shadow-2xs">
              <button
                type="button"
                onClick={() => onChangeViewMode("table")}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  viewMode === "table" ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Spreadsheet Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode("cards")}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  viewMode === "cards" ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visual Card Gallery View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode("compact")}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  viewMode === "compact" ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Ultra-Compact Dense View"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Subfolder Toggle Icon */}
          <button
            type="button"
            onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
            title={
              includeSubfolders
                ? "Subfolders included (Click to show this folder only)"
                : "This folder only (Click to include subfolders)"
            }
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-semibold transition-all border ${
              includeSubfolders
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-2xs"
                : "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-700 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-700"
            }`}
          >
            {includeSubfolders ? (
              <FolderTree className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <FolderIcon className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {includeSubfolders ? "Subfolders: ON" : "Subfolders: OFF"}
            </span>
          </button>

          {/* New Subfolder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNewSubfolder(currentFolder.id)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 shadow-2xs"
            title="Create a subfolder inside this folder"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-500" />
            <span>Subfolder</span>
          </Button>

          {/* Move Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveFolder(currentFolder)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 shadow-2xs"
            title="Move this folder to another location or root"
          >
            <FolderInput className="h-3.5 w-3.5 text-amber-500" />
            <span>Move</span>
          </Button>

          {/* Customize Icon & Color Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCustomizeFolder(currentFolder)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 shadow-2xs"
            title="Customize folder icon and color"
          >
            <Palette className="h-3.5 w-3.5 text-purple-500" />
            <span>Customize</span>
          </Button>

          {/* Delete Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteFolder(currentFolder)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-2xs"
            title="Delete this folder"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Subfolders Navigation Zone */}
      {childFolders.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderIcon className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                Subfolders in {currentFolder.name} ({childFolders.length})
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Click to open subfolder
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {childFolders.map((child) => {
              const count = bookmarksCountMap[child.id] || 0;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelectFolder(child.id, false)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-900 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs text-left transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs shadow-2xs"
                      style={{ backgroundColor: `${child.color}20` }}
                    >
                      <FolderIconRenderer
                        icon={child.icon}
                        color={child.color}
                        className="h-3.5 w-3.5"
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                        {child.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {count} {count === 1 ? "site" : "sites"}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })}

            {/* Quick Add Subfolder Card */}
            <button
              type="button"
              onClick={() => onNewSubfolder(currentFolder.id)}
              className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer flex items-center gap-2 justify-center text-xs font-medium"
              title="Add a new subfolder"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Subfolder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

