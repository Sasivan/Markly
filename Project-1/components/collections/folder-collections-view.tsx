"use client";

import * as React from "react";
import {
  Folder as FolderIcon,
  ArrowRight,
  Layers,
  Plus,
  Edit2,
  Table as TableIcon,
  LayoutGrid,
  Rows3,
  FolderTree,
  ChevronDown,
  ChevronRight,
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
  onCopyFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  onSaveCollection?: (
    folderId: string,
    updates: { name: string; icon: string; color: string; parentId?: string | null }
  ) => Promise<void> | void;
  unsortedCount?: number;
  onSelectView?: (view: any) => void;
  onOpenAddBookmarkToFolder?: (folderId: string) => void;
}

interface TreeFolderRowProps {
  node: FolderTreeNode;
  depth: number;
  onSelectFolder: (folderId: string, isParent?: boolean) => void;
  onEditCollection: (folder: Folder) => void;
  onOpenAddBookmarkToFolder?: (folderId: string) => void;
  onNewSubfolder?: (parentId: string) => void;
}

function TreeFolderRow({
  node,
  depth,
  onSelectFolder,
  onEditCollection,
  onOpenAddBookmarkToFolder,
  onNewSubfolder,
}: TreeFolderRowProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const childCount = node.children?.length || 0;
  const bookmarkCount = node.totalDescendantBookmarkCount || node.bookmarkCount || 0;

  return (
    <div className="select-none">
      <div
        className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-850 cursor-pointer transition-colors"
        style={{ paddingLeft: `${Math.max(12, depth * 22 + 12)}px` }}
        onClick={() => onSelectFolder(node.id, childCount > 0)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {childCount > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sm shadow-2xs shrink-0"
            style={{ backgroundColor: `${node.color}20` }}
          >
            <FolderIconRenderer icon={node.icon} color={node.color} className="h-3.5 w-3.5" />
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
              {node.name}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] font-mono px-1.5 py-0 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-none"
            >
              {bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}
            </Badge>
            {childCount > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                ({childCount} {childCount === 1 ? "subfolder" : "subfolders"})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onEditCollection(node)}
            className="h-6.5 w-6.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 cursor-pointer"
            title="Edit"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onSelectFolder(node.id, childCount > 0)}
            className="h-6.5 px-2 rounded-md border border-slate-200 dark:border-neutral-700 text-[10px] font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <span>Open</span>
            <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {isOpen && childCount > 0 && (
        <div className="space-y-0.5 border-l border-slate-200 dark:border-neutral-800 ml-4 my-0.5">
          {node.children.map((child) => (
            <TreeFolderRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectFolder={onSelectFolder}
              onEditCollection={onEditCollection}
              onOpenAddBookmarkToFolder={onOpenAddBookmarkToFolder}
              onNewSubfolder={onNewSubfolder}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  onCopyFolder,
  onDeleteFolder,
  onSaveCollection,
  unsortedCount = 0,
  onSelectView,
  onOpenAddBookmarkToFolder,
}: FolderCollectionsViewProps) {
  const [editingCollection, setEditingCollection] = React.useState<Folder | null>(null);
  const [viewMode, setViewMode] = React.useState<"cards" | "tree" | "table" | "compact">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("markly_collections_view_mode");
        if (saved && ["cards", "tree", "table", "compact"].includes(saved)) {
          return saved as any;
        }
      } catch {}
    }
    return "cards";
  });

  const handleSetViewMode = (mode: "cards" | "tree" | "table" | "compact") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("markly_collections_view_mode", mode);
      } catch {}
    }
  };

  const unsortedFolder: Folder = React.useMemo(() => {
    return (
      folders.find((f) => f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_")) || {
        id: "__UNSORTED__",
        userId: "",
        parentId: null,
        name: "Inbox / Needs Organization",
        icon: "📥",
        color: "#8b5cf6",
        position: -9999,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    );
  }, [folders]);

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
          {/* Multi-View Mode Switcher: Cards | Tree | Table | Compact */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-850 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-700 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetViewMode("cards")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === "cards"
                  ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Cards View (Default)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("tree")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === "tree"
                  ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Parent & Child Tree View (Hierarchical)"
            >
              <FolderTree className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("table")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("compact")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === "compact"
                  ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact View"
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>

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

      {/* 1. Grid of Collection Cards (Default) */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Permanent Unsorted (Inbox) Collection Card with Customization */}
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
                      <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-none">
                        {bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}
                      </Badge>

                      {/* All-in-One Edit Collection Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCollection(rootNode);
                        }}
                        className="h-7 px-2 rounded-lg flex items-center gap-1 bg-slate-100/80 dark:bg-neutral-850 hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
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
      )}

      {/* 2. Parent & Child Tree View (Hierarchical) */}
      {viewMode === "tree" && (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-3 shadow-xs space-y-1">
          {/* Inbox / Unsorted Tree Row */}
          <div
            onClick={() => onSelectView?.("unsorted")}
            className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-850 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-5" />
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-sm shadow-2xs shrink-0"
                style={{ backgroundColor: `${unsortedFolder.color}20` }}
              >
                <FolderIconRenderer icon={unsortedFolder.icon} color={unsortedFolder.color} className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {unsortedFolder.name}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-400 text-violet-600 dark:text-violet-400">
                  Inbox
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono px-1.5 py-0 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-none"
                >
                  {unsortedCount} {unsortedCount === 1 ? "site" : "sites"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setEditingCollection(unsortedFolder)}
                className="h-6.5 w-6.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 cursor-pointer"
                title="Edit"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onSelectView?.("unsorted")}
                className="h-6.5 px-2 rounded-md border border-slate-200 dark:border-neutral-700 text-[10px] font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <span>Open</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-neutral-800/80 my-1.5" />

          {/* Root Tree Folders */}
          {folderTree.map((rootNode) => (
            <TreeFolderRow
              key={rootNode.id}
              node={rootNode}
              depth={0}
              onSelectFolder={onSelectFolder}
              onEditCollection={setEditingCollection}
              onOpenAddBookmarkToFolder={onOpenAddBookmarkToFolder}
              onNewSubfolder={onNewSubfolder}
            />
          ))}
        </div>
      )}

      {/* 3. Table View of Collections */}
      {viewMode === "table" && (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-neutral-850 border-b border-slate-200 dark:border-neutral-800 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Collection</th>
                <th className="py-3 px-4">Subfolders</th>
                <th className="py-3 px-4">Bookmarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
              {/* Inbox / Unsorted Row */}
              <tr
                onClick={() => onSelectView?.("unsorted")}
                className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-2xs"
                      style={{ backgroundColor: `${unsortedFolder.color}20` }}
                    >
                      <FolderIconRenderer icon={unsortedFolder.icon} color={unsortedFolder.color} className="h-4 w-4" />
                    </div>
                    <span>{unsortedFolder.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-400 text-violet-600 dark:text-violet-400">
                      Inbox
                    </Badge>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground font-mono">0</td>
                <td className="py-3 px-4">
                  <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                    {unsortedCount} {unsortedCount === 1 ? "site" : "sites"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCollection(unsortedFolder)}
                      className="h-7 w-7 p-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800"
                      title="Edit collection"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectView?.("unsorted")}
                      className="h-7 px-2 text-[11px] cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </td>
              </tr>

              {/* Folder Rows */}
              {folderTree.map((rootNode) => {
                const childCount = rootNode.children?.length || 0;
                const bookmarkCount = rootNode.totalDescendantBookmarkCount || rootNode.bookmarkCount || 0;
                return (
                  <tr
                    key={rootNode.id}
                    onClick={() => onSelectFolder(rootNode.id, childCount > 0)}
                    className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-2xs"
                          style={{ backgroundColor: `${rootNode.color}20` }}
                        >
                          <FolderIconRenderer icon={rootNode.icon} color={rootNode.color} className="h-4 w-4" />
                        </div>
                        <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{rootNode.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {childCount} {childCount === 1 ? "subfolder" : "subfolders"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-none">
                        {bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCollection(rootNode)}
                          className="h-7 w-7 p-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800"
                          title="Edit collection"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectFolder(rootNode.id, childCount > 0)}
                          className="h-7 px-2 text-[11px] cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Compact List View */}
      {viewMode === "compact" && (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] divide-y divide-slate-100 dark:divide-neutral-800/80 overflow-hidden shadow-xs">
          {/* Inbox / Unsorted Compact Row */}
          <div
            onClick={() => onSelectView?.("unsorted")}
            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-2xs shrink-0"
                style={{ backgroundColor: `${unsortedFolder.color}20` }}
              >
                <FolderIconRenderer icon={unsortedFolder.icon} color={unsortedFolder.color} className="h-4 w-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{unsortedFolder.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-400 text-violet-600 dark:text-violet-400">
                    Inbox
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {unsortedCount} {unsortedCount === 1 ? "site" : "sites"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setEditingCollection(unsortedFolder)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectView?.("unsorted")}
                className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <span>Open</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Folder Compact Rows */}
          {folderTree.map((rootNode) => {
            const childCount = rootNode.children?.length || 0;
            const bookmarkCount = rootNode.totalDescendantBookmarkCount || rootNode.bookmarkCount || 0;
            return (
              <div
                key={rootNode.id}
                onClick={() => onSelectFolder(rootNode.id, childCount > 0)}
                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-2xs shrink-0"
                    style={{ backgroundColor: `${rootNode.color}20` }}
                  >
                    <FolderIconRenderer icon={rootNode.icon} color={rootNode.color} className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {rootNode.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                      <span>{bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}</span>
                      {childCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{childCount} {childCount === 1 ? "subfolder" : "subfolders"}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingCollection(rootNode)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectFolder(rootNode.id, childCount > 0)}
                    className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        onCopyFolder={(f) => {
          setEditingCollection(null);
          onCopyFolder?.(f);
        }}
        onDeleteFolder={(f) => {
          setEditingCollection(null);
          onDeleteFolder?.(f);
        }}
      />
    </div>
  );
}
