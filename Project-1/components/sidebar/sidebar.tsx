"use client";

import * as React from "react";
import {
  Folder,
  Star,
  Clock,
  Inbox,
  Archive,
  Compass,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Sparkles,
  Search,
  Layers,
  History,
  Database,
  User,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { FolderTreeNodeComponent } from "./folder-tree-node";
import { DeleteFolderModal } from "./delete-folder-modal";
import { FolderCustomizeModal } from "./folder-customize-modal";
import { AddFolderModal } from "./add-folder-modal";
import type { Folder as FolderType, FolderTreeNode } from "@/server/db/schema";

interface SidebarProps {
  folderTree: FolderTreeNode[];
  folders: FolderType[];
  activeFolderId: string | null;
  activeView: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "graph" | "insights" | "database" | "profile";
  totalBookmarksCount: number;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "graph" | "insights" | "database" | "profile") => void;
  onRefreshData: () => void;
  onOpenSearch?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  folderTree,
  folders,
  activeFolderId,
  activeView,
  totalBookmarksCount,
  onSelectFolder,
  onSelectView,
  onRefreshData,
  onOpenSearch,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { user, signOut, openAuthModal } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setCollapsed = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      if (onToggleCollapse) {
        onToggleCollapse();
      } else {
        setInternalCollapsed(val);
      }
    },
    [onToggleCollapse]
  );
  const [sidebarWidth, setSidebarWidth] = React.useState(260);
  const [isResizing, setIsResizing] = React.useState(false);

  // VS Code style section collapse & global tree expand/collapse
  const [isFoldersSectionOpen, setIsFoldersSectionOpen] = React.useState(true);
  const [globalForceExpanded, setGlobalForceExpanded] = React.useState<boolean | null>(null);
  const [isAllFoldersExpanded, setIsAllFoldersExpanded] = React.useState(true);

  const handleToggleAllFolders = () => {
    const next = !isAllFoldersExpanded;
    setIsAllFoldersExpanded(next);
    setGlobalForceExpanded(next);
  };

  // New folder modal state
  const [addFolderModalOpen, setAddFolderModalOpen] = React.useState(false);
  const [addFolderParentId, setAddFolderParentId] = React.useState<string | null>(null);

  // Modals state
  const [customizeFolder, setCustomizeFolder] = React.useState<FolderType | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FolderType | null>(null);

  // Resizing logic
  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 190), 450);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Keyboard shortcut Ctrl+\ to toggle collapse
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Folder Actions
  const handleConfirmCreateFolder = async (name: string, icon: string, color: string, parentId?: string | null) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "New Folder",
          parentId: parentId || null,
          icon: icon || "📁",
          color: color || "#3b82f6",
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
        onSelectFolder(data.folder.id);
      }
    } catch (err) {
      console.error("Create folder error:", err);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      onRefreshData();
    } catch (err) {
      console.error("Rename folder error:", err);
    }
  };

  const handleCustomizeSave = async (folderId: string, updates: { name: string; icon: string; color: string }) => {
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      onRefreshData();
    } catch (err) {
      console.error("Customize folder error:", err);
    }
  };

  const handleDuplicateFolder = async (folderId: string) => {
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "POST",
      });
      onRefreshData();
    } catch (err) {
      console.error("Duplicate folder error:", err);
    }
  };

  const handleConfirmDelete = async (folderId: string, mode: "move_up" | "delete_all") => {
    try {
      await fetch(`/api/folders/${folderId}?mode=${mode}`, {
        method: "DELETE",
      });
      if (activeFolderId === folderId) {
        onSelectFolder(null);
        onSelectView("all");
      }
      onRefreshData();
    } catch (err) {
      console.error("Delete folder error:", err);
    }
  };

  const handleDropFolder = async (draggedFolderId: string, targetFolderId: string, position: "inside" | "before" | "after") => {
    try {
      await fetch("/api/folders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: draggedFolderId,
          targetFolderId,
          dropPosition: position,
        }),
      });
      onRefreshData();
    } catch (err) {
      console.error("Drop folder error:", err);
    }
  };

  const parentFolderForModal = addFolderParentId ? folders.find((f) => f.id === addFolderParentId) : null;

  if (collapsed) {
    return (
      <aside className="w-12 flex-shrink-0 flex flex-col border-r border-border bg-[#fbfbfa] dark:bg-[#191919] h-full overflow-hidden select-none">
        {/* Workspace Brand Header - identical h-12 container and h-6 w-6 icon matching expanded sidebar */}
        <div className="h-12 border-b border-border flex items-center justify-center bg-[#fbfbfa] dark:bg-[#191919] flex-shrink-0">
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            M
          </div>
        </div>

        {/* Collapsed Nav Rail */}
        <div className="flex-1 py-2 flex flex-col items-center space-y-2.5 px-1 overflow-y-auto">
          {/* Home Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("home");
            }}
            title="Workspace Home"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "home" && !activeFolderId
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </button>

          {/* Quick Search in Minimized Rail */}
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search Bookmarks (⌘K)"
            className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* All Bookmarks / Quick Access Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            title="All Bookmarks / Quick Access"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "all" && !activeFolderId
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
          </button>

          {/* Folder Collections Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("collections");
            }}
            title="Folder Collections"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "collections" && !activeFolderId
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-foreground"
            }`}
          >
            <Folder className="h-4 w-4 text-indigo-500" />
          </button>

          {/* Knowledge Graph Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("graph");
            }}
            title="Interactive Knowledge Graph (Obsidian)"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "graph" && !activeFolderId
                ? "bg-purple-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-purple-400"
            }`}
          >
            <Layers className="h-4 w-4 text-purple-500" />
          </button>

          {/* Inbox Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("unsorted");
            }}
            title="Inbox / Needs Organization"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "unsorted"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-violet-500"
            }`}
          >
            <Inbox className="h-4 w-4 text-violet-500" />
          </button>

          {/* User Account / Sign In in Rail */}
          <button
            type="button"
            onClick={() => openAuthModal(user ? "login" : "login")}
            title={user ? `Signed in as ${user.email}` : "Sign In / Sign Up"}
            className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 mt-2 border-t border-border/60 pt-2"
          >
            {user ? (
              <div className="h-5 w-5 rounded-md bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User className="h-4 w-4 text-blue-500" />
            )}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Create New Folder Modal with Icon Search */}
      <AddFolderModal
        parentId={addFolderParentId}
        parentFolder={parentFolderForModal}
        open={addFolderModalOpen}
        onOpenChange={setAddFolderModalOpen}
        onConfirm={handleConfirmCreateFolder}
      />

      {/* Delete Folder Confirmation Dialog */}
      <DeleteFolderModal
        folder={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Customize Folder Dialog */}
      <FolderCustomizeModal
        folder={customizeFolder}
        open={Boolean(customizeFolder)}
        onOpenChange={(open) => !open && setCustomizeFolder(null)}
        onSave={handleCustomizeSave}
      />

      {/* Sidebar Container */}
      <aside
        style={{ width: `${sidebarWidth}px` }}
        className="relative flex-shrink-0 flex flex-col border-r border-border bg-[#fbfbfa] dark:bg-[#191919] h-full overflow-hidden select-none"
      >
        {/* Workspace Brand Header - clean, full width */}
        <div className="h-12 border-b border-border flex items-center px-3.5 gap-2.5 bg-[#fbfbfa] dark:bg-[#191919]">
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs flex-shrink-0">
            M
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
            Markly
          </span>
        </div>

        {/* Modern Homepage Section */}
        <div
          className={`p-2 space-y-1 text-xs select-none transition-all ${
            isFoldersSectionOpen
              ? "flex-shrink-0 border-b border-border/60"
              : "flex-1 overflow-y-auto min-h-0"
          }`}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider flex items-center justify-between">
            <span>Workspace</span>
            <span className="text-[9px] bg-slate-100 dark:bg-neutral-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">Hub</span>
          </div>

          {/* Home Page Link */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("home");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "home" && !activeFolderId
                ? "bg-blue-600 text-white font-semibold shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${activeView === "home" && !activeFolderId ? "text-white" : "text-blue-500"} flex-shrink-0`} />
            <span className="truncate">Home</span>
            <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded ${activeView === "home" && !activeFolderId ? "bg-blue-700 text-white" : "text-muted-foreground"}`}>Overview</span>
          </button>

          {/* Quick Search in Nav */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
          >
            <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">Search</span>
            <kbd className="ml-auto text-[10px] bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-1.5 py-0.2 rounded font-mono text-muted-foreground">⌘K</kbd>
          </button>

          {/* Quick Access / All Sites */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "all" && !activeFolderId
                ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Compass className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">Quick Access</span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">{totalBookmarksCount}</span>
          </button>

          {/* Folder Collections */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("collections");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "collections" && !activeFolderId
                ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Folder className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span className="truncate">Folder Collections</span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">{folders.length}</span>
          </button>

          {/* Obsidian-Style Interactive Knowledge Graph */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("graph");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "graph" && !activeFolderId
                ? "bg-purple-600 text-white font-semibold shadow-xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <span className="truncate">Knowledge Graph</span>
            <span className="ml-auto text-[9px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono px-1.5 py-0.2 rounded">Obsidian</span>
          </button>

          {/* Recently Visited */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("recent");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "recent"
                ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span className="truncate">Recently Visited</span>
          </button>

          {/* Favorites */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("favorites");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "favorites"
                ? "bg-slate-200 dark:bg-neutral-800 text-amber-700 dark:text-amber-400 font-semibold shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            <span className="truncate">Favorites</span>
          </button>

          {/* Inbox / Needs Organization */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("unsorted");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "unsorted"
                ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Inbox className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <span className="truncate">Inbox / Needs Organization</span>
          </button>

          {/* Archive */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("archive");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "archive"
                ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
            }`}
          >
            <Archive className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">Archive</span>
          </button>
        </div>

        {/* Folders Section Header (VS Code Style) */}
        <div
          className={`p-2 transition-all select-none ${
            isFoldersSectionOpen
              ? "flex-1 overflow-y-auto min-h-0"
              : "flex-shrink-0 mt-auto border-t border-border/80 bg-[#fbfbfa] dark:bg-[#191919]"
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setIsFoldersSectionOpen(!isFoldersSectionOpen)}
              className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors"
              title={isFoldersSectionOpen ? "Collapse Folders Section" : "Expand Folders Section"}
            >
              {isFoldersSectionOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span>Folders</span>
            </button>

            <div className="flex items-center gap-1">
              {/* Unified Toggle All Folders Icon (Collapse / Expand merged) */}
              <button
                type="button"
                onClick={handleToggleAllFolders}
                title={isAllFoldersExpanded ? "Collapse all folders" : "Expand all folders"}
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-neutral-700 hover:text-foreground cursor-pointer transition-colors"
              >
                {isAllFoldersExpanded ? (
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Add Folder Button */}
              <button
                type="button"
                onClick={() => {
                  setAddFolderParentId(null);
                  setAddFolderModalOpen(true);
                }}
                title="Add New Folder (with Icon Search)"
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-neutral-700 hover:text-foreground cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Recursive Folder Tree Items */}
          {isFoldersSectionOpen && (
            <div className="space-y-0.5 mt-1">
              {folderTree.map((node) => (
                <FolderTreeNodeComponent
                  key={node.id}
                  node={node}
                  depth={0}
                  activeFolderId={activeFolderId}
                  forceExpanded={globalForceExpanded}
                  onSelect={(id, isParent) => {
                    onSelectFolder(id, isParent);
                  }}
                  onNewSubfolder={(parentId) => {
                    setAddFolderParentId(parentId);
                    setAddFolderModalOpen(true);
                  }}
                  onRename={handleRenameFolder}
                  onCustomize={setCustomizeFolder}
                  onDuplicate={handleDuplicateFolder}
                  onDelete={setDeleteTarget}
                  onDropFolder={handleDropFolder}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer: Supabase Realtime User Profile */}
        <div className="p-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 bg-slate-50/70 dark:bg-neutral-900/40">
          {user ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => onSelectView("profile")}
                title="View Profile & Settings"
                className="flex items-center gap-2 truncate cursor-pointer hover:opacity-80 transition-opacity text-left min-w-0 flex-1 mr-2"
              >
                <img
                  src={
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email || user.id}`
                  }
                  alt={user.email || "User"}
                  className="h-7 w-7 rounded-full object-cover bg-blue-600 text-white font-bold flex-shrink-0 border border-slate-200 dark:border-neutral-700 shadow-2xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || "User"}`;
                  }}
                />
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user.user_metadata?.display_name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase Synced
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={signOut}
                title="Sign out of Markly"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors flex-shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-xs font-bold">Sign In / Sign Up</span>
              </div>
              <span className="text-[10px] bg-blue-200/60 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-semibold">
                Supabase
              </span>
            </button>
          )}
        </div>

        {/* Draggable Resizer Bar on right edge */}
        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
        />
      </aside>
    </>
  );
}
