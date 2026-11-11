"use client";

import * as React from "react";
import {
  Bookmark as BookmarkIcon,
  Clock,
  FolderTree,
  Globe,
  Activity,
} from "lucide-react";
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
import { useAuth } from "@/components/auth/auth-context";
import type { Folder as FolderType, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

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
}

export function MarklyWorkspace({
  initialFolderTree,
  initialFolders,
  initialBookmarks,
  initialStats,
}: MarklyWorkspaceProps) {
  const { user } = useAuth();
  const [folderTree, setFolderTree] = React.useState(initialFolderTree);
  const [folders, setFolders] = React.useState(initialFolders);
  const [bookmarks, setBookmarks] = React.useState(initialBookmarks);
  const [stats, setStats] = React.useState(initialStats);

  // Active filter state
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);
  const [activeView, setActiveView] = React.useState<"home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive" | "graph" | "insights" | "database" | "profile">("home");
  const [activeDomain, setActiveDomain] = React.useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = React.useState(false); // Default false: show only sites in that specific folder
  const [activeDomainFilter, setActiveDomainFilter] = React.useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = React.useState<string | null>(null);

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

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

  // Check for incoming query params from Bookmarklet, Browser Extension or PWA Share Target
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const incomingUrl = params.get("addUrl") || params.get("url");
      if (incomingUrl) {
        setPrefillUrl(incomingUrl);
        setAddModalOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

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

  // Refresh data function
  const refreshData = React.useCallback(async () => {
    try {
      let url = `/api/bookmarks?view=${activeView === "home" || activeView === "collections" || activeView === "database" ? "all" : activeView}&includeSubfolders=${includeSubfolders}`;
      if (activeFolderId) {
        url += `&folderId=${activeFolderId}`;
      }
      if (activeDomainFilter) {
        url += `&domain=${encodeURIComponent(activeDomainFilter)}`;
      }
      if (activeTagFilter) {
        url += `&tag=${encodeURIComponent(activeTagFilter)}`;
      }

      const [foldersRes, bookmarksRes, statsRes] = await Promise.all([
        fetch("/api/folders").then((r) => r.json()),
        fetch(url).then((r) => r.json()),
        fetch(`/api/stats${activeFolderId ? `?folderId=${activeFolderId}&includeSubfolders=${includeSubfolders}` : ""}`).then((r) => r.json()),
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
  }, [activeFolderId, activeView, includeSubfolders, activeDomainFilter, activeTagFilter]);

  React.useEffect(() => {
    refreshData();
  }, [user?.id, activeFolderId, activeView, includeSubfolders, activeDomainFilter, activeTagFilter, refreshData]);

  const handleBookmarkAdded = (newBookmark: BookmarkWithDetails) => {
    setBookmarks((prev) => [newBookmark, ...prev]);
    refreshData();
  };

  const handleGlobalPaste = (pastedUrl: string) => {
    setPrefillUrl(pastedUrl);
    setAddModalOpen(true);
  };

  const openAddModal = (urlToPrefill?: string) => {
    setPrefillUrl(urlToPrefill || "");
    setAddModalOpen(true);
  };

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
        initialUrl={prefillUrl}
        onBookmarkAdded={handleBookmarkAdded}
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
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
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
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
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
          totalBookmarksCount={bookmarks.length}
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
              onOpenAddModal={openAddModal}
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
              onSelectFolder={(id, isParent) => {
                setActiveFolderId(id);
                setActiveView("all");
                setIncludeSubfolders(Boolean(isParent));
                setActiveDomain(null);
                setActiveDomainFilter(null);
                setActiveTagFilter(null);
              }}
            />
          ) : (
            <>
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
                data={bookmarks}
                folders={folders}
                onRefreshData={refreshData}
                onOpenAddModal={openAddModal}
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
