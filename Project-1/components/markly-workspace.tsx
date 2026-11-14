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
import { FolderPagePanel } from "@/components/folders/folder-page-panel";
import { AddFolderModal } from "@/components/sidebar/add-folder-modal";
import { FolderCustomizeModal } from "@/components/sidebar/folder-customize-modal";
import { DeleteFolderModal } from "@/components/sidebar/delete-folder-modal";
import { MoveFolderModal } from "@/components/sidebar/move-folder-modal";
import { EditBookmarkModal } from "@/components/table/edit-bookmark-modal";
import { ApiKeyModal } from "@/components/ai/api-key-modal";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { DomainInsightsView } from "@/components/domain/domain-insights-view";
import { LibraryInsightsView } from "@/components/insights/library-insights-view";
import { ProfileView } from "@/components/profile/profile-view";
import { RecycleBinView } from "@/components/trash/recycle-bin-view";
import { FeedbackView } from "@/components/feedback/feedback-view";
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
    // Exclude permanent Unsorted system folder from standard tree roots
    if (f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_")) {
      continue;
    }
    const parentId = f.parentId ?? (f as any).parent_id ?? null;
    nodeMap.set(f.id, {
      ...f,
      parentId,
      parent_id: parentId,
      children: [],
      bookmarkCount: countsMap.get(f.id) || 0,
      totalDescendantBookmarkCount: countsMap.get(f.id) || 0,
    } as FolderTreeNode);
  }

  const roots: FolderTreeNode[] = [];
  for (const node of nodeMap.values()) {
    const pid = node.parentId ?? (node as any).parent_id;
    if (pid && nodeMap.has(pid)) {
      nodeMap.get(pid)!.children.push(node);
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
  initialView?: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback";
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
  const { user, openAuthModal } = useAuth();
  const [guestBannerDismissed, setGuestBannerDismissed] = React.useState(false);
  const [folderTree, setFolderTree] = React.useState<FolderTreeNode[]>(initialFolderTree);
  const [folders, setFolders] = React.useState<FolderType[]>(initialFolders);
  const [bookmarks, setBookmarks] = React.useState<BookmarkWithDetails[]>(initialBookmarks);
  const [stats, setStats] = React.useState(initialStats);

  // Active filter state directly matching SSR state to eliminate home page glimpse on refresh!
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(initialFolderId);
  const [activeView, setActiveView] = React.useState<"home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "trash" | "graph" | "insights" | "database" | "profile" | "feedback">(
    initialFolderId ? "all" : (initialView || "home")
  );
  const [activeDomain, setActiveDomain] = React.useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = React.useState(true); // Default true: include subfolders for smooth navigation
  const [activeDomainFilter, setActiveDomainFilter] = React.useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = React.useState<string | null>(null);
  const [recentBoundary, setRecentBoundary] = React.useState<"1d" | "7d" | "15d" | "30d" | "all" | "top20" | "today">("1d");

  // Sidebar collapse state: collapsed by default for all users when opening website
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_sidebar_collapsed");
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return true; // Default collapsed
  });

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

  // Folder Page Panel modals state
  const [panelAddFolderModalOpen, setPanelAddFolderModalOpen] = React.useState(false);
  const [panelAddFolderParentId, setPanelAddFolderParentId] = React.useState<string | null>(null);
  const [panelCustomizeFolder, setPanelCustomizeFolder] = React.useState<FolderType | null>(null);
  const [panelDeleteFolder, setPanelDeleteFolder] = React.useState<FolderType | null>(null);
  const [panelMoveFolder, setPanelMoveFolder] = React.useState<FolderType | null>(null);

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
          const children = folders.filter((f) => (f.parentId ?? (f as any).parent_id) === parentId).map((f) => f.id);
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
      // STRICT RECENCY RULE:
      // Only bookmarks that have an actual recorded visit timestamp qualify as "Recently Visited".
      // Exclude any sites with no visit history.
      const visitedOnly = list.filter((b) => {
        const lastVisit = Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0);
        return lastVisit > 0;
      });

      // Apply boundary filter
      const now = Date.now();
      let boundedList = visitedOnly;
      if (recentBoundary === "1d" || recentBoundary === "today") {
        boundedList = visitedOnly.filter(
          (b) => Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0) >= now - 24 * 60 * 60 * 1000
        );
      } else if (recentBoundary === "7d") {
        boundedList = visitedOnly.filter(
          (b) => Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0) >= now - 7 * 24 * 60 * 60 * 1000
        );
      } else if (recentBoundary === "15d") {
        boundedList = visitedOnly.filter(
          (b) => Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0) >= now - 15 * 24 * 60 * 60 * 1000
        );
      } else if (recentBoundary === "30d") {
        boundedList = visitedOnly.filter(
          (b) => Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0) >= now - 30 * 24 * 60 * 60 * 1000
        );
      }

      // Sort strictly by actual visit timestamp descending
      const sorted = [...boundedList].sort((a, b) => {
        const timeA = Math.max(a.lastClickedAt || 0, a.lastVisitedAt || 0);
        const timeB = Math.max(b.lastClickedAt || 0, b.lastVisitedAt || 0);
        return timeB - timeA;
      });

      list = recentBoundary === "top20" ? sorted.slice(0, 20) : sorted;
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
  }, [bookmarks, folders, activeFolderId, includeSubfolders, activeView, activeDomainFilter, activeTagFilter, recentBoundary]);

  // Safety check: if activeFolderId points to a folder that does not exist in folders list, reset it!
  React.useEffect(() => {
    if (activeFolderId && folders.length > 0 && !folders.some((f) => f.id === activeFolderId)) {
      setActiveFolderId(null);
      setActiveView("collections");
    }
  }, [activeFolderId, folders]);

  // Refresh data function: single unified bootstrap request for 0ms atomic state hydration
  const refreshData = React.useCallback(async () => {
    if (!user) return; // Do not fetch from server in guest mode
    try {
      const res = await fetch("/api/workspace/bootstrap");
      const data = await res.json();

      if (data.success) {
        setFolderTree(data.tree);
        setFolders(data.folders);
        setBookmarks(data.bookmarks);
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to refresh workspace bootstrap:", e);
    }
  }, [user]);

  // Sync guest bookmarks to cloud upon login
  const prevUserRef = React.useRef(user);
  React.useEffect(() => {
    if (!prevUserRef.current && user) {
      const guestBookmarks = bookmarks.filter((b) => b.id.startsWith("bm_guest_"));
      if (guestBookmarks.length > 0) {
        Promise.all(
          guestBookmarks.map((gb) =>
            fetch("/api/bookmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: gb.url,
                title: gb.title,
                description: gb.description,
                folderId: gb.folderId && !gb.folderId.startsWith("fld_guest_") ? gb.folderId : null,
                isFavorite: gb.isFavorite,
                isArchived: gb.isArchived,
                tagNames: gb.tags?.map((t) => t.name) || [],
              }),
            }).catch(() => {})
          )
        ).then(() => {
          refreshData();
        });
      } else {
        refreshData();
      }
    }
    prevUserRef.current = user;
  }, [user, bookmarks, refreshData]);

  React.useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  // Sync all open tabs & views on any CRUD operation
  React.useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener("markly-workspace-updated", handleSync);
    window.addEventListener("markly-recycle-bin-updated", handleSync);
    return () => {
      window.removeEventListener("markly-workspace-updated", handleSync);
      window.removeEventListener("markly-recycle-bin-updated", handleSync);
    };
  }, [refreshData]);

  const handleBookmarkAdded = (newBookmark: BookmarkWithDetails) => {
    setBookmarks((prev) => [newBookmark, ...prev]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
    }
    refreshData();
  };

  const handleGlobalPaste = (pastedUrl: string) => {
    setPrefillUrl(pastedUrl);
    setAddModalOpen(true);
  };

  const [defaultFolderForAdd, setDefaultFolderForAdd] = React.useState<string | null>(null);
  const [folderViewMode, setFolderViewMode] = React.useState<"table" | "board" | "cards" | "list" | "compact">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_table_view_mode");
        if (stored && ["table", "board", "cards", "list", "compact"].includes(stored)) {
          return stored as any;
        }
      } catch {}
    }
    return "table";
  });

  const openAddModal = React.useCallback((folderIdOrUrl?: unknown, urlToPrefill?: unknown) => {
    let cleanFolderId: string | null = null;
    let cleanUrl = "";

    if (typeof folderIdOrUrl === "string") {
      if (folderIdOrUrl.startsWith("http://") || folderIdOrUrl.startsWith("https://") || (folderIdOrUrl.includes(".") && !folderIdOrUrl.startsWith("fld_"))) {
        cleanUrl = folderIdOrUrl.trim();
      } else {
        cleanFolderId = folderIdOrUrl;
      }
    }
    if (typeof urlToPrefill === "string") {
      cleanUrl = urlToPrefill.trim();
    }

    setDefaultFolderForAdd(cleanFolderId || activeFolderId || null);
    setPrefillUrl(cleanUrl);
    setAddModalOpen(true);
  }, [activeFolderId]);

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

    if (!user) return; // Guest mode in-memory only

    // 2. Persist to SQLite and sync to Supabase in the background
    try {
      await fetch(`/api/bookmarks/${bm.id}/visit`, { method: "POST", keepalive: true });
    } catch (err) {
      console.error("Visit recording error:", err);
    }
  }, [user]);

  // 0ms Optimistic Folder Operations for instant tree & UI updates
  const handleCreateFolderOptimistic = React.useCallback(
    async (name: string, icon: string, color: string, parentId?: string | null) => {
      const cleanParentId = (parentId === "null" || parentId === "" || !parentId) ? null : parentId;
      const folderId = user ? `fld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : `fld_guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const optimisticFolder: FolderType = {
        id: folderId,
        userId: user?.id || "guest",
        parentId: cleanParentId,
        name: name.trim() || "New Folder",
        icon: icon || "📁",
        color: color || "#3b82f6",
        position: folders.filter((f) => f.parentId === cleanParentId).length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Instantly update React state in 0ms without disrupting current view
      const updatedFolders = [...folders, optimisticFolder];
      setFolders(updatedFolders);
      setFolderTree(buildTreeFromFolders(updatedFolders, bookmarks));

      // Auto-select newly created folder
      setActiveFolderId(folderId);
      setActiveView("all");

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API in the background with the exact same ID
      try {
        const res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: folderId,
            name: name.trim() || "New Folder",
            parentId: cleanParentId,
            icon: icon || "📁",
            color: color || "#3b82f6",
          }),
        });
        const data = await res.json();
        if (data.success && data.folder) {
          const realFolder: FolderType = data.folder;
          setFolders((prev) => prev.map((f) => (f.id === folderId ? realFolder : f)));
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
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
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("folderId");
          url.searchParams.set("view", "collections");
          window.history.replaceState({ view: "collections", folderId: null }, "", url.pathname + url.search);
        } catch {}
      }

      if (!user) return; // Guest mode in-memory only

      // 3. Persist deletion in background
      try {
        await fetch(`/api/folders/${folderId}?mode=delete_all`, { method: "DELETE" });

        // 4. Notify any open views that recycle bin was updated only AFTER server has committed deletion
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-recycle-bin-updated"));
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } catch (err) {
        console.error("Delete folder error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, activeFolderId, user, refreshData]
  );

  const handleRenameFolderOptimistic = React.useCallback(
    async (folderId: string, newName: string) => {
      const updated = folders.map((f) => (f.id === folderId ? { ...f, name: newName, updatedAt: Date.now() } : f));
      setFolders(updated);
      setFolderTree(buildTreeFromFolders(updated, bookmarks));

      if (!user) return; // Guest mode in-memory only

      try {
        await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
      } catch (err) {
        console.error("Rename folder error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, user, refreshData]
  );

  const handleCustomizeFolderOptimistic = React.useCallback(
    async (folderId: string, updates: { name: string; icon: string; color: string }) => {
      const updated = folders.map((f) =>
        f.id === folderId ? { ...f, ...updates, updatedAt: Date.now() } : f
      );
      setFolders(updated);
      setFolderTree(buildTreeFromFolders(updated, bookmarks));

      if (!user) return; // Guest mode in-memory only

      try {
        await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error("Customize folder error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, user, refreshData]
  );

  const handleMoveFolderOptimistic = React.useCallback(
    async (folderId: string, newParentId: string | null) => {
      const updated = folders.map((f) =>
        f.id === folderId
          ? { ...f, parentId: newParentId, parent_id: newParentId, updatedAt: Date.now() }
          : f
      );
      setFolders(updated);
      setFolderTree(buildTreeFromFolders(updated, bookmarks));

      if (!user) return; // Guest mode in-memory only

      try {
        await fetch("/api/folders/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderId,
            targetFolderId: newParentId,
            dropPosition: newParentId ? "inside" : "root",
          }),
        });
        refreshData();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } catch (err) {
        console.error("Move folder error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, user, refreshData]
  );

  const handleSaveCollectionOptimistic = React.useCallback(
    async (
      folderId: string,
      updates: { name: string; icon: string; color: string; parentId?: string | null }
    ) => {
      // 1. Optimistically update folders state
      const updated = folders.map((f) =>
        f.id === folderId
          ? {
              ...f,
              name: updates.name,
              icon: updates.icon,
              color: updates.color,
              parentId: updates.parentId !== undefined ? updates.parentId : f.parentId,
              parent_id: updates.parentId !== undefined ? updates.parentId : (f as any).parent_id,
              updatedAt: Date.now(),
            }
          : f
      );
      setFolders(updated);
      setFolderTree(buildTreeFromFolders(updated, bookmarks));

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        const existing = folders.find((f) => f.id === folderId);
        if (updates.parentId !== undefined && updates.parentId !== existing?.parentId) {
          await fetch("/api/folders/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderId,
              targetFolderId: updates.parentId,
              dropPosition: updates.parentId ? "inside" : "root",
            }),
          });
        }

        await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updates.name,
            icon: updates.icon,
            color: updates.color,
            parentId: updates.parentId,
          }),
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } catch (err) {
        console.error("Save collection error:", err);
        refreshData();
      }
    },
    [folders, bookmarks, user, refreshData]
  );

  const handleDeleteBookmarkOptimistic = React.useCallback(
    async (id: string) => {
      // 1. Immediately drop from state in 0ms (instantly removes from Quick Access, Recently Visited, and Table)
      setBookmarks((prev) => prev.filter((b) => b.id !== id));

      if (!user) return; // Guest mode in-memory only

      // 2. Await delete on server first
      try {
        await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });

        // 3. Notify Recycle Bin only AFTER server has committed the deletion
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-recycle-bin-updated"));
        }
      } catch (err) {
        console.error("Delete bookmark error:", err);
        // Roll back on network failure
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleToggleFavoriteOptimistic = React.useCallback(
    async (bm: BookmarkWithDetails) => {
      const nextFav = !bm.isFavorite;
      // 1. Instantly update React state in 0ms across all pages
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bm.id ? { ...b, isFavorite: nextFav } : b))
      );

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        await fetch(`/api/bookmarks/${bm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: nextFav }),
        });
      } catch (e) {
        console.error("Toggle favorite error:", e);
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleToggleArchiveOptimistic = React.useCallback(
    async (bm: BookmarkWithDetails) => {
      const nextArchive = !bm.isArchived;
      // 1. Instantly update React state in 0ms across all pages
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bm.id ? { ...b, isArchived: nextArchive } : b))
      );

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        await fetch(`/api/bookmarks/${bm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: nextArchive }),
        });
      } catch (e) {
        console.error("Toggle archive error:", e);
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleMoveBookmarkOptimistic = React.useCallback(
    async (bookmarkId: string, folderId: string | null) => {
      // 1. Instantly update React state in 0ms across all pages
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bookmarkId ? { ...b, folderId } : b))
      );

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        await fetch(`/api/bookmarks/${bookmarkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        });
      } catch (e) {
        console.error("Move bookmark error:", e);
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleBulkDeleteBookmarksOptimistic = React.useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      // 1. Immediately drop from state in 0ms
      setBookmarks((prev) => prev.filter((b) => !idSet.has(b.id)));

      if (!user) return; // Guest mode in-memory only

      // 2. Await bulk delete on server first
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids }),
        });

        // 3. Notify Recycle Bin only AFTER server has committed the deletion
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-recycle-bin-updated"));
        }
      } catch (err) {
        console.error("Bulk delete error:", err);
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleBulkMoveBookmarksOptimistic = React.useCallback(
    async (ids: string[], folderId: string | null) => {
      const idSet = new Set(ids);
      // 1. Instantly update React state in 0ms
      setBookmarks((prev) =>
        prev.map((b) => (idSet.has(b.id) ? { ...b, folderId } : b))
      );

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "move", ids, folderId }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } catch (err) {
        console.error("Bulk move error:", err);
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleBulkFavoriteBookmarksOptimistic = React.useCallback(
    async (ids: string[], isFavorite: boolean) => {
      const idSet = new Set(ids);
      // 1. Instantly update React state in 0ms
      setBookmarks((prev) =>
        prev.map((b) => (idSet.has(b.id) ? { ...b, isFavorite } : b))
      );

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "favorite", ids, isFavorite }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } catch (err) {
        console.error("Bulk favorite error:", err);
        refreshData();
      }
    },
    [user, refreshData]
  );

  const handleBulkArchiveBookmarksOptimistic = React.useCallback(
    async (ids: string[], isArchived: boolean) => {
      const idSet = new Set(ids);
      // 1. Instantly update React state in 0ms
      setBookmarks((prev) =>
        prev.map((b) => (idSet.has(b.id) ? { ...b, isArchived } : b))
      );

      if (!user) return; // Guest mode in-memory only

      // 2. Persist to API
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive", ids, isArchived }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
      } catch (err) {
        console.error("Bulk archive error:", err);
        refreshData();
      }
    },
    [user, refreshData]
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
          setActiveFolderId(id);
          setActiveView("all");
          setIncludeSubfolders(true);
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
        defaultFolderId={defaultFolderForAdd}
        onBookmarkAdded={handleBookmarkAdded}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
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

      {/* Folder Page Panel Modals */}
      <AddFolderModal
        parentId={panelAddFolderParentId}
        parentFolder={panelAddFolderParentId ? folders.find((f) => f.id === panelAddFolderParentId) : null}
        open={panelAddFolderModalOpen}
        onOpenChange={setPanelAddFolderModalOpen}
        onConfirm={handleCreateFolderOptimistic}
      />

      <DeleteFolderModal
        folder={panelDeleteFolder}
        open={Boolean(panelDeleteFolder)}
        onOpenChange={(open) => !open && setPanelDeleteFolder(null)}
        onConfirmDelete={handleDeleteFolderOptimistic}
      />

      <FolderCustomizeModal
        folder={panelCustomizeFolder}
        open={Boolean(panelCustomizeFolder)}
        onOpenChange={(open) => !open && setPanelCustomizeFolder(null)}
        onSave={async (folderId, updates) => {
          await handleCustomizeFolderOptimistic(folderId, updates);
          setPanelCustomizeFolder(null);
        }}
      />

      <MoveFolderModal
        folder={panelMoveFolder}
        isOpen={Boolean(panelMoveFolder)}
        onClose={() => setPanelMoveFolder(null)}
        folders={folders}
        folderTree={folderTree}
        onMoveFolder={handleMoveFolderOptimistic}
      />

      {/* Sidebar with recursive folder tree & drag-and-drop */}
      <Sidebar
        folderTree={folderTree}
        folders={folders}
        activeFolderId={activeFolderId}
        activeView={activeView}
        totalBookmarksCount={stats.totalBookmarks}
        unsortedCount={bookmarks.filter((b) => !b.isArchived && !b.folderId).length}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onCreateFolder={handleCreateFolderOptimistic}
        onDeleteFolder={handleDeleteFolderOptimistic}
        onRenameFolder={handleRenameFolderOptimistic}
        onCustomizeFolder={handleCustomizeFolderOptimistic}
        onSelectFolder={(id) => {
          setActiveFolderId(id);
          setActiveView("all");
          setIncludeSubfolders(true);
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
        onOpenAddBookmarkToFolder={(fId) => openAddModal(fId)}
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
          onOpenProfile={() => {
            setActiveView("profile");
            setActiveFolderId(null);
            setActiveDomain(null);
            setActiveDomainFilter(null);
            setActiveTagFilter(null);
          }}
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

        {/* Breadcrumb Navigation Trail (Shown for workspace browsing, hidden for full-page profile, recycle bin, and feedback) */}
        {activeView !== "profile" && activeView !== "trash" && activeView !== "feedback" && (
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
        )}

        {/* Dashboard, Home, Graph & Table Zone */}
        <div
          ref={mainScrollRef}
          className={`flex-1 ${
            activeView === "trash" ? "overflow-hidden p-0" : "overflow-y-auto p-6 space-y-6"
          }`}
        >
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
              onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
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
              onToggleFavorite={handleToggleFavoriteOptimistic}
              onToggleArchive={handleToggleArchiveOptimistic}
              onRefreshData={refreshData}
              onDeleteBookmark={handleDeleteBookmarkOptimistic}
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
                setIncludeSubfolders(true);
                setActiveDomain(null);
                setActiveDomainFilter(null);
                setActiveTagFilter(null);
              }}
              onOpenAddFolder={() => {
                setPanelAddFolderParentId(null);
                setPanelAddFolderModalOpen(true);
              }}
              onNewSubfolder={(parentId) => {
                setPanelAddFolderParentId(parentId);
                setPanelAddFolderModalOpen(true);
              }}
              onRenameFolder={handleRenameFolderOptimistic}
              onCustomizeFolder={(f) => setPanelCustomizeFolder(f)}
              onMoveFolder={(f) => setPanelMoveFolder(f)}
              onDeleteFolder={(f) => setPanelDeleteFolder(f)}
              onSaveCollection={handleSaveCollectionOptimistic}
              unsortedCount={bookmarks.filter((b) => !b.isArchived && !b.folderId).length}
              onSelectView={(v) => {
                setActiveView(v);
                setActiveFolderId(null);
              }}
              onOpenAddBookmarkToFolder={(fId) => openAddModal(fId)}
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
          ) : activeView === "feedback" && !activeFolderId ? (
            /* Dedicated Feedback & Support View */
            <FeedbackView
              onNavigateHome={() => {
                setActiveView("home");
                setActiveFolderId(null);
              }}
            />
          ) : (
            <>
              {/* Dedicated Folder Page Options & Navigation Panel */}
              {activeFolderId && (() => {
                const cur = folders.find((f) => f.id === activeFolderId);
                if (!cur) return null;

                const childFolders = folders.filter((f) => (f.parentId ?? (f as any).parent_id) === activeFolderId);
                const directBookmarksCount = bookmarks.filter((b) => !b.isArchived && b.folderId === activeFolderId).length;

                const getDescendants = (parentId: string): string[] => {
                  const kids = folders.filter((f) => (f.parentId ?? (f as any).parent_id) === parentId).map((f) => f.id);
                  return [parentId, ...kids.flatMap(getDescendants)];
                };
                const descendantIds = new Set(getDescendants(activeFolderId));
                const totalDescendantBookmarksCount = bookmarks.filter((b) => !b.isArchived && b.folderId && descendantIds.has(b.folderId)).length;

                const bookmarksCountMap = bookmarks.reduce<Record<string, number>>((acc, bm) => {
                  if (bm.folderId) acc[bm.folderId] = (acc[bm.folderId] || 0) + 1;
                  return acc;
                }, {});

                return (
                  <FolderPagePanel
                    currentFolder={cur}
                    folders={folders}
                    directBookmarksCount={directBookmarksCount}
                    totalDescendantBookmarksCount={totalDescendantBookmarksCount}
                    childFolders={childFolders}
                    bookmarksCountMap={bookmarksCountMap}
                    includeSubfolders={includeSubfolders}
                    onToggleIncludeSubfolders={setIncludeSubfolders}
                    onSelectFolder={(fId) => {
                      if (fId) {
                        setActiveFolderId(fId);
                        setIncludeSubfolders(true);
                      } else {
                        setActiveFolderId(null);
                        setActiveView("collections");
                      }
                    }}
                    onNavigateHome={() => {
                      setActiveFolderId(null);
                      setActiveView("home");
                    }}
                    onNewSubfolder={(parentId) => {
                      setPanelAddFolderParentId(parentId);
                      setPanelAddFolderModalOpen(true);
                    }}
                    onRenameFolder={handleRenameFolderOptimistic}
                    onCustomizeFolder={(folder) => setPanelCustomizeFolder(folder)}
                    onMoveFolder={(folder) => setPanelMoveFolder(folder)}
                    onDeleteFolder={(folder) => setPanelDeleteFolder(folder)}
                    onAddBookmarkToFolder={(fId) => openAddModal(fId)}
                  />
                );
              })()}

              {/* Stats KPI Cards (only shown on general views to avoid clutter inside folders) */}
              {!activeFolderId && (
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

              {/* Recently Visited Time Boundary Control Bar */}
              {activeView === "recent" && !activeFolderId && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Recently Visited Sites</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-muted-foreground">
                          {filteredBookmarks.length} {filteredBookmarks.length === 1 ? "site" : "sites"}
                        </span>
                      </h2>
                      <p className="text-[11px] text-muted-foreground">
                        Tracked strictly by actual clicks and visits. Unvisited sites are excluded.
                      </p>
                    </div>
                  </div>

                  {/* Predefined Recency Day Boundary Selector */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 self-start sm:self-auto text-xs shadow-2xs">
                    <span className="text-[11px] font-medium text-muted-foreground px-2 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Activity:</span>
                    </span>
                    {[
                      { id: "1d", label: "1d" },
                      { id: "7d", label: "7d" },
                      { id: "15d", label: "15d" },
                      { id: "30d", label: "30d" },
                      { id: "all", label: "All Visited" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRecentBoundary(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          recentBoundary === tab.id || (tab.id === "1d" && (recentBoundary === "today" || recentBoundary === "top20"))
                            ? "bg-blue-600 text-white shadow-xs scale-102 font-bold"
                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TanStack Table Section (Bottom Zone) */}
              <BookmarkTable
                data={filteredBookmarks}
                folders={folders}
                onRefreshData={refreshData}
                onOpenAddModal={() => openAddModal()}
                onRecordVisit={handleBookmarkVisit}
                externalSearchQuery={globalSearch}
                onSearchChange={setGlobalSearch}
                onDeleteBookmark={handleDeleteBookmarkOptimistic}
                onBulkDeleteBookmarks={handleBulkDeleteBookmarksOptimistic}
                onBulkMoveBookmarks={handleBulkMoveBookmarksOptimistic}
                onBulkFavoriteBookmarks={handleBulkFavoriteBookmarksOptimistic}
                onBulkArchiveBookmarks={handleBulkArchiveBookmarksOptimistic}
                onToggleFavorite={handleToggleFavoriteOptimistic}
                onToggleArchive={handleToggleArchiveOptimistic}
                onMoveBookmark={handleMoveBookmarkOptimistic}
                controlledViewMode={folderViewMode}
                onControlledViewModeChange={setFolderViewMode}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
