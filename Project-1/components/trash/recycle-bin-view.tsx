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
        if (data.retentionDays !== undefined) {
          const stored = typeof window !== "undefined" ? localStorage.getItem("markly_recycle_bin_retention") : null;
          if (stored === null) {
            setRetentionDays(data.retentionDays);
            try {
              localStorage.setItem("markly_recycle_bin_retention", String(data.retentionDays));
            } catch {}
          } else {
            setRetentionDays(parseInt(stored, 10));
          }
        }
      }
    } catch (e) {
      console.error("Fetch recycle bin error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("markly_recycle_bin_retention", String(days));
        } catch {}
      }
      const res = await fetch("/api/recycle-bin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: days }),
      });
      const data = await res.json();
      const label = days === 0 ? "Permanent (Never auto-purged)" : `${days} day${days > 1 ? "s" : ""}`;
      setNotice({ text: `Retention policy permanently selected: ${label}.`, type: "success" });
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
      {/* Sticky Header Banner */}
      <div className="border-b border-border bg-slate-50/80 dark:bg-[#161616]/90 backdrop-blur-md px-6 py-5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-sm border border-rose-500/20">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Recycle Bin</h1>
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                PC-style Trash: deleted folders and websites can be inspected, restored in 0ms, or auto-purged based on retention policy.
              </p>
            </div>
          </div>

          {/* Retention Options & Empty Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Retention Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card dark:bg-[#1a1a1a] border border-border text-xs shadow-2xs">
              <span className="text-[11px] font-medium text-muted-foreground px-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Save for:</span>
              </span>
              {[1, 7, 15, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleUpdateRetention(days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    retentionDays === days
                      ? "bg-rose-500 text-white shadow-xs scale-102"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {days}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleUpdateRetention(0)}
                title="Select permanent retention so items are never automatically purged"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                  retentionDays === 0
                    ? "bg-emerald-600 text-white shadow-xs scale-102 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                className="h-8.5 px-3.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
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
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
                notice.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              {notice.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <span>{notice.text}</span>
            </div>
          </div>
        )}

        {/* Empty Bin Confirmation Modal */}
        {showEmptyConfirm && (
          <div className="max-w-5xl mx-auto mt-3 p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/40 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 text-sm">
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
                className="h-7.5 px-3 text-xs font-semibold cursor-pointer"
              >
                {emptying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, Empty Permanently"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEmptyConfirm(false)}
                className="h-7.5 px-3 text-xs cursor-pointer"
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
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] border border-border/50 w-fit text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-[#2a2a2a] text-foreground shadow-2xs font-bold border border-black/5 dark:border-white/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("folder")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "folder"
                  ? "bg-white dark:bg-[#2a2a2a] text-foreground shadow-2xs font-bold border border-black/5 dark:border-white/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderIcon className="h-3.5 w-3.5 text-blue-500" />
              <span>Folders ({folderCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bookmark")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "bookmark"
                  ? "bg-white dark:bg-[#2a2a2a] text-foreground shadow-2xs font-bold border border-black/5 dark:border-white/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
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
              className="pl-8 text-xs h-8.5 rounded-xl bg-white dark:bg-[#1e1e1e] border-border text-foreground"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
            <span>Loading Recycle Bin...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="py-20 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center p-8 bg-card/40 dark:bg-[#161616]/40">
            <div className="h-14 w-14 rounded-2xl bg-muted/60 dark:bg-[#222] text-muted-foreground flex items-center justify-center mb-3">
              <Trash2 className="h-7 w-7 stroke-1 text-slate-400 dark:text-neutral-500" />
            </div>
            <h3 className="font-bold text-base text-foreground">Recycle Bin is empty</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Whenever you delete a folder or website, it stays safely protected here {retentionDays === 0 ? "permanently" : `for ${retentionDays} days`} and can be restored back anytime.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateView("all")}
              className="mt-4 text-xs font-semibold cursor-pointer border-border dark:border-neutral-750"
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
                  className="rounded-xl border border-border bg-card dark:bg-[#181818] hover:border-slate-300 dark:hover:border-neutral-700 transition-all text-xs overflow-hidden shadow-2xs"
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
                      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#252525] flex items-center justify-center flex-shrink-0 border border-black/5 dark:border-white/5">
                        {isFolder ? (
                          <FolderIconRenderer icon={item.icon} color={item.color || "#3b82f6"} className="h-5 w-5" />
                        ) : (
                          <BookmarkIcon
                            src={parsedData.iconUrl || item.icon}
                            domain={parsedData.domain || ""}
                            alt={item.title}
                            className="h-5 w-5 rounded object-contain flex-shrink-0"
                          />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground truncate text-xs sm:text-sm">
                            {item.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-medium"
                          >
                            {isFolder ? "Folder" : "Website"}
                          </Badge>
                          {isFolder && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 flex items-center gap-1"
                            >
                              <span>{insideBookmarks.length} site{insideBookmarks.length !== 1 ? "s" : ""}</span>
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
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
                      {/* Expiration Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 border ${
                          isExpiringSoon
                            ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10"
                            : "border-slate-200 dark:border-neutral-800 text-muted-foreground bg-slate-50 dark:bg-neutral-850/40"
                        }`}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {item.expiresInDays <= 0
                          ? `Expires in ${item.expiresInHours}h`
                          : `Expires in ${item.expiresInDays}d`}
                      </Badge>

                      {/* Restore Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isOperating}
                        onClick={() => handleRestore(item)}
                        className="h-8 px-3 text-xs font-semibold cursor-pointer border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 hover:border-blue-500 flex items-center gap-1 shadow-2xs"
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
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-lg"
                        title="Delete permanently right now"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* PC Folder Drill-Down: Contained Website Rows */}
                  {isFolder && isExpanded && (
                    <div className="border-t border-border/70 bg-slate-50/60 dark:bg-[#141414] px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground pb-1 border-b border-border/40">
                        <span>Websites inside this deleted folder ({insideBookmarks.length})</span>
                        <span className="text-[10px]">Restoring the folder restores all these sites</span>
                      </div>

                      {insideBookmarks.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground py-2 italic">
                          This folder had no bookmarks when deleted.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {insideBookmarks.map((bm: any) => (
                            <div
                              key={bm.id}
                              className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-white dark:bg-[#1d1d1d] border border-border/60 hover:border-border transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <BookmarkIcon
                                  src={bm.icon_url || bm.iconUrl}
                                  domain={bm.domain || ""}
                                  alt={bm.title}
                                  className="h-4 w-4 rounded object-contain flex-shrink-0"
                                />
                                <span className="font-medium text-foreground truncate max-w-sm">
                                  {bm.title}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                                  {bm.domain}
                                </span>
                              </div>

                              <a
                                href={bm.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-blue-500 p-1 flex items-center gap-1 text-[11px]"
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
