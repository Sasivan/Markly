"use client";

import * as React from "react";
import { Folder as FolderIcon, ArrowRight, Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder, FolderTreeNode } from "@/server/db/schema";

interface FolderCollectionsViewProps {
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string, isParent?: boolean) => void;
  onOpenAddFolder?: () => void;
}

export function FolderCollectionsView({
  folders,
  folderTree,
  onSelectFolder,
  onOpenAddFolder,
}: FolderCollectionsViewProps) {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1">
              <FolderIcon className="h-3 w-3" />
              Collections Directory
            </span>
            <span className="text-xs text-muted-foreground font-mono">{folderTree.length} Root Collections</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Folder Collections
          </h1>
          <p className="text-xs text-muted-foreground">
            Explore and organize your bookmarks by category. Click any collection card to inspect its bookmarks and launch deep visual analytics.
          </p>
        </div>

        {onOpenAddFolder && (
          <Button
            size="sm"
            onClick={onOpenAddFolder}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-8 px-3 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Collection</span>
          </Button>
        )}
      </div>

      {/* Grid of Collection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {folderTree.map((rootNode) => {
          const childCount = rootNode.children?.length || 0;
          const bookmarkCount = rootNode.totalDescendantBookmarkCount || rootNode.bookmarkCount || 0;

          return (
            <div
              key={rootNode.id}
              onClick={() => onSelectFolder(rootNode.id, childCount > 0)}
              className="rounded-xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-4 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-2xs"
                    style={{ backgroundColor: `${rootNode.color}20` }}
                  >
                    <FolderIconRenderer icon={rootNode.icon} color={rootNode.color} className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">
                    {bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {rootNode.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {childCount > 0
                      ? `Contains ${childCount} nested ${childCount === 1 ? "subfolder" : "subfolders"}`
                      : "Direct standalone collection"}
                  </p>
                </div>

                {/* Subfolder preview badges */}
                {childCount > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {rootNode.children.slice(0, 3).map((child) => (
                      <span
                        key={child.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFolder(child.id, (child.children?.length || 0) > 0);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <FolderIconRenderer icon={child.icon} color={child.color} className="h-3 w-3" />
                        <span>{child.name}</span>
                      </span>
                    ))}
                    {childCount > 3 && (
                      <span className="text-[10px] font-mono text-muted-foreground">+{childCount - 3}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Folder & Analytics
                  <ArrowRight className="h-3 w-3" />
                </span>
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

