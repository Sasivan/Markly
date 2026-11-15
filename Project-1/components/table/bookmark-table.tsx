"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
} from "@tanstack/react-table";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Table as TableIcon,
  Kanban,
  Rows3,
  Star,
  ExternalLink,
  Copy,
  Edit2,
  Trash2,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Check,
  Activity,
  Folder as FolderIcon,
  Plus,
  Globe,
  FolderPlus,
  Bookmark,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkActionBar } from "./bulk-action-bar";
import { EditBookmarkModal } from "./edit-bookmark-modal";
import { CopyBookmarkModal } from "@/components/modals/copy-bookmark-modal";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import { formatDate, formatDateTime } from "@/lib/utils";

interface BookmarkTableProps {
  data: BookmarkWithDetails[];
  folders: FolderType[];
  onRefreshData: () => void;
  onOpenAddModal?: () => void;
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
  externalSearchQuery?: string;
  onSearchChange?: (val: string) => void;
  onDeleteBookmark?: (id: string, title?: string) => void;
  onBulkDeleteBookmarks?: (ids: string[]) => void;
  onBulkMoveBookmarks?: (ids: string[], folderId: string | null) => void;
  onBulkCopyBookmarks?: (ids: string[], targetFolderId: string | null) => void;
  onBulkFavoriteBookmarks?: (ids: string[], isFavorite: boolean) => void;
  onBulkArchiveBookmarks?: (ids: string[], isArchived: boolean) => void;
  onToggleFavorite?: (bookmark: BookmarkWithDetails) => void;
  onToggleArchive?: (bookmark: BookmarkWithDetails) => void;
  onMoveBookmark?: (bookmarkId: string, folderId: string | null) => void;
  onCopyBookmark?: (bookmark: BookmarkWithDetails) => void;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  controlledViewMode?: "table" | "board" | "cards" | "list" | "compact";
  onControlledViewModeChange?: (mode: "table" | "board" | "cards" | "list" | "compact") => void;
}

export function BookmarkTable({
  data,
  folders,
  onRefreshData,
  onOpenAddModal,
  onRecordVisit,
  externalSearchQuery,
  onSearchChange,
  onDeleteBookmark,
  onBulkDeleteBookmarks,
  onBulkMoveBookmarks,
  onBulkCopyBookmarks,
  onBulkFavoriteBookmarks,
  onBulkArchiveBookmarks,
  onToggleFavorite,
  onToggleArchive,
  onMoveBookmark,
  onCopyBookmark,
  onOpenPreview,
  controlledViewMode,
  onControlledViewModeChange,
}: BookmarkTableProps) {
  // State
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState(externalSearchQuery || "");

  React.useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setGlobalFilter(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  React.useEffect(() => {
    const handleSetSearch = (e: any) => {
      if (e.detail?.query !== undefined) {
        setGlobalFilter(e.detail.query);
        onSearchChange?.(e.detail.query);
      }
    };
    window.addEventListener("markly-set-search", handleSetSearch);
    return () => window.removeEventListener("markly-set-search", handleSetSearch);
  }, [onSearchChange]);

  const [savedSearchSuccess, setSavedSearchSuccess] = React.useState(false);
  const handleSaveSearch = () => {
    if (!globalFilter.trim()) return;
    try {
      const stored = localStorage.getItem("markly_saved_searches");
      const list: Array<{ id: string; name: string; query: string }> = stored ? JSON.parse(stored) : [];
      if (!list.some((s) => s.query.toLowerCase() === globalFilter.trim().toLowerCase())) {
        list.push({
          id: Date.now().toString(),
          name: globalFilter.trim(),
          query: globalFilter.trim(),
        });
        localStorage.setItem("markly_saved_searches", JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("markly-saved-searches-updated"));
      }
      setSavedSearchSuccess(true);
      setTimeout(() => setSavedSearchSuccess(false), 2000);
    } catch {}
  };
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  
  // 4.1: Persisted Column Visibility
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_table_columns");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  // 5.1: Quick Filter Chips
  type FilterChipKey = "all" | "starred" | "ai" | "unvisited" | "broken" | "recent_week";
  const [activeChip, setActiveChip] = React.useState<FilterChipKey>("all");

  // 4.4: Snapshot Fallback Switcher ("thumbnail" | "icon" | "monogram")
  const [cardFallbackMode, setCardFallbackMode] = React.useState<"thumbnail" | "icon" | "monogram">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_card_fallback") as any;
        if (stored && ["thumbnail", "icon", "monogram"].includes(stored)) return stored;
      } catch {}
    }
    return "thumbnail";
  });

  const setCardFallback = (mode: "thumbnail" | "icon" | "monogram") => {
    setCardFallbackMode(mode);
    try {
      localStorage.setItem("markly_card_fallback", mode);
    } catch {}
  };
  
  // 5 Notion-Inspired View Modes with persistent memory
  const [internalViewMode, setInternalViewMode] = React.useState<"table" | "board" | "cards" | "list" | "compact">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_table_view_mode") as any;
        if (stored && ["table", "board", "cards", "list", "compact"].includes(stored)) {
          return stored;
        }
      } catch {}
    }
    return "table";
  });

  const viewMode = controlledViewMode ?? internalViewMode;

  const setViewMode = React.useCallback((mode: "table" | "board" | "cards" | "list" | "compact") => {
    setInternalViewMode(mode);
    onControlledViewModeChange?.(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("markly_table_view_mode", mode);
      } catch {}
    }
  }, [onControlledViewModeChange]);

  // Edit & Copy modals
  const [editingBookmark, setEditingBookmark] = React.useState<BookmarkWithDetails | null>(null);
  const [copyingBookmark, setCopyingBookmark] = React.useState<BookmarkWithDetails | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Column visibility dropdown
  const [colMenuOpen, setColMenuOpen] = React.useState(false);

