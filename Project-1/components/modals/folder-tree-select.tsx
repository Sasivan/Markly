"use client";

import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Search,
  X,
  Inbox,
  Folder as FolderDefaultIcon,
  ChevronsUpDown,
} from "lucide-react";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder, FolderTreeNode } from "@/server/db/schema";

interface FolderTreeSelectProps {
  folders: Folder[];
  folderTree?: FolderTreeNode[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function FolderTreeSelect({
  folders,
  folderTree,
  selectedFolderId,
  onSelectFolder,
  disabled = false,
  className = "",
}: FolderTreeSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string>>(new Set());
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Build tree if folderTree not provided
  const computedTree = React.useMemo(() => {
    if (folderTree && folderTree.length > 0) return folderTree;

    const map = new Map<string, FolderTreeNode>();
    folders.forEach((f) => {
      map.set(f.id, {
        ...f,
        children: [],
        bookmarkCount: 0,
        totalDescendantBookmarkCount: 0,
      });
    });

    const roots: FolderTreeNode[] = [];
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
  }, [folders, folderTree]);

  // Initially expand all folders so user sees complete structure
  React.useEffect(() => {
    const allIds = new Set<string>();
    const collect = (nodes: FolderTreeNode[]) => {
      for (const n of nodes) {
        allIds.add(n.id);
        if (n.children && n.children.length > 0) {
          collect(n.children);
        }
      }
    };
    collect(computedTree);
    setExpandedFolderIds(allIds);
  }, [computedTree]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const expandAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const all = new Set<string>();
    const collect = (nodes: FolderTreeNode[]) => {
      for (const n of nodes) {
        all.add(n.id);
        if (n.children) collect(n.children);
      }
    };
    collect(computedTree);
    setExpandedFolderIds(all);
  };

  const collapseAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds(new Set());
  };

  // Find currently selected folder object and its breadcrumb path
  const selectedFolder = React.useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  const selectedBreadcrumb = React.useMemo(() => {
    if (!selectedFolder || !selectedFolder.parentId) return null;
    const parentNames: string[] = [];
    let currentParentId: string | null = selectedFolder.parentId;
    while (currentParentId) {
      const parent = folders.find((f) => f.id === currentParentId);
      if (parent) {
        parentNames.unshift(parent.name);
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }
    return parentNames.length > 0 ? parentNames.join(" › ") : null;
  }, [folders, selectedFolder]);

  // Filter tree nodes if search query is active
  const filterTree = (nodes: FolderTreeNode[], query: string): FolderTreeNode[] => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase().trim();

    const matches = (n: FolderTreeNode): boolean => {
      const matchSelf = n.name.toLowerCase().includes(q);
      const childMatch = n.children?.some(matches);
      return matchSelf || Boolean(childMatch);
    };

    return nodes
      .filter(matches)
      .map((n) => ({
        ...n,
        children: filterTree(n.children || [], query),
      }));
  };

  const displayTree = React.useMemo(() => {
    return filterTree(computedTree, searchQuery);
  }, [computedTree, searchQuery]);

  // Recursive tree node renderer
  const renderTreeNode = (node: FolderTreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedFolderIds.has(node.id) || searchQuery.trim().length > 0;
    const isSelected = selectedFolderId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            onSelectFolder(node.id);
            setIsOpen(false);
          }}
          className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
            isSelected
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold"
              : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Expand / Collapse toggle or indent spacer */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="h-4 w-4 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors flex-shrink-0 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 flex-shrink-0" />
            )}

            {/* Folder Icon Renderer */}
            <FolderIconRenderer
              icon={node.icon}
              color={node.color}
              className="h-4 w-4 flex-shrink-0"
            />

            {/* Folder Name */}
            <span className="truncate text-xs">{node.name}</span>

            {/* Descendant count badge */}
            {node.bookmarkCount !== undefined && node.bookmarkCount > 0 && (
              <span className="text-[10px] text-muted-foreground ml-0.5 opacity-70">
                ({node.bookmarkCount})
              </span>
            )}
          </div>

          {/* Checkmark when selected */}
          {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
        </div>

        {/* Subfolders */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-input bg-background hover:bg-slate-50 dark:hover:bg-neutral-850 transition-all text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer shadow-xs ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "ring-2 ring-blue-500/40 border-blue-500" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedFolder ? (
            <>
              <div
                className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${selectedFolder.color || "#3b82f6"}20` }}
              >
                <FolderIconRenderer
                  icon={selectedFolder.icon}
                  color={selectedFolder.color}
                  className="h-3.5 w-3.5"
                />
              </div>
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {selectedFolder.name}
                </span>
                {selectedBreadcrumb && (
                  <span className="text-[10px] text-muted-foreground truncate opacity-75">
                    in {selectedBreadcrumb}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-base leading-none">📥</span>
              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                Unsorted (Inbox)
              </span>
            </>
          )}
        </div>

        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Flyout / Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col">
          {/* Search & Action Row */}
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-neutral-800 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1.5 text-xs rounded-md bg-slate-100 dark:bg-neutral-800 border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 rounded transition-colors"
                title="Expand All"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 rounded transition-colors"
                title="Collapse All"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Scrollable Tree View List */}
          <div className="overflow-y-auto space-y-0.5 max-h-60 pr-1">
            {/* Root Option: Unsorted (Inbox) */}
            <div
              onClick={() => {
                onSelectFolder("");
                setIsOpen(false);
              }}
              className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                !selectedFolderId
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">📥</span>
                <span className="font-medium text-xs">Unsorted (Inbox)</span>
              </div>
              {!selectedFolderId && (
                <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
            </div>

            {/* Folder Trees */}
            {displayTree.length > 0 ? (
              displayTree.map((node) => renderTreeNode(node, 0))
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No folders found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

