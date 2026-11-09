"use client";

import * as React from "react";
import { ChevronRight, Folder as FolderIcon, Layers, Star, Clock, Inbox, Archive, Compass, Sparkles } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface BreadcrumbsProps {
  activeFolderId: string | null;
  activeView: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive";
  folders: Folder[];
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive") => void;
  totalBookmarksCount: number;
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
        currentId = found.parentId;
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
            onSelectView("all");
          }}
          className="flex items-center gap-1 hover:text-foreground font-medium cursor-pointer"
        >
          <Compass className="h-3.5 w-3.5" />
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
              ) : (
                "All Bookmarks"
              )}
            </span>
          </>
        )}
      </div>

      {/* Right: Subfolder filter toggle & count */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {activeFolderId && (
          <button
            type="button"
            onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${
              includeSubfolders
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                : "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:bg-slate-200"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>{includeSubfolders ? "Including Subfolders" : "This Folder Only"}</span>
          </button>
        )}

        <span className="text-[11px] text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-2 py-0.5 rounded-md font-mono font-semibold">
          {totalBookmarksCount} {totalBookmarksCount === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  );
}

