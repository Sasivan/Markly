"use client";

import * as React from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Plus,
  Folder as FolderIcon,
  Globe,
  Sparkles,
  Search,
  Download,
  ArrowRight,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder, BookmarkWithDetails } from "@/server/db/schema";

export interface SharedFolderRecord {
  folderId: string;
  name: string;
  icon: string;
  color: string;
  url: string;
  count: number;
  sharedAt: string;
}

interface SharedLinksViewProps {
  folders: Folder[];
  bookmarks: BookmarkWithDetails[];
  onOpenShareModal: (folder: Folder) => void;
  onRefreshData: () => void;
  onSelectFolder?: (folderId: string) => void;
}

export function SharedLinksView({
  folders,
  bookmarks,
  onOpenShareModal,
  onRefreshData,
  onSelectFolder,
}: SharedLinksViewProps) {
  const [sharedList, setSharedList] = React.useState<SharedFolderRecord[]>([]);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [importUrl, setImportUrl] = React.useState("");
  const [importStatus, setImportStatus] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [selectedFolderToShare, setSelectedFolderToShare] = React.useState<string>("");

  // Load shared folders from localStorage
  const loadSharedRecords = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("markly_shared_folders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSharedList(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load markly_shared_folders", e);
    }
    setSharedList([]);
  }, []);

  React.useEffect(() => {
    loadSharedRecords();
    const handleUpdate = () => loadSharedRecords();
    window.addEventListener("markly-shared-updated", handleUpdate);
    return () => window.removeEventListener("markly-shared-updated", handleUpdate);
  }, [loadSharedRecords]);

  // Unshare action
  const handleUnshare = (folderId: string) => {
    try {
      const updated = sharedList.filter((s) => s.folderId !== folderId);
      setSharedList(updated);
      localStorage.setItem("markly_shared_folders", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("markly-shared-updated"));
    } catch (e) {
      console.error("Failed to unshare folder", e);
    }
  };

  // Copy share URL
  const handleCopyLink = async (record: SharedFolderRecord) => {
    try {
      await navigator.clipboard.writeText(record.url);
      setCopiedId(record.folderId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("Failed to copy link", e);
    }
  };

  // Quick Share Picker
  const handleTriggerShare = () => {
    if (!selectedFolderToShare) return;
    const folder = folders.find((f) => f.id === selectedFolderToShare);
    if (folder) {
      onOpenShareModal(folder);
      setSelectedFolderToShare("");
    }
  };

  // Import shared collection URL into local workspace
  const handleImportSharedUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsImporting(true);
    setImportStatus(null);

    try {
      const urlObj = new URL(importUrl.trim());
      const dataParam = urlObj.searchParams.get("data");
      if (!dataParam) {
        setImportStatus("Invalid share link: no collection payload found in URL.");
        setIsImporting(false);
        return;
      }

      const decoded = decodeURIComponent(escape(atob(dataParam)));
      const parsed = JSON.parse(decoded) as {
        name: string;
        icon?: string;
        color?: string;
        items: Array<{ title: string; url: string; domain?: string; description?: string; tags?: string[] }>;
      };

      if (!parsed.name || !Array.isArray(parsed.items)) {
        setImportStatus("Invalid share payload structure.");
        setIsImporting(false);
        return;
      }

      // Create target folder
      const folderRes = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${parsed.name} (Imported)`,
          icon: parsed.icon || "Folder",
          color: parsed.color || "#2563eb",
        }),
      });
      const folderData = await folderRes.json();
      const newFolderId = folderData?.folder?.id || null;

      // Import bookmarks
      let importedCount = 0;
      for (const item of parsed.items) {
        try {
          await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.title,
              url: item.url,
              folderId: newFolderId,
              description: item.description || "",
              tags: item.tags || [],
            }),
          });
          importedCount++;
        } catch {
          // continue
        }
      }

      setImportStatus(`Success! Imported folder "${parsed.name}" with ${importedCount} links into your workspace.`);
      setImportUrl("");
      onRefreshData();
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
    } catch (err: any) {
      setImportStatus(`Failed to import: ${err?.message || "Invalid URL format"}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered shared records
  const filteredRecords = React.useMemo(() => {
    if (!searchQuery.trim()) return sharedList;
    const q = searchQuery.toLowerCase();
    return sharedList.filter(
      (s) => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
    );
  }, [sharedList, searchQuery]);

  const totalExposedLinks = React.useMemo(() => {
    return sharedList.reduce((acc, s) => acc + (s.count || 0), 0);
  }, [sharedList]);

  const shareableFolders = React.useMemo(() => {
    return folders.filter((f) => f.id !== "__UNSORTED__" && !f.id.startsWith("fld_unsorted_"));
  }, [folders]);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Share2 className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Shared Collections & Sites
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            View, inspect, preview, and revoke all public share links generated for your folders.
          </p>
        </div>

        {/* Quick Share Folder Trigger */}
        <div className="flex items-center gap-2">
          <select
            value={selectedFolderToShare}
            onChange={(e) => setSelectedFolderToShare(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select folder to share...</option>
            {shareableFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedFolderToShare}
            onClick={handleTriggerShare}
            className="h-8 px-3 text-xs bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Generate Share Link</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Active Shared Collections</span>
            <div className="text-2xl font-bold font-mono text-foreground">{sharedList.length}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Share2 className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Total Bookmarks Exposed</span>
            <div className="text-2xl font-bold font-mono text-foreground">{totalExposedLinks}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Public Status</span>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Public Live Links Active</span>
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Radio className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Import Shared Link Box */}
      <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Import a Shared Collection from Another User
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Paste any Markly /share/... URL
          </span>
        </div>

        <form onSubmit={handleImportSharedUrl} className="flex items-center gap-2">
          <input
            type="text"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://markly.app/share/folder-id?data=..."
            className="flex-1 h-8 px-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!importUrl.trim() || isImporting}
            className="h-8 px-3 text-xs bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{isImporting ? "Importing..." : "Import Collection"}</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </form>

        {importStatus && (
          <div className={`p-2.5 rounded-lg text-xs font-medium ${
            importStatus.startsWith("Success")
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          }`}>
            {importStatus}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter shared collections..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          {filteredRecords.length} of {sharedList.length} shared items
        </span>
      </div>

      {/* Shared Collections Grid */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/50 space-y-3">
          <div className="h-10 w-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {sharedList.length === 0 ? "No Shared Collections Yet" : "No Matching Collections"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {sharedList.length === 0
                ? "Select any folder from the top dropdown to generate a public share link that others can view or clone."
                : `No shared folders match "${searchQuery}".`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((item) => {
            const isCopied = copiedId === item.folderId;
            return (
              <div
                key={item.folderId}
                className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top Row: Folder Info & Unshare */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderIconRenderer
                        icon={item.icon || "📁"}
                        color={item.color || "#2563eb"}
                        className="h-8 w-8 flex-shrink-0"
                      />
                      <div className="truncate">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <span>{item.count} links</span>
                          <span>•</span>
                          <span>
                            {item.sharedAt
                              ? new Date(item.sharedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnshare(item.folderId)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
                      title="Unshare (Revoke public access)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Unshare</span>
                    </Button>
                  </div>

                  {/* Share Link Preview Box */}
                  <div className="p-2 rounded-lg bg-secondary/50 border border-border flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="truncate text-muted-foreground text-[11px] select-all">
                      {item.url}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(item)}
                      className="h-6 px-2 text-[11px] flex-shrink-0 flex items-center gap-1 cursor-pointer bg-card"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-emerald-500 font-sans">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="font-sans">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                  {onSelectFolder && (
                    <button
                      type="button"
                      onClick={() => onSelectFolder(item.folderId)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center gap-1 font-medium"
                    >
                      <FolderIcon className="h-3 w-3" />
                      <span>View in Workspace</span>
                    </button>
                  )}

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-medium ml-auto"
                  >
                    <span>Open Public View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

