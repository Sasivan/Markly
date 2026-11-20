"use client";

import * as React from "react";
import { ChevronRight, Folder as FolderIcon, Layers, Star, Clock, Inbox, Archive, Compass, User, Trash2, Search, Globe, FolderTree, Share2, Sparkles, BarChart3 } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface BreadcrumbsProps {
  activeFolderId: string | null;
  activeView: "home" | "all" | "collections" | "visuals" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback" | "shared" | "smart-collections" | "sessions" | "search";
  folders: Folder[];
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "visuals" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback" | "shared" | "smart-collections" | "sessions" | "search") => void;
  totalBookmarksCount: number;
  onOpenSearch?: () => void;
  onShareFolder?: (folder: Folder) => void;
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
  onShareFolder,
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
    <nav
      aria-label="Breadcrumb"
      className="flex items-center justify-between gap-3 px-3 sm:px-4 h-9 border-b border-border bg-background/60 text-xs flex-shrink-0"
    >
      {/* Left: ancestry trail */}
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto mk-scroll-x text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            onSelectFolder(null);
            onSelectView("home");
          }}
          className="flex shrink-0 items-center gap-1.5 rounded px-1 py-0.5 font-medium hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
          title="Workspace home"
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
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => onSelectFolder(item.id, folders.some((f) => f.parentId === item.id))}
                    aria-current={isLast ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-1.5 rounded px-1 py-0.5 cursor-pointer transition-colors hover:bg-accent hover:text-foreground ${
                      isLast ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <FolderIconRenderer icon={item.icon} className="h-3.5 w-3.5" color={item.color} />
                    <span className="max-w-[180px] truncate">{item.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden="true" />
            <span aria-current="page" className="flex items-center gap-1.5 font-medium text-foreground">
              {activeView === "favorites" ? (
                <>
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Favorites
                </>
              ) : activeView === "recent" ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Recently visited
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
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Account
                </>
              ) : activeView === "trash" ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" /> Recycle bin
                </>
              ) : activeView === "shared" ? (
                <>
                  <Share2 className="h-3.5 w-3.5 text-muted-foreground" /> Shared
                </>
              ) : activeView === "smart-collections" ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> Smart collections
                </>
              ) : activeView === "visuals" ? (
                <>
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /> Visuals
                </>
              ) : activeView === "graph" ? (
                <>
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Knowledge graph
                </>
              ) : activeView === "sessions" ? (
                <>
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Tab sessions
                </>
              ) : activeView === "search" ? (
                <>
                  <Search className="h-3.5 w-3.5 text-muted-foreground" /> Search
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

      {/* Right: scope controls and count */}
      <div className="flex shrink-0 items-center gap-1.5">
        {activeFolderId && activeFolder && onShareFolder && (
          <button
            type="button"
            onClick={() => onShareFolder(activeFolder)}
            title="Share this collection publicly"
            className="h-6 px-2 rounded-sm flex items-center gap-1 cursor-pointer transition-colors border border-border bg-card hover:border-border-strong hover:bg-secondary text-foreground text-2xs font-medium"
          >
            <Share2 className="h-3 w-3" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {activeFolderId && (
          <button
            type="button"
            aria-pressed={includeSubfolders}
            onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
            title={
              includeSubfolders
                ? "Including subfolders — click to show this folder only"
                : "This folder only — click to include subfolders"
            }
            className={`h-6 w-6 rounded-sm flex items-center justify-center cursor-pointer transition-colors border ${
              includeSubfolders
                ? "bg-accent text-foreground border-border"
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

        <span className="mk-meta rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-2xs">
          {totalBookmarksCount} {totalBookmarksCount === 1 ? "item" : "items"}
        </span>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search pages & bookmarks (⌘K)"
            aria-label="Search pages and bookmarks"
            className="h-6 w-6 rounded-sm hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
}
