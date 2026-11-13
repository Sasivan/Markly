"use client";

import * as React from "react";
import { Folder as FolderIcon, X, Search, Check, FolderInput, Home, ChevronRight, ChevronDown } from "lucide-react";
import type { Folder, FolderTreeNode } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface MoveFolderModalProps {
  folder: FolderTreeNode | Folder | null;
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onMoveFolder: (folderId: string, newParentId: string | null) => Promise<void> | void;
}

export function MoveFolderModal({
  folder,
  isOpen,
  onClose,
  folders,
  folderTree,
  onMoveFolder,
}: MoveFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // Initialize selected parent whenever folder changes
  React.useEffect(() => {
    if (folder) {
      setSelectedParentId(folder.parentId || null);
      setSearchQuery("");
      // Expand all nodes by default
      const allIds = new Set<string>();
      const collectIds = (nodes: FolderTreeNode[]) => {
        for (const n of nodes) {
          allIds.add(n.id);
          if (n.children) collectIds(n.children);
        }
      };
      collectIds(folderTree);
      setExpandedIds(allIds);
    }
  }, [folder, folderTree, isOpen]);

  if (!isOpen || !folder) return null;

  // Collect all descendant IDs of the current folder so they cannot be selected (prevents cyclic graphs)
  const forbiddenIds = new Set<string>();
  forbiddenIds.add(folder.id);
  const markDescendants = (parentId: string) => {
    for (const f of folders) {
      if (f.parentId === parentId && !forbiddenIds.has(f.id)) {
        forbiddenIds.add(f.id);
        markDescendants(f.id);
      }
    }
  };
  markDescendants(folder.id);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!folder) return;
    if (selectedParentId === folder.parentId) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      await onMoveFolder(folder.id, selectedParentId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render tree node recursively
  const renderNode = (node: FolderTreeNode, depth: number = 0) => {
    const isForbidden = forbiddenIds.has(node.id);
    const isSelected = selectedParentId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.some((c) => !forbiddenIds.has(c.id));

    // Filter by search query if present
    if (
      searchQuery.trim() &&
      !node.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !node.children?.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ) {
      return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            if (!isForbidden) setSelectedParentId(node.id);
          }}
          style={{ paddingLeft: `${depth * 18 + 12}px` }}
          className={`flex items-center justify-between py-2 pr-3 rounded-lg text-xs cursor-pointer transition-colors ${
            isForbidden
              ? "opacity-35 cursor-not-allowed bg-muted/20 text-muted-foreground"
              : isSelected
              ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
              : "hover:bg-accent/70 text-foreground"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="h-4 w-4 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <FolderIconRenderer icon={node.icon} color={node.color} className="h-3.5 w-3.5" />
            <span className="truncate">{node.name}</span>
            {node.id === folder.id && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-mono">
                Current
              </span>
            )}
            {isForbidden && node.id !== folder.id && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                Subfolder
              </span>
            )}
          </div>

          {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 text-foreground animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FolderInput className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Move Folder</h3>
              <p className="text-xs text-muted-foreground">
                Select where to place <span className="font-medium text-foreground">"{folder.name}"</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search destination folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Target Options List */}
        <div className="mt-3 max-h-60 overflow-y-auto space-y-1 pr-1 border border-border rounded-xl p-2 bg-muted/20">
          {/* Root Level Option */}
          <div
            onClick={() => setSelectedParentId(null)}
            className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs cursor-pointer transition-colors ${
              selectedParentId === null
                ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                : "hover:bg-accent/70 text-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center">
                <Home className="h-3 w-3" />
              </div>
              <div>
                <span className="font-medium">🏠 Root Level</span>
                <span className="text-[10px] text-muted-foreground ml-2">(Top-level folder)</span>
              </div>
            </div>
            {selectedParentId === null && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
          </div>

          <div className="h-px bg-border my-1.5" />

          {/* Folder Hierarchy */}
          {folderTree.map((rootNode) => renderNode(rootNode, 0))}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? "Moving..." : "Move Folder"}
          </button>
        </div>
      </div>
    </div>
  );
}
