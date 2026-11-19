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
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  Layers,
  History,
  Database,
  User,
  LogOut,
  Trash2,
  Globe,
  Edit2,
  MessageSquarePlus,
  X,
  Bookmark,
  Share2,
  Sparkles,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { CreateSmartCollectionModal } from "@/components/modals/create-smart-collection-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { FolderTreeNodeComponent } from "./folder-tree-node";
import { DeleteFolderModal } from "./delete-folder-modal";
import { FolderCustomizeModal } from "./folder-customize-modal";
import { AddFolderModal } from "./add-folder-modal";
import { MoveFolderModal } from "./move-folder-modal";
import { CopyFolderModal } from "./copy-folder-modal";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder as FolderType, FolderTreeNode } from "@/server/db/schema";

interface SidebarProps {
  folderTree: FolderTreeNode[];
  folders: FolderType[];
  activeFolderId: string | null;
  activeView: "home" | "all" | "collections" | "visuals" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback" | "shared" | "smart-collections" | "sessions" | "search";
  totalBookmarksCount: number;
  unsortedCount?: number;
  onSelectFolder: (folderId: string | null, isParent?: boolean) => void;
  onSelectView: (view: "home" | "all" | "collections" | "visuals" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback" | "shared" | "smart-collections" | "sessions" | "search") => void;
  onRefreshData: () => void;
  onOpenSearch?: () => void;
  onOpenAddBookmarkToFolder?: (folderId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCreateFolder?: (name: string, icon: string, color: string, parentId?: string | null) => Promise<void>;
  onDeleteFolder?: (folderId: string, mode: "move_up" | "delete_all") => Promise<void>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
  onCustomizeFolder?: (folderId: string, updates: { name: string; icon: string; color: string }) => Promise<void>;
  onShareFolder?: (folder: FolderType | FolderTreeNode) => void;
}

export function Sidebar({
  folderTree,
  folders,
  activeFolderId,
  activeView,
  totalBookmarksCount,
  unsortedCount,
  onSelectFolder,
  onSelectView,
  onRefreshData,
  onOpenSearch,
  onOpenAddBookmarkToFolder,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onCustomizeFolder,
  onShareFolder,
}: SidebarProps) {
  const { user, signOut, openAuthModal } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setCollapsed = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      if (onToggleCollapse) {
        onToggleCollapse();
      } else {
        setInternalCollapsed((prev) => {
          const next = typeof val === "function" ? val(prev) : val;
          try {
            localStorage.setItem("markly_sidebar_collapsed", String(next));
          } catch {}
          return next;
        });
      }
    },
    [onToggleCollapse]
  );
  const [sidebarWidth, setSidebarWidth] = React.useState(260);
  const [isResizing, setIsResizing] = React.useState(false);

