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
  Globe,
} from "lucide-react";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder, FolderTreeNode } from "@/server/db/schema";

export interface FolderTreeSelectProps {
  folders: Folder[];
  folderTree?: FolderTreeNode[];
  selectedFolderId?: string | null;
  value?: string | null;
  onSelectFolder?: (folderId: string) => void;
  onChange?: (folderId: string | null) => void;
  allowAll?: boolean;
  allLabel?: string;
  allowUnsorted?: boolean;
  unsortedLabel?: string;
  allowRoot?: boolean;
  rootLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FolderTreeSelect({
  folders,
  folderTree,
  selectedFolderId,
  value,
  onSelectFolder,
  onChange,
  allowAll = false,
  allLabel = "All Folders (Full Library)",
  allowUnsorted,
  unsortedLabel,
  allowRoot,
  rootLabel,
  placeholder = "Select a folder...",
  disabled = false,
  className = "",
}: FolderTreeSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string>>(new Set());
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Normalize effective value
  const effectiveId = value !== undefined ? value : selectedFolderId;
  const showUnsorted = allowUnsorted ?? allowRoot ?? true;
  const effectiveUnsortedLabel = unsortedLabel || rootLabel || "Unsorted (Inbox)";

  const handleSelect = (id: string | null) => {
    onSelectFolder?.(id || "");
    onChange?.(id);
    setIsOpen(false);
  };

  // Build tree if folderTree not provided (guarantee Unsorted is never duplicated in tree)
  const computedTree = React.useMemo(() => {
    const cleanFolders = folders.filter((f) => f.id !== "__UNSORTED__" && !f.id.startsWith("fld_unsorted_"));
    if (folderTree && folderTree.length > 0) {
      return folderTree.filter((f) => f.id !== "__UNSORTED__" && !f.id.startsWith("fld_unsorted_"));
    }

    const map = new Map<string, FolderTreeNode>();
    cleanFolders.forEach((f) => {
      map.set(f.id, {
        ...f,
        children: [],
        bookmarkCount: 0,
        totalDescendantBookmarkCount: 0,
      });
    });

    const roots: FolderTreeNode[] = [];
    cleanFolders.forEach((f) => {
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
    if (!effectiveId || effectiveId === "all" || effectiveId === "__UNSORTED__" || effectiveId.startsWith("fld_unsorted_")) return null;
    return folders.find((f) => f.id === effectiveId) || null;
  }, [folders, effectiveId]);

  const unsortedFolder = React.useMemo(() => {
    return folders.find((f) => f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_")) || null;
  }, [folders]);

  const isAllSelected = Boolean(allowAll && (effectiveId === null || effectiveId === "all" || effectiveId === ""));
  const isUnsortedSelected = Boolean(
    !isAllSelected && (
      !effectiveId ||
      effectiveId === "__UNSORTED__" ||
      effectiveId.startsWith("fld_unsorted_") ||
      (selectedFolder && (selectedFolder.id === "__UNSORTED__" || selectedFolder.id.startsWith("fld_unsorted_")))
    )
  );

  const selectedBreadcrumb = React.useMemo(() => {
    const pId = selectedFolder?.parentId ?? (selectedFolder as any)?.parent_id;
    if (!selectedFolder || !pId) return null;
    const parentNames: string[] = [];
    const visited = new Set<string>();
    let currentParentId: string | null = pId;
    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parent = folders.find((f) => f.id === currentParentId);
      if (parent) {
        parentNames.unshift(parent.name);
        currentParentId = parent.parentId ?? (parent as any).parent_id ?? null;
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
    const isSelected = effectiveId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => handleSelect(node.id)}
          className={`group flex items-center justify-between gap-1.5 rounded-sm px-2 py-1.5 cursor-pointer transition-colors text-xs ${
            isSelected
              ? "bg-primary/15 text-primary font-semibold"
              : "hover:bg-accent text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Expand / Collapse toggle or indent spacer */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="h-4 w-4 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
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
              <span className="text-xs font-mono text-muted-foreground ml-0.5 opacity-70">
                ({node.bookmarkCount})
              </span>
            )}
          </div>

          {/* Checkmark when selected */}
          {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
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
        className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong focus:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "ring-1 ring-ring border-primary" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isAllSelected ? (
            <>
              <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Globe className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-foreground truncate">
                {allLabel}
              </span>
            </>
          ) : !isUnsortedSelected && selectedFolder ? (
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
                <span className="font-medium text-foreground truncate">
                  {selectedFolder.name}
                </span>
                {selectedBreadcrumb && (
                  <span className="text-xs font-mono text-muted-foreground truncate opacity-75">
                    in {selectedBreadcrumb}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div
                className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${(unsortedFolder?.color || "#8b5cf6")}20` }}
              >
                <FolderIconRenderer
                  icon={unsortedFolder?.icon || "inbox"}
                  color={unsortedFolder?.color || "#8b5cf6"}
                  className="h-3.5 w-3.5"
                />
              </div>
              <span className="font-medium text-foreground truncate">
                {effectiveUnsortedLabel}
              </span>
            </>
          )}
        </div>

        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Flyout / Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 flex max-h-80 w-full min-w-[280px] max-w-[90vw] flex-col gap-2 overflow-hidden mk-menu sm:min-w-[320px]">
          {/* Search & Action Row */}
          <div className="flex items-center gap-1.5 pb-1 border-b border-border/60 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="px-1.5 py-0.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-colors"
                title="Expand All"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-1.5 py-0.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-colors"
                title="Collapse All"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Scrollable Tree View List */}
          <div className="overflow-y-auto overflow-x-hidden space-y-0.5 max-h-60 pr-1">
            {/* Optional: All Folders */}
            {allowAll && (
              <div
                onClick={() => handleSelect(null)}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                  isAllSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-xs">{allLabel}</span>
                </div>
                {isAllSelected && (
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </div>
            )}

            {/* Root Option: Unsorted (Inbox) */}
            {showUnsorted && (
              <div
                onClick={() => handleSelect(unsortedFolder ? unsortedFolder.id : "")}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                  isUnsortedSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderIconRenderer
                    icon={unsortedFolder?.icon || "inbox"}
                    color={unsortedFolder?.color || "#8b5cf6"}
                    className="h-4 w-4 flex-shrink-0"
                  />
                  <span className="font-medium text-xs">{effectiveUnsortedLabel}</span>
                </div>
                {isUnsortedSelected && (
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </div>
            )}

            {/* Folder Trees */}
            {displayTree.length > 0 ? (
              displayTree.map((node) => renderTreeNode(node, 0))
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground font-mono">
                No folders found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
