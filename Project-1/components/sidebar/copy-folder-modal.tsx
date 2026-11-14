"use client";

import * as React from "react";
import { Folder as FolderIcon, X, Search, Check, Copy, Home, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import type { Folder, FolderTreeNode } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CopyFolderModalProps {
  folder: FolderTreeNode | Folder | null;
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  folderTree: FolderTreeNode[];
  onCopyFolder: (folderId: string, targetParentId: string | null, customName?: string) => Promise<void> | void;
}

export function CopyFolderModal({
  folder,
  isOpen,
  onClose,
  folders,
  folderTree,
  onCopyFolder,
}: CopyFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(null);
  const [folderName, setFolderName] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (folder) {
      const pid = folder.parentId ?? (folder as any).parent_id ?? null;
      setSelectedParentId(pid);
      setFolderName(`${folder.name} (Copy)`);
      setSearchQuery("");
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

  // Forbidden IDs: cannot copy into self or its descendants
  const forbiddenIds = new Set<string>();
  forbiddenIds.add(folder.id);
  const markDescendants = (parentId: string) => {
    for (const f of folders) {
      const pid = f.parentId ?? (f as any).parent_id ?? null;
      if (pid === parentId && !forbiddenIds.has(f.id)) {
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
    setIsSubmitting(true);
    try {
      await onCopyFolder(folder.id, selectedParentId, folderName.trim() || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNode = (node: FolderTreeNode, depth: number = 0) => {
    const isForbidden = forbiddenIds.has(node.id);
    const isSelected = selectedParentId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.some((c) => !forbiddenIds.has(c.id));

    if (
      searchQuery.trim() &&
      !node.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !node.children?.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ) {
      return null;
    }

    return (
      <div key={node.id} className="flex flex-col">
        <button
          type="button"
          disabled={isForbidden}
          onClick={() => !isForbidden && setSelectedParentId(node.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ease-out text-left w-full ${
            isForbidden
              ? "opacity-35 cursor-not-allowed bg-muted/50"
              : isSelected
              ? "bg-accent text-accent-foreground border border-border"
              : "hover:bg-secondary text-foreground cursor-pointer"
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 20 + 12)}px` }}
        >
          {hasChildren ? (
            <span
              onClick={(e) => toggleExpand(node.id, e)}
              className="p-0.5 rounded hover:bg-muted cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>
          ) : (
            <span className="w-3.5" />
          )}

          <div
            className="h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${node.color}20` }}
          >
            <FolderIconRenderer icon={node.icon} color={node.color} className="h-3.5 w-3.5" />
          </div>

          <span className="truncate flex-1">{node.name}</span>

          {isForbidden && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
              Current
            </span>
          )}

          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
        </button>

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="flex flex-col">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-secondary text-foreground flex items-center justify-center">
              <Copy className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">Copy folder</h2>
              <p className="text-xs text-muted-foreground">
                Duplicate folder, subfolders, and bookmarks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Name input */}
        <div className="p-4 border-b border-border/60 bg-muted/30 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">New folder name</label>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="h-8 text-xs bg-background"
          />
        </div>

        {/* Search destination */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search destination folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-muted/40 border border-border"
            />
          </div>
        </div>

        {/* Destination tree list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedParentId(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ease-out text-left w-full cursor-pointer ${
              selectedParentId === null
                ? "bg-accent text-accent-foreground border border-border"
                : "hover:bg-secondary text-foreground"
            }`}
          >
            <div className="h-5 w-5 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
              <Home className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="truncate flex-1">Root collections (top level)</span>
            {selectedParentId === null && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </button>

          {/* Render folder tree */}
          {folderTree.map((node) => renderNode(node, 0))}
        </div>

        {/* Footer info & buttons */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Duplicates all nested items and tags
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting || !folderName.trim()}
              className="h-8 text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Copying...</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy folder</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

