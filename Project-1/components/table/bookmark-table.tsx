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
  Star,
  ExternalLink,
  Copy,
  Edit2,
  Trash2,
  MoreHorizontal,
  Archive,
  ArrowUpDown,
  Check,
  Activity,
  Folder as FolderIcon,
  Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkActionBar } from "./bulk-action-bar";
import { EditBookmarkModal } from "./edit-bookmark-modal";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";
import { formatDate, formatDateTime } from "@/lib/utils";

interface BookmarkTableProps {
  data: BookmarkWithDetails[];
  folders: FolderType[];
  onRefreshData: () => void;
  onOpenAddModal: () => void;
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
  externalSearchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function BookmarkTable({
  data,
  folders,
  onRefreshData,
  onOpenAddModal,
  onRecordVisit,
  externalSearchQuery,
  onSearchChange,
}: BookmarkTableProps) {
  // State
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState(externalSearchQuery || "");

  React.useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setGlobalFilter(externalSearchQuery);
    }
  }, [externalSearchQuery]);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [viewMode, setViewMode] = React.useState<"table" | "cards" | "compact">("table");

  // Edit modal
  const [editingBookmark, setEditingBookmark] = React.useState<BookmarkWithDetails | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Column visibility dropdown
  const [colMenuOpen, setColMenuOpen] = React.useState(false);

  // Filter data by status if active
  const filteredData = React.useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter((item) => item.status === statusFilter);
  }, [data, statusFilter]);

  // Actions
  const handleToggleFavorite = async (bookmark: BookmarkWithDetails) => {
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
    try {
      await fetch(`/api/bookmarks/${deleteTarget.id}`, { method: "DELETE" });
      onRefreshData();
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      await fetch("/api/bookmarks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      setRowSelection({});
      onRefreshData();
    } catch (e) {
      console.error("Bulk delete error:", e);
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

  // Bulk Actions
  const selectedIds = React.useMemo(() => {
    const indices = Object.keys(rowSelection).map(Number);
    return indices.map((idx) => filteredData[idx]?.id).filter(Boolean);
  }, [rowSelection, filteredData]);

  const handleBulkMove = async (folderId: string | null) => {
    await fetch("/api/bookmarks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", ids: selectedIds, folderId }),
    });
    setRowSelection({});
    onRefreshData();
  };

  const handleBulkFavorite = async (isFavorite: boolean) => {
    await fetch("/api/bookmarks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "favorite", ids: selectedIds, isFavorite }),
    });
    setRowSelection({});
    onRefreshData();
  };

  const handleBulkArchive = async (isArchived: boolean) => {
    await fetch("/api/bookmarks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", ids: selectedIds, isArchived }),
    });
    setRowSelection({});
    onRefreshData();
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
      if (!bm.folderId) return { name: "Unsorted", icon: "📁", color: "#64748b" };
      const currentFolder = folders.find((f) => f.id === bm.folderId);
      if (!currentFolder) return { name: bm.folderName || "Unsorted", icon: "📁", color: "#64748b" };

      // If current folder has a parent folder, return the parent folder!
      if (currentFolder.parentId) {
        const parentFolder = folders.find((f) => f.id === currentFolder.parentId);
        if (parentFolder) {
          return {
            name: parentFolder.name,
            icon: parentFolder.icon || "📁",
            color: parentFolder.color || "#3b82f6",
          };
        }
      }

      // If already a top-level parent folder, return its own folder info
      return {
        name: currentFolder.name,
        icon: currentFolder.icon || "📁",
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
      setTimeout(onRefreshData, 300);
    },
    [onRecordVisit, onRefreshData]
  );

  // TanStack Table Column Definitions
  const columns = React.useMemo<ColumnDef<BookmarkWithDetails>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded text-primary h-3.5 w-3.5 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            className="rounded text-primary h-3.5 w-3.5 cursor-pointer"
          />
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
              onClick={() => handleToggleFavorite(bm)}
              className="hover:scale-110 transition-transform cursor-pointer"
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
            <div className="flex items-center gap-2.5 max-w-md">
              <BookmarkIcon
                src={bm.iconUrl}
                alt={bm.title}
                domain={bm.domain}
                className="h-5 w-5 rounded object-contain bg-background flex-shrink-0 border border-border/40"
              />
              <div className="truncate">
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => recordVisit(bm)}
                  className="font-medium hover:underline text-foreground truncate block"
                >
                  {bm.title}
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
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-border/40"
              style={{
                backgroundColor: `${parentInfo.color}14`,
                color: parentInfo.color,
              }}
              title={`Parent folder: ${parentInfo.name}`}
            >
              <FolderIconRenderer icon={parentInfo.icon} color={parentInfo.color} className="h-3.5 w-3.5" />
              <span className="truncate max-w-[140px]">{parentInfo.name}</span>
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
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  #{tag.name}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground font-mono">+{tags.length - 3}</span>
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
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${status === "dead"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status === "dead" ? "bg-destructive" : "bg-emerald-500"}`} />
              {status === "dead" ? "Dead" : "Alive"}
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
            return <span className="text-muted-foreground/40 font-mono text-[11px]">- Never -</span>;
          }
          return (
            <span className="text-foreground/90 whitespace-nowrap font-mono text-[11px]" title={new Date(lastTime).toLocaleString()}>
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
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.visitCount}</span>,
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
          <span className="text-muted-foreground whitespace-nowrap font-mono text-[11px]">
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
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Copy Link"
              >
                {copiedId === bm.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => setEditingBookmark(bm)}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Edit Details"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(bm.id, bm.title)}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
    state: {
      sorting,
      globalFilter,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        folders={folders}
        onClearSelection={() => setRowSelection({})}
        onBulkMove={handleBulkMove}
        onBulkFavorite={handleBulkFavorite}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
      />

      {/* Table Controls Header: Search, View Toggle, Status Filter, Column Visibility */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Left: Global Search & Status Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="Search title, URL, tags, domain..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              className="pl-8 text-xs h-8 bg-background"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Health</option>
            <option value="alive">🟢 Alive</option>
            <option value="dead">🔴 Dead Links</option>
          </select>
        </div>

        {/* Right: View Toggles & Columns */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${viewMode === "cards" ? "bg-background text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              title="Card / Gallery View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${viewMode === "compact" ? "bg-background text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              title="Compact View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

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
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] p-2 shadow-2xl z-50 text-xs text-slate-900 dark:text-neutral-100 animate-in zoom-in-95">
                <div className="font-semibold px-2 py-1 text-[11px] text-muted-foreground border-b border-border mb-1">
                  Toggle Columns
                </div>
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.id !== "select" && col.id !== "actions")
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-[11px]"
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

      {/* Main View Display */}
      {viewMode === "table" ? (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted/30 text-muted-foreground font-medium">
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
                      className={`hover:bg-muted/20 transition-colors group ${row.getIsSelected() ? "bg-primary/5" : ""
                        }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-2.5 px-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* Card / Gallery View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredData.map((bm) => (
            <div
              key={bm.id}
              className="rounded-lg border border-border bg-card p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <BookmarkIcon
                      src={bm.iconUrl}
                      alt={bm.title}
                      domain={bm.domain}
                      className="h-6 w-6 rounded object-contain bg-background flex-shrink-0 border border-border/40"
                    />
                    <span className="text-[11px] font-semibold text-muted-foreground truncate">{bm.domain}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(bm)}
                    className="cursor-pointer"
                  >
                    {bm.isFavorite ? (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <Star className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground" />
                    )}
                  </button>
                </div>

                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => recordVisit(bm)}
                  className="font-semibold text-sm hover:underline text-foreground block line-clamp-1"
                >
                  {bm.title}
                </a>

                {bm.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{bm.description}</p>
                )}

                {/* Tags */}
                {bm.tags && bm.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {bm.tags.map((t) => (
                      <span
                        key={t.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: `${t.color}15`, color: t.color }}
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium">
                  <FolderIconRenderer icon={getParentFolderInfo(bm).icon} color={getParentFolderInfo(bm).color} className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px]">{getParentFolderInfo(bm).name}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBookmark(bm)}
                    className="hover:text-foreground cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => recordVisit(bm)}
                    className="hover:text-foreground inline-flex items-center gap-0.5"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compact List View */
        <div className="rounded-lg border border-border bg-card shadow-xs divide-y divide-border">
          {filteredData.map((bm) => (
            <div
              key={bm.id}
              className="flex items-center justify-between px-3.5 py-1.5 hover:bg-muted/20 text-xs group"
            >
              <div className="flex items-center gap-2.5 truncate max-w-xl">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(bm)}
                  className="cursor-pointer"
                >
                  {bm.isFavorite ? (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  ) : (
                    <Star className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground" />
                  )}
                </button>

                <BookmarkIcon
                  src={bm.iconUrl}
                  alt={bm.title}
                  domain={bm.domain}
                  className="h-4 w-4 rounded object-contain"
                />

                <a
                  href={bm.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => recordVisit(bm)}
                  className="font-medium hover:underline text-foreground truncate"
                >
                  {bm.title}
                </a>
              </div>

              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                <span className="hidden sm:inline-flex items-center gap-1 font-medium">
                  <FolderIconRenderer icon={getParentFolderInfo(bm).icon} color={getParentFolderInfo(bm).color} className="h-3.5 w-3.5" />
                  <span>{getParentFolderInfo(bm).name}</span>
                </span>
                <span className="font-mono">{bm.visitCount} visits</span>
                <a href={bm.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
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
