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
  Palette,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { Folder, BookmarkWithDetails } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";

interface AddBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  initialUrl?: string;
  onBookmarkAdded?: (bookmark: BookmarkWithDetails) => void;
  onFolderCreated?: (folder: Folder) => void;
}

const QUICK_TAGS = ["dev", "design", "ai", "tools", "reading", "product", "docs", "video"];

const FOLDER_ICONS = ["📁", "💻", "🎨", "⚡", "🚀", "📚", "💼", "⭐", "🌐", "🔒"];
const FOLDER_COLORS = [
  { id: "#3b82f6", name: "Blue" },
  { id: "#10b981", name: "Emerald" },
  { id: "#8b5cf6", name: "Purple" },
  { id: "#f59e0b", name: "Amber" },
  { id: "#ec4899", name: "Pink" },
  { id: "#06b6d4", name: "Cyan" },
];

export function AddBookmarkModal({
  open,
  onOpenChange,
  folders,
  initialUrl = "",
  onBookmarkAdded,
  onFolderCreated,
}: AddBookmarkModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = React.useState(initialUrl);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>("");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [tagsInput, setTagsInput] = React.useState("");

  // Additional Editing State
  const [customTitle, setCustomTitle] = React.useState("");
  const [customDescription, setCustomDescription] = React.useState("");
  const [showMoreOptions, setShowMoreOptions] = React.useState(false);

  // Inline Folder Creator State
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderIcon, setNewFolderIcon] = React.useState("📁");
  const [newFolderColor, setNewFolderColor] = React.useState("#3b82f6");
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
      setTagsInput("");
      setCustomTitle("");
      setCustomDescription("");
      setShowMoreOptions(false);
      setIsCreatingFolder(false);
      setNewFolderName("");
    }
  }, [open]);

  // Handle Quick Inline Folder Creation
  const handleCreateFolderInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setFolderSubmitting(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          icon: newFolderIcon,
          color: newFolderColor,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.folder) {
        setSelectedFolderId(data.folder.id);
        setIsCreatingFolder(false);
        setNewFolderName("");
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
      }, 900);
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
      <DialogContent className="max-w-md p-5 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Add Bookmark
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Save any link. Markly auto-fetches high-res icon and metadata.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          {/* URL Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
              Website URL
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                className="text-xs h-8.5 flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !url.trim()}
                className="text-xs h-8.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer flex items-center gap-1"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Folder Selector + Inline Add Folder Button */}
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
                <span>{isCreatingFolder ? "Cancel New Folder" : "+ New Folder"}</span>
              </button>
            </div>

            {/* Inline Folder Creator Card */}
            {isCreatingFolder && (
              <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-2 animate-in fade-in duration-150">
                <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                  Quick Create Folder
                </div>
                <div className="flex items-center gap-2">
                  {/* Emoji Icon Select */}
                  <select
                    value={newFolderIcon}
                    onChange={(e) => setNewFolderIcon(e.target.value)}
                    className="h-8 w-11 rounded border border-input bg-background text-sm text-center cursor-pointer"
                  >
                    {FOLDER_ICONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="text"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateFolderInline}
                    disabled={folderSubmitting || !newFolderName.trim()}
                    className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
                  >
                    {folderSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                  </Button>
                </div>

                {/* Color Options */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-muted-foreground mr-1">Color:</span>
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`h-4 w-4 rounded-full transition-transform cursor-pointer ${
                        newFolderColor === c.id ? "scale-125 ring-2 ring-blue-500 ring-offset-1" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.id }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isCreatingFolder && (
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full h-8.5 text-xs rounded-lg border border-input bg-background px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                disabled={loading}
              >
                <option value="">📥 Unsorted (Inbox)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon || "📁"} {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tags with Quick Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>Tags (comma-separated)</span>
              </label>
            </div>
            <Input
              type="text"
              placeholder="e.g. dev, design, react"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="text-xs h-8.5"
              disabled={loading}
            />

            {/* Quick Tag Chips */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] text-muted-foreground mr-0.5">Quick add:</span>
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

          {/* More Editing Options Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="text-xs text-slate-600 dark:text-neutral-400 hover:text-foreground flex items-center gap-1 cursor-pointer font-medium py-1"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{showMoreOptions ? "Hide extra editing options" : "Custom Title & Notes (Optional)"}</span>
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
                    placeholder="Leave empty to use website's page title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                    Personal Notes / Description
                  </label>
                  <Input
                    type="text"
                    placeholder="Quick notes or why you saved this..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center gap-2 text-xs text-slate-700 dark:text-neutral-300 hover:text-foreground cursor-pointer font-medium select-none"
            >
              <div
                className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                  isFavorite ? "bg-amber-100 dark:bg-amber-950/60 text-amber-500" : "bg-slate-100 dark:bg-neutral-800 text-slate-400"
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-500" : ""}`} />
              </div>
              <span>{isFavorite ? "Starred as Favorite" : "Add to Favorites"}</span>
            </button>
          </div>

          {/* Duplicate Warning Dialog / Prompt */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
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
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3 text-xs">
              <div className="h-8 w-8 rounded bg-white dark:bg-neutral-800 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 flex-shrink-0 shadow-xs">
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
                  Saved successfully to {folders.find((f) => f.id === selectedFolderId)?.name || "Inbox"}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
