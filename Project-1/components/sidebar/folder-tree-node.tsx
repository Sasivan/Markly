"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, MoreHorizontal, Plus, Edit2, Palette, Copy, Trash2, GripVertical, FolderInput } from "lucide-react";
import type { FolderTreeNode } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface FolderTreeNodeProps {
  node: FolderTreeNode;
  depth?: number;
  activeFolderId: string | null;
  forceExpanded?: boolean | null;
  onSelect: (folderId: string, isParent?: boolean) => void;
  onNewSubfolder: (parentId: string) => void;
  onAddBookmarkToFolder?: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onCustomize: (node: FolderTreeNode) => void;
  onDuplicate: (folderId: string) => void;
  onDelete: (node: FolderTreeNode) => void;
  onMove?: (node: FolderTreeNode) => void;
  onDropFolder: (draggedFolderId: string, targetFolderId: string, position: "inside" | "before" | "after") => void;
}

export function FolderTreeNodeComponent({
  node,
  depth = 0,
  activeFolderId,
  forceExpanded,
  onSelect,
  onNewSubfolder,
  onAddBookmarkToFolder,
  onRename,
  onCustomize,
  onDuplicate,
  onDelete,
  onMove,
  onDropFolder,
}: FolderTreeNodeProps) {
  const [expanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    if (forceExpanded !== undefined && forceExpanded !== null) {
      setExpanded(forceExpanded);
    }
  }, [forceExpanded]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(node.name);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dropIndicator, setDropIndicator] = React.useState<"inside" | "before" | "after" | null>(null);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const handleRenameSubmit = () => {
    if (editName.trim() && editName.trim() !== node.name) {
      onRename(node.id, editName.trim());
    } else {
      setEditName(node.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  // Drag and drop events using HTML5 DnD (lightweight, zero bundle friction)
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.setData("application/x-markly-folder", node.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) {
      setDropIndicator("before");
    } else if (y > height * 0.75) {
      setDropIndicator("after");
    } else {
      setDropIndicator("inside");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = dropIndicator || "inside";
    setDropIndicator(null);
    const draggedFolderId =
      e.dataTransfer.getData("application/x-markly-folder") || e.dataTransfer.getData("text/plain");
    if (!draggedFolderId || draggedFolderId === node.id) return;

    onDropFolder(draggedFolderId, node.id, pos);
  };

  const isActive = activeFolderId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-0.5 select-none">
      <div
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
        onClick={() => !isEditing && onSelect(node.id, hasChildren)}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`group relative flex items-center gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer transition-all text-xs ${
          isActive
            ? "bg-accent font-semibold text-foreground"
            : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
        } ${
          dropIndicator === "inside"
            ? "ring-2 ring-blue-500 bg-blue-500/15"
            : dropIndicator === "before"
            ? "border-t-2 border-blue-500"
            : dropIndicator === "after"
            ? "border-b-2 border-blue-500"
            : ""
        }`}
      >
        {/* Expand / Collapse Chevron */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={`h-4 w-4 rounded flex items-center justify-center hover:bg-muted text-muted-foreground transition-opacity ${
            hasChildren ? "opacity-100" : "opacity-0 group-hover:opacity-30 cursor-default"
          }`}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
        </button>

        {/* Folder Icon / Emoji */}
        <FolderIconRenderer icon={node.icon} className="h-3.5 w-3.5" color={node.color} />

        {/* Folder Name / Inline Editor */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-background border border-primary px-1.5 py-0.5 text-xs rounded text-foreground focus:outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="truncate flex-1 font-medium"
          >
            {node.name}
          </span>
        )}

        {/* Bookmark Count badge */}
        {!isEditing && (
          <span className="text-[10px] text-muted-foreground/70 opacity-60 group-hover:opacity-100 font-mono">
            {node.totalDescendantBookmarkCount}
          </span>
        )}

        {/* Action Menu Trigger (...) & Quick Add Bookmark */}
        {!isEditing && (
          <div className="flex items-center gap-0.5">
            {onAddBookmarkToFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBookmarkToFolder(node.id);
                }}
                title={`Add Bookmark to ${node.name}`}
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {/* Context Dropdown Menu - Solid high contrast, no glassy blur */}
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] p-1.5 shadow-2xl z-50 text-xs text-slate-900 dark:text-neutral-100 animate-in zoom-in-95 opacity-100"
                >
                  {onAddBookmarkToFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onAddBookmarkToFolder(node.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-left cursor-pointer transition-colors"
                    >
                      <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span>Add Bookmark Here</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNewSubfolder(node.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-left cursor-pointer transition-colors"
                  >
                    <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>New Subfolder</span>
                  </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsEditing(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-medium text-left cursor-pointer transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMove?.(node);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-left cursor-pointer transition-colors"
                >
                  <FolderInput className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Move Folder</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCustomize(node);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-800 dark:text-neutral-200 hover:text-amber-600 font-medium text-left cursor-pointer transition-colors"
                >
                  <Palette className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>Change Icon & Color</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate(node.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-medium text-left cursor-pointer transition-colors"
                >
                  <Copy className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span>Duplicate Folder</span>
                </button>

                <div className="h-px bg-slate-200 dark:bg-neutral-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(node);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium text-left cursor-pointer transition-colors"
                >
                  <Trash2 className="h-4 w-4 flex-shrink-0" />
                  <span>Delete Folder</span>
                </button>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Nested Subfolders Render */}
      {hasChildren && expanded && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <FolderTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
              forceExpanded={forceExpanded}
              onSelect={onSelect}
              onNewSubfolder={onNewSubfolder}
              onAddBookmarkToFolder={onAddBookmarkToFolder}
              onRename={onRename}
              onCustomize={onCustomize}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onMove={onMove}
              onDropFolder={onDropFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

