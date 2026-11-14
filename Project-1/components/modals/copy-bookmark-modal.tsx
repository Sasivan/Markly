"use client";

import * as React from "react";
import { Folder as FolderIcon, X, Search, Check, Copy, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import type { BookmarkWithDetails, Folder, FolderTreeNode } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CopyBookmarkModalProps {
  bookmark: BookmarkWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onSuccess?: () => void;
}

export function CopyBookmarkModal({
  bookmark,
  isOpen,
  onClose,
  folders,
  onSuccess,
}: CopyBookmarkModalProps) {
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // Build hierarchical folder tree
  const folderTree = React.useMemo(() => {
    const map = new Map<string, FolderTreeNode>();
    folders.forEach((f) => {
      map.set(f.id, { ...f, children: [], bookmarkCount: 0, totalDescendantBookmarkCount: 0 });
    });

    const roots: FolderTreeNode[] = [];
    folders.forEach((f) => {
      const node = map.get(f.id)!;
      const pid = f.parentId ?? (f as any).parent_id ?? null;
      if (pid && map.has(pid)) {
        map.get(pid)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [folders]);

  React.useEffect(() => {
    if (bookmark) {
      setSelectedFolderId(bookmark.folderId || null);
      setTitle(`${bookmark.title} (Copy)`);
      setSearchQuery("");
      const allIds = new Set<string>();
      const collect = (nodes: FolderTreeNode[]) => {
        for (const n of nodes) {
          allIds.add(n.id);
          if (n.children) collect(n.children);
        }
      };
      collect(folderTree);
      setExpandedIds(allIds);
    }
  }, [bookmark, folderTree, isOpen]);

  if (!isOpen || !bookmark) return null;

  const handleCopy = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFolderId: selectedFolderId,
          customTitle: title.trim() || `${bookmark.title} (Copy)`,
        }),
      });

      if (!res.ok) throw new Error("Copy bookmark failed");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error("Copy bookmark error:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFolderItem = (node: FolderTreeNode, depth: number = 0): React.ReactNode => {
    const matchesSearch =
      !searchQuery.trim() ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedFolderId === node.id;

    return (
      <div key={node.id} className="relative">
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs group transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary font-medium border border-primary/20"
              : "hover:bg-secondary text-foreground"
          } ${depth > 0 ? "border-l border-border ml-2.5" : ""}`}
          style={{ paddingLeft: `${Math.max(8, depth * 14)}px` }}
          onClick={() => setSelectedFolderId(node.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(node.id)) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  });
                }}
                className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <div
              className="h-5 w-5 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${node.color || "#3b82f6"}20` }}
            >
              <FolderIconRenderer icon={node.icon} color={node.color} className="h-3.5 w-3.5" />
            </div>

            <span className="truncate text-xs">{node.name}</span>
          </div>

          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((c) => renderFolderItem(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-card border border-border shadow-lg p-5 flex flex-col space-y-4 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-secondary text-primary flex items-center justify-center">
              <Copy className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Copy Site to Folder</h2>
              <p className="text-xs text-muted-foreground truncate max-w-70">
                {bookmark.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Copy Title Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Copy Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bookmark copy title"
            className="text-xs h-8"
          />
        </div>

        {/* Destination Folder Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Select Destination Folder
          </label>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search destination folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto rounded-md border border-border p-1.5 space-y-0.5">
            {/* Unsorted Option */}
            <div
              onClick={() => setSelectedFolderId(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                selectedFolderId === null
                  ? "bg-primary/10 text-primary font-medium border border-primary/20"
                  : "hover:bg-secondary text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderIconRenderer icon="inbox" className="h-4 w-4" />
                <span>Unsorted (Inbox)</span>
              </div>
              {selectedFolderId === null && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>

            <div className="h-px bg-border/60 my-1" />

            {/* Folder Hierarchy */}
            {folderTree.map((root) => renderFolderItem(root, 0))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-8 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            disabled={isSubmitting}
            className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>Copy Bookmark</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
