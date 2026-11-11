"use client";

import * as React from "react";
import {
  Bookmark as BookmarkIcon,
  Clock,
  FolderTree,
  Globe,
  Activity,
  ArrowLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { AddBookmarkModal } from "@/components/add-bookmark-modal";
import { CommandPalette } from "@/components/command-palette";
import { GlobalPasteListener } from "@/components/global-paste-listener";
import { ImportExportModal } from "@/components/import-export-modal";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BookmarkTable } from "@/components/table/bookmark-table";
import { VisualDashboard } from "@/components/dashboard/visual-dashboard";
import { WorkspaceHome } from "@/components/home/workspace-home";
import { FolderCollectionsView } from "@/components/collections/folder-collections-view";
import { ChildSubfoldersBar } from "@/components/collections/child-subfolders-bar";
import { EditBookmarkModal } from "@/components/table/edit-bookmark-modal";
import { ApiKeyModal } from "@/components/ai/api-key-modal";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { DomainInsightsView } from "@/components/domain/domain-insights-view";
import { LibraryInsightsView } from "@/components/insights/library-insights-view";
import { ProfileView } from "@/components/profile/profile-view";
import { RecycleBinView } from "@/components/trash/recycle-bin-view";
import { useAuth } from "@/components/auth/auth-context";
import type { Folder as FolderType, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

// Fast in-memory tree builder for 0ms optimistic folder updates
function buildTreeFromFolders(allFolders: FolderType[], bookmarksList: BookmarkWithDetails[]): FolderTreeNode[] {
  const countsMap = new Map<string, number>();
  for (const b of bookmarksList) {
    if (b.folderId && !b.isArchived) {
      countsMap.set(b.folderId, (countsMap.get(b.folderId) || 0) + 1);
    }
  }

  const nodeMap = new Map<string, FolderTreeNode>();
  for (const f of allFolders) {
    nodeMap.set(f.id, {
      ...f,
      children: [],
      bookmarkCount: countsMap.get(f.id) || 0,
      totalDescendantBookmarkCount: countsMap.get(f.id) || 0,
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function computeDescendants(n: FolderTreeNode): number {
    let total = n.bookmarkCount;
    for (const child of n.children) {
      total += computeDescendants(child);
    }
    n.totalDescendantBookmarkCount = total;
    return total;
  }

  for (const r of roots) {
    computeDescendants(r);
  }

  return roots;
}

interface MarklyWorkspaceProps {
  initialFolderTree: FolderTreeNode[];
  initialFolders: FolderType[];
  initialBookmarks: BookmarkWithDetails[];
  initialStats: {
    totalBookmarks: number;
    totalFolders: number;
    addedThisWeek: number;
    deadLinks: number;
    topDomain: string;
    topDomains: { domain: string; count: number }[];
    tagDistribution: { name: string; color: string; count: number }[];
    timeline: { date: string; count: number }[];
  };
  initialView?: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile";
  initialFolderId?: string | null;
  initialSidebarCollapsed?: boolean;
}

export function MarklyWorkspace({
  initialFolderTree,
  initialFolders,
  initialBookmarks,
  initialStats,
  initialView = "home",
  initialFolderId = null,
  initialSidebarCollapsed = false,
}: MarklyWorkspaceProps) {
  const { user } = useAuth();
  const [folderTree, setFolderTree] = React.useState<FolderTreeNode[]>(initialFolderTree);
  const [folders, setFolders] = React.useState<FolderType[]>(initialFolders);
  const [bookmarks, setBookmarks] = React.useState<BookmarkWithDetails[]>(initialBookmarks);
  const [stats, setStats] = React.useState(initialStats);

  // Active filter state directly matching SSR state to eliminate home page glimpse on refresh!
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(initialFolderId);
  const [activeView, setActiveView] = React.useState<"home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile">(
    initialFolderId ? "all" : (initialView || "home")
  );
  const [activeDomain, setActiveDomain] = React.useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = React.useState(false); // Default false: show only sites in that specific folder
  const [activeDomainFilter, setActiveDomainFilter] = React.useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = React.useState<string | null>(null);

  // Sidebar collapse state initialized directly from SSR cookie to eliminate full-then-collapse glimpse!
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(Boolean(initialSidebarCollapsed));

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("markly_sidebar_collapsed");
      if (stored !== null) {
        setSidebarCollapsed(stored === "true");
      }
    } catch {}
  }, []);

  const toggleSidebarCollapse = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("markly_sidebar_collapsed", String(next));
        document.cookie = `markly_sidebar_collapsed=${next}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {}
      return next;
    });
  }, []);

  // Main scroll container ref to automatically scroll to top on section/folder open
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeView, activeFolderId, activeDomain]);

  // Search state across header and table
  const [globalSearch, setGlobalSearch] = React.useState("");

  // Modals state
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [prefillUrl, setPrefillUrl] = React.useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [importExportOpen, setImportExportOpen] = React.useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = React.useState(false);
  const [editingBookmark, setEditingBookmark] = React.useState<BookmarkWithDetails | null>(null);

  // Hydration ref to avoid overwriting URL query params on initial mount
  const isHydratedRef = React.useRef(false);

  // Restore view and folder from URL query parameters or sessionStorage on initial load
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const incomingUrl = params.get("addUrl") || params.get("url");
      if (incomingUrl) {
        setPrefillUrl(incomingUrl);
        setAddModalOpen(true);
      }

      const urlView = params.get("view");
      const urlFolderId = params.get("folderId");
      const sessionView = sessionStorage.getItem("markly_active_view");
      const sessionFolderId = sessionStorage.getItem("markly_active_folder_id");

      const validViews = [
        "home",
        "all",
        "collections",
        "favorites",
        "recent",
        "unsorted",
        "archive",
        "trash",
        "graph",
        "insights",
        "database",
        "profile",
      ];

      const restoredFolderId = urlFolderId || sessionFolderId || null;
      const restoredView =
        urlView && validViews.includes(urlView)
          ? (urlView as any)
          : sessionView && validViews.includes(sessionView)
          ? (sessionView as any)
          : null;

      if (restoredFolderId) {
        setActiveFolderId(restoredFolderId);
        setActiveView("all");
      } else if (restoredView) {
        setActiveView(restoredView);
      }

      isHydratedRef.current = true;
    }
  }, []);

  const isNavigatingFromPopRef = React.useRef(false);
  const lastHistoryStateRef = React.useRef({ view: "home", folderId: null as string | null });

  // Listen for browser / mouse back and forward button clicks
  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get("view");
      const urlFolderId = params.get("folderId");

      const validViews = [
        "home",
        "all",
        "collections",
        "favorites",
        "recent",
        "unsorted",
        "archive",
        "trash",
        "graph",
        "insights",
        "database",
        "profile",
      ];

      const targetFolderId = urlFolderId || null;
      const targetView = urlView && validViews.includes(urlView) ? (urlView as any) : "home";

      isNavigatingFromPopRef.current = true;
      setActiveFolderId(targetFolderId);
      setActiveView(targetFolderId ? "all" : targetView);
      lastHistoryStateRef.current = { view: targetView, folderId: targetFolderId };

      if (targetFolderId) {
        sessionStorage.setItem("markly_active_folder_id", targetFolderId);
        sessionStorage.setItem("markly_active_view", "all");
      } else {
        sessionStorage.removeItem("markly_active_folder_id");
        sessionStorage.setItem("markly_active_view", targetView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Synchronize active view & folder to sessionStorage and URL query params
  React.useEffect(() => {
    if (!isHydratedRef.current || typeof window === "undefined") return;

    try {
      const url = new URL(window.location.href);

      if (activeFolderId) {
        sessionStorage.setItem("markly_active_folder_id", activeFolderId);
        sessionStorage.setItem("markly_active_view", "all");
        document.cookie = `markly_active_folder_id=${activeFolderId}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `markly_active_view=all; path=/; max-age=2592000; SameSite=Lax`;
        url.searchParams.set("folderId", activeFolderId);
        url.searchParams.delete("view");
      } else {
        sessionStorage.removeItem("markly_active_folder_id");
        sessionStorage.setItem("markly_active_view", activeView);
        document.cookie = `markly_active_folder_id=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `markly_active_view=${activeView}; path=/; max-age=2592000; SameSite=Lax`;
        url.searchParams.delete("folderId");
        if (activeView === "home") {
          url.searchParams.delete("view");
        } else {
          url.searchParams.set("view", activeView);
        }
      }

      if (isNavigatingFromPopRef.current) {
        isNavigatingFromPopRef.current = false;
        window.history.replaceState({ view: activeView, folderId: activeFolderId }, "", url.pathname + url.search);
      } else {
        const changed =
          lastHistoryStateRef.current.view !== activeView ||
          lastHistoryStateRef.current.folderId !== activeFolderId;
        if (changed) {
          lastHistoryStateRef.current = { view: activeView, folderId: activeFolderId };
          window.history.pushState({ view: activeView, folderId: activeFolderId }, "", url.pathname + url.search);
        }
      }
    } catch {}
  }, [activeView, activeFolderId]);

  // Keyboard shortcut state for two-key sequence (G then F / G then A)
  const gPressedRef = React.useRef(false);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside input / textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // N: New Bookmark (only in standard view, not in database view)
      if ((e.key === "n" || e.key === "N") && activeView !== "database") {
        e.preventDefault();
        setPrefillUrl("");
        setAddModalOpen(true);
        return;
      }

      // /: Focus search
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search title, URL"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          setCommandPaletteOpen(true);
        }
        return;
      }

      // G key sequence listener
      if (e.key === "g" || e.key === "G") {
        gPressedRef.current = true;
        setTimeout(() => {
          gPressedRef.current = false;
        }, 1200);
        return;
      }

      if (gPressedRef.current) {
        if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          setActiveView("favorites");
          setActiveFolderId(null);
          gPressedRef.current = false;
        } else if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          setActiveView("all");
          setActiveFolderId(null);
          gPressedRef.current = false;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Derived in-memory filtered bookmarks for 0ms view navigation without network flicker!
  const filteredBookmarks = React.useMemo(() => {
    let list = bookmarks.filter((b) => !b.isArchived);

    if (activeFolderId) {
      if (includeSubfolders) {
        // Collect all descendant folder IDs
        const getDescendants = (parentId: string): string[] => {
          const children = folders.filter((f) => f.parentId === parentId).map((f) => f.id);
          return [parentId, ...children.flatMap(getDescendants)];
        };
        const folderIds = new Set(getDescendants(activeFolderId));
        list = list.filter((b) => b.folderId && folderIds.has(b.folderId));
      } else {
        list = list.filter((b) => b.folderId === activeFolderId);
      }
    } else if (activeView === "favorites") {
      list = list.filter((b) => b.isFavorite);
    } else if (activeView === "unsorted") {
      list = list.filter((b) => !b.folderId);
    } else if (activeView === "recent") {
      list = [...list].sort((a, b) => {
        const timeA = Math.max(a.lastClickedAt || 0, a.lastVisitedAt || 0, a.createdAt || 0);
        const timeB = Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0, b.createdAt || 0);
        return timeB - timeA;
      });
    } else if (activeView === "archive") {
      list = bookmarks.filter((b) => b.isArchived);
    }

    if (activeDomainFilter) {
      list = list.filter((b) => b.domain?.toLowerCase() === activeDomainFilter.toLowerCase());
    }

    if (activeTagFilter) {
      list = list.filter((b) => b.tags?.some((t) => t.name.toLowerCase() === activeTagFilter.toLowerCase()));
    }

    return list;
  }, [bookmarks, folders, activeFolderId, includeSubfolders, activeView, activeDomainFilter, activeTagFilter]);

  // Refresh data function: always keeps full canonical bookmarks array
  const refreshData = React.useCallback(async () => {
    try {
      let url = "/api/bookmarks?view=all";
      if (user?.id) {
        url += `&userId=${encodeURIComponent(user.id)}`;
      }

      const foldersUrl = user?.id ? `/api/folders?userId=${encodeURIComponent(user.id)}` : "/api/folders";
      let statsUrl = "/api/stats";
      if (user?.id) {
        statsUrl += `?userId=${encodeURIComponent(user.id)}`;
      }

      const [foldersRes, bookmarksRes, statsRes] = await Promise.all([
        fetch(foldersUrl).then((r) => r.json()),
        fetch(url).then((r) => r.json()),
        fetch(statsUrl).then((r) => r.json()),
      ]);

      if (foldersRes.success) {
        setFolderTree(foldersRes.tree);
        setFolders(foldersRes.folders);
      }
      if (bookmarksRes.success) {
        setBookmarks(bookmarksRes.bookmarks);
      }
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (e) {
      console.error("Failed to refresh data:", e);
    }
  }, [user?.id]);

  React.useEffect(() => {
    refreshData();
  }, [user?.id, refreshData]);

  const handleBookmarkAdded = (newBookmark: BookmarkWithDetails) => {
    setBookmarks((prev) => [newBookmark, ...prev]);
    refreshData();
  };

  const handleGlobalPaste = (pastedUrl: string) => {
    setPrefillUrl(pastedUrl);
    setAddModalOpen(true);
  };

  const openAddModal = React.useCallback((urlToPrefill?: unknown) => {
    const cleanUrl = typeof urlToPrefill === "string" ? urlToPrefill.trim() : "";
    setPrefillUrl(cleanUrl);
    setAddModalOpen(true);
  }, []);

  // Real-time Bookmark Visit / Click handler
  const handleBookmarkVisit = React.useCallback(async (bm: BookmarkWithDetails) => {
    const now = Date.now();
    // 1. Instantly update React state so the UI (Recently Visited, Quick Access, Activity) updates and re-sorts in real time without waiting
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bm.id
          ? {
              ...b,
              visitCount: (b.visitCount || 0) + 1,
              lastVisitedAt: now,
              lastClickedAt: now,
            }
          : b
      )
    );

    // 2. Persist to SQLite and sync to Supabase in the background
    try {
      await fetch(`/api/bookmarks/${bm.id}/visit`, { method: "POST", keepalive: true });
    } catch (err) {
      console.error("Visit recording error:", err);
    }
  }, []);

  // 0ms Optimistic Folder Operations for instant tree & UI updates
  const handleCreateFolderOptimistic = React.useCallback(
    async (name: string, icon: string, color: string, parentId?: string | null) => {
      const folderId = `fld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const optimisticFolder: FolderType = {
        id: folderId,
        userId: user?.id || "usr_default_markly",
        parentId: parentId || null,
        name: name.trim() || "New Folder",
        icon: icon || "📁",
        color: color || "#3b82f6",
        position: folders.filter((f) => f.parentId === (parentId || null)).length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Instantly update React state in 0ms without disrupting current view
      const updatedFolders = [...folders, optimisticFolder];
      setFolders(updatedFolders);
      setFolderTree(buildTreeFromFolders(updatedFolders, bookmarks));

      // 2. Persist to SQLite in the background with the exact same ID
      try {
        const res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: folderId,
            name: name.trim() || "New Folder",
            parentId: parentId || null,
            icon: icon || "📁",
            color: color || "#3b82f6",
            userId: user?.id,
          }),
        });
        const data = await res.json();
        if (data.success && data.folder) {
          const realFolder: FolderType = data.folder;
          setFolders((prev) => prev.map((f) => (f.id === folderId ? realFolder : f)));
        }
      } catch (err) {
        console.error("Create folder error:", err);
      }
    },
    [folders, bookmarks, user?.id]
  );

  const handleDeleteFolderOptimistic = React.useCallback(
    async (folderId: string, mode: "move_up" | "delete_all" = "delete_all") => {
      // Find all descendant IDs if delete_all
      const getDescendants = (pId: string): string[] => {
        const kids = folders.filter((f) => f.parentId === pId).map((f) => f.id);
        return [pId, ...kids.flatMap(getDescendants)];
      };
      const toDeleteIds = new Set(getDescendants(folderId));
      const targetFolder = folders.find((f) => f.id === folderId);

      // 1. Instantly delete bookmarks inside this folder and descendant folders
      const remainingBookmarks = bookmarks.filter((b) => !b.folderId || !toDeleteIds.has(b.folderId));
      setBookmarks(remainingBookmarks);

      // 2. Instantly update folders list and tree
      const nextFolders = folders.filter((f) => !toDeleteIds.has(f.id));
      setFolders(nextFolders);
      setFolderTree(buildTreeFromFolders(nextFolders, remainingBookmarks));

      if (activeFolderId && toDeleteIds.has(activeFolderId)) {
        setActiveFolderId(null);
        setActiveView("collections");
      }

      // 3. Notify any open views that recycle bin was updated in real time
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-recycle-bin-updated"));
      }

      // 4. Persist deletion to SQLite and Supabase in background
      try {
        const q = new URLSearchParams({ mode: "delete_all" });
        if (user?.id) q.set("userId", user.id);
        await fetch(`/api/folders/${folderId}?${q.toString()}`, { method: "DELETE" });
      } catch (err) {
        console.error("Delete folder error:", err);
      }
    },
    [folders, bookmarks, activeFolderId, user?.id]
  );

  const handleRenameFolderOptimistic = React.useCallback(
    async (folderId: string, newName: string) => {
      const updated = folders.map((f) => (f.id === folderId ? { ...f, name: newName, updatedAt: Date.now() } : f));
      setFolders(updated);
      setFolderTree(buildTreeFromFolders(updated, bookmarks));

      try {
        await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, userId: user?.id }),
        });
      } catch (err) {
        console.error("Rename folder error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, user?.id, refreshData]
  );

  const handleCustomizeFolderOptimistic = React.useCallback(
    async (folderId: string, updates: { name: string; icon: string; color: string }) => {
      const updated = folders.map((f) =>
        f.id === folderId ? { ...f, ...updates, updatedAt: Date.now() } : f
      );
      setFolders(updated);
      setFolderTree(buildTreeFromFolders(updated, bookmarks));

      try {
        await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updates, userId: user?.id }),
        });
      } catch (err) {
        console.error("Customize folder error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, user?.id, refreshData]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Global paste listener */}
      <GlobalPasteListener onUrlPasted={handleGlobalPaste} />

      {/* Cmd+K Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        folders={folders}
        bookmarks={bookmarks}
        onSelectFolder={(id) => {
          const isParent = id ? folders.some((f) => f.parentId === id) : false;
          setActiveFolderId(id);
          setActiveView("all");
          setIncludeSubfolders(isParent);
          setActiveDomain(null);
          setActiveDomainFilter(null);
          setActiveTagFilter(null);
        }}
        onSelectView={(view) => {
          setActiveView(view);
          setActiveFolderId(null);
          setActiveDomain(null);
          setActiveDomainFilter(null);
          setActiveTagFilter(null);
        }}
        onOpenAddModal={openAddModal}
      />

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        folders={folders}
        folderTree={folderTree}
        initialUrl={prefillUrl}
        onBookmarkAdded={handleBookmarkAdded}
        onFolderCreated={(newFolder) => {
          setFolders((prev) => {
            const next = [...prev, newFolder];
            setFolderTree(buildTreeFromFolders(next, bookmarks));
            return next;
          });
          refreshData();
        }}
      />

      {/* Import / Export & Health Check Modal */}
      <ImportExportModal
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
        onRefreshData={refreshData}
        onOpenSearch={() => setCommandPaletteOpen(true)}
      />

      {/* Gemini AI API Key Settings Modal */}
      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={setApiKeyModalOpen}
      />

      {/* Edit Bookmark Modal (for Homepage Organization and Direct Edit) */}
      <EditBookmarkModal
        bookmark={editingBookmark}
        folders={folders}
        open={Boolean(editingBookmark)}
        onOpenChange={(open) => !open && setEditingBookmark(null)}
        onSave={async (id, updates) => {
          await fetch(`/api/bookmarks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          setEditingBookmark(null);
          refreshData();
        }}
      />

      {/* Sidebar with recursive folder tree & drag-and-drop */}
      <Sidebar
        folderTree={folderTree}
        folders={folders}
        activeFolderId={activeFolderId}
        activeView={activeView}
        totalBookmarksCount={stats.totalBookmarks}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onCreateFolder={handleCreateFolderOptimistic}
        onDeleteFolder={handleDeleteFolderOptimistic}
        onRenameFolder={handleRenameFolderOptimistic}
        onCustomizeFolder={handleCustomizeFolderOptimistic}
        onSelectFolder={(id) => {
          const isParent = id ? folders.some((f) => f.parentId === id) : false;
          setActiveFolderId(id);
          setActiveView("all");
          setIncludeSubfolders(isParent);
          setActiveDomain(null);
          setActiveDomainFilter(null);
          setActiveTagFilter(null);
        }}
        onSelectView={(view) => {
          setActiveView(view);
          setActiveFolderId(null);
          setActiveDomain(null);
          setActiveDomainFilter(null);
          setActiveTagFilter(null);
        }}
        onRefreshData={refreshData}
        onOpenSearch={() => setCommandPaletteOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header without search bar (available in left panel) */}
        <AppHeader
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebarCollapse}
          onOpenAddModal={() => openAddModal()}
          onOpenImportExport={() => setImportExportOpen(true)}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
          onOpenProfile={() => setActiveView("profile")}
          onNavigateHome={() => {
            setActiveView("home");
            setActiveFolderId(null);
            setActiveDomain(null);
            setActiveDomainFilter(null);
            setActiveTagFilter(null);
          }}
          activeView={activeView}
          activeFolder={activeFolderId ? folders.find((f) => f.id === activeFolderId) || null : null}
        />

        {/* Breadcrumb Navigation Trail */}
        <Breadcrumbs
          activeFolderId={activeFolderId}
          activeView={activeView}
          folders={folders}
          includeSubfolders={includeSubfolders}
          onToggleIncludeSubfolders={setIncludeSubfolders}
          onSelectFolder={(id) => {
            setActiveFolderId(id);
            setActiveDomainFilter(null);
            setActiveTagFilter(null);
          }}
          onSelectView={(view) => {
            setActiveView(view);
            setActiveFolderId(null);
            setActiveDomainFilter(null);
            setActiveTagFilter(null);
          }}
          totalBookmarksCount={filteredBookmarks.length}
          onOpenSearch={() => setCommandPaletteOpen(true)}
        />

        {/* Dashboard, Home, Graph & Table Zone */}
        <div ref={mainScrollRef} className="overflow-y-auto flex-1 p-6 space-y-6">
          {activeDomain ? (
            /* Dedicated Level 3: Website / Domain Insights Page */
            <DomainInsightsView
              domain={activeDomain}
              onBack={() => setActiveDomain(null)}
              onSelectFolder={(fId) => {
                setActiveFolderId(fId);
                setActiveDomain(null);
                setActiveView("all");
              }}
              onEditBookmark={(bm) => setEditingBookmark(bm)}
              onToggleFavorite={async (bm) => {
                await fetch(`/api/bookmarks/${bm.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isFavorite: !bm.isFavorite }),
                });
                refreshData();
              }}
            />
          ) : activeView === "graph" && !activeFolderId ? (
            /* Dedicated Obsidian Knowledge Graph View (Global) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Obsidian Knowledge Graph
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Interactive force-directed graph connecting domains, folders, bookmarks, and shared tags.
                  </p>
                </div>
              </div>
              <KnowledgeGraph
                mode="global"
                onSelectDomain={(dom) => {
                setActiveDomainFilter(dom);
                setActiveView("all");
                setActiveFolderId(null);
              }}
                onSelectFolder={(fId) => {
                  setActiveFolderId(fId);
                  setActiveView("all");
                }}
                onEditBookmark={(bm) => setEditingBookmark(bm)}
                onToggleFavorite={async (bm) => {
                  await fetch(`/api/bookmarks/${bm.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isFavorite: !bm.isFavorite }),
                  });
                  refreshData();
                }}
              />
            </div>
          ) : activeView === "insights" && !activeFolderId ? (
            /* Dedicated Library Insights & Analytics Hub */
            <LibraryInsightsView
              bookmarks={bookmarks}
              folders={folders}
              folderTree={folderTree}
              onSelectFolder={(fId) => {
                setActiveFolderId(fId);
                setActiveView("all");
              }}
              onSelectTag={(tag) => {
                setActiveTagFilter(tag);
                setActiveView("all");
              }}
              onSelectDomain={(dom) => {
                setActiveDomainFilter(dom);
                setActiveView("all");
              }}
              onEditBookmark={(bm) => setEditingBookmark(bm)}
              onRefreshData={refreshData}
              onRecordVisit={handleBookmarkVisit}
            />
          ) : activeView === "profile" ? (
            /* Dedicated User Profile & Account Connections View */
            <ProfileView
              totalBookmarks={stats.totalBookmarks}
              totalFolders={stats.totalFolders}
              onRefreshData={refreshData}
              onNavigateHome={() => {
                setActiveView("home");
                setActiveFolderId(null);
              }}
            />
          ) : activeView === "home" && !activeFolderId ? (
            /* Dedicated Modern Workspace Homepage */
            <WorkspaceHome
              bookmarks={bookmarks}
              folders={folders}
              folderTree={folderTree}
              onSelectFolder={(id, isParent) => {
                setActiveFolderId(id);
                setActiveView("all");
                setIncludeSubfolders(Boolean(isParent));
                setActiveDomain(null);
                setActiveDomainFilter(null);
                setActiveTagFilter(null);
              }}
              onSelectView={(view) => {
                setActiveView(view);
                setActiveFolderId(null);
                setActiveDomain(null);
                setActiveDomainFilter(null);
                setActiveTagFilter(null);
              }}
              onSelectDomain={(dom) => {
                setActiveDomainFilter(dom);
                setActiveView("all");
                setActiveFolderId(null);
              }}
              onSelectTag={(tag) => {
                setActiveTagFilter(tag);
                setActiveView("all");
                setActiveFolderId(null);
              }}
              onOpenAddModal={() => openAddModal()}
              onRecordVisit={handleBookmarkVisit}
              onEditBookmark={(bm) => setEditingBookmark(bm)}
              onToggleFavorite={async (bm) => {
                await fetch(`/api/bookmarks/${bm.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isFavorite: !bm.isFavorite }),
                });
                refreshData();
              }}
              onRefreshData={refreshData}
            />
          ) : activeView === "collections" && !activeFolderId ? (
            /* Dedicated Folder Collections Directory */
            <FolderCollectionsView
              folders={folders}
              folderTree={folderTree}
              onNavigateHome={() => {
                setActiveView("home");
                setActiveFolderId(null);
              }}
              onSelectFolder={(id, isParent) => {
                setActiveFolderId(id);
                setActiveView("all");
                setIncludeSubfolders(Boolean(isParent));
                setActiveDomain(null);
                setActiveDomainFilter(null);
                setActiveTagFilter(null);
              }}
            />
          ) : activeView === "trash" && !activeFolderId ? (
            /* Dedicated PC-Style Recycle Bin View */
            <RecycleBinView
              onRefreshWorkspace={refreshData}
              onNavigateView={(view) => {
                setActiveView(view);
                setActiveFolderId(null);
              }}
            />
          ) : (
            <>
              {/* Back to Parent / Collections Banner inside Folder View */}
              {activeFolderId && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/80 backdrop-blur-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cur = folders.find((f) => f.id === activeFolderId);
                        if (cur?.parentId) {
                          setActiveFolderId(cur.parentId);
                        } else {
                          setActiveFolderId(null);
                          setActiveView("collections");
                        }
                      }}
                      className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-accent text-foreground border-border shadow-xs group"
                      title={
                        folders.find((f) => f.id === activeFolderId)?.parentId
                          ? "Go back to parent folder"
                          : "Go back to Collections"
                      }
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                      <span>
                        {(() => {
                          const cur = folders.find((f) => f.id === activeFolderId);
                          if (cur?.parentId) {
                            const parent = folders.find((f) => f.id === cur.parentId);
                            return `Back to ${parent?.name || "Parent Folder"}`;
                          }
                          return "Back to Collections";
                        })()}
                      </span>
                    </Button>

                    <div className="h-4 w-px bg-border/80" />

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Inside Folder:</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-foreground bg-accent/60">
                        <span>{folders.find((f) => f.id === activeFolderId)?.icon || "📁"}</span>
                        <span>{folders.find((f) => f.id === activeFolderId)?.name || "Folder"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveFolderId(null);
                        setActiveView("home");
                      }}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 hover:bg-accent"
                      title="Return to Workspace Homepage"
                    >
                      <Home className="h-3.5 w-3.5" />
                      <span>Workspace Home</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Stats KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                    <span>Total Bookmarks</span>
                    <BookmarkIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight">{stats.totalBookmarks}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">live sync</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                    <span>Folders</span>
                    <FolderTree className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight">{stats.totalFolders}</span>
                    <span className="text-[10px] text-muted-foreground">nested tree</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                    <span>Added This Week</span>
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight">{stats.addedThisWeek}</span>
                    <span className="text-[10px] text-muted-foreground">activity</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                    <span>Top Domain</span>
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1 truncate">
                    <span className="text-sm font-semibold truncate">{stats.topDomain}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                    <span>Link Health</span>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round(((stats.totalBookmarks - stats.deadLinks) / Math.max(stats.totalBookmarks, 1)) * 100)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">{stats.deadLinks} dead link</span>
                  </div>
                </div>
              </div>

              {/* Subfolders Navigation Bar (if current folder has subfolders) */}
              {activeFolderId && folders.some((f) => f.parentId === activeFolderId) && (
                <ChildSubfoldersBar
                  currentFolder={folders.find((f) => f.id === activeFolderId)!}
                  childFolders={folders.filter((f) => f.parentId === activeFolderId)}
                  bookmarksCountMap={bookmarks.reduce<Record<string, number>>((acc, bm) => {
                    if (bm.folderId) acc[bm.folderId] = (acc[bm.folderId] || 0) + 1;
                    return acc;
                  }, {})}
                  onSelectFolder={(childId, isParent) => {
                    setActiveFolderId(childId);
                    setIncludeSubfolders(Boolean(isParent));
                  }}
                />
              )}

              {/* Visual Intelligence Dashboard (Top Zone with Contextual Folder Analytics) */}
              <VisualDashboard
                folderTree={folderTree}
                folders={folders}
                bookmarks={bookmarks}
                stats={stats}
                activeFolderId={activeFolderId}
                includeSubfolders={includeSubfolders}
                onToggleIncludeSubfolders={setIncludeSubfolders}
                onSelectFolder={(fId) => {
                  setActiveFolderId(fId);
                  setActiveView("all");
                }}
                activeDomainFilter={activeDomainFilter}
                onSelectDomain={setActiveDomainFilter}
                activeTagFilter={activeTagFilter}
                onSelectTag={setActiveTagFilter}
                onOpenDomainInsights={(dom) => setActiveDomain(dom)}
              />

              {/* TanStack Table Section (Bottom Zone) */}
              <BookmarkTable
                data={filteredBookmarks}
                folders={folders}
                onRefreshData={refreshData}
                onOpenAddModal={() => openAddModal()}
                onRecordVisit={handleBookmarkVisit}
                externalSearchQuery={globalSearch}
                onSearchChange={setGlobalSearch}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
