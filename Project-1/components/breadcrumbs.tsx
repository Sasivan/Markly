"use client";

import * as React from "react";
import { ChevronRight, Folder as FolderIcon, Layers, Star, Clock, Inbox, Archive, Compass, Database, User, Trash2, Search, Globe, FolderTree } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface BreadcrumbsProps {
  activeFolderId: string | null;
  activeView: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback";
  folders: Folder[];
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback") => void;
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
    <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-background text-xs">
      {/* Left: Breadcrumbs trail */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-muted-foreground flex-1 mr-4">
        <button
          type="button"
          onClick={() => {
            onSelectFolder(null);
            onSelectView("home");
          }}
          className="flex items-center gap-1 hover:text-foreground font-medium cursor-pointer transition-colors"
          title="Open Workspace Home"
        >
          <Compass className="h-3.5 w-3.5 text-muted-foreground" />
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
                    className={`flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors ${
                      isLast ? "font-medium text-foreground" : "text-muted-foreground"
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
            <span className="font-medium text-foreground flex items-center gap-1">
              {activeView === "favorites" ? (
                <>
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Favorites
                </>
              ) : activeView === "recent" ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Recent bookmarks
                </>
              ) : activeView === "unsorted" ? (
                <>
                  <Inbox className="h-3.5 w-3.5 text-muted-foreground" /> Unsorted
                </>
              ) : activeView === "archive" ? (
                <>
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" /> Archive
                </>
              ) : activeView === "collections" ? (
                <>
                  <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" /> Folder collections
                </>
              ) : activeView === "home" ? (
                <>
                  <Compass className="h-3.5 w-3.5 text-muted-foreground" /> Home
                </>
              ) : activeView === "profile" ? (
                <>
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Account profile
                </>
              ) : activeView === "trash" ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" /> Recycle bin
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" /> All sites
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
            className={`h-7 w-7 rounded-md flex items-center justify-center cursor-pointer transition-colors duration-150 ease-out border ${
              includeSubfolders
                ? "bg-accent text-accent-foreground border-border"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
            }`}
          >
            {includeSubfolders ? (
              <FolderTree className="h-3.5 w-3.5" />
            ) : (
              <FolderIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md font-mono tabular-nums font-medium">
          {totalBookmarksCount} {totalBookmarksCount === 1 ? "item" : "items"}
        </span>

        {/* Search icon rightmost at the edge of screen */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search all pages & bookmarks (⌘K)"
            className="h-7 w-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors border border-transparent hover:border-border ml-0.5"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

