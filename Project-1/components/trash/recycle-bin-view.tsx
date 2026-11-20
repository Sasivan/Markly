"use client";

import * as React from "react";
import {
  Trash2,
  RotateCcw,
  Clock,
  AlertTriangle,
  Folder as FolderIcon,
  Globe,
  Search,
  Check,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { useAuth } from "@/components/auth/auth-context";

interface RecycleBinItem {
  id: string;
  userId: string;
  itemType: "folder" | "bookmark";
  itemId: string;
  title: string;
  originalFolderId: string | null;
  originalFolderName: string | null;
  icon: string | null;
  color: string | null;
  itemData: string;
  deletedAt: number;
  retentionDays: number;
  expiresInDays: number;
  expiresInHours: number;
}

interface RecycleBinViewProps {
  onRefreshWorkspace: () => void;
  onNavigateView: (view: any) => void;
}

function getExpirationInfo(deletedAt: number, currentRetention: number) {
  if (currentRetention === 0) {
    return {
      label: "Never expires",
      isExpiringSoon: false,
    };
  }
  const totalMs = currentRetention * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - (deletedAt || Date.now());
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  if (currentRetention === 1 || remainingDays <= 1) {
    return {
      label: `Expires in ${remainingHours}h`,
      isExpiringSoon: true,
    };
  }
  return {
    label: `Expires in ${remainingDays}d`,
    isExpiringSoon: false,
  };
}

export function RecycleBinView({ onRefreshWorkspace, onNavigateView }: RecycleBinViewProps) {
  const { user } = useAuth();
  const [items, setItems] = React.useState<RecycleBinItem[]>([]);
  const [retentionDays, setRetentionDays] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_recycle_bin_retention");
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if ([0, 1, 7, 15, 30].includes(parsed)) return parsed;
        }
      } catch {}
    }
    return 30;
  });
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"all" | "folder" | "bookmark">("all");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [emptying, setEmptying] = React.useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = React.useState(false);
  const [notice, setNotice] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedFolderId, setExpandedFolderId] = React.useState<string | null>(null);

  const getEffectiveUserId = React.useCallback(() => {
    return user?.id || null;
  }, [user?.id]);

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await fetch("/api/recycle-bin");
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        if (typeof window !== "undefined") {
          const userKey = user ? `markly_recycle_bin_retention_${user.id}` : null;
          const stored = userKey ? localStorage.getItem(userKey) || localStorage.getItem("markly_recycle_bin_retention") : localStorage.getItem("markly_recycle_bin_retention");
          if (stored !== null) {
            const parsed = parseInt(stored, 10);
            if ([0, 1, 7, 15, 30].includes(parsed)) {
              setRetentionDays(parsed);
              return;
            }
          }
        }
        if (data.retentionDays !== undefined) {
          setRetentionDays(data.retentionDays);
          try {
            localStorage.setItem("markly_recycle_bin_retention", String(data.retentionDays));
          } catch {}
        }
      }
    } catch (e) {
      console.error("Fetch recycle bin error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchItems();

    // Listen for real-time deletions anywhere in workspace while this page is open!
    const handleUpdate = () => {
      fetchItems();
    };

    window.addEventListener("markly-recycle-bin-updated", handleUpdate);
    return () => {
      window.removeEventListener("markly-recycle-bin-updated", handleUpdate);
    };
  }, [fetchItems]);

  const handleUpdateRetention = async (days: number) => {
    try {
      setRetentionDays(days);

      // Real-time recalculation of expiration for all items in state upon clicking
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (days === 0) {
            return {
              ...item,
              retentionDays: 0,
              expiresInDays: 9999,
              expiresInHours: 99999,
            };
          }
          const ageMs = Date.now() - (item.deletedAt || Date.now());
          const totalMs = days * 24 * 60 * 60 * 1000;
          const remainingMs = Math.max(0, totalMs - ageMs);
          const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
          const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
          return {
            ...item,
            retentionDays: days,
            expiresInDays: remainingDays,
            expiresInHours: remainingHours,
          };
        })
      );

      if (typeof window !== "undefined") {
        try {
          if (user?.id) {
            localStorage.setItem(`markly_recycle_bin_retention_${user.id}`, String(days));
          }
          localStorage.setItem("markly_recycle_bin_retention", String(days));
        } catch {}
      }
      try {
        await fetch("/api/recycle-bin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retentionDays: days }),
        });
      } catch {}
      const label = days === 0 ? "∞ Permanent (Never automatically deleted)" : `${days} day${days > 1 ? "s" : ""}`;
      setNotice({ text: `Retention setting saved permanently: ${label}.`, type: "success" });
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setNotice({ text: "Failed to update retention policy.", type: "error" });
    }
  };

  const handleRestore = async (item: RecycleBinItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/recycle-bin/${item.id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setNotice({
          text: `Restored "${item.title}" successfully.`,
          type: "success",
        });
        onRefreshWorkspace();
        setTimeout(() => setNotice(null), 3500);
      } else {
        setNotice({ text: data.error || "Failed to restore item.", type: "error" });
      }
    } catch (err: any) {
      setNotice({ text: err.message || "Failed to restore item.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (item: RecycleBinItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/recycle-bin/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setNotice({
          text: `Permanently deleted "${item.title}".`,
          type: "success",
        });
        setTimeout(() => setNotice(null), 3000);
      }
    } catch (err: any) {
      setNotice({ text: err.message || "Failed to delete item.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEmptyRecycleBin = async () => {
    setEmptying(true);
    try {
      const res = await fetch("/api/recycle-bin", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems([]);
        setShowEmptyConfirm(false);
        setNotice({ text: "Recycle bin emptied permanently.", type: "success" });
        setTimeout(() => setNotice(null), 3000);
      }
    } catch (err: any) {
      setNotice({ text: err.message || "Failed to empty recycle bin.", type: "error" });
    } finally {
      setEmptying(false);
    }
  };

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeTab === "all" || item.itemType === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesTab && matchesSearch;
    });
  }, [items, activeTab, searchQuery]);

  const folderCount = items.filter((i) => i.itemType === "folder").length;
  const bookmarkCount = items.filter((i) => i.itemType === "bookmark").length;

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto mk-scroll bg-background">
      {/* Sticky page header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="mk-eyebrow flex items-center gap-2 text-rose-600/80 dark:text-rose-400/80">
              <Trash2 className="h-3 w-3" />
              <span>Deleted items</span>
              <span className="h-1 w-1 rounded-full bg-border-strong" aria-hidden="true" />
              <span className="font-mono text-2xs normal-case tracking-normal text-muted-foreground">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">Recycle bin</h1>
            <p className="mk-lede">
              Inspect or restore deleted folders and sites, or let the retention policy purge them.
            </p>
          </div>

          {/* Retention Options & Empty Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Retention Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-card border border-border text-xs">
              <span className="text-xs font-mono text-muted-foreground px-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Save for:</span>
              </span>
              {[1, 7, 15, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleUpdateRetention(days)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-mono font-medium cursor-pointer transition-colors ${
                    retentionDays === days
                      ? "bg-rose-600 text-white font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {days}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleUpdateRetention(0)}
                title="Select permanent retention so items are never automatically purged"
                className={`px-2.5 py-1 rounded-sm text-xs font-mono font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                  retentionDays === 0
                    ? "bg-emerald-600 text-white font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span>∞ Permanent</span>
              </button>
            </div>

            {/* Empty Recycle Bin Button */}
            {items.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEmptyConfirm(true)}
                className="h-8 px-3 text-xs font-medium cursor-pointer flex items-center gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors shrink-0 rounded-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Empty Bin</span>
              </Button>
            )}
          </div>
        </div>

        {/* Global Notice Toast */}
        {notice && (
          <div className="max-w-5xl mx-auto mt-3">
            <div
              className={`p-2.5 rounded-md border text-xs flex items-center gap-2 ${
                notice.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-mono"
              }`}
            >
              {notice.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <span>{notice.text}</span>
            </div>
          </div>
        )}

        {/* Empty Bin Confirmation Modal */}
        {showEmptyConfirm && (
          <div className="max-w-5xl mx-auto mt-3 p-3.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Permanently empty Recycle Bin?</span>
            </div>
            <p className="text-muted-foreground text-xs">
              This will permanently delete all {items.length} items from your database. This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="destructive"
                disabled={emptying}
                onClick={handleEmptyRecycleBin}
                className="h-7 px-3 text-xs font-medium cursor-pointer"
              >
                {emptying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, Empty Permanently"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEmptyConfirm(false)}
                className="h-7 px-3 text-xs cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full px-6 py-6 space-y-4">
        {/* Controls: Search & Separate Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted border border-border w-fit text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-card text-foreground shadow-surface font-medium border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("folder")}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "folder"
                  ? "bg-card text-foreground shadow-surface font-medium border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Folders ({folderCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bookmark")}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "bookmark"
                  ? "bg-card text-foreground shadow-surface font-medium border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Websites ({bookmarkCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search deleted items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8.5 rounded-xl bg-card border-border text-foreground"
            />
          </div>
        </div>

        {/* Loading Skullet Smart Skeleton States */}
        {loading ? (
          <div className="space-y-3" skullet-loading="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                data-skullet-bar=""
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3.5 shadow-surface"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="max-w-sm flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 py-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
              <Trash2 className="h-7 w-7 stroke-1 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base text-foreground">Recycle Bin is empty</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Whenever you delete a folder or website, it stays safely protected here {retentionDays === 0 ? "permanently" : `for ${retentionDays} days`} and can be restored back anytime.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateView("all")}
              className="mt-4 text-xs font-semibold cursor-pointer border-border"
            >
              Browse All Bookmarks
            </Button>
          </div>
        ) : (
          /* Items List with PC-Style Folder Inspection */
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              const isFolder = item.itemType === "folder";
              const isOperating = actionLoadingId === item.id;
              let parsedData: any = {};
              try {
                parsedData = JSON.parse(item.itemData);
              } catch {}

              const isExpiringSoon = item.expiresInDays <= 1;
              const insideBookmarks: any[] = isFolder && Array.isArray(parsedData.bookmarks) ? parsedData.bookmarks : [];
              const isExpanded = expandedFolderId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-md border border-border bg-card hover:border-border/80 transition-colors text-xs overflow-hidden"
                >
                  {/* Folder / Item Main Bar */}
                  <div className="flex items-center justify-between gap-3 p-3.5">
                    <div
                      className={`flex items-center gap-3 min-w-0 flex-1 ${isFolder ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (isFolder) {
                          setExpandedFolderId(isExpanded ? null : item.id);
                        }
                      }}
                    >
                      {/* Item Icon */}
                      <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                        {isFolder ? (
                          <FolderIconRenderer icon={item.icon} color={item.color || "#3b82f6"} className="h-4 w-4" />
                        ) : (
                          <BookmarkIcon
                            src={parsedData.iconUrl || item.icon}
                            domain={parsedData.domain || ""}
                            alt={item.title}
                            className="h-4 w-4 rounded-sm object-contain flex-shrink-0"
                          />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate text-xs sm:text-sm">
                            {item.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs font-mono px-1.5 py-0 font-medium"
                          >
                            {isFolder ? "Folder" : "Website"}
                          </Badge>
                          {isFolder && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono px-1.5 py-0 border-border text-muted-foreground flex items-center gap-1"
                            >
                              <span>{insideBookmarks.length} site{insideBookmarks.length !== 1 ? "s" : ""}</span>
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground mt-0.5">
                          {isFolder ? (
                            <span>Click to {isExpanded ? "collapse" : "view contained sites"}</span>
                          ) : (
                            <span className="truncate max-w-xs">{parsedData.url || "No link"}</span>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Deleted {new Date(item.deletedAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expiration Countdown & Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Dynamic Expiration Badge */}
                      {(() => {
                        const { label, isExpiringSoon: expiringSoon } = getExpirationInfo(item.deletedAt, retentionDays);
                        return (
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono px-2 py-0.5 border rounded-sm ${
                              expiringSoon
                                ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                : retentionDays === 0
                                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                : "border-border text-muted-foreground bg-secondary"
                            }`}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{label}</span>
                          </Badge>
                        );
                      })()}

                      {/* Restore Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isOperating}
                        onClick={() => handleRestore(item)}
                        className="h-8 px-2.5 text-xs font-medium cursor-pointer border border-border bg-card hover:bg-secondary text-foreground flex items-center gap-1 transition-colors rounded-md"
                        title={isFolder ? "Restore Folder and all contained websites" : "Restore website"}
                      >
                        {isOperating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        <span>Restore{isFolder ? " All" : ""}</span>
                      </Button>

                      {/* Delete Permanently Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isOperating}
                        onClick={() => handlePermanentDelete(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-md"
                        title="Delete permanently right now"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* PC Folder Drill-Down */}
                  {isFolder && isExpanded && (
                    <div className="border-t border-border/60 bg-secondary/30 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pb-1 border-b border-border/40">
                        <span>Websites inside this deleted folder ({insideBookmarks.length})</span>
                        <span>Restoring the folder restores all these sites</span>
                      </div>

                      {insideBookmarks.length === 0 ? (
                        <p className="text-xs font-mono text-muted-foreground py-2 italic">
                          This folder had no bookmarks when deleted.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {insideBookmarks.map((bm: any) => (
                            <div
                              key={bm.id}
                              className="flex items-center justify-between gap-2.5 p-2 rounded-md bg-card border border-border/60 hover:border-border transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <BookmarkIcon
                                  src={bm.icon_url || bm.iconUrl}
                                  domain={bm.domain || ""}
                                  alt={bm.title}
                                  className="h-4 w-4 rounded-sm object-contain flex-shrink-0"
                                />
                                <span className="font-medium text-foreground truncate max-w-sm">
                                  {bm.title}
                                </span>
                                <span className="text-xs font-mono text-muted-foreground truncate hidden sm:inline">
                                  {bm.domain}
                                </span>
                              </div>

                              <a
                                href={bm.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground p-1 flex items-center gap-1 text-xs"
                                title="Open URL in new tab"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
