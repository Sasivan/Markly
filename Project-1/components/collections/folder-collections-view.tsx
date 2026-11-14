"use client";

import * as React from "react";
import {
  Folder as FolderIcon,
  ArrowRight,
  Layers,
  Plus,
  Edit2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { EditCollectionModal } from "./edit-collection-modal";
import type { Folder, FolderTreeNode } from "@/server/db/schema";

interface FolderCollectionsViewProps {
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string, isParent?: boolean) => void;
  onOpenAddFolder?: () => void;
  onNavigateHome?: () => void;
  onNewSubfolder?: (parentId: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onCustomizeFolder?: (folder: Folder) => void;
  onMoveFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  onSaveCollection?: (
    folderId: string,
    updates: { name: string; icon: string; color: string; parentId?: string | null }
  ) => Promise<void> | void;
  unsortedCount?: number;
  onSelectView?: (view: any) => void;
  onOpenAddBookmarkToFolder?: (folderId: string) => void;
}

export function FolderCollectionsView({
  folders,
  folderTree,
  onSelectFolder,
  onOpenAddFolder,
  onNavigateHome,
  onNewSubfolder,
  onRenameFolder,
  onCustomizeFolder,
  onMoveFolder,
  onDeleteFolder,
  onSaveCollection,
  unsortedCount = 0,
  onSelectView,
  onOpenAddBookmarkToFolder,
}: FolderCollectionsViewProps) {
  const [editingCollection, setEditingCollection] = React.useState<Folder | null>(null);

  const handleSaveCollection = async (
    folderId: string,
    updates: { name: string; icon: string; color: string; parentId?: string | null }
  ) => {
    if (onSaveCollection) {
      await onSaveCollection(folderId, updates);
    } else {
      // Fallback to legacy individual handlers if onSaveCollection wasn't provided
      if (onRenameFolder) onRenameFolder(folderId, updates.name);
      if (onCustomizeFolder) {
        const existing = folders.find((f) => f.id === folderId);
        if (existing) onCustomizeFolder({ ...existing, ...updates });
      }
    }
  };

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
            <span className="text-xs text-muted-foreground font-mono">
              {folderTree.length} Root Collections
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Folder Collections
          </h1>
          <p className="text-xs text-muted-foreground">
            Browse and organize your bookmark folders and nested subfolder trees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddFolder && (
            <Button
              type="button"
              onClick={onOpenAddFolder}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-8 px-3 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Collection</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Collection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Permanent Unsorted (Inbox) Collection Card with Customization */}
        {(() => {
          const unsortedFolder: Folder = folders.find(
            (f) => f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_")
          ) || {
            id: "__UNSORTED__",
            userId: "",
            parentId: null,
            name: "Inbox / Needs Organization",
            icon: "📥",
            color: "#8b5cf6",
            position: -9999,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          return (
            <div
              key={unsortedFolder.id}
              onClick={() => {
                onSelectView?.("unsorted");
              }}
              className="rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-900/60 bg-violet-50/20 dark:bg-violet-950/20 p-4 shadow-xs hover:border-violet-500 dark:hover:border-violet-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-2xs"
                    style={{ backgroundColor: `${unsortedFolder.color}20` }}
                  >
                    <FolderIconRenderer
                      icon={unsortedFolder.icon}
                      color={unsortedFolder.color}
                      className="h-5 w-5"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-mono px-2 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                    >
                      {unsortedCount} {unsortedCount === 1 ? "site" : "sites"}
                    </Badge>

                    {/* Quick Add Bookmark to this collection */}
                    {onOpenAddBookmarkToFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddBookmarkToFolder(unsortedFolder.id);
                        }}
                        className="h-7 px-2 rounded-lg flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                        title={`Add bookmark directly to ${unsortedFolder.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    )}

                    {/* All-in-One Edit Collection Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCollection(unsortedFolder);
                      }}
                      className="h-7 px-2 rounded-lg flex items-center gap-1 bg-slate-100/80 dark:bg-neutral-800/80 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                      title="Edit collection details"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-violet-500" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {unsortedFolder.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Permanent system folder for all uncategorized bookmarks
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-violet-100 dark:border-violet-900/40 flex items-center justify-between text-xs text-violet-600 dark:text-violet-400 font-semibold">
                <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Unsorted Collection
                  <ArrowRight className="h-3 w-3" />
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">permanent</span>
              </div>
            </div>
          );
        })()}

        {/* User Folders */}
        {folderTree.map((rootNode) => {
          const childCount = rootNode.children?.length || 0;
          const bookmarkCount =
            rootNode.totalDescendantBookmarkCount || rootNode.bookmarkCount || 0;

          return (
            <div
              key={rootNode.id}
              onClick={() => {
                onSelectFolder(rootNode.id, childCount > 0);
              }}
              className="rounded-xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-4 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-2xs"
                    style={{ backgroundColor: `${rootNode.color}20` }}
                  >
                    <FolderIconRenderer
                      icon={rootNode.icon}
                      color={rootNode.color}
                      className="h-5 w-5"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">
                      {bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}
                    </Badge>

                    {/* Quick Add Bookmark to this collection */}
                    {onOpenAddBookmarkToFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddBookmarkToFolder(rootNode.id);
                        }}
                        className="h-7 px-2 rounded-lg flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                        title={`Add bookmark directly to ${rootNode.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    )}

                    {/* All-in-One Edit Collection Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCollection(rootNode);
                      }}
                      className="h-7 px-2 rounded-lg flex items-center gap-1 bg-slate-100/80 dark:bg-neutral-800/80 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                      title="Edit collection details"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Edit</span>
                    </button>
                  </div>
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
                      <span className="text-[10px] font-mono text-muted-foreground">
                        +{childCount - 3}
                      </span>
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

      {/* All-In-One Collection Edit Modal */}
      <EditCollectionModal
        folder={editingCollection}
        folders={folders}
        folderTree={folderTree}
        open={!!editingCollection}
        onOpenChange={(open) => {
          if (!open) setEditingCollection(null);
        }}
        onSave={handleSaveCollection}
        onNewSubfolder={(parentId) => {
          setEditingCollection(null);
          onNewSubfolder?.(parentId);
        }}
        onDeleteFolder={(f) => {
          setEditingCollection(null);
          onDeleteFolder?.(f);
        }}
      />
    </div>
  );
}
