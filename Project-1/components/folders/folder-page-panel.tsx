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
              <span className="font-mono bg-secondary px-2 py-0.5 rounded-md text-xs font-medium text-foreground border border-border tabular-nums">
                {directBookmarksCount} direct {directBookmarksCount === 1 ? "site" : "sites"}
              </span>
              <span>•</span>
              <span className="font-mono bg-secondary px-2 py-0.5 rounded-md text-xs font-medium text-foreground border border-border tabular-nums">
                {childFolders.length} {childFolders.length === 1 ? "subfolder" : "subfolders"}
              </span>
              <span>•</span>
              <span className="font-mono bg-secondary px-2 py-0.5 rounded-md text-xs font-medium text-foreground border border-border tabular-nums">
                {totalDescendantBookmarksCount} total {totalDescendantBookmarksCount === 1 ? "site" : "sites"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Folder Options Toolbar */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {/* Quick Add Bookmark to this folder (Icon-Only + Button) */}
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

          {/* Subfolder Toggle Icon */}
          <button
            type="button"
            onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
            title={
              includeSubfolders
                ? "Subfolders included (Click to show this folder only)"
                : "This folder only (Click to include subfolders)"
            }
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-medium transition-colors border ${
              includeSubfolders
                ? "bg-secondary text-foreground border-border shadow-xs"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
            }`}
          >
            {includeSubfolders ? (
              <FolderTree className="h-3.5 w-3.5 text-foreground" />
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
            className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs"
            title="Create a subfolder inside this folder"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Subfolder</span>
          </Button>

          {/* Move Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveFolder(currentFolder)}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs"
            title="Move this folder to another location or root"
          >
            <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Move</span>
          </Button>

          {/* Copy Folder Button */}
          {onCopyFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyFolder(currentFolder)}
              className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs"
              title="Copy this folder and its contents to another project folder"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Copy</span>
            </Button>
          )}

          {/* Customize Icon & Color Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCustomizeFolder(currentFolder)}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer border-border hover:bg-secondary text-foreground shadow-xs"
            title="Customize folder icon and color"
          >
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Customize</span>
          </Button>

          {/* Delete Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteFolder(currentFolder)}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 cursor-pointer border-destructive/20 hover:bg-destructive/10 text-destructive shadow-xs"
            title="Delete this folder"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Subfolders Navigation Zone */}
      {childFolders.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Subfolders in {currentFolder.name} ({childFolders.length})
              </span>
            </span>
            <span className="text-xs text-muted-foreground font-mono">
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
                  className="p-3 rounded-xl border border-border bg-card shadow-xs hover:border-border-hover text-left transition-colors cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs border border-border/40"
                      style={{ backgroundColor: `${child.color}20` }}
                    >
                      <FolderIconRenderer
                        icon={child.icon}
                        color={child.color}
                        className="h-3.5 w-3.5"
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                        {child.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono tabular-nums">
                        {count} {count === 1 ? "site" : "sites"}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform duration-150 flex-shrink-0" />
                </button>
              );
            })}

            {/* Quick Add Subfolder Card */}
            <button
              type="button"
              onClick={() => onNewSubfolder(currentFolder.id)}
              className="p-3 rounded-xl border border-dashed border-border hover:border-border-hover hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2 justify-center text-xs font-medium"
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

