"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  Folder as FolderIcon,
  Tag as TagIcon,
  ExternalLink,
  Globe,
  Activity,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";

interface EditBookmarkModalProps {
  bookmark: BookmarkWithDetails | null;
  folders: Folder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: any) => Promise<void>;
}

export function EditBookmarkModal({
  bookmark,
  folders,
  open,
  onOpenChange,
  onSave,
}: EditBookmarkModalProps) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [folderId, setFolderId] = React.useState<string>("");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isArchived, setIsArchived] = React.useState(false);
  const [status, setStatus] = React.useState<"alive" | "dead">("alive");
  const [tagsInput, setTagsInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Re-scrape and Upload state
  const [isScraping, setIsScraping] = React.useState(false);
  const [scrapeNotice, setScrapeNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setImageUrl(bookmark.imageUrl || "");
      setDescription(bookmark.description || "");
      setFolderId(bookmark.folderId || "");
      setIsFavorite(bookmark.isFavorite);
      setIsArchived(bookmark.isArchived);
      setStatus(bookmark.status === "dead" ? "dead" : "alive");
      setTagsInput(bookmark.tags.map((t) => t.name).join(", "));
      setScrapeNotice(null);
    }
  }, [bookmark]);

  if (!bookmark) return null;

  // Re-scrape metadata and site image
  const handleRescrape = async () => {
    const targetUrl = url.trim() || bookmark.url;
    if (!targetUrl) return;

    setIsScraping(true);
    setScrapeNotice(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          saveImmediately: false,
        }),
      });

      const data = await res.json();
      const meta = data.scraped || data.metadata;
      if (data.success && meta) {
        const newImg = meta.ogImage || meta.imageUrl;
        if (newImg) {
          setImageUrl(newImg);
        }
        if (meta.title) {
          setTitle(meta.title);
        }
        if (meta.description) {
          setDescription(meta.description);
        }
        setScrapeNotice({
          type: "success",
          text: newImg
            ? "Successfully re-scraped preview image & metadata!"
            : "Re-scraped page metadata.",
        });
      } else {
        setScrapeNotice({
          type: "error",
          text: data.error || data.message || "Failed to re-scrape site.",
        });
      }
    } catch (err: any) {
      setScrapeNotice({
        type: "error",
        text: err.message || "Failed to connect to scraper.",
      });
    } finally {
      setIsScraping(false);
    }
  };

  // Upload image handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScrapeNotice({ type: "error", text: "Please select an image file (PNG, JPG, WebP, SVG)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
        setScrapeNotice({ type: "success", text: "Custom image uploaded successfully!" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await onSave(bookmark.id, {
        title: title.trim(),
        url: url.trim() || bookmark.url,
        imageUrl: imageUrl.trim() || null,
        description: description.trim() || null,
        folderId: folderId || null,
        isFavorite,
        isArchived,
        status,
        tagNames: parsedTags,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            {bookmark.iconUrl ? (
              <img
                src={bookmark.iconUrl}
                alt={bookmark.domain}
                className="h-8 w-8 rounded-lg object-contain border border-slate-200 dark:border-neutral-700 bg-background flex-shrink-0 p-0.5"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-neutral-300">
                {bookmark.domain.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="truncate flex-1">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white truncate">
                Edit Bookmark
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                <Globe className="h-3 w-3" />
                <span>{bookmark.domain}</span>
                <span>•</span>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5 font-medium"
                >
                  Visit Link <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3 text-xs">
          {/* Title input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-neutral-200">
              Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs bg-slate-50 dark:bg-neutral-800"
              required
            />
          </div>

          {/* Website URL section */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
              <LinkIcon className="h-3 w-3 text-slate-400" />
              <span>Website URL</span>
            </label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-xs bg-slate-50 dark:bg-neutral-800 font-mono"
              required
            />
          </div>

          {/* Site Image & Preview Section */}
          <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-900/40">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Site Preview Image</span>
              </label>

              <div className="flex items-center gap-1.5">
                {/* Re-scrape Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRescrape}
                  disabled={isScraping}
                  className="text-xs h-7 px-2.5 gap-1 cursor-pointer"
                  title="Re-scrape image and metadata directly from the live webpage"
                >
                  <RefreshCw className={`h-3 w-3 ${isScraping ? "animate-spin text-blue-600" : ""}`} />
                  <span>{isScraping ? "Scraping..." : "Scrape Again"}</span>
                </Button>

                {/* Upload Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-7 px-2.5 gap-1 cursor-pointer"
                  title="Upload a custom preview image from your computer"
                >
                  <Upload className="h-3 w-3" />
                  <span>Upload</span>
                </Button>

                {imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageUrl("")}
                    className="text-xs h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Remove image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Image Preview Box */}
            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 min-h-24 max-h-36 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Site preview"
                  className="w-full h-36 object-cover"
                  onError={() => {
                    setScrapeNotice({ type: "error", text: "Image URL failed to load. You can re-scrape or upload an image." });
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-slate-400 dark:text-neutral-500">
                  <ImageIcon className="h-7 w-7 stroke-1 mb-1" />
                  <span className="text-[11px]">No preview image attached</span>
                  <span className="text-[10px] text-slate-400">Click &quot;Scrape Again&quot; or &quot;Upload&quot; to add one</span>
                </div>
              )}
            </div>

            {/* Manual Image URL Input */}
            <Input
              type="text"
              placeholder="Or paste direct image URL (e.g. https://... image.png)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="h-7 text-[11px] bg-white dark:bg-neutral-800"
            />

            {/* Scrape Notice Banner */}
            {scrapeNotice && (
              <div
                className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                  scrapeNotice.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {scrapeNotice.type === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span>{scrapeNotice.text}</span>
              </div>
            )}
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-neutral-200">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              placeholder="Add optional notes or description..."
            />
          </div>

          {/* Folder & Tags Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
                <FolderIcon className="h-3 w-3 text-slate-400" /> Folder
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">📥 Unsorted (Inbox)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
                <TagIcon className="h-3 w-3 text-slate-400" /> Tags (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="dev, react, tools"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="h-8 text-xs bg-slate-50 dark:bg-neutral-800"
              />
            </div>
          </div>

          {/* Health & Flags */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
                <Activity className="h-3 w-3 text-slate-400" /> Link Health Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "alive" | "dead")}
                className="w-full h-8 text-xs rounded-md border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="alive">🟢 Alive (Reachable)</option>
                <option value="dead">🔴 Dead (Broken Link)</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-neutral-300 hover:text-foreground">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="rounded text-amber-500 h-3.5 w-3.5"
                />
                <Star className={`h-3.5 w-3.5 ${isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                <span className="font-medium">Favorite</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-neutral-300 hover:text-foreground">
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                  className="rounded text-blue-600 h-3.5 w-3.5"
                />
                <span className="font-medium">Archived</span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-700">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !title.trim()}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:translate-y-0.5"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
