"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Star,
  Copy,
  Check,
  Folder as FolderIcon,
  Tag as TagIcon,
  Activity,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Globe,
  Edit2,
  Trash2,
  RefreshCw,
  Archive,
  FolderPlus,
  Loader2,
  Maximize2,
  Minimize2,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { CopyBookmarkModal } from "./copy-bookmark-modal";
import { useAuth } from "@/components/auth/auth-context";
import { getAiRequestHeaders } from "@/lib/ai-config";

interface SitePreviewModalProps {
  bookmark: BookmarkWithDetails | null;
  folders: Folder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
  onToggleFavorite?: (bm: BookmarkWithDetails) => void;
  onToggleArchive?: (bm: BookmarkWithDetails) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onDeleteBookmark?: (id: string, title?: string) => void;
  onMoveBookmark?: (bookmarkId: string, folderId: string | null) => void;
  onCopyBookmark?: (bookmarkId: string, targetFolderId: string | null) => void;
  onUpdateBookmark?: (updated: BookmarkWithDetails) => void;
}

export function SitePreviewModal({
  bookmark,
  folders,
  open,
  onOpenChange,
  onRecordVisit,
  onToggleFavorite,
  onToggleArchive,
  onEditBookmark,
  onDeleteBookmark,
  onMoveBookmark,
  onCopyBookmark,
  onUpdateBookmark,
}: SitePreviewModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"overview" | "preview">("overview");
  const [description, setDescription] = React.useState("");
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [isScraping, setIsScraping] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [iframeKey, setIframeKey] = React.useState(0);
  const [expandedPreview, setExpandedPreview] = React.useState(false);
  const [copyModalOpen, setCopyModalOpen] = React.useState(false);

  // Sync state whenever bookmark changes
  React.useEffect(() => {
    if (bookmark) {
      setDescription(bookmark.description || "");
      setIsEditingDescription(false);
      setSaveSuccess(false);
      setIframeKey((prev) => prev + 1);
      setActiveTab("overview");

      // Auto-generate AI summary if completely missing or empty
      if (!bookmark.description || bookmark.description.trim().length < 5) {
        autoGenerateSummary(bookmark.id);
      }
    }
  }, [bookmark]);

  const autoGenerateSummary = async (bookmarkId: string) => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}/ai-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAiRequestHeaders(user?.id),
        },
        body: JSON.stringify({ mode: "ai", save: true }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setDescription(data.summary);
        if (bookmark && onUpdateBookmark) {
          onUpdateBookmark({ ...bookmark, description: data.summary });
        }
      }
    } catch (e) {
      console.warn("Auto AI summary generation error:", e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (!bookmark) return null;

  const currentFolder = folders.find((f) => f.id === bookmark.folderId);

  const handleOpenExternal = () => {
    onRecordVisit?.(bookmark);
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Generate AI summary explicitly
  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}/ai-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAiRequestHeaders(user?.id),
        },
        body: JSON.stringify({ mode: "ai", save: true }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setDescription(data.summary);
        setSaveSuccess(true);
        if (onUpdateBookmark) {
          onUpdateBookmark({ ...bookmark, description: data.summary });
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.warn("Failed to generate AI summary:", e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Quick extract page metadata (0 AI credits)
  const handleQuickExtract = async () => {
    setIsScraping(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scrape", save: true }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setDescription(data.summary);
        setSaveSuccess(true);
        if (onUpdateBookmark) {
          onUpdateBookmark({ ...bookmark, description: data.summary });
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.warn("Failed to extract metadata:", e);
    } finally {
      setIsScraping(false);
    }
  };

  // Save manual notes / description to DB
  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (data.success && data.bookmark) {
        setSaveSuccess(true);
        setIsEditingDescription(false);
        onUpdateBookmark?.(data.bookmark);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.warn("Failed to save description:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Render formatted rich text (paragraphs and bullet points)
  const renderFormattedDescription = (text: string) => {
    if (!text.trim()) {
      return (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
          <FileText className="h-8 w-8 mx-auto text-indigo-400 opacity-60" />
          <p className="font-medium text-slate-700 dark:text-neutral-300">No description generated yet.</p>
          <p className="text-[11px] text-muted-foreground">Click &quot;AI Generate Summary&quot; to automatically create a high-quality summary.</p>
        </div>
      );
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets: string[] = [];
    const paragraphs: string[] = [];

    lines.forEach((line) => {
      if (line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ")) {
        bullets.push(line.replace(/^[•\-\*]\s*/, ""));
      } else {
        paragraphs.push(line);
      }
    });

    return (
      <div className="space-y-3.5 text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed font-sans">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="leading-relaxed">
            {p}
          </p>
        ))}

        {bullets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block">
              Key Highlights &amp; Features
            </span>
            <ul className="space-y-1.5 pl-1">
              {bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#151515] border-slate-200 dark:border-neutral-800 shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{bookmark.title} - Site Details &amp; Preview</DialogTitle>
          </DialogHeader>

          {/* Top Header Bar */}
          <div className="px-6 py-3.5 border-b border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-neutral-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-2xs">
                <BookmarkIcon
                  src={bookmark.iconUrl}
                  alt={bookmark.title}
                  domain={bookmark.domain}
                  className="h-5 w-5 rounded-sm object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {bookmark.title}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono truncate">{bookmark.domain}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 border ${
                      bookmark.status === "dead"
                        ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                        : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    }`}
                  >
                    {bookmark.status === "dead" ? "Broken Link" : "Active"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Favorite toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onToggleFavorite?.(bookmark)}
                className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800"
                title={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    bookmark.isFavorite
                      ? "text-amber-500 fill-amber-500"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="hidden sm:inline">
                  {bookmark.isFavorite ? "Favorited" : "Favorite"}
                </span>
              </Button>

              {/* Copy URL */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800"
                title="Copy website URL"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="hidden sm:inline text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </Button>

              {/* Open External Primary Action */}
              <Button
                type="button"
                size="sm"
                onClick={handleOpenExternal}
                className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5 shadow-2xs"
                title="Open website in new browser tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Site</span>
              </Button>
            </div>
          </div>

          {/* Clean View Tabs: Document Overview | Live Webpage */}
          <div className="px-6 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-1 bg-white dark:bg-[#151515]">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-3 text-xs font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Overview &amp; Knowledge Summary</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`py-2 px-3 text-xs font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
                activeTab === "preview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Live Website Preview</span>
            </button>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {activeTab === "overview" ? (
              <div className="space-y-5">
                {/* Visual OpenGraph Hero Banner (if available) */}
                {bookmark.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 aspect-21/9 max-h-56 shadow-2xs group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bookmark.imageUrl}
                      alt={bookmark.title}
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3.5">
                      <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
                        {bookmark.domain}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notion-Style Properties Bar */}
                <div className="rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Folder Location */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <FolderIcon className="h-3 w-3 text-indigo-500" />
                      <span>Folder</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                      {currentFolder ? (
                        <>
                          <FolderIconRenderer
                            icon={currentFolder.icon}
                            color={currentFolder.color}
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          <span className="truncate">{currentFolder.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground font-normal">Unsorted (Inbox)</span>
                      )}
                    </div>
                  </div>

                  {/* Visit Frequency */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span>Visits</span>
                    </span>
                    <div className="font-semibold text-foreground font-mono">
                      {bookmark.visitCount} {bookmark.visitCount === 1 ? "open" : "opens"}
                    </div>
                  </div>

                  {/* Saved Date */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-amber-500" />
                      <span>Saved</span>
                    </span>
                    <div className="font-semibold text-foreground">
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <TagIcon className="h-3 w-3 text-violet-500" />
                      <span>Tags</span>
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {bookmark.tags && bookmark.tags.length > 0 ? (
                        bookmark.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-[10px] font-normal px-1.5 py-0 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-none"
                          >
                            #{tag.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Knowledge Document Section */}
                <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-4.5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-neutral-800/80 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span>AI Knowledge &amp; Site Summary</span>
                      </h3>
                      {saveSuccess && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                          <Check className="h-3 w-3" /> Saved in Database
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Page Metadata (0 Credits) */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleQuickExtract}
                        disabled={isScraping || isGeneratingAi}
                        className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                        title="Extract description directly from page metadata (0 AI Credits)"
                      >
                        {isScraping ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3 text-amber-500" />
                        )}
                        <span>Metadata (0 Credits)</span>
                      </Button>

                      {/* AI Generate Summary */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAiSummary}
                        disabled={isGeneratingAi || isScraping}
                        className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/60 shadow-2xs"
                        title="Generate high-accuracy smart summary using Gemini AI"
                      >
                        {isGeneratingAi ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <span>{isGeneratingAi ? "Generating..." : "AI Summary"}</span>
                      </Button>

                      {/* Edit Notes Toggle */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingDescription(!isEditingDescription)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit site notes manually"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Document Reader Mode vs. Inline Editor */}
                  {isEditingDescription ? (
                    <div className="space-y-2.5 animate-in fade-in">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Write detailed notes or description for this site..."
                        rows={6}
                        className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-foreground"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDescription(bookmark.description || "");
                            setIsEditingDescription(false);
                          }}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveDescription}
                          disabled={isSaving}
                          className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>Save to Database</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      {isGeneratingAi ? (
                        <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                          <p className="font-medium text-slate-700 dark:text-neutral-300">
                            Generating comprehensive AI summary...
                          </p>
                        </div>
                      ) : (
                        renderFormattedDescription(description)
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Live Preview Window */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span>Live Webpage Frame</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIframeKey((prev) => prev + 1)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Reload preview"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedPreview(!expandedPreview)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      title={expandedPreview ? "Compact height" : "Expand height"}
                    >
                      {expandedPreview ? (
                        <Minimize2 className="h-3 w-3" />
                      ) : (
                        <Maximize2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Helpful Note for Restricted Domains */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Iframe Security Restrictions</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                      Websites like GitHub, Google, Twitter, or Notion restrict cross-origin framing (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">X-Frame-Options: SAMEORIGIN</code>). If the frame below displays blank, use the button below to visit directly.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenExternal}
                      className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer pt-0.5"
                    >
                      <span>Open {bookmark.domain} in New Tab</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Iframe View */}
                <div
                  className={`relative rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-inner transition-all ${
                    expandedPreview ? "h-[580px]" : "h-[420px]"
                  }`}
                >
                  <iframe
                    key={iframeKey}
                    src={bookmark.url}
                    title={bookmark.title}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    className="w-full h-full border-none bg-white"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Bottom Action Bar */}
          <div className="px-6 py-3 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/80 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Copy Site to Folder button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCopyModalOpen(true)}
                className="h-8 text-xs cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 gap-1.5"
              >
                <FolderPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copy to Folder...</span>
              </Button>

              {/* Archive button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onToggleArchive?.(bookmark)}
                className="h-8 text-xs cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>{bookmark.isArchived ? "Unarchive" : "Archive"}</span>
              </Button>

              {/* Delete button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDeleteBookmark?.(bookmark.id, bookmark.title);
                  onOpenChange(false);
                }}
                className="h-8 text-xs cursor-pointer text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit details */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditBookmark?.(bookmark);
                }}
                className="h-8 text-xs cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                <span>Edit Details</span>
              </Button>

              {/* Open in New Tab */}
              <Button
                type="button"
                size="sm"
                onClick={handleOpenExternal}
                className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5 shadow-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in New Tab</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Bookmark to Destination Folder Modal */}
      <CopyBookmarkModal
        bookmark={bookmark}
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        folders={folders}
        onSuccess={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
          }
        }}
      />
    </>
  );
}
