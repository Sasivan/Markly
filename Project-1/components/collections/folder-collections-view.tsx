"use client";

import * as React from "react";
import {
  Folder as FolderIcon,
  ArrowRight,
  Layers,
  Plus,
  MoreHorizontal,
  Edit2,
  Palette,
  Trash2,
  FolderInput,
  Inbox,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
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
  unsortedCount?: number;
  onSelectView?: (view: any) => void;
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
  unsortedCount = 0,
  onSelectView,
}: FolderCollectionsViewProps) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  React.useEffect(() => {
    if (editingFolderId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingFolderId]);

  const handleStartRename = (f: Folder) => {
    setEditingFolderId(f.id);
    setEditName(f.name);
    setOpenMenuId(null);
  };

  const handleSaveRename = (folderId: string) => {
    if (editName.trim() && onRenameFolder) {
      onRenameFolder(folderId, editName.trim());
    }
    setEditingFolderId(null);
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
          const unsortedFolder: Folder = folders.find((f) => f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_")) || {
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
          const isRenaming = editingFolderId === unsortedFolder.id;

          return (
            <div
              key={unsortedFolder.id}
              onClick={() => {
                if (!isRenaming) onSelectView?.("unsorted");
              }}
              className="rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-900/60 bg-violet-50/20 dark:bg-violet-950/20 p-4 shadow-xs hover:border-violet-500 dark:hover:border-violet-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-2xs"
                    style={{ backgroundColor: `${unsortedFolder.color}20` }}
                  >
                    <FolderIconRenderer icon={unsortedFolder.icon} color={unsortedFolder.color} className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                      {unsortedCount} {unsortedCount === 1 ? "site" : "sites"}
                    </Badge>

                    {/* 3-Dot Options Menu Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === unsortedFolder.id ? null : unsortedFolder.id);
                        }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-foreground cursor-pointer transition-colors"
                        title="Unsorted options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === unsortedFolder.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f] p-1.5 shadow-2xl z-50 text-xs space-y-0.5 animate-in zoom-in-95"
                        >
                          {onRenameFolder && (
                            <button
                              type="button"
                              onClick={() => handleStartRename(unsortedFolder)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-left transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                              <span>Rename Collection</span>
                            </button>
                          )}

                          {onCustomizeFolder && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onCustomizeFolder(unsortedFolder);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-left transition-colors"
                            >
                              <Palette className="h-3.5 w-3.5 text-purple-500" />
                              <span>Customize Icon & Color</span>
                            </button>
                          )}

                          <div className="pt-1 mt-1 border-t border-slate-100 dark:border-neutral-800 px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>Permanent System Folder</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {isRenaming ? (
                    <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(unsortedFolder.id);
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="text-sm font-bold bg-slate-100 dark:bg-neutral-800 px-2 py-1 rounded border border-indigo-400 focus:outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(unsortedFolder.id)}
                        className="p-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFolderId(null)}
                        className="p-1.5 rounded bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-300 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {unsortedFolder.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permanent system folder for all uncategorized bookmarks
                      </p>
                    </>
                  )}
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
          const bookmarkCount = rootNode.totalDescendantBookmarkCount || rootNode.bookmarkCount || 0;
          const isRenaming = editingFolderId === rootNode.id;

          return (
            <div
              key={rootNode.id}
              onClick={() => {
                if (!isRenaming) onSelectFolder(rootNode.id, childCount > 0);
              }}
              className="rounded-xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-4 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-2xs"
                    style={{ backgroundColor: `${rootNode.color}20` }}
                  >
                    <FolderIconRenderer icon={rootNode.icon} color={rootNode.color} className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">
                      {bookmarkCount} {bookmarkCount === 1 ? "site" : "sites"}
                    </Badge>

                    {/* 3-Dot Options Menu Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === rootNode.id ? null : rootNode.id);
                        }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-foreground cursor-pointer transition-colors"
                        title="Folder options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === rootNode.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f] p-1.5 shadow-2xl z-50 text-xs space-y-0.5 animate-in zoom-in-95"
                        >
                          {onNewSubfolder && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onNewSubfolder(rootNode.id);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-left transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5 text-indigo-500" />
                              <span>New Subfolder</span>
                            </button>
                          )}

                          {onRenameFolder && (
                            <button
                              type="button"
                              onClick={() => handleStartRename(rootNode)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-left transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                              <span>Rename Collection</span>
                            </button>
                          )}

                          {onCustomizeFolder && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onCustomizeFolder(rootNode);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-left transition-colors"
                            >
                              <Palette className="h-3.5 w-3.5 text-purple-500" />
                              <span>Customize Icon & Color</span>
                            </button>
                          )}

                          {onMoveFolder && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onMoveFolder(rootNode);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-left transition-colors"
                            >
                              <FolderInput className="h-3.5 w-3.5 text-amber-500" />
                              <span>Move Collection</span>
                            </button>
                          )}

                          {onDeleteFolder && (
                            <>
                              <div className="h-px bg-slate-100 dark:bg-neutral-800 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onDeleteFolder(rootNode);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer text-left transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete Collection</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {isRenaming ? (
                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(rootNode.id);
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="text-sm font-bold bg-background border border-indigo-500 rounded px-1.5 py-0.5 text-foreground focus:outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(rootNode.id)}
                        className="h-6 w-6 rounded bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 cursor-pointer"
                        title="Save"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFolderId(null)}
                        className="h-6 w-6 rounded bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {rootNode.name}
                    </h3>
                  )}
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
