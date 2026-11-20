"use client";

import * as React from "react";
import {
  FolderTree,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Pin,
  FolderPlus,
  BookmarkPlus,
  Check,
  Globe,
  Inbox,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardWidgetBox } from "@/components/home/dashboard-widget-box";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { saveUniversalPreset } from "@/components/presets/universal-preset-hub";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BookmarkWithDetails, Folder as FolderType, FolderTreeNode } from "@/server/db/schema";
import type { WidgetColSpan } from "@/components/home/home-layout-modal";

export interface FolderTreeStudioBoxProps {
  id?: string;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  initialColSpan?: WidgetColSpan;
  rowSpan?: 1 | 2;
  onColSpanChange?: (span: WidgetColSpan) => void;
  onRowSpanChange?: (span: 1 | 2) => void;
  onDeleteWidget?: () => void;
  onSelectFolder?: (folderId: string | null) => void;
  onPinHome?: (visual: {
    id: string;
    title: string;
    kind: "tree_studio";
    treeConfig?: any;
  }) => void;
  onAddToFolder?: (visual: {
    id: string;
    title: string;
    kind: "tree_studio";
    treeConfig?: any;
  }) => void;
}

export function FolderTreeStudioBox({
  id = "studio_folder_tree",
  bookmarks,
  folders,
  initialColSpan = 12,
  rowSpan = 2,
  onColSpanChange,
  onRowSpanChange,
  onDeleteWidget,
  onSelectFolder,
  onPinHome,
  onAddToFolder,
}: FolderTreeStudioBoxProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string>>(() => {
    return new Set(folders.map((f) => f.id));
  });
  const [accentColor, setAccentColor] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`markly_tree_box_color_${id}`) || "#4c7a63";
    }
    return "#4c7a63";
  });
  const [boxIcon, setBoxIcon] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`markly_tree_box_icon_${id}`) || "folder-tree";
    }
    return "folder-tree";
  });

  // Target Placement Dialog State
  const [placementModalOpen, setPlacementModalOpen] = React.useState(false);
  const [targetFolderId, setTargetFolderId] = React.useState<string>("");
  const [placementSuccess, setPlacementSuccess] = React.useState(false);

  // Compute hierarchical folder tree with accurate bookmark counts
  const folderTree = React.useMemo(() => {
    const countsMap = new Map<string, number>();
    bookmarks.forEach((b) => {
      const fid = b.folderId || "__UNSORTED__";
      countsMap.set(fid, (countsMap.get(fid) || 0) + 1);
    });

    const nodeMap = new Map<string, FolderTreeNode>();
    folders.forEach((f) => {
      nodeMap.set(f.id, {
        ...f,
        children: [],
        bookmarkCount: countsMap.get(f.id) || 0,
        totalDescendantBookmarkCount: countsMap.get(f.id) || 0,
      });
    });

    const roots: FolderTreeNode[] = [];
    folders.forEach((f) => {
      const node = nodeMap.get(f.id);
      if (!node) return;
      if (f.parentId && nodeMap.has(f.parentId)) {
        nodeMap.get(f.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    function computeDescendants(n: FolderTreeNode): number {
      let sum = n.bookmarkCount;
      if (n.children && n.children.length > 0) {
        for (const child of n.children) {
          sum += computeDescendants(child);
        }
      }
      n.totalDescendantBookmarkCount = sum;
      return sum;
    }
    roots.forEach(computeDescendants);

    return roots;
  }, [folders, bookmarks]);

  // Filter tree nodes if search query is active
  const filterTree = (nodes: FolderTreeNode[], query: string): FolderTreeNode[] => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase().trim();

    const matches = (n: FolderTreeNode): boolean => {
      const matchSelf = n.name.toLowerCase().includes(q);
      const childMatch = n.children?.some(matches);
      return matchSelf || Boolean(childMatch);
    };

    return nodes.filter(matches).map((n) => ({
      ...n,
      children: filterTree(n.children || [], query),
    }));
  };

  const displayTree = React.useMemo(() => {
    return filterTree(folderTree, searchQuery);
  }, [folderTree, searchQuery]);

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

  const expandAll = () => {
    setExpandedFolderIds(new Set(folders.map((f) => f.id)));
  };

  const collapseAll = () => {
    setExpandedFolderIds(new Set());
  };

  const handleFolderClick = (fldId: string) => {
    if (onSelectFolder) {
      onSelectFolder(fldId);
    } else {
      window.dispatchEvent(
        new CustomEvent("markly-select-folder", { detail: { folderId: fldId } })
      );
    }
  };

  const handlePinThisBoxToHome = () => {
    if (onPinHome) {
      onPinHome({
        id: `tree_${Date.now()}`,
        title: "Folder Hierarchy & Collections Tree",
        kind: "tree_studio",
      });
      return;
    }
    try {
      const raw = localStorage.getItem("markly_home_widgets");
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      const newId = `custom:tree_${Date.now()}`;
      list.unshift({
        id: newId,
        label: "Folder Hierarchy & Collections Tree",
        visible: true,
        kind: "studio",
        category: "tree_studio",
        colSpan: initialColSpan,
        rowSpan: rowSpan,
      });
      localStorage.setItem("markly_home_widgets", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      window.dispatchEvent(new CustomEvent("markly-home-widgets-updated"));
      setPlacementSuccess(true);
      setTimeout(() => setPlacementSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAsPreset = () => {
    saveUniversalPreset({
      id: `preset_box_tree_${Date.now()}`,
      name: "Folder Hierarchy Tree Box",
      description: `Universal resizable collections tree (${folders.length} collections)`,
      category: "box",
      tabRef: "T1",
      data: {
        id,
        title: "Folder Hierarchy & Collections Tree",
        category: "tree_studio",
        kind: "tree_studio",
        colSpan: initialColSpan,
        rowSpan: rowSpan,
      },
    });
    setPlacementSuccess(true);
    setTimeout(() => setPlacementSuccess(false), 2000);
  };

  const handleAddToFolderTabs = () => {
    if (!targetFolderId) return;
    if (onAddToFolder) {
      onAddToFolder({
        id: `tree_${Date.now()}`,
        title: "Folder Hierarchy & Collections Tree",
        kind: "tree_studio",
      });
      setPlacementModalOpen(false);
      return;
    }
    try {
      const storageKey = `markly_folder_tabs_${targetFolderId}`;
      const raw = localStorage.getItem(storageKey);
      let tabs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tabs) || tabs.length === 0) {
        tabs = [{ id: "tab_default", label: "Overview", visuals: [] }];
      }
      tabs[0].visuals = tabs[0].visuals || [];
      tabs[0].visuals.unshift({
        id: `tree_${Date.now()}`,
        title: "Folder Hierarchy & Collections Tree",
        kind: "tree_studio",
        colSpan: initialColSpan,
        rowSpan: rowSpan,
      });
      localStorage.setItem(storageKey, JSON.stringify(tabs));
      window.dispatchEvent(new CustomEvent("markly-folder-tabs-updated", { detail: { folderId: targetFolderId, tabs, scope: "custom" } }));
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      setPlacementModalOpen(false);
      setPlacementSuccess(true);
      setTimeout(() => setPlacementSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: FolderTreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedFolderIds.has(node.id) || searchQuery.trim().length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => handleFolderClick(node.id)}
          className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary/70 text-foreground cursor-pointer transition-colors text-xs border border-transparent hover:border-border/60"
          style={{ paddingLeft: `${depth * 18 + 10}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="h-4 w-4 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
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

            <FolderIconRenderer
              icon={node.icon}
              color={node.color || accentColor}
              className="h-4 w-4 flex-shrink-0"
            />

            <span className="truncate font-medium text-xs text-foreground group-hover:text-primary transition-colors">
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-secondary text-primary font-semibold border border-border/50">
              {node.bookmarkCount || 0} sites
            </span>
            {hasChildren && (
              <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                {node.children.length} sub
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardWidgetBox
      id={id}
      title="Folder Hierarchy & Collections Tree"
      icon={<FolderTree className="h-4 w-4" style={{ color: accentColor }} />}
      badgeText={`${folders.length} COLLECTIONS`}
      initialColSpan={initialColSpan}
      onColSpanChange={onColSpanChange}
      rowSpan={rowSpan}
      onRowSpanChange={onRowSpanChange}
      onDeleteWidget={onDeleteWidget}
      minHeight={320}
      extraHeaderAction={
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePinThisBoxToHome}
            title="Pin to Dashboard Home"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-amber-500 cursor-pointer gap-1"
          >
            <Pin className="h-3 w-3" />
            <span className="hidden sm:inline text-3xs">Pin Home</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPlacementModalOpen(true)}
            title="Add to a Folder Tab"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer gap-1"
          >
            <FolderPlus className="h-3 w-3" />
            <span className="hidden sm:inline text-3xs">To Tab</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleSaveAsPreset}
            title="Save as Preset Box"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer gap-1"
          >
            <BookmarkPlus className="h-3 w-3" />
            <span className="hidden sm:inline text-3xs">Preset</span>
          </Button>
        </div>
      }
    >
      <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2.5 overflow-hidden">
        {/* Feedback toast */}
        {placementSuccess && (
          <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-medium flex items-center gap-1.5 mk-fade-in">
            <Check className="h-3.5 w-3.5" />
            <span>Folder Tree Box placed successfully!</span>
          </div>
        )}

        {/* Toolbar: Search, Expand/Collapse, and Appearance Pickers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-secondary/30 rounded-xl border border-border text-xs flex-shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search folders & collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-6 py-1 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-2 py-1 text-2xs font-mono text-muted-foreground hover:text-foreground bg-background hover:bg-secondary rounded-md border border-border transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2 py-1 text-2xs font-mono text-muted-foreground hover:text-foreground bg-background hover:bg-secondary rounded-md border border-border transition-colors cursor-pointer"
            >
              Collapse
            </button>
            <div className="h-4 w-[1px] bg-border mx-0.5" />
            <UniversalColorPicker
              color={accentColor}
              onChange={(c) => {
                setAccentColor(c);
                try {
                  localStorage.setItem(`markly_tree_box_color_${id}`, c);
                } catch {}
              }}
              compact={true}
              contextKey={`tree_box_color_${id}`}
            />
            <UniversalIconPicker
              icon={boxIcon}
              color={accentColor}
              onChange={(i) => {
                setBoxIcon(i);
                try {
                  localStorage.setItem(`markly_tree_box_icon_${id}`, i);
                } catch {}
              }}
              compact={true}
              contextKey={`tree_box_icon_${id}`}
            />
          </div>
        </div>

        {/* Hierarchical Tree Body */}
        <div className="flex-1 min-h-[220px] overflow-y-auto space-y-0.5 rounded-xl border border-border/80 bg-background/50 p-2 mk-scroll">
          {displayTree.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-xs text-muted-foreground gap-1.5">
              <FolderTree className="h-8 w-8 text-muted-foreground/40" />
              <span>No collections match your search filter</span>
            </div>
          ) : (
            displayTree.map((root) => renderTreeNode(root, 0))
          )}
        </div>
      </div>

      {/* Placement Modal Dialog */}
      <Dialog open={placementModalOpen} onOpenChange={setPlacementModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FolderPlus className="h-4 w-4 text-primary" />
              <span>Place Folder Tree into Target Collection</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select which folder tab should house this resizable Folder Tree box.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="mk-eyebrow block mb-1">
                Target Folder
              </label>
              <UniversalFolderSelect
                folders={folders}
                value={targetFolderId}
                onChange={(id) => setTargetFolderId(id || "")}
                allowRoot={false}
                placeholder="Select a folder..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPlacementModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!targetFolderId}
              onClick={handleAddToFolderTabs}
              className="text-xs cursor-pointer gap-1"
            >
              <Check className="h-3 w-3" />
              <span>Confirm & Place Box</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardWidgetBox>
  );
}
