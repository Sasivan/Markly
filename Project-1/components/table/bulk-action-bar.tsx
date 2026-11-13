"use client";

import * as React from "react";
import { Folder, Star, Archive, Trash2, Download, X, Search, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder as FolderType } from "@/server/db/schema";

interface BulkActionBarProps {
  selectedCount: number;
  folders: FolderType[];
  onClearSelection: () => void;
  onBulkMove: (folderId: string | null) => void;
  onBulkFavorite: (isFavorite: boolean) => void;
  onBulkArchive: (isArchived: boolean) => void;
  onBulkDelete: () => void;
  onBulkExport: (format: "json" | "csv") => void;
}

export function BulkActionBar({
  selectedCount,
  folders,
  onClearSelection,
  onBulkMove,
  onBulkFavorite,
  onBulkArchive,
  onBulkDelete,
  onBulkExport,
}: BulkActionBarProps) {
  const [moveDropdownOpen, setMoveDropdownOpen] = React.useState(false);
  const [folderSearch, setFolderSearch] = React.useState("");
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string>>(new Set());
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoveDropdownOpen(false);
      }
    }
    if (moveDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moveDropdownOpen]);

  // Hierarchical folder tree
  const folderTree = React.useMemo(() => {
    const map = new Map<string, FolderType & { children: (FolderType & { children: any[] })[] }>();
    folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
    const roots: (FolderType & { children: (FolderType & { children: any[] })[] })[] = [];
    folders.forEach((f) => {
      const node = map.get(f.id)!;
      const pid = f.parentId ?? (f as any).parent_id;
      if (pid && map.has(pid)) {
        map.get(pid)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [folders]);

  // Initially expand all folders
  React.useEffect(() => {
    setExpandedFolderIds(new Set(folders.map((f) => f.id)));
  }, [folders]);

  if (selectedCount === 0) return null;

  const renderFolderNode = (node: FolderType & { children: any[] }, depth: number = 0): React.ReactNode => {
    const matchesSearch =
      !folderSearch.trim() ||
      node.name.toLowerCase().includes(folderSearch.toLowerCase().trim());
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedFolderIds.has(node.id);

    return (
      <div key={node.id} className="relative">
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-xs group transition-colors ${
            depth > 0 ? "border-l-2 border-slate-200 dark:border-neutral-700 ml-2.5" : ""
          }`}
          style={{ paddingLeft: `${Math.max(6, depth * 12)}px` }}
          onClick={() => {
            setMoveDropdownOpen(false);
            onBulkMove(node.id);
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedFolderIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                });
              }}
              className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <div
            className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${node.color || "#3b82f6"}20` }}
          >
            <FolderIconRenderer icon={node.icon} color={node.color} className="h-3.5 w-3.5" />
          </div>

          <span className="truncate flex-1 font-medium text-slate-800 dark:text-neutral-200">
            {node.name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child: any) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-[#1a1a1a] border-2 border-slate-300 dark:border-neutral-700 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-5 text-slate-900 dark:text-neutral-100">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-neutral-700">
        <span className="font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[11px] border border-blue-200 dark:border-blue-800">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
          title="Clear Selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Move to folder thread dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1"
            onClick={() => setMoveDropdownOpen(!moveDropdownOpen)}
          >
            <Folder className="h-3 w-3 text-blue-500" />
            <span>Move to...</span>
          </Button>

          {moveDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] p-2 shadow-2xl z-50 text-xs flex flex-col space-y-2 animate-in fade-in zoom-in-95 duration-150">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search destination folder..."
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  className="w-full pl-7 pr-6 py-1 text-xs rounded-md bg-slate-100 dark:bg-neutral-800 border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {folderSearch && (
                  <button
                    type="button"
                    onClick={() => setFolderSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Scrollable Tree Container */}
              <div className="overflow-y-auto max-h-56 space-y-0.5 pr-1">
                {/* Unsorted (Inbox) Option */}
                <button
                  type="button"
                  onClick={() => {
                    setMoveDropdownOpen(false);
                    onBulkMove(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left cursor-pointer transition-colors"
                >
                  <span className="text-base leading-none">📥</span>
                  <span className="font-semibold text-slate-800 dark:text-neutral-200">
                    Unsorted (Inbox)
                  </span>
                </button>

                <div className="h-px bg-slate-200 dark:bg-neutral-700 my-1" />

                {/* Folder Thread Nodes */}
                {folderTree.map((root) => renderFolderNode(root, 0))}
              </div>
            </div>
          )}
        </div>

        {/* Favorite */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={() => onBulkFavorite(true)}
        >
          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span>Favorite</span>
        </Button>

        {/* Archive */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={() => onBulkArchive(true)}
        >
          <Archive className="h-3 w-3 text-purple-500" />
          <span>Archive</span>
        </Button>

        {/* Export JSON */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={() => onBulkExport("json")}
        >
          <Download className="h-3 w-3" />
          <span>Export</span>
        </Button>

        {/* Delete */}
        <Button
          size="sm"
          variant="destructive"
          className="text-xs h-7 gap-1"
          onClick={onBulkDelete}
        >
          <Trash2 className="h-3 w-3" />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
}
