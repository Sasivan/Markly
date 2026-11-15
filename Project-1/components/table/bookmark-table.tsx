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
  Filter,
  X,
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
  allBookmarks?: BookmarkWithDetails[];
  controlledViewMode?: "table" | "board" | "cards" | "list" | "compact";
  onControlledViewModeChange?: (mode: "table" | "board" | "cards" | "list" | "compact") => void;
}

// Notion-Style Multi-Column Filter Rules
export type ColumnFilterField =
  | "title"
  | "url"
  | "domain"
  | "folder"
  | "tags"
  | "status"
  | "favorite"
  | "visitCount"
  | "notes"
  | "recency"
  | "lastClicked";

export type ColumnFilterOperator =
  | "contains"
  | "does_not_contain"
  | "starts_with"
  | "equals"
  | "not_equals"
  | "greater_than"
  | "is_empty"
  | "is_not_empty"
  | "is_starred"
  | "is_not_starred";

export interface ColumnFilterRule {
  id: string;
  field: ColumnFilterField;
  operator: ColumnFilterOperator;
  value: string;
}

export function BookmarkTable({
  data,
  allBookmarks,
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
const TABLE_COLUMN_OPTIONS = [
  { id: "title", label: "Title & URL" },
  { id: "domain", label: "Domain" },
  { id: "folder", label: "Folder Group" },
  { id: "tags", label: "Tags" },
  { id: "status", label: "Health Status" },
  { id: "lastClicked", label: "Last Clicked" },
  { id: "visitCount", label: "Visits" },
  { id: "createdAt", label: "Date Added" },
];

  // Persisted Sorting
  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_table_sorting");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [{ id: "createdAt", desc: true }];
  });

  const handleSortingChange = (updaterOrValue: any) => {
    setSorting((prev) => {
      const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
      try {
        localStorage.setItem("markly_table_sorting", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  // Persisted Status Filter
  const [statusFilter, setStatusFilterState] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_table_status_filter");
        if (stored) return stored;
      } catch {}
    }
    return "all";
  });

  const setStatusFilter = (val: string) => {
    setStatusFilterState(val);
    try {
      localStorage.setItem("markly_table_status_filter", val);
    } catch {}
  };

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

  const handleToggleColumn = (colId: string, isVisible: boolean) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [colId]: isVisible };
      try {
        localStorage.setItem("markly_table_columns", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [columnFilters, setColumnFilters] = React.useState<ColumnFilterRule[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_notion_column_filters");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  const handleSaveColumnFilters = (filters: ColumnFilterRule[]) => {
    setColumnFilters(filters);
    try {
      localStorage.setItem("markly_notion_column_filters", JSON.stringify(filters));
    } catch {}
  };

  // 3.1: Live Reactive Sync for Smart Dynamic Collections
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.rules && Array.isArray(e.detail.rules)) {
        setColumnFilters(e.detail.rules);
      }
    };
    window.addEventListener("markly-smart-collection-selected", handler);
    return () => window.removeEventListener("markly-smart-collection-selected", handler);
  }, []);

  // Track focused bookmark for Vim keyboard navigation (j, k, Enter, o, f, e, c, d, Esc)
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

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

  // Column, Filter & Sort popover menus
  const [colMenuOpen, setColMenuOpen] = React.useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false);

  const filterMenuRef = React.useRef<HTMLDivElement>(null);
  const sortMenuRef = React.useRef<HTMLDivElement>(null);
  const colMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setColMenuOpen(false);
      }
    }
    if (filterMenuOpen || sortMenuOpen || colMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [filterMenuOpen, sortMenuOpen, colMenuOpen]);

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

function getDomainGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 42%, 20%) 0%, hsl(${h2}, 52%, 11%) 100%)`;
}

  // Filter data by status and search filter across all views (Table, Board, Cards, List, Compact)
  const filteredData = React.useMemo(() => {
    const isSearching = Boolean(globalFilter && globalFilter.trim().length > 0);
    // When searching, search across all bookmarks if provided, otherwise data
    let result =
      isSearching && allBookmarks && allBookmarks.length > 0
        ? allBookmarks
        : data;

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Apply Notion Multi-Column Filter Rules (Advanced Multi-Condition Engine)
    for (const rule of columnFilters) {
      const qVal = (rule.value || "").trim().toLowerCase();
      if (rule.field === "title") {
        if (rule.operator === "contains" && qVal) {
          result = result.filter((b) => (b.title || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "does_not_contain" && qVal) {
          result = result.filter((b) => !(b.title || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "starts_with" && qVal) {
          result = result.filter((b) => (b.title || "").toLowerCase().startsWith(qVal));
        } else if (rule.operator === "is_empty") {
          result = result.filter((b) => !b.title || b.title.trim() === "");
        } else if (rule.operator === "is_not_empty") {
          result = result.filter((b) => Boolean(b.title && b.title.trim()));
        }
      } else if (rule.field === "url") {
        if (rule.operator === "contains" && qVal) {
          result = result.filter((b) => (b.url || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "does_not_contain" && qVal) {
          result = result.filter((b) => !(b.url || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "starts_with" && qVal) {
          result = result.filter((b) => (b.url || "").toLowerCase().startsWith(qVal));
        }
      } else if (rule.field === "domain") {
        if (rule.operator === "contains" && qVal) {
          result = result.filter((b) => (b.domain || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "does_not_contain" && qVal) {
          result = result.filter((b) => !(b.domain || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "starts_with" && qVal) {
          result = result.filter((b) => (b.domain || "").toLowerCase().startsWith(qVal));
        }
      } else if (rule.field === "notes") {
        if (rule.operator === "contains" && qVal) {
          result = result.filter((b) => (b.notes || "").toLowerCase().includes(qVal));
        } else if (rule.operator === "is_not_empty") {
          result = result.filter((b) => Boolean(b.notes && b.notes.trim()));
        } else if (rule.operator === "is_empty") {
          result = result.filter((b) => !b.notes || b.notes.trim() === "");
        }
      } else if (rule.field === "folder") {
        if (rule.value === "__UNSORTED__") {
          result = result.filter((b) => !b.folderId || b.folderId === "__UNSORTED__" || b.folderId.startsWith("fld_unsorted_"));
        } else if (rule.value && rule.value !== "all") {
          if (rule.operator === "not_equals") {
            result = result.filter((b) => b.folderId !== rule.value);
          } else {
            result = result.filter((b) => b.folderId === rule.value);
          }
        }
      } else if (rule.field === "tags") {
        if (rule.operator === "is_empty") {
          result = result.filter((b) => !b.tags || b.tags.length === 0);
        } else if (rule.operator === "is_not_empty") {
          result = result.filter((b) => Boolean(b.tags && b.tags.length > 0));
        } else if (qVal) {
          result = result.filter((b) =>
            b.tags?.some((t: any) => (typeof t === "string" ? t : t.name).toLowerCase().includes(qVal.replace(/^#/, "")))
          );
        }
      } else if (rule.field === "status") {
        if (rule.value !== "all") {
          result = result.filter((b) => b.status === rule.value);
        }
      } else if (rule.field === "favorite") {
        if (rule.operator === "is_not_starred" || rule.value === "unstarred") {
          result = result.filter((b) => !b.isFavorite);
        } else {
          result = result.filter((b) => b.isFavorite);
        }
      } else if (rule.field === "visitCount") {
        if (rule.operator === "equals" && (rule.value === "0" || rule.value === "unvisited")) {
          result = result.filter((b) => (b.visitCount || 0) === 0);
        } else if (rule.operator === "greater_than") {
          const minVisits = Number(rule.value) || 0;
          result = result.filter((b) => (b.visitCount || 0) > minVisits);
        } else if (rule.value === "visited") {
          result = result.filter((b) => (b.visitCount || 0) > 0);
        }
      } else if (rule.field === "recency") {
        const cutoff = rule.value === "24h" ? Date.now() - 86400000 : rule.value === "week" ? Date.now() - 7 * 86400000 : Date.now() - 30 * 86400000;
        result = result.filter((b) => b.createdAt >= cutoff);
      } else if (rule.field === "lastClicked") {
        if (rule.value === "never") {
          result = result.filter((b) => !b.lastClickedAt && !b.lastVisitedAt);
        } else {
          const cutoff = rule.value === "24h" ? Date.now() - 86400000 : rule.value === "week" ? Date.now() - 7 * 86400000 : Date.now() - 30 * 86400000;
          result = result.filter((b) => {
            const last = b.lastClickedAt || b.lastVisitedAt || 0;
            return last >= cutoff;
          });
        }
      }
    }

    // 5.3: Typo-Tolerant & Fuzzy Search across all fields: title, domain, URL, description, notes, tags, folder
    const q = (globalFilter || "").toLowerCase().trim();
    if (q) {
      const searchTokens = q.split(/\s+/).filter(Boolean);
      result = result.filter((bm) => {
        const folderObj = folders.find((f) => f.id === bm.folderId);
        const folderTitle = folderObj ? folderObj.name : bm.folderName || "";
        const tagNames = (bm.tags || []).map((t: any) => (typeof t === "string" ? t : t.name));
        const tagHashes = tagNames.map((t: string) => `#${t}`);
        const notesText = (bm as any).notes || (bm as any).personalNotes || "";
        const searchable = [
          bm.title || "",
          bm.domain || "",
          bm.url || "",
          bm.description || "",
          notesText,
          ...tagNames,
          ...tagHashes,
          folderTitle,
        ]
          .join(" ")
          .toLowerCase();
        return searchTokens.every((token) => {
          const cleanToken = token.startsWith("#") ? token.slice(1) : token;
          return fuzzyMatch(searchable, cleanToken);
        });
      });
    }
    return result;
  }, [data, allBookmarks, folders, statusFilter, globalFilter, columnFilters]);

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

  // 8.1: Vim-Style Keyboard Navigation & Action Shortcuts
  React.useEffect(() => {
    const handleTableKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (filteredData.length === 0) return;

      // j or ArrowDown: Select next bookmark
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev === null || prev >= filteredData.length - 1 ? 0 : prev + 1;
          setTimeout(() => {
            const el = document.querySelector(`[data-bookmark-index="${next}"]`);
            if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }, 10);
          return next;
        });
        return;
      }

      // k or ArrowUp: Select previous bookmark
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev === null || prev <= 0 ? filteredData.length - 1 : prev - 1;
          setTimeout(() => {
            const el = document.querySelector(`[data-bookmark-index="${next}"]`);
            if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }, 10);
          return next;
        });
        return;
      }

      const activeBm = focusedIndex !== null && filteredData[focusedIndex] ? filteredData[focusedIndex] : null;
      if (!activeBm) return;

      // Space or Enter: Open preview
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenPreview?.(activeBm);
        return;
      }

      // o: Open URL in new tab
      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        window.open(activeBm.url, "_blank");
        recordVisit(activeBm);
        return;
      }

      // f: Toggle Favorite
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleToggleFavorite(activeBm);
        return;
      }

      // e: Edit bookmark
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setEditingBookmark(activeBm);
        return;
      }

      // c: Copy Link
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleCopyLink(activeBm.url, activeBm.id);
        return;
      }

      // d or Delete: Delete bookmark
      if (e.key === "d" || e.key === "D" || e.key === "Delete") {
        e.preventDefault();
        handleDelete(activeBm.id, activeBm.title);
        return;
      }

      // Esc: Clear focus
      if (e.key === "Escape") {
        setFocusedIndex(null);
      }
    };

    window.addEventListener("keydown", handleTableKeys);
    return () => window.removeEventListener("keydown", handleTableKeys);
  }, [filteredData, focusedIndex, onOpenPreview]);

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
        id: "domain",
        accessorKey: "domain",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground font-medium"
          >
            <span>Domain</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground truncate max-w-36 block">
            {row.original.domain}
          </span>
        ),
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
    onSortingChange: handleSortingChange,
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

      {/* Table Controls Header: Search, Notion Filter, Sort, View Toggles & Columns */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Search Bar, Notion Filter & Sort */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-xl">
          {/* Global Fuzzy Search Bar */}
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
            <Input
              id="markly-global-search-input"
              data-markly-search-input="true"
              type="text"
              placeholder="Search title, description, domain, tags, URL... (/ to focus)"
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              className="pl-8 pr-7 text-xs h-8 bg-background border-border"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => {
                  setGlobalFilter("");
                  onSearchChange?.("");
                }}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Notion-Style Multi-Column Filter Menu */}
          <div className="relative" ref={filterMenuRef}>
            <Button
              size="sm"
              variant={columnFilters.length > 0 || statusFilter !== "all" ? "default" : "outline"}
              onClick={() => {
                setFilterMenuOpen(!filterMenuOpen);
                setSortMenuOpen(false);
                setColMenuOpen(false);
              }}
              className="text-xs h-8 gap-1.5 px-3 cursor-pointer"
              title="Filter by any column property"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
              {(columnFilters.length > 0 || statusFilter !== "all") && (
                <span className="h-2 w-2 rounded-full bg-amber-400 ml-0.5" />
              )}
            </Button>

            {filterMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl border border-border bg-card p-3 shadow-xl z-50 text-xs text-foreground space-y-3 animate-in zoom-in-95 max-h-[75vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-xs text-foreground">Filter Rules</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground ml-1">
                      {filteredData.length} matches
                    </span>
                  </div>
                  {columnFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveColumnFilters([]);
                        setStatusFilter("all");
                      }}
                      className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {columnFilters.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
                    <p>No active filter rules.</p>
                    <p className="text-[11px]">Add conditions to filter by title, domain, folder, tags, or notes.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {columnFilters.map((rule, idx) => (
                      <div key={rule.id} className="p-2 rounded-lg border border-border bg-secondary/30 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-muted-foreground">
                          <span>{idx === 0 ? "Where" : "And"}</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveColumnFilters(columnFilters.filter((r) => r.id !== rule.id));
                            }}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded cursor-pointer transition-colors"
                            title="Remove condition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Field Selector */}
                          <select
                            value={rule.field}
                            onChange={(e) => {
                              const newField = e.target.value as ColumnFilterField;
                              let defOp: ColumnFilterOperator = "contains";
                              let defVal = "";
                              if (newField === "folder") { defOp = "equals"; defVal = "__UNSORTED__"; }
                              else if (newField === "status") { defOp = "equals"; defVal = "alive"; }
                              else if (newField === "favorite") { defOp = "is_starred"; defVal = "starred"; }
                              else if (newField === "visitCount") { defOp = "greater_than"; defVal = "0"; }
                              else if (newField === "recency") { defOp = "equals"; defVal = "week"; }
                              else if (newField === "lastClicked") { defOp = "equals"; defVal = "7d"; }
                              else if (newField === "url") { defOp = "contains"; defVal = ""; }
                              const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, field: newField, operator: defOp, value: defVal } : r);
                              handleSaveColumnFilters(updated);
                            }}
                            className="h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="title">Title</option>
                            <option value="url">URL</option>
                            <option value="domain">Domain</option>
                            <option value="folder">Folder</option>
                            <option value="tags">Tags</option>
                            <option value="notes">Notes</option>
                            <option value="status">Health Status</option>
                            <option value="favorite">Starred</option>
                            <option value="visitCount">Visit Count</option>
                            <option value="lastClicked">Last Clicked</option>
                            <option value="recency">Date Added</option>
                          </select>

                          {/* Operator Selector */}
                          <select
                            value={rule.operator}
                            onChange={(e) => {
                              const newOp = e.target.value as ColumnFilterOperator;
                              const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, operator: newOp } : r);
                              handleSaveColumnFilters(updated);
                            }}
                            className="h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {rule.field === "title" || rule.field === "domain" || rule.field === "notes" || rule.field === "url" ? (
                              <>
                                <option value="contains">contains</option>
                                <option value="does_not_contain">does not contain</option>
                                <option value="starts_with">starts with</option>
                                <option value="is_empty">is empty</option>
                                <option value="is_not_empty">is not empty</option>
                              </>
                            ) : rule.field === "folder" ? (
                              <>
                                <option value="equals">is</option>
                                <option value="not_equals">is not</option>
                              </>
                            ) : rule.field === "visitCount" ? (
                              <>
                                <option value="equals">is exactly</option>
                                <option value="greater_than">is greater than</option>
                              </>
                            ) : rule.field === "favorite" ? (
                              <>
                                <option value="is_starred">is starred</option>
                                <option value="is_not_starred">is not starred</option>
                              </>
                            ) : rule.field === "tags" ? (
                              <>
                                <option value="contains">includes tag</option>
                                <option value="is_empty">has no tags</option>
                                <option value="is_not_empty">has any tag</option>
                              </>
                            ) : (
                              <option value="equals">equals</option>
                            )}
                          </select>
                        </div>

                        {/* Value Input */}
                        {rule.operator !== "is_empty" && rule.operator !== "is_not_empty" && rule.operator !== "is_starred" && rule.operator !== "is_not_starred" && (
                          <div className="pt-0.5">
                            {rule.field === "folder" ? (
                              <select
                                value={rule.value}
                                onChange={(e) => {
                                  const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r);
                                  handleSaveColumnFilters(updated);
                                }}
                                className="w-full h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="__UNSORTED__">Unsorted (No Folder)</option>
                                {folders
                                  .filter((f) => f.id !== "__UNSORTED__")
                                  .map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                              </select>
                            ) : rule.field === "status" ? (
                              <select
                                value={rule.value}
                                onChange={(e) => {
                                  const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r);
                                  handleSaveColumnFilters(updated);
                                }}
                                className="w-full h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="alive">Reachable (200 OK)</option>
                                <option value="dead">Dead / Broken</option>
                              </select>
                            ) : rule.field === "lastClicked" ? (
                              <select
                                value={rule.value}
                                onChange={(e) => {
                                  const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r);
                                  handleSaveColumnFilters(updated);
                                }}
                                className="w-full h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="24h">Clicked in Past 24 Hours</option>
                                <option value="week">Clicked in Past 7 Days</option>
                                <option value="month">Clicked in Past 30 Days</option>
                                <option value="never">Never Clicked / Unvisited</option>
                              </select>
                            ) : rule.field === "recency" ? (
                              <select
                                value={rule.value}
                                onChange={(e) => {
                                  const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r);
                                  handleSaveColumnFilters(updated);
                                }}
                                className="w-full h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="24h">Past 24 Hours</option>
                                <option value="week">Past 7 Days</option>
                                <option value="month">Past 30 Days</option>
                              </select>
                            ) : (
                              <input
                                type={rule.field === "visitCount" ? "number" : "text"}
                                value={rule.value}
                                onChange={(e) => {
                                  const updated = columnFilters.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r);
                                  handleSaveColumnFilters(updated);
                                }}
                                placeholder={
                                  rule.field === "tags"
                                    ? "Tag name (e.g. design)"
                                    : rule.field === "visitCount"
                                    ? "0"
                                    : "Type text to match..."
                                }
                                className="w-full h-7 px-2 rounded border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Rule Button */}
                <div className="pt-1 border-t border-border flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newRule: ColumnFilterRule = {
                        id: `cfr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                        field: "title",
                        operator: "contains",
                        value: "",
                      };
                      handleSaveColumnFilters([...columnFilters, newRule]);
                    }}
                    className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add filter condition</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setFilterMenuOpen(false)}
                    className="h-7 px-3 text-xs bg-primary text-primary-foreground cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notion-Style Sort Menu */}
          <div className="relative" ref={sortMenuRef}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSortMenuOpen(!sortMenuOpen);
                setFilterMenuOpen(false);
                setColMenuOpen(false);
              }}
              className="text-xs h-8 gap-1.5 px-3 cursor-pointer"
              title="Notion Sort Menu"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort</span>
            </Button>

            {sortMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-card p-2.5 shadow-xl z-50 text-xs text-foreground space-y-1.5 animate-in zoom-in-95">
                <div className="font-semibold text-xs text-foreground border-b border-border pb-1">
                  Sort By
                </div>
                {[
                  { id: "createdAt", label: "Date Added" },
                  { id: "title", label: "Title (A-Z)" },
                  { id: "domain", label: "Domain (A-Z)" },
                  { id: "visitCount", label: "Visit Count" },
                  { id: "lastVisitedAt", label: "Last Visited" },
                ].map((opt) => {
                  const currentSort = sorting[0];
                  const isSelected = currentSort?.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const desc = isSelected ? !currentSort.desc : true;
                        handleSortingChange([{ id: opt.id, desc }]);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                        isSelected ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-secondary text-foreground"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-primary">
                          {currentSort.desc ? "↓ Desc" : "↑ Asc"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: View Toggles & Columns */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher (5 Notion-Inspired Modes) */}
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

          {/* Column Visibility Menu (Persisted across refreshes) */}
          <div className="relative" ref={colMenuRef}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setColMenuOpen(!colMenuOpen);
                setFilterMenuOpen(false);
                setSortMenuOpen(false);
              }}
              className="text-xs h-8 gap-1.5 px-3 cursor-pointer"
              title="Choose visible table columns"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Columns</span>
            </Button>

            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-card p-2.5 shadow-xl z-50 text-xs text-foreground animate-in zoom-in-95 space-y-1">
                <div className="font-semibold px-2 py-1 text-xs text-foreground border-b border-border mb-1 flex items-center justify-between">
                  <span>Toggle Columns</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Persisted</span>
                </div>
                {TABLE_COLUMN_OPTIONS.map((col) => {
                  const isVisible = columnVisibility[col.id] !== false;
                  return (
                    <label
                      key={col.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-xs transition-colors"
                    >
                      <span className="text-foreground">{col.label}</span>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => handleToggleColumn(col.id, e.target.checked)}
                        className="rounded text-primary h-3.5 w-3.5 accent-primary cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Notion Filter Pills */}
      {columnFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Active filters:</span>
          {columnFilters.map((rule) => {
            let label = "";
            if (rule.field === "folder") {
              const f = folders.find((item) => item.id === rule.value);
              label = `Folder ${rule.operator === "not_equals" ? "!=" : "="} ${rule.value === "__UNSORTED__" ? "Unsorted" : f ? f.name : rule.value}`;
            } else if (rule.field === "favorite") {
              label = rule.operator === "is_not_starred" ? "Unstarred" : "Starred";
            } else if (rule.field === "status") {
              label = rule.value === "alive" ? "Reachable" : "Broken";
            } else if (rule.field === "visitCount") {
              label = rule.operator === "greater_than" ? `Visits > ${rule.value}` : `Visits = ${rule.value}`;
            } else if (rule.field === "recency") {
              label = rule.value === "24h" ? "Past 24h" : rule.value === "week" ? "Past 7d" : "Past 30d";
            } else if (rule.field === "lastClicked") {
              label = rule.value === "never" ? "Never Clicked" : `Clicked past ${rule.value}`;
            } else if (rule.field === "url") {
              label = `URL ${rule.operator.replace(/_/g, " ")} "${rule.value}"`;
            } else if (rule.operator === "is_empty") {
              label = `${rule.field} is empty`;
            } else if (rule.operator === "is_not_empty") {
              label = `${rule.field} is not empty`;
            } else {
              label = `${rule.field} ${rule.operator.replace(/_/g, " ")} "${rule.value}"`;
            }

            return (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
              >
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveColumnFilters(columnFilters.filter((f) => f.id !== rule.id));
                  }}
                  className="hover:text-primary-foreground hover:bg-primary/40 rounded p-0.5 transition-colors cursor-pointer"
                  title="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => handleSaveColumnFilters([])}
            className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

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
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      data-bookmark-index={index}
                      draggable={true}
                      onDragStart={(e) => handleBookmarkDragStart(e, row.original.id)}
                      onClick={() => {
                        setFocusedIndex(index);
                        onOpenPreview?.(row.original);
                      }}
                      className={`hover:bg-muted/30 transition-colors group cursor-pointer outline-none focus:outline-none ${
                        row.getIsSelected() ? "bg-primary/5" : ""
                      } ${focusedIndex === index ? "ring-2 ring-primary ring-inset bg-primary/10" : ""}`}
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
          {filteredData.map((bm, index) => {
            const hasCustomImage = Boolean(
              bm.imageUrl &&
                !bm.imageUrl.includes("avatar-") &&
                !bm.imageUrl.includes("thum.io")
            );
            const gradientBg = getDomainGradient(bm.domain || bm.title || "markly");

            return (
              <div
                key={bm.id}
                data-bookmark-index={index}
                draggable={true}
                onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
                onClick={() => {
                  setFocusedIndex(index);
                  if (onOpenPreview) onOpenPreview(bm);
                  else recordVisit(bm);
                }}
                className={`rounded-xl border border-border bg-card overflow-hidden shadow-xs hover:border-border-hover transition-colors flex flex-col justify-between group cursor-pointer outline-none focus:outline-none ${
                  focusedIndex === index ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                }`}
              >
                {/* Notion-Style Card Cover: High-Craft Local SVG Gradient Art / Snapshot / Monogram */}
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
                  ) : hasCustomImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={bm.imageUrl!}
                      alt={bm.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-4 relative select-none"
                      style={{ background: gradientBg }}
                    >
                      <svg
                        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <pattern id={`pat-${bm.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1" fill="#fff" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#pat-${bm.id})`} />
                      </svg>
                      <div className="p-2.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg mb-1 flex items-center justify-center">
                        <BookmarkIcon
                          src={bm.iconUrl}
                          alt={bm.title}
                          domain={bm.domain}
                          className="h-8 w-8 rounded object-contain"
                        />
                      </div>
                      <div className="text-[13px] font-semibold text-white/95 truncate max-w-[85%] text-center tracking-tight">
                        {bm.title}
                      </div>
                      <div className="text-[11px] font-mono text-white/60 truncate max-w-[80%] text-center mt-0.5">
                        {bm.domain}
                      </div>
                    </div>
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
          {filteredData.map((bm, index) => (
            <div
              key={bm.id}
              data-bookmark-index={index}
              draggable={true}
              onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
              onClick={() => {
                setFocusedIndex(index);
                if (onOpenPreview) onOpenPreview(bm);
                else recordVisit(bm);
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 text-xs group transition-colors cursor-pointer outline-none focus:outline-none ${
                focusedIndex === index ? "ring-2 ring-primary ring-inset bg-primary/10" : ""
              }`}
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
          {filteredData.map((bm, index) => (
            <div
              key={bm.id}
              data-bookmark-index={index}
              draggable={true}
              onDragStart={(e) => handleBookmarkDragStart(e, bm.id)}
              onClick={() => {
                setFocusedIndex(index);
                if (onOpenPreview) onOpenPreview(bm);
                else recordVisit(bm);
              }}
              className={`flex items-center justify-between px-2.5 py-1 hover:bg-muted/30 group transition-colors cursor-pointer ${
                focusedIndex === index ? "ring-2 ring-primary ring-inset bg-primary/10" : ""
              }`}
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