  // Two-Page Sidebar: "nav" (System Views & Pages) vs "folders" (Dedicated Folder Tree)
  const [sidebarPage, setSidebarPageState] = React.useState<"nav" | "folders">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_sidebar_page") as "nav" | "folders";
        if (stored === "nav" || stored === "folders") return stored;
      } catch {}
    }
    return "nav";
  });

  const setSidebarPage = (page: "nav" | "folders") => {
    setSidebarPageState(page);
    try {
      localStorage.setItem("markly_sidebar_page", page);
    } catch {}
  };

  const [globalForceExpanded, setGlobalForceExpanded] = React.useState<boolean | null>(null);
  const [isAllFoldersExpanded, setIsAllFoldersExpanded] = React.useState(true);

  const handleToggleAllFolders = () => {
    const next = !isAllFoldersExpanded;
    setIsAllFoldersExpanded(next);
    setGlobalForceExpanded(next);
  };

  // 3.4: Quick Folder Filter state
  const [folderFilterQuery, setFolderFilterQuery] = React.useState("");

  const filteredFolderTree = React.useMemo(() => {
    if (!folderFilterQuery.trim()) return folderTree;
    const q = folderFilterQuery.toLowerCase();

    function filterNode(node: FolderTreeNode): FolderTreeNode | null {
      const selfMatch = node.name.toLowerCase().includes(q);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter(Boolean) as FolderTreeNode[];

      if (selfMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    }

    return folderTree.map(filterNode).filter(Boolean) as FolderTreeNode[];
  }, [folderTree, folderFilterQuery]);

  // New folder modal state
  const [addFolderModalOpen, setAddFolderModalOpen] = React.useState(false);
  const [addFolderParentId, setAddFolderParentId] = React.useState<string | null>(null);

  // Modals state
  const [customizeFolder, setCustomizeFolder] = React.useState<FolderType | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FolderType | null>(null);
  const [moveTarget, setMoveTarget] = React.useState<FolderTreeNode | null>(null);
  const [copyTarget, setCopyTarget] = React.useState<FolderTreeNode | null>(null);
  const [isRootDragOver, setIsRootDragOver] = React.useState(false);

  // Custom avatar live listener
  const [customAvatar, setCustomAvatar] = React.useState<string | null>(null);

  // Shared folders live listener
  const [sharedCount, setSharedCount] = React.useState(0);

  React.useEffect(() => {
    const updateCount = () => {
      try {
        const stored = localStorage.getItem("markly_shared_folders");
        if (stored) {
          const list = JSON.parse(stored);
          setSharedCount(Array.isArray(list) ? list.length : 0);
          return;
        }
      } catch {}
      setSharedCount(0);
    };
    updateCount();
    window.addEventListener("markly-shared-updated", updateCount);
    return () => window.removeEventListener("markly-shared-updated", updateCount);
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("markly_user_avatar");
      if (stored) setCustomAvatar(stored);

      const handler = (e: any) => {
        if (e.detail?.avatarUrl) {
          setCustomAvatar(e.detail.avatarUrl);
        }
      };
      window.addEventListener("markly-avatar-updated", handler);
      return () => window.removeEventListener("markly-avatar-updated", handler);
    }
  }, []);

  // Check if current authenticated user has administrator privileges
  const isUserAdmin = React.useMemo(() => {
    if (!user) return false;
    const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").replace(/[\r\n"']/g, "").trim().toLowerCase();
    const uEmail = (user.email || user.user_metadata?.email || "").replace(/[\r\n"']/g, "").trim().toLowerCase();
    if (uEmail.startsWith("sasivan177@") || uEmail.includes("sasivan177")) return true;
    if (adminEnv && uEmail && (adminEnv === uEmail || adminEnv.includes(uEmail) || uEmail.includes(adminEnv))) return true;
    if (
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.role === "admin" ||
      user.app_metadata?.is_admin === true ||
      user.user_metadata?.is_admin === true
    ) {
      return true;
    }
    return false;
  }, [user]);

  // 5.2: Saved Searches state and live sync
  interface SavedSearchItem {
    id: string;
    name: string;
    query: string;
  }
  const [savedSearches, setSavedSearches] = React.useState<SavedSearchItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_saved_searches");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem("markly_saved_searches");
        if (stored) setSavedSearches(JSON.parse(stored));
        else setSavedSearches([]);
      } catch {}
    };
    window.addEventListener("markly-saved-searches-updated", handleUpdate);
    return () => window.removeEventListener("markly-saved-searches-updated", handleUpdate);
  }, []);

  const handleDeleteSavedSearch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    try {
      localStorage.setItem("markly_saved_searches", JSON.stringify(updated));
    } catch {}
  };


  const handleSelectSavedSearch = (query: string) => {
    onSelectFolder(null);
    onSelectView("all");
    window.dispatchEvent(new CustomEvent("markly-set-search", { detail: { query } }));
  };

  // 3.1: Smart Dynamic Collections State & Handlers
  const [smartCollections, setSmartCollections] = React.useState<any[]>([]);
  const [createSmartCollectionOpen, setCreateSmartCollectionOpen] = React.useState(false);
  const [activeSmartCollectionId, setActiveSmartCollectionId] = React.useState<string | null>(null);

  const fetchSmartCollections = React.useCallback(async () => {
    try {
      const res = await fetch("/api/smart-collections");
      const d = await res.json();
      if (d.success && Array.isArray(d.collections)) {
        setSmartCollections(d.collections);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchSmartCollections();
  }, [fetchSmartCollections]);

  const handleDeleteSmartCollection = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/smart-collections?id=${id}`, { method: "DELETE" });
      setSmartCollections((prev) => prev.filter((c) => c.id !== id));
      if (activeSmartCollectionId === id) {
        setActiveSmartCollectionId(null);
      }
    } catch {}
  };

  const handleSelectSmartCollection = (sc: any) => {
    setActiveSmartCollectionId(sc.id);
    onSelectFolder(null);
    onSelectView("all");
    try {
      const rules = typeof sc.rulesJson === "string" ? JSON.parse(sc.rulesJson) : sc.rulesJson;
      localStorage.setItem("markly_notion_column_filters", JSON.stringify(rules));
      window.dispatchEvent(
        new CustomEvent("markly-smart-collection-selected", { detail: { collection: sc, rules } })
      );
    } catch {}
  };
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

  // Folder Actions (with 0ms Optimistic Strategy)
  const handleConfirmCreateFolder = async (name: string, icon: string, color: string, parentId?: string | null) => {
    try {
      if (onCreateFolder) {
        await onCreateFolder(name, icon, color, parentId);
        return;
      }
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "New Folder",
          parentId: parentId || null,
          icon: icon || "Folder",
          color: color || "#3b82f6",
        }),
      });
      const data = await res.json();
      if (data.success && data.folder) {
        onRefreshData();
        onSelectFolder(data.folder.id);
      }
    } catch (err) {
      console.error("Create folder error:", err);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      if (onRenameFolder) {
        await onRenameFolder(folderId, newName);
        return;
      }
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Rename folder error:", err);
    }
  };

  const handleCustomizeSave = async (folderId: string, updates: { name: string; icon: string; color: string }) => {
    try {
      if (onCustomizeFolder) {
        await onCustomizeFolder(folderId, updates);
        return;
      }
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Customize folder error:", err);
    }
  };

  const handleDuplicateFolder = async (folderId: string) => {
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Duplicate folder error:", err);
    }
  };

  const handleConfirmDelete = async (folderId: string, mode: "move_up" | "delete_all") => {
    try {
      if (onDeleteFolder) {
        await onDeleteFolder(folderId, mode);
        return;
      }
      await fetch(`/api/folders/${folderId}?mode=${encodeURIComponent(mode)}`, {
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

  const handleDropFolder = async (
    draggedFolderId: string,
    targetFolderId: string,
    position: "inside" | "before" | "after" | "root"
  ) => {
    if (!draggedFolderId || draggedFolderId === targetFolderId) return;

    // Cyclic check: cannot drop folder into itself or its own subfolder
    const getDescendants = (parentId: string): string[] => {
      const children = folders.filter((f) => (f.parentId ?? (f as any).parent_id) === parentId).map((f) => f.id);
      return [parentId, ...children.flatMap(getDescendants)];
    };
    if (targetFolderId !== "root" && getDescendants(draggedFolderId).includes(targetFolderId)) {
      console.warn("Cannot move a folder into itself or its subfolder");
      return;
    }

    try {
      await fetch("/api/folders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: draggedFolderId,
          targetFolderId: targetFolderId === "root" ? null : targetFolderId,
          dropPosition: position,
        }),
      });
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Drop folder error:", err);
    }
  };

  const handleMoveFolder = async (folderId: string, newParentId: string | null) => {
    await handleDropFolder(folderId, newParentId || "root", newParentId ? "inside" : "root");
  };

  const handleCopyFolder = async (folderId: string, targetParentId: string | null, customName?: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetParentId, name: customName }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
        setCopyTarget(null);
      }
    } catch (err) {
      console.error("Failed to copy folder:", err);
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRootDragOver(true);
  };

  const handleRootDragLeave = () => {
    setIsRootDragOver(false);
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRootDragOver(false);

    // 4.3: Batch move bookmarks to root / unsorted
    const bookmarksJson = e.dataTransfer.getData("application/x-markly-bookmarks");
    if (bookmarksJson) {
      try {
        const ids = JSON.parse(bookmarksJson);
        if (Array.isArray(ids) && ids.length > 0) {
          const res = await fetch("/api/bookmarks/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "move", ids, folderId: null }),
          });
          if (res.ok) {
            window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
          }
        }
      } catch (err) {
        console.error("Failed to move bookmarks to root:", err);
      }
      return;
    }

    const draggedFolderId =
      e.dataTransfer.getData("application/x-markly-folder") || e.dataTransfer.getData("text/plain");
    if (!draggedFolderId) return;
    handleDropFolder(draggedFolderId, "root", "root");
  };

  const parentFolderForModal = addFolderParentId ? folders.find((f) => f.id === addFolderParentId) : null;

  if (collapsed) {
    return (
      <aside className="w-12 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar-bg h-full overflow-hidden select-none">
        {/* Workspace Brand Header - click Markly logo to expand sidebar */}
        <div className="h-12 border-b border-sidebar-border flex items-center px-2.5 bg-sidebar-bg flex-shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Expand Sidebar (Ctrl+\)"
            className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground font-bold text-xs cursor-pointer transition-transform active:scale-95 shadow-xs shrink-0"
          >
            M
          </button>
        </div>

        {/* Collapsed Nav Rail (Exact same 1-to-1 order as expanded sidebar) */}
        <div className="flex-1 py-2 flex flex-col items-center space-y-1.5 px-1 overflow-y-auto">
          {/* 1. Home Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("home");
            }}
            title="Workspace Home"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "home" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
          </button>

          {/* 2. Quick Search in Minimized Rail */}
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search Bookmarks (⌘K)"
            className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* 3. All Sites Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            title="All Sites"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "all" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Globe className="h-4 w-4" />
          </button>

          {/* 4. Favorites Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("favorites");
            }}
            title="Favorites"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "favorites" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Star className="h-4 w-4" />
          </button>

          {/* 5. Recently Visited Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("recent");
            }}
            title="Recently Visited"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "recent" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
          </button>

          {/* 6. Smart Collections Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("smart-collections");
            }}
            title="Smart Collections"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "smart-collections" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </button>

          {/* 7. Tab Sessions & Stash Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("sessions");
            }}
            title="Tab Sessions & Stash"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "sessions" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
          </button>

          {/* 8. Shared Links Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("shared");
            }}
            title="Shared Links & Collections"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "shared" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Share2 className="h-4 w-4" />
          </button>

          {/* 9. Folder Collections Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("collections");
            }}
            title="Folder Collections"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "collections" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Folder className="h-4 w-4" />
          </button>

          {/* 10. Visuals & Analytics Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("visuals");
            }}
            title="Visuals & Analytics"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "visuals" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4 text-primary" />
          </button>

          {/* 11. Knowledge Graph Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("graph");
            }}
            title="Interactive Knowledge Graph"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "graph" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
          </button>

          {/* 12. Archive Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("archive");
            }}
            title="Archive"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "archive" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Archive className="h-4 w-4" />
          </button>

          {/* 13. Recycle Bin Option */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("trash");
            }}
            title="Recycle Bin"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "trash"
                ? "bg-accent text-destructive font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Pinned Bottom Left Feedback & Profile in Collapsed Rail */}
        <div className="p-2 border-t border-sidebar-border flex flex-col items-center gap-1.5 justify-center flex-shrink-0 bg-sidebar-bg">
          {/* Admin Moderation Button for Authorized Admins (Above Feedback) */}
          {isUserAdmin && (
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("feedback");
                window.dispatchEvent(new CustomEvent("markly-open-admin-feedback"));
              }}
              title="Admin Feedback Moderation Console"
              className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("feedback");
              window.dispatchEvent(new CustomEvent("markly-open-user-feedback"));
            }}
            title="Feedback & Support"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "feedback" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("profile");
            }}
            title={user ? `Profile (${user.email})` : "Account Profile"}
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeView === "profile" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {customAvatar || user?.user_metadata?.avatar_url ? (
              <img
                src={customAvatar || user?.user_metadata?.avatar_url}
                alt="Profile"
                className="h-6 w-6 rounded-full object-cover border border-border"
              />
            ) : user ? (
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
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

      {/* Move Folder Dialog */}
      <MoveFolderModal
        folder={moveTarget}
        isOpen={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        folders={folders}
        folderTree={folderTree}
        onMoveFolder={handleMoveFolder}
      />

      {/* Copy Folder Dialog */}
      <CopyFolderModal
        folder={copyTarget}
        isOpen={Boolean(copyTarget)}
        onClose={() => setCopyTarget(null)}
        folders={folders}
        folderTree={folderTree}
        onCopyFolder={handleCopyFolder}
      />

      {/* 3.1: Create Smart Dynamic Collection Modal */}
      <CreateSmartCollectionModal
        isOpen={createSmartCollectionOpen}
        onClose={() => setCreateSmartCollectionOpen(false)}
        onCreated={fetchSmartCollections}
      />

      {/* Sidebar Container */}
      <aside
        style={{ width: `${sidebarWidth}px` }}
        className="relative flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar-bg h-full overflow-hidden select-none"
      >
        {/* Workspace Brand Header - Locked to exact 10px coordinate as collapsed */}
        <div className="h-12 border-b border-sidebar-border flex items-center justify-between px-2.5 bg-sidebar-bg flex-shrink-0">
          {/* Clickable Website Name & Logo opens Workspace Home */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("home");
            }}
            title="Markly - Go to Workspace Home"
            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85 transition-opacity text-left group"
          >
            {/* Markly Logo: Exact same size and position as collapsed */}
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="font-semibold text-xs text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
              Markly
            </span>
          </button>

          {/* Page Switcher Buttons & Collapse Sidebar Button: Positioned at right of website name panel */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-md border border-border/60">
              <button
                type="button"
                onClick={() => setSidebarPage("nav")}
                disabled={sidebarPage === "nav"}
                title="Page 1: Navigation & Views"
                className={`h-5 w-5 rounded flex items-center justify-center cursor-pointer transition-colors ${
                  sidebarPage === "nav"
                    ? "bg-card text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarPage("folders")}
                disabled={sidebarPage === "folders"}
                title="Page 2: Folder Tree Hierarchy"
                className={`h-5 w-5 rounded flex items-center justify-center cursor-pointer transition-colors ${
                  sidebarPage === "folders"
                    ? "bg-card text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Collapse Sidebar Button at the right edge of open sidebar */}
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar (Ctrl+\)"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page 1: Workspace Nav Section */}
        {sidebarPage === "nav" && (
        <div className="flex-1 overflow-y-auto min-h-0 py-2 px-2 space-y-1 text-xs select-none">
          {/* Home Page Link */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("home");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "home" && !activeFolderId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Compass className={`h-4 w-4 ${activeView === "home" && !activeFolderId ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <span className="truncate">Home</span>
          </button>

          {/* Quick Search in Nav */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Search</span>
            <kbd className="ml-auto text-xs bg-muted border border-border px-1.5 py-0.5 rounded font-mono text-muted-foreground">⌘K</kbd>
          </button>

          {/* 5.2: Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="pt-1 pb-1 space-y-0.5 border-y border-sidebar-border/40 my-1">
              <div className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                <span>Saved searches</span>
              </div>
              {savedSearches.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectSavedSearch(item.query)}
                  className="group flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg cursor-pointer text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedSearch(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer transition-opacity"
                    title="Remove saved search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* All Sites */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("all");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "all" && !activeFolderId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">All sites</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground tabular-nums">{totalBookmarksCount}</span>
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
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Star className={`h-4 w-4 ${activeView === "favorites" ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
            </div>
            <span className="truncate">Favorites</span>
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
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Recently visited</span>
          </button>

          {/* Smart Collections Page (Strictly ABOVE Shared) */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("smart-collections");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "smart-collections" && !activeFolderId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Smart collections</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground tabular-nums">
              {smartCollections.length}
            </span>
          </button>

          {/* Tab Sessions & Stash Page */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("sessions");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "sessions" && !activeFolderId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Tab sessions & stash</span>
          </button>

          {/* Shared Links */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("shared");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "shared"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Shared</span>
            {sharedCount > 0 && (
              <span className="ml-auto text-xs font-mono text-muted-foreground tabular-nums">
                {sharedCount}
              </span>
            )}
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
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Folder className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Folder collections</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground tabular-nums">
              {folders.filter((f) => f.id !== "__UNSORTED__" && !f.id.startsWith("fld_unsorted_")).length}
            </span>
          </button>

          {/* Visuals & Custom Builder */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("visuals");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "visuals" && !activeFolderId
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate">Visual builder & charts</span>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Studio
            </span>
          </button>

          {/* Knowledge Graph */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("graph");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "graph" && !activeFolderId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Knowledge graph</span>
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
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Archive className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Archive</span>
          </button>

          {/* Recycle Bin (Trash) */}
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("trash");
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium text-left transition-colors ${
              activeView === "trash"
                ? "bg-accent text-destructive font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-4 w-4" />
            </div>
            <span className="truncate">Recycle bin</span>
          </button>
        </div>
        )}

        {/* Page 2: Dedicated Folder Tree Section */}
        {sidebarPage === "folders" && (
        <div className="flex-1 overflow-y-auto min-h-0 p-2 select-none space-y-0.5">
          <div
            onDragOver={handleRootDragOver}
            onDragLeave={handleRootDragLeave}
            onDrop={handleRootDrop}
            className={`flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground rounded-md transition-colors ${
              isRootDragOver ? "bg-primary/10 text-primary ring-1 ring-primary/40" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Folder className="h-3.5 w-3.5 text-primary" />
              <span>Folders</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Unified Toggle All Folders Icon */}
              <button
                type="button"
                onClick={handleToggleAllFolders}
                title={isAllFoldersExpanded ? "Collapse all folders" : "Expand all folders"}
                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
                title="Add New Folder"
                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Recursive Folder Tree Items */}
          <div className="space-y-0.5 mt-1">
              {/* 3.4: Quick Folder Filter Input */}
              <div className="px-1 py-1 mb-1">
                <div className="relative flex items-center">
                  <Search className="absolute left-2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={folderFilterQuery}
                    onChange={(e) => setFolderFilterQuery(e.target.value)}
                    placeholder="Filter folders..."
                    className="w-full h-6 pl-6 pr-5 rounded-md bg-secondary/50 border border-sidebar-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {folderFilterQuery && (
                    <button
                      type="button"
                      onClick={() => setFolderFilterQuery("")}
                      className="absolute right-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Clear folder filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Permanent System Folder: Unsorted */}
              {(() => {
                const unsortedFolder = folders.find((f) => f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_"));
                const unsortedName = unsortedFolder?.name || "Unsorted";
                const unsortedIcon = unsortedFolder?.icon || "Inbox";
                const unsortedColor = unsortedFolder?.color || "#8b5cf6";

                return (
                  <div
                    onClick={() => {
                      onSelectFolder(null);
                      onSelectView("unsorted");
                    }}
                    className={`group flex items-center justify-between gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      activeView === "unsorted" && !activeFolderId
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                    }`}
                    title="Permanent folder for uncategorized bookmarks"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FolderIconRenderer icon={unsortedIcon} color={unsortedColor} className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate font-medium">{unsortedName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {unsortedCount !== undefined && unsortedCount > 0 && (
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                          {unsortedCount}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (unsortedFolder) setCustomizeFolder(unsortedFolder);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-opacity"
                        title="Edit Unsorted Name & Icon"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {filteredFolderTree.map((node) => (
                <FolderTreeNodeComponent
                  key={node.id}
                  node={node}
                  depth={0}
                  activeFolderId={activeFolderId}
                  forceExpanded={Boolean(folderFilterQuery.trim()) || globalForceExpanded}
                  onSelect={(id, isParent) => {
                    onSelectFolder(id, isParent);
                  }}
                  onNewSubfolder={(parentId) => {
                    setAddFolderParentId(parentId);
                    setAddFolderModalOpen(true);
                  }}
                  onAddBookmarkToFolder={onOpenAddBookmarkToFolder}
                  onRename={handleRenameFolder}
                  onCustomize={setCustomizeFolder}
                  onDuplicate={handleDuplicateFolder}
                  onDelete={setDeleteTarget}
                  onMove={setMoveTarget}
                  onCopy={setCopyTarget}
                  onShare={(n) => onShareFolder?.(n)}
                  onDropFolder={handleDropFolder}
                />
              ))}

              {folderFilterQuery.trim() && filteredFolderTree.length === 0 && (
                <div className="py-2 px-3 text-center text-[11px] text-muted-foreground font-mono">
                  No matching folders
                </div>
              )}

              {/* Drop to Root Level Target */}
              <div
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
                className={`transition-colors rounded-md ${
                  isRootDragOver
                    ? "h-6 my-1 border border-dashed border-primary/50 bg-primary/10 flex items-center justify-center text-xs text-primary font-medium"
                    : "h-2"
                }`}
              >
                {isRootDragOver ? "Drop for Root Level" : null}
              </div>
            </div>
        </div>
        )}

        {/* Admin Moderation Button for Authorized Admins (Above Feedback) */}
        {isUserAdmin && (
          <div className="px-3 pt-1.5 pb-0.5 border-t border-sidebar-border/60 bg-sidebar-bg flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("feedback");
                window.dispatchEvent(new CustomEvent("markly-open-admin-feedback"));
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="truncate">Admin moderation</span>
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                Admin
              </span>
            </button>
          </div>
        )}

        {/* Feedback & Support Nav Button */}
        <div className={`px-3 py-1.5 ${isUserAdmin ? "pt-1" : "border-t border-sidebar-border/60"} bg-sidebar-bg flex-shrink-0`}>
          <button
            type="button"
            onClick={() => {
              onSelectFolder(null);
              onSelectView("feedback");
              window.dispatchEvent(new CustomEvent("markly-open-user-feedback"));
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeView === "feedback" && !activeFolderId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">Feedback & support</span>
          </button>
        </div>

        {/* Sidebar Footer: Realtime User Profile */}
        <div className="p-2.5 border-t border-sidebar-border flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 bg-sidebar-bg">
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
                    customAvatar ||
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email || user.id}`
                  }
                  alt={user.email || "User"}
                  className="h-7 w-7 rounded-full object-cover bg-primary text-primary-foreground font-medium flex-shrink-0 border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || "User"}`;
                  }}
                />
                <div className="truncate">
                  <div className="text-xs font-medium text-foreground truncate">
                    {user.user_metadata?.display_name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Synced</span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={signOut}
                title="Sign out of Markly"
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors flex-shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSelectFolder(null);
                onSelectView("profile");
              }}
              title="View Account Profile"
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground font-medium cursor-pointer hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                {customAvatar ? (
                  <img
                    src={customAvatar}
                    alt="Guest"
                    className="h-5 w-5 rounded-full object-cover border border-border"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium truncate">Account profile</span>
              </div>
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                Guest
              </span>
            </button>
          )}
        </div>

        {/* Draggable Resizer Bar on right edge */}
        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary active:bg-primary transition-colors z-20"
        />
      </aside>
    </>
  );
}