// 5.3: Typo-Tolerant & Subsequence Fuzzy Matching
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  text = text.toLowerCase();
  query = query.toLowerCase();
  if (text.includes(query)) return true;
  // Subsequence matching (e.g. "ghub" matches "github")
  let ti = 0;
  let qi = 0;
  while (ti < text.length && qi < query.length) {
    if (text[ti] === query[qi]) qi++;
    ti++;
  }
  if (qi === query.length) return true;
  // Typo tolerance
  const words = text.split(/\s+/);
  for (const w of words) {
    if (Math.abs(w.length - query.length) <= 2) {
      let dist = 0;
      const minLen = Math.min(w.length, query.length);
      for (let i = 0; i < minLen; i++) {
        if (w[i] !== query[i]) dist++;
      }
      dist += Math.abs(w.length - query.length);
      if (dist <= 1 || (query.length > 5 && dist <= 2)) return true;
    }
  }
  return false;
}

  // Filter data by status and search filter across all views (Table, Board, Cards, List, Compact)
  const filteredData = React.useMemo(() => {
    let result = data;
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // 5.1: Quick Filter Chips
    if (activeChip === "starred") {
      result = result.filter((b) => b.isFavorite);
    } else if (activeChip === "ai") {
      result = result.filter((b) => Boolean(b.description && b.description.length > 20));
    } else if (activeChip === "unvisited") {
      result = result.filter((b) => (b.visitCount || 0) === 0);
    } else if (activeChip === "broken") {
      result = result.filter((b) => b.status === "dead");
    } else if (activeChip === "recent_week") {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((b) => b.createdAt >= oneWeekAgo);
    }

    // 5.3: Typo-Tolerant & Fuzzy Search
    const q = (globalFilter || "").toLowerCase().trim();
    if (q) {
      const searchTokens = q.split(/\s+/).filter(Boolean);
      result = result.filter((bm) => {
        const searchable = [
          bm.title || "",
          bm.domain || "",
          bm.url || "",
          bm.description || "",
          ...(bm.tags || []).map((t) => t.name),
          bm.folderName || "",
        ]
          .join(" ")
          .toLowerCase();
        return searchTokens.every((token) => fuzzyMatch(searchable, token));
      });
    }
    return result;
  }, [data, statusFilter, globalFilter, activeChip]);

  // Notion-style Board / Kanban Columns
  const kanbanColumns = React.useMemo(() => {
    const folderMap = new Map<string, { id: string; name: string; icon: string; color: string; bookmarks: BookmarkWithDetails[] }>();

    for (const f of folders) {
      folderMap.set(f.id, {
        id: f.id,
        name: f.name,
        icon: f.icon || "folder",
        color: f.color || "#3b82f6",
        bookmarks: [],
      });
    }

    folderMap.set("unsorted", {
      id: "unsorted",
      name: "Unsorted (Inbox)",
      icon: "inbox",
      color: "#64748b",
      bookmarks: [],
    });

    for (const bm of filteredData) {
      if (bm.folderId && folderMap.has(bm.folderId)) {
        folderMap.get(bm.folderId)!.bookmarks.push(bm);
      } else {
        folderMap.get("unsorted")!.bookmarks.push(bm);
      }
    }

    return Array.from(folderMap.values()).filter((c) => c.bookmarks.length > 0 || c.id === "unsorted");
  }, [folders, filteredData]);

  // Actions
  const handleToggleFavorite = async (bookmark: BookmarkWithDetails) => {
    if (onToggleFavorite) {
      onToggleFavorite(bookmark);
      return;
    }
    try {
      await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !bookmark.isFavorite }),
      });
      onRefreshData();
    } catch (e) {
      console.error("Toggle favorite error:", e);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);

  const confirmSingleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    if (onDeleteBookmark) {
      onDeleteBookmark(targetId, deleteTarget.title);
    } else {
      try {
        await fetch(`/api/bookmarks/${targetId}`, { method: "DELETE" });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-recycle-bin-updated"));
        }
        onRefreshData();
      } catch (e) {
        console.error("Delete error:", e);
      }
    }
  };

  const confirmBulkDelete = async () => {
    const ids = [...selectedIds];
    setIsBulkDeleteOpen(false);
    setRowSelection({});
    if (onBulkDeleteBookmarks) {
      onBulkDeleteBookmarks(ids);
    } else {
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-recycle-bin-updated"));
        }
        onRefreshData();
      } catch (e) {
        console.error("Bulk delete error:", e);
      }
    }
  };

  const handleDelete = (id: string, title?: string) => {
    const bm = data.find((b) => b.id === id);
    setDeleteTarget({ id, title: title || bm?.title || "this bookmark" });
  };

  const handleSaveEdit = async (id: string, updates: any) => {
    try {
      await fetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      onRefreshData();
    } catch (e) {
      console.error("Save edit error:", e);
    }
  };

  const handleToggleArchive = async (bm: BookmarkWithDetails) => {
    if (onToggleArchive) {
      onToggleArchive(bm);
      return;
    }
    const nextArchived = !bm.isArchived;
    try {
      await fetch(`/api/bookmarks/${bm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: nextArchived }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
      onRefreshData();
    } catch (e) {
      console.error("Toggle archive error:", e);
    }
  };

  // Bulk Actions
  const selectedIds = React.useMemo(() => {
    return Object.keys(rowSelection).filter(Boolean);
  }, [rowSelection]);

  // 4.3: Drag-and-Drop Batch Organization
  const handleBookmarkDragStart = (e: React.DragEvent, bookmarkId: string) => {
    const ids = selectedIds.includes(bookmarkId) && selectedIds.length > 1
      ? selectedIds
      : [bookmarkId];
    e.dataTransfer.setData("application/x-markly-bookmarks", JSON.stringify(ids));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleBulkMove = async (folderId: string | null) => {
    const ids = [...selectedIds];
    setRowSelection({});
    if (onBulkMoveBookmarks) {
      onBulkMoveBookmarks(ids, folderId);
    } else {
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "move", ids, folderId }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
        onRefreshData();
      } catch (e) {
        console.error("Bulk move error:", e);
      }
    }
  };

  const handleBulkCopy = async (targetFolderId: string | null) => {
    const ids = [...selectedIds];
    setRowSelection({});
    if (onBulkCopyBookmarks) {
      onBulkCopyBookmarks(ids, targetFolderId);
    } else {
      try {
        await fetch("/api/bookmarks/bulk-copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, targetFolderId }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
        onRefreshData();
      } catch (e) {
        console.error("Bulk copy error:", e);
      }
    }
  };

  const handleBulkFavorite = async (isFavorite: boolean) => {
    const ids = [...selectedIds];
    setRowSelection({});
    if (onBulkFavoriteBookmarks) {
      onBulkFavoriteBookmarks(ids, isFavorite);
    } else {
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "favorite", ids, isFavorite }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
        onRefreshData();
      } catch (e) {
        console.error("Bulk favorite error:", e);
      }
    }
  };

  const handleBulkArchive = async (isArchived: boolean) => {
    const ids = [...selectedIds];
    setRowSelection({});
    if (onBulkArchiveBookmarks) {
      onBulkArchiveBookmarks(ids, isArchived);
    } else {
      try {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive", ids, isArchived }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
        }
        onRefreshData();
      } catch (e) {
        console.error("Bulk archive error:", e);
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteOpen(true);
  };

  const handleBulkExport = (format: "json" | "csv") => {
    const itemsToExport = data.filter((b) => selectedIds.includes(b.id));
    if (format === "json") {
      const blob = new Blob([JSON.stringify(itemsToExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `markly-bookmarks-${Date.now()}.json`;
      a.click();
    }
  };

  // Helper: for any site or subfolder, show ONLY its parent folder
  const getParentFolderInfo = React.useCallback(
    (bm: BookmarkWithDetails) => {
      if (!bm.folderId) return { name: "Unsorted", icon: "folder", color: "#64748b" };
      const currentFolder = folders.find((f) => f.id === bm.folderId);
      if (!currentFolder) return { name: bm.folderName || "Unsorted", icon: "folder", color: "#64748b" };

      // If current folder has a parent folder, return the parent folder!
      const pid = currentFolder.parentId ?? (currentFolder as any).parent_id;
      if (pid) {
        const parentFolder = folders.find((f) => f.id === pid);
        if (parentFolder) {
          return {
            name: parentFolder.name,
            icon: parentFolder.icon || "folder",
            color: parentFolder.color || "#3b82f6",
          };
        }
      }

      // If already a top-level parent folder, return its own folder info
      return {
        name: currentFolder.name,
        icon: currentFolder.icon || "folder",
        color: currentFolder.color || "#3b82f6",
      };
    },
    [folders]
  );

  const recordVisit = React.useCallback(
    (bm: BookmarkWithDetails) => {
      if (onRecordVisit) {
        onRecordVisit(bm);
        return;
      }
      bm.visitCount = (bm.visitCount || 0) + 1;
      const now = Date.now();
      bm.lastVisitedAt = now;
      bm.lastClickedAt = now;
      fetch(`/api/bookmarks/${bm.id}/visit`, { method: "POST", keepalive: true }).catch(() => {});
    },
    [onRecordVisit]
  );

  // TanStack Table Column Definitions
  const columns = React.useMemo<ColumnDef<BookmarkWithDetails>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
              className="rounded text-primary h-3.5 w-3.5 cursor-pointer"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => row.toggleSelected(e.target.checked)}
              className="rounded text-primary h-3.5 w-3.5 cursor-pointer"
            />
          </div>
        ),
        size: 32,
        enableSorting: false,
      },
      {
        id: "favorite",
        header: "★",
        cell: ({ row }) => {
          const bm = row.original;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(bm);
              }}
              className="hover:scale-110 transition-transform cursor-pointer p-0.5 rounded"
              title={bm.isFavorite ? "Unfavorite" : "Favorite"}
            >
              {bm.isFavorite ? (
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              ) : (
                <Star className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
              )}
            </button>
          );
        },
        size: 32,
        enableSorting: true,
        sortingFn: (rowA, rowB) => (rowA.original.isFavorite === rowB.original.isFavorite ? 0 : rowA.original.isFavorite ? 1 : -1),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground font-medium"
          >
            <span>Title</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const bm = row.original;
          return (
            <div className="flex items-center gap-2.5 max-w-md group/title">
              <BookmarkIcon
                src={bm.iconUrl}
                alt={bm.title}
                domain={bm.domain}
                className="h-5 w-5 rounded object-contain bg-background flex-shrink-0 border border-border/40"
              />
              <div className="truncate flex items-center gap-1.5 min-w-0">
                <span
                  onClick={(e) => {
                    if (onOpenPreview) {
                      e.stopPropagation();
                      onOpenPreview(bm);
                    }
                  }}
                  className="font-medium hover:underline text-foreground truncate block cursor-pointer"
                  title="Click to preview site details"
                >
                  {bm.title}
                </span>
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    recordVisit(bm);
                  }}
                  className="text-muted-foreground hover:text-blue-500 opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                  title="Open site in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        },
      },
      {
        id: "folder",
        accessorFn: (row) => getParentFolderInfo(row).name,
        header: "Parent Folder",
        cell: ({ row }) => {
          const parentInfo = getParentFolderInfo(row.original);
          return (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border border-border/40"
              style={{
                backgroundColor: `${parentInfo.color}14`,
                color: parentInfo.color,
              }}
              title={`Parent folder: ${parentInfo.name}`}
            >
              <FolderIconRenderer icon={parentInfo.icon} color={parentInfo.color} className="h-3.5 w-3.5" />
              <span className="truncate max-w-36">{parentInfo.name}</span>
            </span>
          );
        },
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const tags = row.original.tags;
          if (!tags || tags.length === 0) return <span className="text-muted-foreground/40">-</span>;
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  #{tag.name}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground font-mono">+{tags.length - 3}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Health",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${status === "dead"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status === "dead" ? "bg-destructive" : "bg-emerald-500"}`} />
              {status === "dead" ? "Broken" : "Reachable"}
            </span>
          );
        },
      },
      {
        id: "lastClicked",
        accessorFn: (row) => row.lastClickedAt || row.lastVisitedAt || 0,
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground font-medium"
          >
            <span>Last Clicked</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const lastTime = row.original.lastClickedAt || row.original.lastVisitedAt;
          if (!lastTime) {
            return <span className="text-muted-foreground/40 font-mono text-xs">- Never -</span>;
          }
          return (
            <span className="text-foreground/90 whitespace-nowrap font-mono tabular-nums text-xs" title={new Date(lastTime).toLocaleString()}>
              {formatDateTime(lastTime)}
            </span>
          );
        },
      },
      {
        accessorKey: "visitCount",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground font-medium"
          >
            <span>Visits</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground">{row.original.visitCount}</span>,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground font-medium"
          >
            <span>Added</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap font-mono tabular-nums text-xs">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const bm = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => handleCopyLink(bm.url, bm.id)}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Copy Link"
              >
                {copiedId === bm.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => setEditingBookmark(bm)}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Edit Details"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setCopyingBookmark(bm)}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Copy to Folder..."
              >
                <FolderPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </button>
              {bm.isArchived ? (
                <button
                  type="button"
                  onClick={() => handleToggleArchive(bm)}
                  className="h-6 w-6 rounded flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-500 hover:text-blue-600 cursor-pointer"
                  title={`Unarchive back to ${getParentFolderInfo(bm).name}`}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleArchive(bm)}
                  className="h-6 w-6 rounded flex items-center justify-center hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-400 hover:text-purple-600 cursor-pointer"
                  title="Archive site"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(bm.id, bm.title)}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        },
      },
    ],
    [copiedId]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updaterOrValue) => {
      setColumnVisibility((prev) => {
        const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
        try {
          localStorage.setItem("markly_table_columns", JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  return (
    <div className="space-y-3">
      {/* Edit Bookmark Modal */}
      <EditBookmarkModal
        bookmark={editingBookmark}
        folders={folders}
        open={Boolean(editingBookmark)}
        onOpenChange={(open) => !open && setEditingBookmark(null)}
        onSave={handleSaveEdit}
      />

      {/* Copy Bookmark to Destination Folder Modal */}
      <CopyBookmarkModal
        bookmark={copyingBookmark}
        isOpen={Boolean(copyingBookmark)}
        onClose={() => setCopyingBookmark(null)}
        folders={folders}
        onSuccess={onRefreshData}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        folders={folders}
        onClearSelection={() => setRowSelection({})}
        onBulkMove={handleBulkMove}
        onBulkCopy={handleBulkCopy}
        onBulkFavorite={handleBulkFavorite}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        isArchiveView={filteredData.length > 0 && filteredData.every((b) => b.isArchived)}
      />

      {/* Table Controls Header: Search, View Toggle, Status Filter, Column Visibility */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Left: Quick Add Bookmark, Global Search & Status Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {onOpenAddModal && (
            <Button
              size="sm"
              onClick={onOpenAddModal}
              className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer flex items-center gap-1 shadow-2xs flex-shrink-0"
              title="Add new bookmark (N)"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          )}

          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="Search title, description, domain, tags, URL..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              className="pl-8 pr-7 text-xs h-8 bg-background"
            />
            {globalFilter.trim().length > 1 && (
              <button
                type="button"
                onClick={handleSaveSearch}
                title={savedSearchSuccess ? "Search Saved!" : "Save this search to sidebar"}
                className="absolute right-2 top-2 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
              >
                {savedSearchSuccess ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Health</option>
            <option value="alive">Reachable</option>
            <option value="dead">Broken links</option>
          </select>
        </div>

        {/* Right: View Toggles & Columns */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* View Mode Switcher (5 Notion-Inspired Space-Optimized Modes) */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                viewMode === "table" ? "bg-background text-foreground shadow-xs font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Notion Table View (Spreadsheet)"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                viewMode === "board" ? "bg-background text-foreground shadow-xs font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Notion Board View (Kanban Columns)"
            >
              <Kanban className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                viewMode === "cards" ? "bg-background text-foreground shadow-xs font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Notion Gallery View (Visual Cards)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                viewMode === "list" ? "bg-background text-foreground shadow-xs font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Notion List View (Clean Document Rows)"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                viewMode === "compact" ? "bg-background text-foreground shadow-xs font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Ultra-Dense Mode (Maximum Space Optimization)"
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 4.4: Card Fallback Switcher (Cards view only) */}
          {viewMode === "cards" && (
            <select
              value={cardFallbackMode}
              onChange={(e) => setCardFallback(e.target.value as any)}
              className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              title="Card Cover Style: Snapshot, Domain Icon, or Monogram"
            >
              <option value="thumbnail">Snapshot Cover</option>
              <option value="icon">Icon Cover</option>
              <option value="monogram">Monogram Cover</option>
            </select>
          )}

          {/* Column Visibility Menu */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setColMenuOpen(!colMenuOpen)}
              className="text-xs h-8 gap-1 px-2.5"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Columns</span>
            </Button>

            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-50 text-xs text-foreground animate-in zoom-in-95">
                <div className="font-medium px-2 py-1 text-xs text-muted-foreground border-b border-border mb-1">
                  Toggle Columns
                </div>
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.id !== "select" && col.id !== "actions")
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="rounded text-primary h-3 w-3"
                      />
                      <span className="capitalize">{col.id}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5.1: Quick Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {[
          { id: "all", label: "All Items", count: data.length },
          { id: "starred", label: "Starred", count: data.filter((b) => b.isFavorite).length },
          { id: "ai", label: "AI Summary", count: data.filter((b) => Boolean(b.description && b.description.length > 20)).length },
          { id: "unvisited", label: "Unvisited", count: data.filter((b) => (b.visitCount || 0) === 0).length },
          { id: "broken", label: "Broken Links", count: data.filter((b) => b.status === "dead").length },
          { id: "recent_week", label: "Added This Week", count: data.filter((b) => b.createdAt >= Date.now() - 7 * 86400000).length },
        ].map((chip) => {
          const isActive = activeChip === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id as FilterChipKey)}
              className={`h-6 px-2.5 rounded-full border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span>{chip.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main View Display */}
      {viewMode === "table" ? (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-card border-b border-border shadow-xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        className="py-2.5 px-3 select-none"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                      No matching bookmarks found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      draggable={true}
                      onDragStart={(e) => handleBookmarkDragStart(e, row.original.id)}
                      onClick={() => onOpenPreview?.(row.original)}
                      className={`hover:bg-muted/30 transition-colors group cursor-pointer outline-none focus:outline-none ${
                        row.getIsSelected() ? "bg-primary/5" : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isInteractiveCell =
                          cell.column.id === "select" ||
                          cell.column.id === "favorite" ||
                          cell.column.id === "actions";
                        return (
                          <td
                            key={cell.id}
                            className="py-2.5 px-3"
                            onClick={(e) => {
                              if (isInteractiveCell) e.stopPropagation();
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === "board" ? (
        /* Notion-Style Kanban Board View */
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-96">
          {kanbanColumns.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("application/x-markly-bookmarks")) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onDrop={(e) => {
                const bookmarksJson = e.dataTransfer.getData("application/x-markly-bookmarks");
                if (bookmarksJson) {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const ids = JSON.parse(bookmarksJson);
                    if (Array.isArray(ids) && ids.length > 0) {
                      handleBulkMove(col.id === "__UNSORTED__" ? null : col.id);
                    }
                  } catch {}
                }
              }}
              className="w-72 flex-shrink-0 rounded-xl border border-border bg-card flex flex-col max-h-[75vh] shadow-xs"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FolderIconRenderer icon={col.icon} color={col.color} className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold text-xs text-foreground truncate">{col.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono">
                  {col.bookmarks.length}
                </Badge>
              </div>

              {/* Column Cards Container */}
              <div className="p-2 space-y-2 overflow-y-auto flex-1">
                {col.bookmarks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg">
                    No items in this collection
                  </div>
                ) : (
                  col.bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      draggable={true}
                      onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
                      onClick={() => (onOpenPreview ? onOpenPreview(bm) : recordVisit(bm))}
                      className="group p-2.5 rounded-lg border border-border bg-background hover:border-border-hover transition-colors text-xs space-y-1.5 cursor-pointer shadow-xs outline-none focus:outline-none"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <BookmarkIcon
                            src={bm.iconUrl}
                            domain={bm.domain}
                            alt={bm.title}
                            className="h-4 w-4 rounded object-contain flex-shrink-0"
                          />
                          <span
                            className="font-medium text-xs text-foreground truncate hover:underline cursor-pointer"
                          >
                            {bm.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(bm);
                          }}
                          className="cursor-pointer text-muted-foreground/30 hover:text-amber-500 flex-shrink-0"
                        >
                          <Star className={`h-3.5 w-3.5 ${bm.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                        </button>
                      </div>

                      {bm.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{bm.description}</p>
                      )}

                      {/* Tags in Kanban */}
                      {bm.tags && bm.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {bm.tags.slice(0, 2).map((t) => (
                            <span
                              key={t.id}
                              className="px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: `${t.color}15`, color: t.color }}
                            >
                              #{t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
                        <span className="truncate max-w-32 font-mono">{bm.domain}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(bm.url, bm.id);
                            }}
                            className="hover:text-foreground cursor-pointer p-0.5"
                            title="Copy Link"
                          >
                            {copiedId === bm.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCopyingBookmark(bm);
                            }}
                            className="hover:text-foreground cursor-pointer p-0.5"
                            title="Copy to Folder..."
                          >
                            <FolderPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBookmark(bm);
                            }}
                            className="hover:text-foreground cursor-pointer p-0.5"
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(bm);
                            }}
                            className={`cursor-pointer p-0.5 ${bm.isArchived ? "text-blue-500 hover:text-blue-600" : "hover:text-purple-600"}`}
                            title={bm.isArchived ? `Unarchive back to ${getParentFolderInfo(bm).name}` : "Archive"}
                          >
                            {bm.isArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                          </button>
                          <a
                            href={bm.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              recordVisit(bm);
                            }}
                            className="hover:text-foreground inline-flex items-center p-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "cards" ? (
        /* Notion Gallery / Card View with Visual Snapshot Cover */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((bm) => {
            const snapshotUrl =
              bm.imageUrl && !bm.imageUrl.includes("avatar-")
                ? bm.imageUrl
                : `https://image.thum.io/get/width/600/crop/340/${bm.url}`;

            return (
              <div
                key={bm.id}
                draggable={true}
                onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
                onClick={() => (onOpenPreview ? onOpenPreview(bm) : recordVisit(bm))}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-xs hover:border-border-hover transition-colors flex flex-col justify-between group cursor-pointer outline-none focus:outline-none"
              >
                {/* Notion-Style Card Cover: Visual Snapshot / Icon / Monogram */}
                <div className="relative h-36 w-full bg-secondary overflow-hidden border-b border-border/60">
                  {cardFallbackMode === "monogram" ? (
                    <div className="h-full w-full bg-muted/40 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-3xl font-bold font-mono uppercase select-none">
                        {bm.title?.charAt(0) || bm.domain?.charAt(0) || "M"}
                      </div>
                    </div>
                  ) : cardFallbackMode === "icon" ? (
                    <div className="h-full w-full bg-muted/30 flex flex-col items-center justify-center gap-2">
                      <div className="p-3 rounded-2xl bg-card border border-border shadow-xs">
                        <BookmarkIcon
                          src={bm.iconUrl}
                          alt={bm.title}
                          domain={bm.domain}
                          className="h-8 w-8 rounded object-contain"
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[80%]">
                        {bm.domain}
                      </span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={snapshotUrl}
                      alt={bm.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="absolute bottom-2 left-2.5 bg-black/60 backdrop-blur-xs text-white text-xs font-mono px-2 py-0.5 rounded shadow-xs truncate max-w-[80%]">
                    {bm.domain}
                  </div>
                  {/* Quick Favorite Star on Cover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(bm);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur-xs text-white transition-colors cursor-pointer"
                    title={bm.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    {bm.isFavorite ? (
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    ) : (
                      <Star className="h-3.5 w-3.5 text-white/80 hover:text-white" />
                    )}
                  </button>
                </div>

                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 truncate">
                      <BookmarkIcon
                        src={bm.iconUrl}
                        alt={bm.title}
                        domain={bm.domain}
                        className="h-5 w-5 rounded object-contain bg-background flex-shrink-0 border border-border/40"
                      />
                      <span
                        className="font-medium text-sm hover:underline text-foreground block truncate cursor-pointer flex-1"
                        title={bm.title}
                      >
                        {bm.title}
                      </span>
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          recordVisit(bm);
                        }}
                        className="text-muted-foreground hover:text-primary p-0.5 shrink-0"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {bm.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                        {bm.description}
                      </p>
                    )}

                    {/* Tags */}
                    {bm.tags && bm.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {bm.tags.map((t) => (
                          <span
                            key={t.id}
                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${t.color}15`, color: t.color }}
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2.5 mt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <FolderIconRenderer icon={getParentFolderInfo(bm).icon} color={getParentFolderInfo(bm).color} className="h-3.5 w-3.5" />
                      <span className="truncate max-w-32">{getParentFolderInfo(bm).name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(bm.url, bm.id);
                        }}
                        className="hover:text-foreground cursor-pointer"
                        title="Copy Link"
                      >
                        {copiedId === bm.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCopyingBookmark(bm);
                        }}
                        className="hover:text-foreground cursor-pointer"
                        title="Copy to Folder..."
                      >
                        <FolderPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBookmark(bm);
                        }}
                        className="hover:text-foreground cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "list" ? (
        /* Notion-Style Document List View */
        <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
          {filteredData.map((bm) => (
            <div
              key={bm.id}
              draggable={true}
              onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
              onClick={() => (onOpenPreview ? onOpenPreview(bm) : recordVisit(bm))}
              className="flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 text-xs group transition-colors cursor-pointer outline-none focus:outline-none"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(bm);
                  }}
                  className="cursor-pointer flex-shrink-0"
                >
                  <Star className={`h-4 w-4 ${bm.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground/25 group-hover:text-muted-foreground"}`} />
                </button>

                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-4.5 w-4.5 rounded object-contain flex-shrink-0"
                />

                <span
                  className="font-semibold text-xs text-foreground hover:underline truncate cursor-pointer"
                >
                  {bm.title}
                </span>

                <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40 font-mono hidden md:inline truncate">
                  {bm.domain}
                </span>

                {bm.tags && bm.tags.length > 0 && (
                  <div className="hidden lg:flex items-center gap-1">
                    {bm.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${t.color}15`, color: t.color }}
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="flex items-center gap-3 text-muted-foreground text-xs flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-neutral-400">
                  <FolderIconRenderer icon={getParentFolderInfo(bm).icon} color={getParentFolderInfo(bm).color} className="h-3.5 w-3.5" />
                  <span className="truncate max-w-28 hidden sm:inline">{getParentFolderInfo(bm).name}</span>
                </span>

                <span className="font-mono tabular-nums hidden sm:inline">{bm.visitCount} visits</span>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(bm.url, bm.id);
                    }}
                    className="p-1 hover:text-foreground rounded cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedId === bm.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCopyingBookmark(bm);
                    }}
                    className="p-1 hover:text-foreground rounded cursor-pointer"
                    title="Copy to Folder..."
                  >
                    <FolderPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBookmark(bm);
                    }}
                    className="p-1 hover:text-foreground rounded cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchive(bm);
                    }}
                    className={`p-1 rounded cursor-pointer ${bm.isArchived ? "text-blue-500 hover:text-blue-600" : "hover:text-purple-600"}`}
                    title={bm.isArchived ? `Unarchive back to ${getParentFolderInfo(bm).name}` : "Archive"}
                  >
                    {bm.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </button>
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      recordVisit(bm);
                    }}
                    className="p-1 hover:text-foreground rounded"
                    title="Open website"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Notion Ultra-Dense / Space-Optimized Mode */
        <div className="rounded-lg border border-border bg-card shadow-xs divide-y divide-border/50 text-xs">
          {filteredData.map((bm) => (
            <div
              key={bm.id}
              draggable={true}
              onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
              onClick={() => (onOpenPreview ? onOpenPreview(bm) : recordVisit(bm))}
              className="flex items-center justify-between px-2.5 py-1 hover:bg-muted/30 group transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(bm);
                  }}
                  className="cursor-pointer flex-shrink-0"
                >
                  <Star className={`h-3 w-3 ${bm.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20 group-hover:text-muted-foreground"}`} />
                </button>

                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-3.5 w-3.5 rounded object-contain flex-shrink-0"
                />

                <span
                  className="font-medium hover:underline text-foreground truncate max-w-sm sm:max-w-md cursor-pointer"
                >
                  {bm.title}
                </span>

                <span className="text-xs text-muted-foreground font-mono truncate hidden md:inline">
                  {bm.domain}
                </span>
              </div>

              <div
                className="flex items-center gap-2 text-muted-foreground text-xs flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="hidden sm:inline-flex items-center gap-1">
                  <FolderIconRenderer icon={getParentFolderInfo(bm).icon} color={getParentFolderInfo(bm).color} className="h-3 w-3" />
                  <span className="truncate max-w-24">{getParentFolderInfo(bm).name}</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(bm.url, bm.id);
                  }}
                  className="p-0.5 hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Copy Link"
                >
                  {copiedId === bm.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCopyingBookmark(bm);
                  }}
                  className="p-0.5 hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Copy to Folder..."
                >
                  <FolderPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleArchive(bm);
                  }}
                  className={`p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 ${bm.isArchived ? "text-blue-500 hover:text-blue-600" : "hover:text-purple-600"}`}
                  title={bm.isArchived ? `Unarchive back to ${getParentFolderInfo(bm).name}` : "Archive"}
                >
                  {bm.isArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </button>

                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    recordVisit(bm);
                  }}
                  className="hover:text-foreground p-0.5 inline-flex items-center"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Centered Delete Confirmation Modal for Single Bookmark */}
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmSingleDelete}
        title="Delete Bookmark"
        itemName={deleteTarget?.title}
      />

      {/* Centered Delete Confirmation Modal for Bulk Bookmarks */}
      <ConfirmDeleteModal
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Bookmarks"
        isBulk={true}
        count={selectedIds.length}
      />
    </div>
  );
}
