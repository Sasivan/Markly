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
  GitBranch,
  RotateCcw,
} from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";
import type { Folder, BookmarkWithDetails, FolderTreeNode } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";
import { FolderTreeSelect } from "@/components/modals/folder-tree-select";
import {
  FolderRoutingModal,
  getSavedRoutingRules,
  matchFolderRule,
} from "@/components/folders/folder-routing-modal";
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
  const {
    format,
    toggleFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "add_bookmark",
    defaultVerticalWidth: 540,
    defaultHorizontalWidth: 620,
    defaultVerticalHeight: 620,
    defaultHorizontalHeight: 620,
    minWidth: 400,
    minHeight: 440,
  });

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

  // 3.2: Smart Auto-Routing Rules state
  const [routingModalOpen, setRoutingModalOpen] = React.useState(false);
  const [autoRoutedMessage, setAutoRoutedMessage] = React.useState<string | null>(null);

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

  // 2.3: Preventive Real-time Duplicate Detection on URL typing/pasting
  React.useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || (!trimmed.includes(".") && !trimmed.startsWith("http"))) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed, checkDuplicateOnly: true }),
        });
        const d = await res.json();
        if (d.success && d.exists && d.bookmark) {
          const folderObj = folders.find((f) => f.id === d.bookmark.folderId);
          setDuplicateWarning({
            existingBookmark: d.bookmark,
            folderName: folderObj ? folderObj.name : "Unsorted (Inbox)",
          });
        } else {
          setDuplicateWarning(null);
        }
      } catch {}
    }, 350);

    return () => clearTimeout(timer);
  }, [url, folders]);

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
      setAutoRoutedMessage(null);
    }
  }, [open]);

  // 3.2: Check Auto-Routing Rules whenever URL or title is populated
  React.useEffect(() => {
    if (!url.trim()) {
      setAutoRoutedMessage(null);
      return;
    }
    const rules = getSavedRoutingRules();
    const matched = matchFolderRule(url, customTitle || scrapedData?.title || "", rules);
    if (matched && folders.some((f) => f.id === matched.folderId)) {
      setSelectedFolderId(matched.folderId);
      const targetName = folders.find((f) => f.id === matched.folderId)?.name || "Folder";
      setAutoRoutedMessage(`Auto-routed to "${targetName}" (${matched.pattern})`);
    }
  }, [url, scrapedData?.title, customTitle, folders]);

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
      icon: "folder",
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
          icon: "folder",
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
          notes: null,
          cachedContent: null,
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
      <DialogContent
        style={modalStyle}
        className="relative sm:max-w-none max-h-[94vh] max-w-[95vw] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-4 shadow-overlay mk-scroll sm:p-5"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-foreground">
                  Add New Bookmark
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                  Save any link. Markly auto-fetches the icon, favicon and rich metadata.
                </DialogDescription>
              </div>
            </div>

            <ModalFormatControls
              format={format}
              onToggleFormat={toggleFormat}
              hasCustomSize={hasCustomSize}
              onRestoreDefaults={handleRestoreDefaults}
            />
          </div>
        </DialogHeader>

        {/* AI Daily Quota Status Pill */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-2xs font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {aiQuota.hasCustomKey ? (
              <span className="text-foreground truncate font-medium">Custom Key Active • Unlimited AI</span>
            ) : aiQuota.isQuotaExceeded ? (
              <span className="text-muted-foreground truncate">Daily quota (30/30) reached • Standard metadata</span>
            ) : (
              <span className="text-muted-foreground truncate">
                AI Autotagging: <strong className="text-foreground font-semibold">{aiQuota.remaining}</strong> of 30 uses left today
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
              className="text-xs text-primary hover:underline cursor-pointer font-medium ml-2 flex-shrink-0"
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
                          <label className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                <span>Website URL</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
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
                className="text-xs h-9 px-4 cursor-pointer flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Destination Folder Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
                  <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Destination Folder</span>
                </label>
                {autoRoutedMessage && (
                  <span className="text-3xs text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {autoRoutedMessage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRoutingModalOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer font-medium"
                  title="Configure smart auto-routing rules"
                >
                  <GitBranch className="h-3 w-3" />
                  <span>Rules</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isCreatingFolder ? "Cancel" : "New Folder"}</span>
                </button>
              </div>
            </div>

            {/* Clean, Simple Inline Folder Creator */}
            {isCreatingFolder ? (
              <div className="space-y-2.5 rounded-lg border border-border bg-secondary/40 p-3">
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
                    className="h-8 px-3 text-xs cursor-pointer"
                  >
                    {folderSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground w-full">
                  <Layers className="h-3 w-3 shrink-0" />
                  <span className="shrink-0">Nest inside:</span>
                  <div className="flex-1 min-w-0">
                    <FolderTreeSelect
                      folders={folders}
                      folderTree={folderTree}
                      selectedFolderId={newFolderParentId || null}
                      onSelectFolder={(id) => setNewFolderParentId(id || "")}
                      allowRoot={true}
                      rootLabel="Root (Top-Level)"
                      placeholder="Select parent folder..."
                    />
                  </div>
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
            <label className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
              <TagIcon className="h-3.5 w-3.5" />
              <span>Tags (comma-separated)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. dev, design, react, tools"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="text-xs h-8"
              disabled={loading}
            />

            {/* Quick Tag Chips */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="mk-meta mr-0.5 text-2xs">Suggestions</span>
              {domainTagSuggestion && (
                <button
                  type="button"
                  onClick={() => handleAddTagChip(domainTagSuggestion)}
                  className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-2xs text-foreground transition-colors hover:border-border-strong hover:bg-secondary cursor-pointer"
                >
                  +{domainTagSuggestion}
                </button>
              )}
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTagChip(tag)}
                  className="rounded-sm border border-transparent bg-secondary px-1.5 py-0.5 font-mono text-2xs text-muted-foreground transition-colors hover:border-border hover:text-foreground cursor-pointer"
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
              aria-expanded={showMoreOptions}
              className="flex items-center gap-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{showMoreOptions ? "Hide extra editing options" : "Custom Title, Notes & Status (Optional)"}</span>
              {showMoreOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showMoreOptions && (
              <div className="space-y-2.5 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="text-2xs font-medium text-muted-foreground">
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
                  <label className="text-2xs font-medium text-muted-foreground">
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
                  <label className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>Reading Status</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("alive")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "alive"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("pending")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "pending"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      Read Later
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("archived")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "archived"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      Archive
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
              className="flex items-center gap-2 text-xs text-foreground hover:text-primary cursor-pointer font-medium select-none"
            >
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                  isFavorite
                    ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
              </div>
              <span className={isFavorite ? "font-medium text-foreground" : ""}>
                {isFavorite ? "Starred as favorite" : "Mark as favorite"}
              </span>
            </button>
          </div>

          {/* Loading Smart Skeleton State */}
          {loading && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 animate-pulse" skullet-loading="true">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded bg-muted flex-shrink-0" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
              <div className="h-3 bg-muted rounded w-5/6" />
            </div>
          )}

          {/* Duplicate Warning Dialog / Prompt */}
          {duplicateWarning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Already Saved</span>
              </div>
              <p className="text-muted-foreground text-xs">
                This link is already saved inside collection:{" "}
                <strong className="text-foreground">{duplicateWarning.folderName}</strong>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-3 cursor-pointer"
                  onClick={() => handleScrape(url, true)}
                >
                  Save Anyway
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 cursor-pointer text-muted-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Success Scraped Preview */}
          {scrapedData && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3 text-xs">
              <div className="h-8 w-8 rounded-md bg-card flex items-center justify-center border border-border flex-shrink-0">
                {scrapedData.iconUrl ? (
                  <img src={scrapedData.iconUrl} alt="Favicon" className="h-5 w-5 object-contain" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div className="truncate flex-1">
                <div className="font-medium text-foreground truncate">
                  {scrapedData.title}
                </div>
                <div className="text-xs font-mono text-muted-foreground truncate">
                  Saved to {folders.find((f) => f.id === selectedFolderId)?.name || "Unsorted (Inbox)"}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* 3.2: Folder Routing Modal */}
        <FolderRoutingModal
          open={routingModalOpen}
          onOpenChange={setRoutingModalOpen}
          folders={folders}
        />
      </DialogContent>
    </Dialog>
  );
}
