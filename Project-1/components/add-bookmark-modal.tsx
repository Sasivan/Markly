"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Link2,
  Folder as FolderIcon,
  Tag as TagIcon,
  Plus,
  Loader2,
  Check,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Layers,
  Clipboard,
} from "lucide-react";
import type { Folder, BookmarkWithDetails, FolderTreeNode } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";
import { FolderTreeSelect } from "@/components/modals/folder-tree-select";
import { getAiRequestHeaders, getDailyAiQuota, incrementDailyAiUsage, type DailyAiQuota } from "@/lib/ai-config";
import confetti from "canvas-confetti";

interface AddBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  folderTree: FolderTreeNode[];
  initialUrl?: string;
  defaultFolderId?: string | null;
  onBookmarkAdded?: (bookmark: BookmarkWithDetails) => void;
  onFolderCreated?: (folder: Folder) => void;
  onOpenApiKeyModal?: () => void;
}

const QUICK_TAGS = ["developer", "design", "tools", "reading", "ai", "docs", "finance"];

export function AddBookmarkModal({
  open,
  onOpenChange,
  folders,
  folderTree,
  initialUrl = "",
  defaultFolderId = null,
  onBookmarkAdded,
  onFolderCreated,
  onOpenApiKeyModal,
}: AddBookmarkModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = React.useState(initialUrl);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>(defaultFolderId || "");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [bookmarkStatus, setBookmarkStatus] = React.useState<"alive" | "pending" | "archived">("alive");
  const [tagsInput, setTagsInput] = React.useState("");

  // AI daily quota tracking (30 free requests/day; unlimited with custom Gemini key)
  const [aiQuota, setAiQuota] = React.useState<DailyAiQuota>(() => getDailyAiQuota(user?.id));

  React.useEffect(() => {
    if (open) {
      setAiQuota(getDailyAiQuota(user?.id));
      if (defaultFolderId) {
        setSelectedFolderId(defaultFolderId);
      }
    }
  }, [open, user?.id, defaultFolderId]);

  // Additional Editing State
  const [customTitle, setCustomTitle] = React.useState("");
  const [customDescription, setCustomDescription] = React.useState("");
  const [showMoreOptions, setShowMoreOptions] = React.useState(false);

  // Simplified, Elegant Inline Folder Creator State
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderParentId, setNewFolderParentId] = React.useState<string>("");
  const [folderSubmitting, setFolderSubmitting] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Scraped preview state
  const [scrapedData, setScrapedData] = React.useState<{
    title: string;
    description: string;
    domain: string;
    iconUrl: string;
    imageUrl?: string | null;
  } | null>(null);

  // Duplicate state
  const [duplicateWarning, setDuplicateWarning] = React.useState<{
    existingBookmark: any;
    folderName: string;
  } | null>(null);

  React.useEffect(() => {
    if (
      initialUrl &&
      typeof initialUrl === "string" &&
      initialUrl.trim() &&
      (initialUrl.includes(".") || initialUrl.startsWith("http"))
    ) {
      const clean = initialUrl.trim();
      setUrl(clean);
      handleScrape(clean, false);
    }
  }, [initialUrl]);

  React.useEffect(() => {
    if (!open) {
      setUrl("");
      setError(null);
      setScrapedData(null);
      setDuplicateWarning(null);
      setLoading(false);
      setIsFavorite(false);
      setBookmarkStatus("alive");
      setTagsInput("");
      setCustomTitle("");
      setCustomDescription("");
      setShowMoreOptions(false);
      setIsCreatingFolder(false);
      setNewFolderName("");
      setNewFolderParentId("");
    }
  }, [open]);

  // Handle Quick Inline Folder Creation (clean, no forced emoji popup)
  const handleCreateFolderInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const folderName = newFolderName.trim();
    if (!folderName) return;

    setFolderSubmitting(true);
    const tempFolderId = `fld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticFolder: Folder = {
      id: tempFolderId,
      name: folderName,
      parentId: newFolderParentId || null,
      icon: "📁",
      color: "#3b82f6",
      position: folders.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: user?.id || "",
    };

    setSelectedFolderId(tempFolderId);
    setIsCreatingFolder(false);
    setNewFolderName("");
    setNewFolderParentId("");
    setFolderSubmitting(false);

    if (onFolderCreated) {
      onFolderCreated(optimisticFolder);
    }

    try {
      fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tempFolderId,
          name: folderName,
          parentId: optimisticFolder.parentId,
          icon: "📁",
          color: "#3b82f6",
        }),
      }).catch((err) => {
        console.warn("Background folder save warning:", err);
      });
    } catch {}
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setUrl(text.trim());
      }
    } catch {}
  };

  const handleAddTagChip = (tag: string) => {
    const current = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (!current.includes(tag)) {
      const next = current.length > 0 ? `${tagsInput.trim()}, ${tag}` : tag;
      setTagsInput(next);
    }
  };

  // Extract domain suggestion if valid URL entered
  const domainTagSuggestion = React.useMemo(() => {
    try {
      if (!url.trim()) return null;
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const parts = parsed.hostname.replace(/^www\./, "").split(".");
      return parts[0]?.length > 2 ? parts[0].toLowerCase() : null;
    } catch {
      return null;
    }
  }, [url]);

  const handleScrape = async (urlToScrape: string, force: boolean = false) => {
    let trimmed = urlToScrape.trim();
    if (!trimmed) {
      setError("Please enter a valid link");
      return;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      trimmed = "https://" + trimmed;
    }

    setLoading(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // Guest Mode: Create bookmark in memory without failing on server auth
      if (!user) {
        let domain = "example.com";
        try {
          domain = new URL(trimmed).hostname.replace(/^www\./, "");
        } catch {}

        const guestBookmark: BookmarkWithDetails = {
          id: `bm_guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: "guest",
          folderId: selectedFolderId || null,
          url: trimmed,
          canonicalUrl: trimmed,
          title: customTitle.trim() || domain,
          description: customDescription.trim() || "",
          iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          imageUrl: null,
          domain,
          isFavorite,
          isArchived: bookmarkStatus === "archived",
          status: bookmarkStatus === "archived" ? "alive" : (bookmarkStatus as "alive" | "dead" | "pending"),
          visitCount: 0,
          lastVisitedAt: null,
          lastClickedAt: null,
          searchText: `${customTitle.trim()} ${customDescription.trim()} ${domain}`.toLowerCase(),
          createdAt: Date.now(),
          tags: parsedTags.map((name) => ({ id: `tag_${name}`, name, userId: "guest", color: "#3b82f6", createdAt: Date.now() })),
        };

        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.65 },
            colors: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"],
          });
        } catch {}

        if (onBookmarkAdded) {
          onBookmarkAdded(guestBookmark);
        }
        setLoading(false);
        setTimeout(() => {
          onOpenChange(false);
        }, 400);
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (aiQuota.hasCustomKey || !aiQuota.isQuotaExceeded) {
        Object.assign(headers, getAiRequestHeaders(user?.id));
      }

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(4500),
        body: JSON.stringify({
          url: trimmed,
          folderId: selectedFolderId || null,
          isFavorite,
          isArchived: bookmarkStatus === "archived",
          status: bookmarkStatus,
          tagNames: parsedTags,
          saveImmediately: true,
          forceDuplicate: force,
          customTitle: customTitle.trim() || undefined,
          customDescription: customDescription.trim() || undefined,
        }),
      });

      const data = await res.json();

      // Check if duplicate was detected
      if (data.isDuplicate) {
        setDuplicateWarning({
          existingBookmark: data.existingBookmark,
          folderName: data.folderName || "Unsorted",
        });
        setLoading(false);
        return;
      }

      let finalBookmark = data.bookmark;

      if (!res.ok || !data.success || !finalBookmark) {
        // High-reliability fallback: save directly to database
        const fbRes = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: trimmed,
            title: customTitle.trim() || undefined,
            description: customDescription.trim() || undefined,
            folderId: selectedFolderId || null,
            isFavorite,
            isArchived: bookmarkStatus === "archived",
            status: bookmarkStatus,
            tagNames: parsedTags,
          }),
        });
        const fbData = await fbRes.json();
        if (fbData.success && fbData.bookmark) {
          finalBookmark = fbData.bookmark;
        } else {
          throw new Error(data.error || "Could not save bookmark.");
        }
      }

      setScrapedData(
        data.metadata || {
          title: finalBookmark.title,
          domain: finalBookmark.domain,
          description: finalBookmark.description || "",
          iconUrl:
            finalBookmark.iconUrl ||
            `https://www.google.com/s2/favicons?domain=${finalBookmark.domain}&sz=64`,
        }
      );

      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.65 },
          colors: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"],
        });
      } catch {}

      if (!aiQuota.hasCustomKey && !aiQuota.isQuotaExceeded) {
        const nextQuota = incrementDailyAiUsage(user?.id);
        setAiQuota(nextQuota);
      }

      if (finalBookmark && onBookmarkAdded) {
        onBookmarkAdded(finalBookmark);
      }

      setLoading(false);
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (err: any) {
      console.warn("Scrape error, falling back:", err);
      // Fallback: save basic bookmark without blocking user
      try {
        let domain = "example.com";
        try {
          domain = new URL(trimmed).hostname.replace(/^www\./, "");
        } catch {}

        const parsedTags = tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

        const fbRes = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: trimmed,
            title: customTitle.trim() || domain,
            description: customDescription.trim() || "",
            folderId: selectedFolderId || null,
            isFavorite,
            isArchived: bookmarkStatus === "archived",
            status: bookmarkStatus,
            tagNames: parsedTags,
          }),
        });

        const fbData = await fbRes.json();
        if (fbData.success && fbData.bookmark) {
          if (onBookmarkAdded) onBookmarkAdded(fbData.bookmark);
          setLoading(false);
          onOpenChange(false);
          return;
        }
      } catch {}

      setError(err.message || "Failed to save bookmark. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScrape(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] shadow-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800 shadow-2xs">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Add New Bookmark
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Save any link. Markly auto-fetches high-res icon, favicon, and rich metadata.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* AI Daily Quota Status Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors bg-slate-50 dark:bg-neutral-900/60 border-slate-200 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
            {aiQuota.hasCustomKey ? (
              <span className="text-emerald-600 dark:text-emerald-400 truncate font-semibold">Custom Key Active • Unlimited AI</span>
            ) : aiQuota.isQuotaExceeded ? (
              <span className="text-amber-600 dark:text-amber-400 truncate">Free AI quota (30/30) reached today • Saving standard metadata</span>
            ) : (
              <span className="text-slate-600 dark:text-neutral-400 truncate">
                Free AI Autotagging: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{aiQuota.remaining}</strong> of 30 uses left today
              </span>
            )}
          </div>
          {onOpenApiKeyModal && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenApiKeyModal();
              }}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-semibold ml-2 flex-shrink-0"
            >
              {aiQuota.hasCustomKey ? "Manage Key" : "Add Key"}
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
          {/* URL Input with Quick Paste */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Website URL</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Clipboard className="h-3 w-3" />
                <span>Paste</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="https://github.com or paste URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                className="text-xs h-9 flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !url.trim()}
                className="text-xs h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Destination Folder Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <FolderIcon className="h-3.5 w-3.5 text-blue-500" />
                <span>Destination Folder</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus className="h-3 w-3" />
                <span>{isCreatingFolder ? "Cancel" : "New Folder"}</span>
              </button>
            </div>

            {/* Clean, Simple Inline Folder Creator (No forced emoji grid) */}
            {isCreatingFolder ? (
              <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Collection name (e.g. Design Systems, Docs)..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8 text-xs flex-1 bg-background"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateFolderInline();
                      } else if (e.key === "Escape") {
                        setIsCreatingFolder(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCreateFolderInline()}
                    disabled={folderSubmitting || !newFolderName.trim()}
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
                  >
                    {folderSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  <span>Nest inside:</span>
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                    className="h-6 text-[11px] rounded border border-input bg-background px-1.5 text-foreground focus:outline-none"
                  >
                    <option value="">📁 Root (Top-Level)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        ↳ {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <FolderTreeSelect
                folders={folders}
                folderTree={folderTree}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                disabled={loading}
              />
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
              <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
              <span>Tags (comma-separated)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. dev, design, react, tools"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="text-xs h-8.5"
              disabled={loading}
            />

            {/* Quick Tag Chips */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] text-muted-foreground mr-0.5">Suggestions:</span>
              {domainTagSuggestion && (
                <button
                  type="button"
                  onClick={() => handleAddTagChip(domainTagSuggestion)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 hover:brightness-110 transition-colors cursor-pointer"
                >
                  +{domainTagSuggestion}
                </button>
              )}
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTagChip(tag)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 dark:bg-neutral-800 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-600 dark:text-neutral-400 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Extra options accordion */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="text-xs text-slate-600 dark:text-neutral-400 hover:text-foreground flex items-center gap-1.5 cursor-pointer font-medium py-1"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>{showMoreOptions ? "Hide extra editing options" : "Custom Title, Notes & Status (Optional)"}</span>
              {showMoreOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showMoreOptions && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-neutral-800 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                    Custom Title
                  </label>
                  <Input
                    type="text"
                    placeholder="Leave empty to use website's page title automatically"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                    Personal Notes
                  </label>
                  <Input
                    type="text"
                    placeholder="Quick notes or project context..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Reading Status</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("alive")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "alive"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                          : "border-input bg-background hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      ✓ Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("pending")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "pending"
                          ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold"
                          : "border-input bg-background hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      ⏳ Read Later
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("archived")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "archived"
                          ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-semibold"
                          : "border-input bg-background hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      📦 Archive
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Favorite Star Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center gap-2 text-xs text-slate-700 dark:text-neutral-300 hover:text-foreground cursor-pointer font-medium select-none"
            >
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                  isFavorite
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-500 ring-1 ring-amber-400"
                    : "bg-slate-100 dark:bg-neutral-800 text-slate-400"
                }`}
              >
                <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
              </div>
              <span className={isFavorite ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                {isFavorite ? "Starred as Favorite ⭐" : "Mark as Starred Favorite"}
              </span>
            </button>
          </div>

          {/* Loading Smart Skeleton State (Skullet style zero layout shift) */}
          {loading && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2 animate-pulse" skullet-loading="true">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded bg-slate-200 dark:bg-neutral-800 flex-shrink-0" />
                <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-2/3" />
              </div>
              <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-5/6" />
            </div>
          )}

          {/* Duplicate Warning Dialog / Prompt */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Already Saved</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                This link is already saved inside collection:{" "}
                <strong className="text-foreground">📁 {duplicateWarning.folderName}</strong>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7.5 px-3 cursor-pointer"
                  onClick={() => handleScrape(url, true)}
                >
                  Save Anyway
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7.5 cursor-pointer text-muted-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Success Scraped Preview */}
          {scrapedData && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3 text-xs animate-in fade-in duration-150">
              <div className="h-8 w-8 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 flex-shrink-0 shadow-xs">
                {scrapedData.iconUrl ? (
                  <img src={scrapedData.iconUrl} alt="Favicon" className="h-5 w-5 object-contain" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div className="truncate flex-1">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                  {scrapedData.title}
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                  Saved successfully to {folders.find((f) => f.id === selectedFolderId)?.name || "Unsorted (Inbox)"}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
