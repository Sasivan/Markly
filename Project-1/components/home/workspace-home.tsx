"use client";

import * as React from "react";
import {
  Compass,
  Folder as FolderIcon,
  Clock,
  Star,
  Inbox,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Plus,
  CheckCircle2,
  Tag,
  Hash,
  ShieldCheck,
  TrendingUp,
  Bookmark,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

interface WorkspaceHomeProps {
  bookmarks: BookmarkWithDetails[];
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive") => void;
  onSelectTag?: (tag: string | null) => void;
  onOpenAddModal: () => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
}

export function WorkspaceHome({
  bookmarks,
  folders,
  folderTree,
  onSelectFolder,
  onSelectView,
  onSelectTag,
  onOpenAddModal,
  onEditBookmark,
  onToggleFavorite,
}: WorkspaceHomeProps) {
  // 1. Quick Access: Top visited & active bookmarks
  const quickAccessList = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived)
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0) || b.createdAt - a.createdAt)
      .slice(0, 6);
  }, [bookmarks]);

  // 2. Folder Collections: Root level folder collections
  const collections = React.useMemo(() => {
    return folderTree.map((treeNode) => {
      const folderEntity = folders.find((f) => f.id === treeNode.id);
      const childCount = treeNode.children?.length || 0;
      const count = treeNode.totalDescendantBookmarkCount || treeNode.bookmarkCount || 0;
      return {
        id: treeNode.id,
        name: treeNode.name,
        icon: treeNode.icon || "📁",
        color: treeNode.color || "#3b82f6",
        bookmarkCount: count,
        childFolderCount: childCount,
      };
    });
  }, [folderTree, folders]);

  // 3. Recently Added (sorted by createdAt desc)
  const recentlyAdded = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);
  }, [bookmarks]);

  // 4. Favorites
  const favorites = React.useMemo(() => {
    return bookmarks.filter((b) => b.isFavorite && !b.isArchived).slice(0, 6);
  }, [bookmarks]);

  // 5. Inbox / Needs Organization (no folder or no tags)
  const unorganized = React.useMemo(() => {
    return bookmarks
      .filter((b) => !b.isArchived && (!b.folderId || !b.tags || b.tags.length === 0))
      .slice(0, 6);
  }, [bookmarks]);

  // 6. Topic & Tags Cloud
  const topTags = React.useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const bm of bookmarks) {
      if (bm.isArchived) continue;
      for (const t of bm.tags || []) {
        const existing = map.get(t.name) || { count: 0, color: t.color || "#3b82f6" };
        map.set(t.name, { count: existing.count + 1, color: t.color || "#3b82f6" });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [bookmarks]);

  // Workspace summary calculations
  const totalCount = bookmarks.filter((b) => !b.isArchived).length;
  const reachableCount = bookmarks.filter((b) => !b.isArchived && b.status !== "dead").length;
  const healthPercent = totalCount > 0 ? Math.round((reachableCount / totalCount) * 100) : 100;

  // Helper to format relative time
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Helper to get parent folder name
  const getParentName = (bm: BookmarkWithDetails) => {
    if (!bm.folderId) return "Unsorted";
    const current = folders.find((f) => f.id === bm.folderId);
    if (!current) return bm.folderName || "Unsorted";
    if (current.parentId) {
      const parent = folders.find((f) => f.id === current.parentId);
      if (parent) return parent.name;
    }
    return current.name;
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Workspace Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Workspace Home
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Markly Workspace
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Your centralized bookmark hub. Jump into collections, review recent discoveries, or organize pending items. Open any folder to unlock deep visual analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 h-8.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Bookmark</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("all");
              }}
              className="text-xs h-8.5 px-3 rounded-lg border-slate-300 dark:border-neutral-700 cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Browse All ({totalCount})</span>
            </Button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{totalCount}</div>
              <div className="text-[11px] text-muted-foreground">Active Bookmarks</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FolderIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{folders.length}</div>
              <div className="text-[11px] text-muted-foreground">Folder Collections</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{healthPercent}%</div>
              <div className="text-[11px] text-muted-foreground">Reachable & Healthy</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{favorites.length}</div>
              <div className="text-[11px] text-muted-foreground">Starred Favorites</div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Quick Access Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick Access</h2>
            <span className="text-[10px] text-muted-foreground font-mono">Most visited & frequent</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickAccessList.map((bm) => (
            <div
              key={bm.id}
              className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-3 shadow-xs hover:border-blue-400 dark:hover:border-blue-700 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 truncate min-w-0">
                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-6 w-6 rounded object-contain bg-background flex-shrink-0 border border-border/40"
                />
                <div className="truncate">
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold hover:underline text-slate-900 dark:text-white truncate block"
                  >
                    {bm.title}
                  </a>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="truncate max-w-[110px]">{bm.domain}</span>
                    <span>•</span>
                    <span className="font-mono">{bm.visitCount || 0} visits</span>
                  </div>
                </div>
              </div>

              <a
                href={bm.url}
                target="_blank"
                rel="noreferrer"
                className="h-7 w-7 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 transition-colors"
                title="Launch Site"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Folder Collections Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Folder Collections</h2>
            <span className="text-[10px] text-muted-foreground font-mono">Organized Workspaces</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">{collections.length} Collections</span>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("collections");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>View all Collections</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {collections.map((coll) => (
            <div
              key={coll.id}
              onClick={() => onSelectFolder(coll.id, true)}
              className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-4 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shadow-2xs"
                    style={{ backgroundColor: `${coll.color}20` }}
                  >
                    <FolderIconRenderer icon={coll.icon} color={coll.color} className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono font-medium px-2 py-0.5">
                    {coll.bookmarkCount} {coll.bookmarkCount === 1 ? "site" : "sites"}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {coll.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {coll.childFolderCount > 0
                      ? `Includes ${coll.childFolderCount} subfolders`
                      : "Direct collection"}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open Collection with Analytics
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid: 3. Recently Added & 4. Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Recently Added */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recently Added</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("recent");
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
            >
              View Recent →
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] shadow-xs divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden">
            {recentlyAdded.map((bm) => (
              <div key={bm.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookmarkIcon
                    src={bm.iconUrl}
                    alt={bm.title}
                    domain={bm.domain}
                    className="h-5 w-5 rounded object-contain flex-shrink-0"
                  />
                  <div className="truncate">
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold hover:underline text-slate-900 dark:text-white truncate block"
                    >
                      {bm.title}
                    </a>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-mono">{formatTimeAgo(bm.createdAt)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{getParentName(bm)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-6 w-6 rounded bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Favorites */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Starred Favorites</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("favorites");
              }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-medium"
            >
              View Favorites →
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] shadow-xs divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden">
            {favorites.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No favorites starred yet. Click the star on any bookmark to pin it here.
              </div>
            ) : (
              favorites.map((bm) => (
                <div key={bm.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <div className="truncate">
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold hover:underline text-slate-900 dark:text-white truncate block"
                      >
                        {bm.title}
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span className="truncate max-w-[110px]">{bm.domain}</span>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">{getParentName(bm)}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-6 w-6 rounded bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-amber-600 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 5. Inbox / Needs Organization Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Inbox className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inbox / Needs Organization</h2>
            <span className="text-[10px] text-muted-foreground font-mono">Unsorted or missing tags</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("unsorted");
            }}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-medium"
          >
            Open Inbox View →
          </button>
        </div>

        {unorganized.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/40 p-6 text-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
            <div className="text-xs font-semibold text-slate-900 dark:text-white">Inbox Zero!</div>
            <p className="text-[11px] text-muted-foreground">
              All bookmarks in your workspace are properly filed into folders and tagged.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unorganized.map((bm) => (
              <div
                key={bm.id}
                onClick={() => onEditBookmark?.(bm)}
                className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#1a1a1a] p-3.5 shadow-xs flex flex-col justify-between gap-3 cursor-pointer hover:border-rose-400 dark:hover:border-rose-600 transition-all hover:shadow-sm group"
                title="Click to organize folder & tags"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-5 w-5 rounded object-contain flex-shrink-0"
                    />
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      {!bm.folderId ? "No Folder" : "No Tags"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {bm.title}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{bm.domain}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                    Organize Now →
                  </span>
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded"
                    title="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Tags & Categories Explorer */}
      {topTags.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Topics & Tags</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {topTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => {
                  onSelectTag?.(tag.name);
                  onSelectFolder(null);
                  onSelectView("all");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] hover:border-purple-400 transition-all cursor-pointer shadow-2xs group"
              >
                <Hash className="h-3 w-3 text-purple-500" />
                <span className="text-slate-800 dark:text-neutral-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {tag.name}
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-neutral-800 text-muted-foreground px-1.5 py-0.2 rounded font-mono">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
