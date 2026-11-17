"use client";

import * as React from "react";
import { Folder, ChevronRight, ChevronDown, Check, Search, X, FolderTree, CornerDownRight } from "lucide-react";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder as FolderType } from "@/server/db/schema";

export interface UniversalFolderSelectProps {
  folders: FolderType[];
  value: string | null | undefined;
  onChange: (folderId: string | null) => void;
  allowRoot?: boolean;
  rootLabel?: string;
  excludeId?: string; // Exclude this folder and all its descendants (e.g. for parent selection)
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface TreeNode {
  folder: FolderType;
  children: TreeNode[];
  depth: number;
}

export function UniversalFolderSelect({
  folders,
  value,
  onChange,
  allowRoot = true,
  rootLabel = "None (Root / Unsorted / Inbox)",
  excludeId,
  placeholder = "Select a folder...",
  className = "",
  disabled = false,
}: UniversalFolderSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Record<string, boolean>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Compute excluded IDs (the folder itself and all its descendant IDs)
  const excludedIdsSet = React.useMemo(() => {
    const set = new Set<string>();
    if (!excludeId) return set;
    set.add(excludeId);

    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && set.has(f.parentId) && !set.has(f.id)) {
          set.add(f.id);
          changed = true;
        }
      }
    }
    return set;
  }, [folders, excludeId]);

  // Available folders after exclusion
  const availableFolders = React.useMemo(() => {
    return folders.filter((f) => !excludedIdsSet.has(f.id));
  }, [folders, excludedIdsSet]);

  // Selected folder object
  const selectedFolder = React.useMemo(() => {
    if (!value) return null;
    return availableFolders.find((f) => f.id === value) || null;
  }, [availableFolders, value]);

  // Build breadcrumb path for selected folder (e.g. "Core Hub / Frontend / React")
  const selectedBreadcrumbs = React.useMemo(() => {
    if (!selectedFolder) return null;
    const path: string[] = [selectedFolder.name];
    let curr = selectedFolder;
    while (curr.parentId) {
      const parent = availableFolders.find((f) => f.id === curr.parentId);
      if (parent) {
        path.unshift(parent.name);
        curr = parent;
      } else {
        break;
      }
    }
    return path;
  }, [selectedFolder, availableFolders]);

  // Build Hierarchical Tree structure
  const treeNodes = React.useMemo(() => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    availableFolders.forEach((f) => {
      map.set(f.id, { folder: f, children: [], depth: 0 });
    });

    availableFolders.forEach((f) => {
      const node = map.get(f.id)!;
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    function assignDepth(nodes: TreeNode[], depth: number) {
      nodes.forEach((n) => {
        n.depth = depth;
        assignDepth(n.children, depth + 1);
      });
    }
    assignDepth(roots, 0);

    return roots;
  }, [availableFolders]);

  // Auto-expand all ancestors of selected folder on mount or value change
  React.useEffect(() => {
    if (selectedFolder?.parentId) {
      setExpandedFolderIds((prev) => {
        const next = { ...prev };
        let curr = selectedFolder;
        while (curr.parentId) {
          next[curr.parentId] = true;
          const parent = availableFolders.find((f) => f.id === curr.parentId);
          if (parent) curr = parent;
          else break;
        }
        return next;
      });
    }
  }, [selectedFolder, availableFolders]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleSelect = (folderId: string | null) => {
    onChange(folderId);
    setIsOpen(false);
  };

  // Flattened filtered search list if search is active
  const searchResults = React.useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return availableFolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [search, availableFolders]);

  // Recursive tree renderer
  const renderTreeNodes = (nodes: TreeNode[]) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolderIds[node.folder.id] ?? true;
      const isSelected = value === node.folder.id;
      const hasChildren = node.children.length > 0;

      return (
        <div key={node.folder.id} className="select-none">
          <div
            onClick={() => handleSelect(node.folder.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group ${
              isSelected
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground hover:bg-secondary"
            }`}
            style={{ paddingLeft: `${Math.max(8, node.depth * 18 + 8)}px` }}
          >
            {/* Expand / Collapse toggle */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.folder.id, e)}
                className="h-4 w-4 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0 flex items-center justify-center text-muted-foreground/30">
                •
              </span>
            )}

            {/* Folder Icon with Custom Color */}
            <div
              className="h-5 w-5 rounded flex items-center justify-center shrink-0 border border-border/50"
              style={{
                backgroundColor: `${node.folder.color || "#3b82f6"}15`,
                borderColor: `${node.folder.color || "#3b82f6"}30`,
              }}
            >
              <FolderIconRenderer
                icon={node.folder.icon || "folder"}
                color={node.folder.color || "#3b82f6"}
                className="h-3 w-3"
              />
            </div>

            {/* Folder Name */}
            <span className="truncate flex-1 min-w-0">{node.folder.name}</span>

            {/* Checkmark indicator */}
            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-auto" />}
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="relative border-l border-border/40 ml-4 pl-1">
              {renderTreeNodes(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary/60 flex items-center justify-between gap-2 text-xs text-left cursor-pointer transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "ring-2 ring-primary/30 border-primary" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedFolder ? (
            <>
              <div
                className="h-5 w-5 rounded flex items-center justify-center shrink-0 border border-border/50"
                style={{
                  backgroundColor: `${selectedFolder.color || "#3b82f6"}18`,
                  borderColor: `${selectedFolder.color || "#3b82f6"}40`,
                }}
              >
                <FolderIconRenderer
                  icon={selectedFolder.icon || "folder"}
                  color={selectedFolder.color || "#3b82f6"}
                  className="h-3 w-3"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-foreground truncate block">
                  {selectedFolder.name}
                </span>
                {selectedBreadcrumbs && selectedBreadcrumbs.length > 1 && (
                  <span className="text-[10px] text-muted-foreground truncate block font-mono">
                    {selectedBreadcrumbs.slice(0, -1).join(" / ")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{allowRoot ? rootLabel : placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {/* Modern Hierarchical Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-2 max-h-80 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Quick Search Header */}
          <div className="relative flex items-center px-2 py-1 bg-secondary/80 rounded-lg border border-border/60">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders or subfolders..."
              className="w-full text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="h-4 w-4 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Tree or Search Results List */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-0.5 max-h-64">
            {/* Optional None / Root level item */}
            {allowRoot && !search && (
              <div
                onClick={() => handleSelect(null)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  !value
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">{rootLabel}</span>
                {!value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
            )}

            {/* Filtered Search Results */}
            {searchResults ? (
              searchResults.length > 0 ? (
                searchResults.map((f) => {
                  const isSel = value === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleSelect(f.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSel
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div
                        className="h-5 w-5 rounded flex items-center justify-center shrink-0 border border-border/50"
                        style={{
                          backgroundColor: `${f.color || "#3b82f6"}15`,
                          borderColor: `${f.color || "#3b82f6"}30`,
                        }}
                      >
                        <FolderIconRenderer
                          icon={f.icon || "folder"}
                          color={f.color || "#3b82f6"}
                          className="h-3 w-3"
                        />
                      </div>
                      <span className="truncate flex-1">{f.name}</span>
                      {isSel && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No matching folders found
                </div>
              )
            ) : (
              /* Hierarchical Tree */
              renderTreeNodes(treeNodes)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
