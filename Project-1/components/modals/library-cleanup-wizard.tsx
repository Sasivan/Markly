"use client";

import * as React from "react";
import {
  Sparkles,
  Copy,
  Trash2,
  FolderX,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Folder as FolderIcon,
  Check,
  ExternalLink,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";
import type { BookmarkWithDetails, Folder as FolderType } from "@/server/db/schema";

interface LibraryCleanupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  onRefreshData: () => void;
}

function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
    ];
    trackingParams.forEach((p) => u.searchParams.delete(p));
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}${u.search ? u.search : ""}`.toLowerCase();
  } catch {
    return urlStr.trim().toLowerCase();
  }
}

export function LibraryCleanupWizard({
  open,
  onOpenChange,
  bookmarks,
  folders,
  onRefreshData,
}: LibraryCleanupWizardProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "duplicates" | "broken" | "empty_folders">("all");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Advanced Duplicate Cleanup Configuration State
  const [duplicateScopeFolderId, setDuplicateScopeFolderId] = React.useState<string>("all");
  const [duplicateMatchType, setDuplicateMatchType] = React.useState<"exact" | "strip_query" | "domain_title">("exact");
  const [preserveStrategy, setPreserveStrategy] = React.useState<"most_visited" | "oldest" | "newest" | "starred">("most_visited");
  const [destinationFolderId, setDestinationFolderId] = React.useState<string>("keep_original");
  const [selectedGroupKeys, setSelectedGroupKeys] = React.useState<Set<string>>(new Set());
  const [customSurvivorMap, setCustomSurvivorMap] = React.useState<Map<string, string>>(new Map());

  // 1. Identify Duplicate Bookmarks (respecting selected folder scope)
  const duplicateGroups = React.useMemo(() => {
    const map = new Map<string, BookmarkWithDetails[]>();
    for (const b of bookmarks) {
      if (b.isArchived) continue;
      if (duplicateScopeFolderId !== "all") {
        if (duplicateScopeFolderId === "unsorted") {
          if (b.folderId) continue;
        } else if (b.folderId !== duplicateScopeFolderId) {
          continue;
        }
      }
      let key = normalizeUrl(b.url);
      if (duplicateMatchType === "strip_query") {
        try {
          const parsed = new URL(key);
          parsed.search = "";
          parsed.hash = "";
          key = parsed.toString().replace(/\/+$/, "");
        } catch {}
      } else if (duplicateMatchType === "domain_title") {
        const cleanTitle = (b.title || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        key = `${(b.domain || "").toLowerCase()}::${cleanTitle}`;
      }
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(b);
    }

    const groups: Array<{ key: string; items: BookmarkWithDetails[] }> = [];
    for (const [key, items] of map.entries()) {
      if (items.length > 1) {
        groups.push({ key, items });
      }
    }
    return groups;
  }, [bookmarks, duplicateScopeFolderId, duplicateMatchType]);

  // Keep all groups selected initially whenever scope/groups change
  React.useEffect(() => {
    setSelectedGroupKeys(new Set(duplicateGroups.map((g) => g.key)));
  }, [duplicateGroups]);

  // Survivor resolution helper
  const getSurvivor = React.useCallback(
    (group: { key: string; items: BookmarkWithDetails[] }) => {
      const customId = customSurvivorMap.get(group.key);
      if (customId) {
        const found = group.items.find((b) => b.id === customId);
        if (found) return found;
      }

      const sorted = [...group.items].sort((a, b) => {
        if (preserveStrategy === "starred") {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
        }
        if (preserveStrategy === "newest") {
          return b.createdAt - a.createdAt;
        }
        if (preserveStrategy === "oldest") {
          return a.createdAt - b.createdAt;
        }
        // Default: most visited
        const vDiff = (b.visitCount || 0) - (a.visitCount || 0);
        if (vDiff !== 0) return vDiff;
        return a.createdAt - b.createdAt;
      });

      return sorted[0];
    },
    [customSurvivorMap, preserveStrategy]
  );

  const totalDuplicateCount = React.useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + (g.items.length - 1), 0);
  }, [duplicateGroups]);

  const selectedDuplicatesCount = React.useMemo(() => {
    return duplicateGroups
      .filter((g) => selectedGroupKeys.has(g.key))
      .reduce((acc, g) => acc + (g.items.length - 1), 0);
  }, [duplicateGroups, selectedGroupKeys]);

  // 2. Identify Dead / Broken Links
  const brokenLinks = React.useMemo(() => {
    return bookmarks.filter((b) => b.status === "dead" && !b.isArchived);
  }, [bookmarks]);

  // 3. Identify Empty Folders
  const emptyFolders = React.useMemo(() => {
    const parentIds = new Set(folders.map((f) => f.parentId).filter(Boolean));
    const foldersWithBookmarks = new Set(bookmarks.map((b) => b.folderId).filter(Boolean));

    return folders.filter((f) => {
      if (f.id === "__UNSORTED__" || f.id.startsWith("fld_unsorted_")) return false;
      if (parentIds.has(f.id)) return false;
      if (foldersWithBookmarks.has(f.id)) return false;
      return true;
    });
  }, [folders, bookmarks]);

  const totalIssuesCount = totalDuplicateCount + brokenLinks.length + emptyFolders.length;

  // Toggle selection for group
  const handleToggleGroup = (key: string) => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllGroups = () => {
    setSelectedGroupKeys(new Set(duplicateGroups.map((g) => g.key)));
  };

  const handleDeselectAllGroups = () => {
    setSelectedGroupKeys(new Set());
  };

  const handleSetCustomSurvivor = (groupKey: string, bookmarkId: string) => {
    setCustomSurvivorMap((prev) => {
      const next = new Map(prev);
      next.set(groupKey, bookmarkId);
      return next;
    });
  };

  // Actions
  const handleMergeDuplicates = async () => {
    const activeGroups = duplicateGroups.filter((g) => selectedGroupKeys.has(g.key));
    if (activeGroups.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const idsToDelete: string[] = [];
      const idsToMove: string[] = [];

      for (const group of activeGroups) {
        const survivor = getSurvivor(group);
        const toDelete = group.items.filter((b) => b.id !== survivor.id).map((b) => b.id);
        idsToDelete.push(...toDelete);

        if (destinationFolderId !== "keep_original") {
          idsToMove.push(survivor.id);
        }
      }

      if (idsToDelete.length > 0) {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids: idsToDelete }),
        });
      }

      if (idsToMove.length > 0) {
        const targetFolder = destinationFolderId === "unsorted" ? null : destinationFolderId;
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "move", ids: idsToMove, folderId: targetFolder }),
        });
      }

      setSuccessMessage(`Merged ${idsToDelete.length} duplicates across ${activeGroups.length} URLs.`);
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Failed to merge duplicates:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanBrokenLinks = async () => {
    if (brokenLinks.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const ids = brokenLinks.map((b) => b.id);
      await fetch("/api/bookmarks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      setSuccessMessage(`Moved ${brokenLinks.length} broken links to Recycle Bin.`);
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Failed to clean broken links:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeEmptyFolders = async () => {
    if (emptyFolders.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      for (const folder of emptyFolders) {
        await fetch(`/api/folders/${folder.id}?mode=delete_all`, {
          method: "DELETE",
        });
      }
      setSuccessMessage(`Purged ${emptyFolders.length} empty folders.`);
      onRefreshData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }
    } catch (err) {
      console.error("Failed to purge empty folders:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanAll = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      await handleMergeDuplicates();
      await handleCleanBrokenLinks();
      await handlePurgeEmptyFolders();
      setSuccessMessage(`Library hygiene complete! Cleaned ${totalIssuesCount} items.`);
    } catch (err) {
      console.error("Failed full cleanup:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 gap-5">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Library Cleanup Wizard</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Automated hygiene scan: detect duplicate URLs, broken links, and empty folders.
                </DialogDescription>
              </div>
            </div>
            {totalIssuesCount > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                {totalIssuesCount} issues detected
              </Badge>
            )}
          </div>
        </DialogHeader>

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Issue Category Filters */}
        <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("duplicates")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === "duplicates"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span>Duplicates</span>
            <span className="font-mono text-[11px] px-1 rounded-full bg-muted text-foreground">
              {totalDuplicateCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("broken")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === "broken"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span>Broken Links</span>
            <span className="font-mono text-[11px] px-1 rounded-full bg-muted text-foreground">
              {brokenLinks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("empty_folders")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === "empty_folders"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span>Empty Folders</span>
            <span className="font-mono text-[11px] px-1 rounded-full bg-muted text-foreground">
              {emptyFolders.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs min-h-60">
          {activeTab === "all" && (
            <div className="space-y-3">
              {totalIssuesCount === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <Check className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Your Library is Spotless</h4>
                    <p className="text-muted-foreground text-xs mt-1">
                      No duplicates, broken links, or empty folders found.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Duplicates Card */}
                  <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                        <Copy className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {totalDuplicateCount} Redundant Duplicates
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Across {duplicateGroups.length} distinct URLs
                        </div>
                      </div>
                    </div>
                    {totalDuplicateCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleMergeDuplicates}
                        className="text-xs h-8"
                      >
                        Merge Duplicates
                      </Button>
                    )}
                  </div>

                  {/* Broken Links Card */}
                  <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {brokenLinks.length} Broken / Unreachable Links
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Identified via automated health scan
                        </div>
                      </div>
                    </div>
                    {brokenLinks.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleCleanBrokenLinks}
                        className="text-xs h-8 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Trash Broken Links
                      </Button>
                    )}
                  </div>

                  {/* Empty Folders Card */}
                  <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                        <FolderX className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {emptyFolders.length} Empty Folders
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Folders containing 0 bookmarks and 0 subfolders
                        </div>
                      </div>
                    </div>
                    {emptyFolders.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handlePurgeEmptyFolders}
                        className="text-xs h-8"
                      >
                        Purge Empty Folders
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "duplicates" && (
            <div className="space-y-4">
              {/* Duplicate Configuration Bar */}
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  <span>Duplicate Cleanup Strategy & Scope</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* Scope Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium block">
                      Target Scope
                    </label>
                    <UniversalFolderSelect
                      folders={folders}
                      value={duplicateScopeFolderId === "all" ? null : duplicateScopeFolderId === "unsorted" ? "__UNSORTED__" : duplicateScopeFolderId}
                      onChange={(id) => {
                        if (!id || id === "__ALL__") setDuplicateScopeFolderId("all");
                        else if (id === "__UNSORTED__" || id.startsWith("fld_unsorted_")) setDuplicateScopeFolderId("unsorted");
                        else setDuplicateScopeFolderId(id);
                      }}
                      allowAll={true}
                      allLabel="Entire Workspace Library"
                      allowUnsorted={true}
                      unsortedLabel="Inbox / Unsorted Only"
                      placeholder="Select target scope..."
                    />
                  </div>

                  {/* Matching Algorithm */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium block">
                      Match Criteria
                    </label>
                    <select
                      value={duplicateMatchType}
                      onChange={(e) => setDuplicateMatchType(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="exact">Exact Normalized URL</option>
                      <option value="strip_query">Ignore Query Params (?utm...)</option>
                      <option value="domain_title">Same Domain + Title</option>
                    </select>
                  </div>

                  {/* Preservation Strategy */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium block">
                      Preserve Survivor Rule
                    </label>
                    <select
                      value={preserveStrategy}
                      onChange={(e) => setPreserveStrategy(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="most_visited">Keep Most Visited (Clicks)</option>
                      <option value="oldest">Keep Oldest (Original Bookmark)</option>
                      <option value="newest">Keep Newest (Latest Added)</option>
                      <option value="starred">Keep Starred / Favorites First</option>
                    </select>
                  </div>

                  {/* Move Destination */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium block">
                      Survivor Destination
                    </label>
                    <UniversalFolderSelect
                      folders={folders}
                      value={destinationFolderId === "keep_original" ? null : destinationFolderId === "unsorted" ? "__UNSORTED__" : destinationFolderId}
                      onChange={(id) => {
                        if (!id || id === "__ROOT__") setDestinationFolderId("keep_original");
                        else if (id === "__UNSORTED__" || id.startsWith("fld_unsorted_")) setDestinationFolderId("unsorted");
                        else setDestinationFolderId(id);
                      }}
                      allowRoot={true}
                      rootLabel="Keep in Original Folder"
                      allowUnsorted={true}
                      unsortedLabel="Move to Inbox / Unsorted"
                      placeholder="Survivor destination..."
                    />
                  </div>
                </div>
              </div>

              {/* Group Action Controls */}
              {duplicateGroups.length > 0 && (
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllGroups}
                      className="text-primary hover:underline font-medium text-[11px] cursor-pointer"
                    >
                      Select All ({duplicateGroups.length})
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllGroups}
                      className="text-muted-foreground hover:text-foreground text-[11px] cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px] font-mono">
                      {selectedDuplicatesCount} duplicates selected
                    </span>
                    <Button
                      size="sm"
                      disabled={isProcessing || selectedDuplicatesCount === 0}
                      onClick={handleMergeDuplicates}
                      className="h-7 px-2.5 text-xs bg-primary text-primary-foreground cursor-pointer shadow-xs"
                    >
                      <span>Merge Selected ({selectedDuplicatesCount})</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Duplicate Groups List */}
              {duplicateGroups.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Zero duplicate bookmarks found in the selected scope.
                </div>
              ) : (
                duplicateGroups.map((group) => {
                  const survivor = getSurvivor(group);
                  const isChecked = selectedGroupKeys.has(group.key);

                  return (
                    <div
                      key={group.key}
                      className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
                        isChecked ? "border-border bg-card" : "border-border/40 bg-card/40 opacity-70"
                      }`}
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleGroup(group.key)}
                            className="rounded border-border text-primary focus:ring-0 cursor-pointer h-3.5 w-3.5"
                          />
                          <span className="font-mono text-xs text-foreground font-medium truncate max-w-sm sm:max-w-md">
                            {group.key}
                          </span>
                        </label>
                        <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                          {group.items.length} copies
                        </Badge>
                      </div>

                      {/* Group Copies */}
                      <div className="space-y-1.5 pl-5 border-l-2 border-border/80">
                        {group.items.map((b) => {
                          const isSurvivor = b.id === survivor.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => handleSetCustomSurvivor(group.key, b.id)}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                                isSurvivor
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-foreground font-medium"
                                  : "bg-secondary/40 border-transparent hover:border-border text-muted-foreground"
                              }`}
                              title={isSurvivor ? "Survivor (Will be kept)" : "Duplicate (Click to keep this one instead)"}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                                <Badge
                                  variant={isSurvivor ? "default" : "outline"}
                                  className={`text-[10px] font-mono uppercase px-1.5 py-0 ${
                                    isSurvivor
                                      ? "bg-emerald-600 text-white"
                                      : "border-muted-foreground/30 text-muted-foreground"
                                  }`}
                                >
                                  {isSurvivor ? "Keep" : "Delete"}
                                </Badge>
                                <span className="truncate">{b.title || b.url}</span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground shrink-0">
                                <span>{b.folderName || "Unsorted"}</span>
                                <span>•</span>
                                <span>{b.visitCount || 0} visits</span>
                                {b.isFavorite && (
                                  <span className="text-amber-500 font-bold">★</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "broken" && (
            <div className="space-y-2">
              {brokenLinks.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Zero broken links detected in your library.
                </div>
              ) : (
                brokenLinks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                  >
                    <div className="truncate min-w-0 flex-1 mr-3">
                      <div className="font-medium text-foreground truncate">{b.title}</div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">{b.url}</div>
                    </div>
                    <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                      Dead
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "empty_folders" && (
            <div className="space-y-2">
              {emptyFolders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Zero empty folders found. All folders contain bookmarks or subfolders.
                </div>
              ) : (
                emptyFolders.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground truncate">{f.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">0 items</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>

          {totalIssuesCount > 0 && (
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleCleanAll}
              className="text-xs bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isProcessing ? "Cleaning Library..." : `1-Click Clean All (${totalIssuesCount} Issues)`}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

