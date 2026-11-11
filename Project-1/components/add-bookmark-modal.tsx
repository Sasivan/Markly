"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertTriangle, Check, ExternalLink, Loader2, Star, Folder as FolderIcon, Tag as TagIcon } from "lucide-react";
import confetti from "canvas-confetti";
import type { Folder, BookmarkWithDetails } from "@/server/db/schema";
import { useAuth } from "@/components/auth/auth-context";

interface AddBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  initialUrl?: string;
  onBookmarkAdded?: (bookmark: BookmarkWithDetails) => void;
}

export function AddBookmarkModal({
  open,
  onOpenChange,
  folders,
  initialUrl = "",
  onBookmarkAdded,
}: AddBookmarkModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = React.useState(initialUrl);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>("");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [tagsInput, setTagsInput] = React.useState("");

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
    if (initialUrl) {
      setUrl(initialUrl);
      handleScrape(initialUrl, false);
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
    }
  }, [open]);

  const handleScrape = async (urlToScrape: string, force: boolean = false) => {
    const trimmed = urlToScrape.trim();
    if (!trimmed) {
      setError("Please enter a valid link");
      return;
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
        body: JSON.stringify({
          url: trimmed,
          folderId: selectedFolderId || null,
          isFavorite,
          tagNames: parsedTags,
          saveImmediately: true,
          forceDuplicate: force,
          userId: user?.id,
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

      setScrapedData(data.metadata || {
        title: finalBookmark.title,
        domain: finalBookmark.domain,
        description: finalBookmark.description || "",
        iconUrl: finalBookmark.iconUrl || `https://www.google.com/s2/favicons?domain=${finalBookmark.domain}&sz=64`,
      });

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
      }, 1000);
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
      <DialogContent className="max-w-lg p-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Add Bookmark</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Paste any URL. Markly will extract title, description, and high-res icon.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Website URL</label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                className="text-xs h-8 flex-1"
                disabled={loading}
              />
              <Button type="submit" size="sm" disabled={loading || !url.trim()} className="text-xs h-8 px-3">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>

          {/* Folder & Options */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <FolderIcon className="h-3 w-3" /> Folder
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={loading}
              >
                <option value="">📥 Unsorted (Inbox)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon || "📁"} {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <TagIcon className="h-3 w-3" /> Tags (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="design, dev, react"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="text-xs h-8"
                disabled={loading}
              />
            </div>
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Star
                className={`h-4 w-4 ${
                  isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                }`}
              />
              <span>{isFavorite ? "Marked as Favorite" : "Add to Favorites"}</span>
            </button>
          </div>

          {/* Duplicate Warning Dialog / Prompt */}
          {duplicateWarning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
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
                  className="text-xs h-7"
                  onClick={() => handleScrape(url, true)}
                >
                  Save Anyway
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onOpenChange(false)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Optimistic Skeleton Loader */}
          {loading && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20 animate-pulse">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-5/6" />
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Extracting site metadata and generating 64x64 WebP icon...</span>
              </div>
            </div>
          )}

          {/* Success Scraped Preview */}
          {scrapedData && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Bookmark Saved!
                </span>
                <span className="text-[10px] text-muted-foreground">{scrapedData.domain}</span>
              </div>
              <div className="flex items-start gap-2.5">
                {scrapedData.iconUrl ? (
                  <img
                    src={scrapedData.iconUrl}
                    alt={scrapedData.title}
                    className="h-8 w-8 rounded-md object-contain border border-border/50 bg-background flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                    {scrapedData.domain.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="truncate flex-1">
                  <h4 className="font-semibold text-xs text-foreground truncate">{scrapedData.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {scrapedData.description || "No description provided"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

