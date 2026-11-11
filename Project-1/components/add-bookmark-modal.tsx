"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Star,
  Folder as FolderIcon,
  Tag as TagIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Layers,
  Smile,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { Folder, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";
import { FolderTreeSelect } from "@/components/modals/folder-tree-select";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";

interface AddBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  folderTree?: FolderTreeNode[];
  initialUrl?: string;
  onBookmarkAdded?: (bookmark: BookmarkWithDetails) => void;
  onFolderCreated?: (folder: Folder) => void;
}

const QUICK_TAGS = [
  "dev",
  "design",
  "ai",
  "tools",
  "reading",
  "product",
  "docs",
  "video",
  "tutorial",
  "reference",
];

const POPULAR_FOLDER_ICONS = [
  "📁",
  "💻",
  "🎨",
  "⚡",
  "🚀",
  "📚",
  "💼",
  "⭐",
  "🌐",
  "🔒",
  "iconoir:Folder",
  "iconoir:Code",
  "iconoir:Palette",
  "iconoir:Cpu",
  "iconoir:Database",
  "iconoir:BookmarkBook",
];

export const COLOR_PALETTE = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Slate", value: "#64748b" },
  { name: "Zinc", value: "#71717a" },
];

export function AddBookmarkModal({
  open,
  onOpenChange,
  folders,
  folderTree,
  initialUrl = "",
  onBookmarkAdded,
  onFolderCreated,
}: AddBookmarkModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = React.useState(initialUrl);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>("");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [bookmarkStatus, setBookmarkStatus] = React.useState<"alive" | "pending" | "archived">("alive");
  const [tagsInput, setTagsInput] = React.useState("");

  // Additional Editing State
  const [customTitle, setCustomTitle] = React.useState("");
  const [customDescription, setCustomDescription] = React.useState("");
  const [showMoreOptions, setShowMoreOptions] = React.useState(false);

  // Inline Folder Creator State
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderParentId, setNewFolderParentId] = React.useState<string>("");
  const [newFolderIcon, setNewFolderIcon] = React.useState("📁");
  const [newFolderColor, setNewFolderColor] = React.useState("#3b82f6");
  const [folderSubmitting, setFolderSubmitting] = React.useState(false);
  const [showIconLibrary, setShowIconLibrary] = React.useState(false);

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
      setShowIconLibrary(false);
    }
  }, [open]);

  // Handle Quick Inline Folder Creation with full customization & parent selection
  const handleCreateFolderInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;

    setFolderSubmitting(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: newFolderParentId || null,
          icon: newFolderIcon || "📁",
          color: newFolderColor || "#3b82f6",
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.folder) {
        setSelectedFolderId(data.folder.id);
        setIsCreatingFolder(false);
        setNewFolderName("");
        setNewFolderParentId("");
        setShowIconLibrary(false);
        if (onFolderCreated) {
          onFolderCreated(data.folder);
        }
      } else {
        setError(data.error || "Failed to create folder");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    } finally {
      setFolderSubmitting(false);
    }
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

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(4500),
        body: JSON.stringify({
          url: trimmed,
          folderId: selectedFolderId || null,
          isFavorite,
          tagNames: parsedTags,
          saveImmediately: true,
          forceDuplicate: force,
          userId: user?.id,
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
            tagNames: parsedTags,
            userId: user?.id,
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

      if (finalBookmark && onBookmarkAdded) {
        onBookmarkAdded(finalBookmark);
      }

      // Briefly display success card before closing
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (err: any) {
      // Last-chance direct save
      try {
        const parsedTags = tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

        const fbRes = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: trimmed,
            title: customTitle.trim() || undefined,
            description: customDescription.trim() || undefined,
            folderId: selectedFolderId || null,
            isFavorite,
            tagNames: parsedTags,
            userId: user?.id,
          }),
        });
        const fbData = await fbRes.json();
        if (fbData.success && fbData.bookmark) {
          if (onBookmarkAdded) onBookmarkAdded(fbData.bookmark);
          onOpenChange(false);
          return;
        }
      } catch {}

      setError(err.message || "Could not bookmark URL. Please check the address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScrape(url, false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Add Bookmark
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Save any link. Markly auto-fetches high-res icon, favicon, and rich metadata.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mt-1.5">
          {/* URL Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
              Website URL
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="https://github.com or paste link..."
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
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Folder Tree Selector + Inline Add Folder Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <FolderIcon className="h-3.5 w-3.5 text-blue-500" />
                <span>Destination Collection</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus className="h-3 w-3" />
                <span>{isCreatingFolder ? "Cancel New Folder" : "+ New Folder"}</span>
              </button>
            </div>

            {/* Inline Folder Creator Card */}
            {isCreatingFolder && (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${newFolderColor}25` }}
                    >
                      <FolderIconRenderer icon={newFolderIcon} color={newFolderColor} className="h-3.5 w-3.5" />
                    </div>
                    <span>Create New Collection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>

                {/* Folder Name & Submit */}
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Folder name (e.g. Design Systems, Machine Learning)..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8.5 text-xs flex-1 bg-background"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCreateFolderInline()}
                    disabled={folderSubmitting || !newFolderName.trim()}
                    className="h-8.5 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer flex items-center gap-1"
                  >
                    {folderSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>Create</span>
                  </Button>
                </div>

                {/* Nest under Parent Folder */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>Parent Folder (Nest Inside):</span>
                  </label>
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                    className="w-full h-7.5 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">📁 Root (Top-Level Folder)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        ↳ {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Icon Selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Smile className="h-3 w-3" />
                      <span>Folder Icon:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowIconLibrary(!showIconLibrary)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {showIconLibrary ? "Hide 1600+ Icons" : "Browse 1600+ Icons ›"}
                    </button>
                  </div>

                  {showIconLibrary ? (
                    <div className="border border-input rounded-lg p-2 bg-background max-h-48 overflow-y-auto">
                      <IconSearchPicker
                        selectedIcon={newFolderIcon}
                        onSelectIcon={(ic) => {
                          setNewFolderIcon(ic);
                          setShowIconLibrary(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {POPULAR_FOLDER_ICONS.map((ic) => {
                        const isSelected = newFolderIcon === ic;
                        return (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setNewFolderIcon(ic)}
                            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-500 text-white shadow-xs scale-105"
                                : "hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                            }`}
                          >
                            <FolderIconRenderer icon={ic} className="h-4 w-4" color={isSelected ? "#ffffff" : newFolderColor} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Color Swatches */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Color Accent:
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewFolderColor(c.value)}
                        className={`h-4.5 w-4.5 rounded-full transition-transform cursor-pointer ${
                          newFolderColor === c.value ? "scale-125 ring-2 ring-blue-500 ring-offset-1" : "hover:scale-110 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Hierarchical Folder Tree Selector */}
            {!isCreatingFolder && (
              <FolderTreeSelect
                folders={folders}
                folderTree={folderTree}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                disabled={loading}
              />
            )}
          </div>

          {/* Tags with Quick Chips & Domain Suggestion */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>Tags (comma-separated)</span>
              </label>
            </div>
            <Input
              type="text"
              placeholder="e.g. dev, design, react, tutorial"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="text-xs h-8.5"
              disabled={loading}
            />

            {/* Quick Tag Chips */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] text-muted-foreground mr-0.5">Quick add:</span>
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

          {/* More Options Accordion (Custom Title, Notes, Reading Status) */}
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
                    Personal Notes / Why you saved this
                  </label>
                  <Input
                    type="text"
                    placeholder="Quick notes, key insights, or project context..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Bookmark Priority / Status</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBookmarkStatus("alive")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                        bookmarkStatus === "alive"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
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
                          ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
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
                          ? "border-slate-500 bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-200"
                          : "border-input bg-background hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      📦 Archived
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

          {/* Duplicate Warning Dialog / Prompt */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Already Saved</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                This canonical URL is already saved inside folder:{" "}
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
