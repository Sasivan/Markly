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

  // 1. Identify Duplicate Bookmarks
  const duplicateGroups = React.useMemo(() => {
    const map = new Map<string, BookmarkWithDetails[]>();
    for (const b of bookmarks) {
      if (b.isArchived) continue;
      const key = normalizeUrl(b.url);
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
  }, [bookmarks]);

  const totalDuplicateCount = React.useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + (g.items.length - 1), 0);
  }, [duplicateGroups]);

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
      // If folder has subfolders or has bookmarks, it's not empty
      if (parentIds.has(f.id)) return false;
      if (foldersWithBookmarks.has(f.id)) return false;
      return true;
    });
  }, [folders, bookmarks]);

  const totalIssuesCount = totalDuplicateCount + brokenLinks.length + emptyFolders.length;

  // Actions
  const handleMergeDuplicates = async () => {
    if (duplicateGroups.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const idsToDelete: string[] = [];
      for (const group of duplicateGroups) {
        // Keep the one with highest visits or oldest
        const sorted = [...group.items].sort((a, b) => {
          const vDiff = (b.visitCount || 0) - (a.visitCount || 0);
          if (vDiff !== 0) return vDiff;
          return a.createdAt - b.createdAt;
        });
        const toDelete = sorted.slice(1).map((b) => b.id);
        idsToDelete.push(...toDelete);
      }

      if (idsToDelete.length > 0) {
        await fetch("/api/bookmarks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids: idsToDelete }),
        });
      }

      setSuccessMessage(`Merged ${totalDuplicateCount} duplicate bookmarks.`);
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
            <div className="space-y-3">
              {duplicateGroups.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Zero duplicate bookmarks found in your library.
                </div>
              ) : (
                duplicateGroups.map((group) => (
                  <div key={group.key} className="p-3 rounded-lg border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-sm">
                        {group.key}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {group.items.length} copies
                      </Badge>
                    </div>
                    <div className="space-y-1 pl-2 border-l-2 border-primary/40">
                      {group.items.map((b, idx) => (
                        <div key={b.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className="truncate max-w-md font-medium text-foreground">
                            {idx === 0 ? "(Keep) " : "(Duplicate) "}
                            {b.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {b.folderName || "Unsorted"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
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
