"use client";

import * as React from "react";
import { ChevronRight, Folder as FolderIcon, Layers, Star, Clock, Inbox, Archive, Compass, Sparkles, Database, User, Trash2, Search, Globe, FolderTree } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface BreadcrumbsProps {
  activeFolderId: string | null;
  activeView: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile";
  folders: Folder[];
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile") => void;
  totalBookmarksCount: number;
  onOpenSearch?: () => void;
}

export function Breadcrumbs({
  activeFolderId,
  activeView,
  folders,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onSelectFolder,
  onSelectView,
  totalBookmarksCount,
  onOpenSearch,
}: BreadcrumbsProps) {
  // Compute ancestry path if a folder is active
  const breadcrumbPath = React.useMemo(() => {
    if (!activeFolderId) return [];

    const path: Folder[] = [];
    let currentId: string | null = activeFolderId;

    while (currentId) {
      const found = folders.find((f) => f.id === currentId);
      if (found) {
        path.unshift(found);
        currentId = found.parentId ?? (found as any).parent_id ?? null;
      } else {
        break;
      }
    }

    return path;
  }, [activeFolderId, folders]);

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  return (
    <div className="flex items-center justify-between px-6 py-2 border-b border-border/70 bg-background/50 text-xs">
      {/* Left: Breadcrumbs trail */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-muted-foreground flex-1 mr-4">
        <button
          type="button"
          onClick={() => {
            onSelectFolder(null);
            onSelectView("home");
          }}
          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer transition-colors"
          title="Open Workspace Home"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>Workspace</span>
        </button>

        {activeFolderId && breadcrumbPath.length > 0 ? (
          <>
            {breadcrumbPath.map((item, idx) => {
              const isLast = idx === breadcrumbPath.length - 1;
              return (
                <React.Fragment key={item.id}>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => onSelectFolder(item.id, folders.some((f) => f.parentId === item.id))}
                    className={`flex items-center gap-1 hover:text-foreground cursor-pointer ${
                      isLast ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <FolderIconRenderer icon={item.icon} className="h-3.5 w-3.5" color={item.color} />
                    <span className="truncate max-w-[150px]">{item.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
            <span className="font-semibold text-foreground flex items-center gap-1">
              {activeView === "favorites" ? (
                <>
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Favorites
                </>
              ) : activeView === "recent" ? (
                <>
                  <Clock className="h-3.5 w-3.5" /> Recent Bookmarks
                </>
              ) : activeView === "unsorted" ? (
                <>
                  <Inbox className="h-3.5 w-3.5" /> Unsorted (Inbox)
                </>
              ) : activeView === "archive" ? (
                <>
                  <Archive className="h-3.5 w-3.5" /> Archive
                </>
              ) : activeView === "collections" ? (
                <>
                  <FolderIcon className="h-3.5 w-3.5 text-indigo-500" /> Folder Collections
                </>
              ) : activeView === "home" ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Home
                </>
              ) : activeView === "profile" ? (
                <>
                  <User className="h-3.5 w-3.5 text-blue-500" /> Account Profile
                </>
              ) : activeView === "trash" ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Recycle Bin
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 text-blue-500" /> All Sites
                </>
              )}
            </span>
          </>
        )}
      </div>

      {/* Right: Subfolder filter toggle, item count & search icon at edge of screen */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {activeFolderId && (
          <button
            type="button"
            onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
            title={
              includeSubfolders
                ? "Subfolders included: showing all bookmarks in this folder and its subfolders (Click to show this folder only)"
                : "This folder only: showing direct bookmarks only (Click to include subfolders)"
            }
            className={`h-7 w-7 rounded-md flex items-center justify-center cursor-pointer transition-all border ${
              includeSubfolders
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-2xs"
                : "bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border-slate-200 dark:border-neutral-700 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-700"
            }`}
          >
            {includeSubfolders ? (
              <FolderTree className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <FolderIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <span className="text-[11px] text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-2 py-0.5 rounded-md font-mono font-semibold">
          {totalBookmarksCount} {totalBookmarksCount === 1 ? "item" : "items"}
        </span>

        {/* Search icon rightmost at the edge of screen */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search all pages & bookmarks (⌘K)"
            className="h-7 w-7 rounded-md hover:bg-slate-200/80 dark:hover:bg-neutral-800 text-slate-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 flex items-center justify-center cursor-pointer transition-colors border border-transparent hover:border-slate-300 dark:hover:border-neutral-700 ml-0.5"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

