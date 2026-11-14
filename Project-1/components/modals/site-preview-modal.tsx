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
  Camera,
  Lock,
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
  const [previewMode, setPreviewMode] = React.useState<"snapshot" | "iframe">("snapshot");
  const [description, setDescription] = React.useState("");
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [isExtractingCode, setIsExtractingCode] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [snapshotKey, setSnapshotKey] = React.useState(0);
  const [iframeKey, setIframeKey] = React.useState(0);
  const [copyModalOpen, setCopyModalOpen] = React.useState(false);
  const [snapshotError, setSnapshotError] = React.useState(false);

  // Sync state whenever bookmark changes - DO NOT auto-fire AI calls
  React.useEffect(() => {
    if (bookmark) {
      setDescription(bookmark.description || "");
      setIsEditingDescription(false);
      setSaveSuccess(false);
      setSnapshotError(false);
      setSnapshotKey((prev) => prev + 1);
      setIframeKey((prev) => prev + 1);
      setActiveTab("overview");
      setPreviewMode("snapshot");
    }
  }, [bookmark]);

  if (!bookmark) return null;

  const currentFolder = folders.find((f) => f.id === bookmark.folderId);

  // Reliable visual screenshot URL (never blocked by X-Frame-Options)
  const snapshotUrl =
    bookmark.imageUrl && !bookmark.imageUrl.includes("avatar-") && !snapshotError
      ? bookmark.imageUrl
      : `https://image.thum.io/get/width/1200/crop/800/${bookmark.url}`;

  const handleOpenExternal = () => {
    onRecordVisit?.(bookmark);
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 1. Built-in Code / Library Extractor (0 AI Credits)
  const handleExtractWithCode = async () => {
    setIsExtractingCode(true);
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
      console.warn("Failed to extract with code/library:", e);
    } finally {
      setIsExtractingCode(false);
    }
  };

  // 2. Optional AI Summary Generator (Gemini)
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
        <div className="py-8 text-center text-muted-foreground text-xs space-y-3">
          <FileText className="h-8 w-8 mx-auto text-indigo-400 opacity-60" />
          <p className="font-medium text-slate-700 dark:text-neutral-300">No description saved yet.</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExtractWithCode}
              disabled={isExtractingCode}
              className="h-7 text-xs cursor-pointer gap-1.5"
            >
              <Zap className="h-3 w-3 text-amber-500" />
              <span>Extract with Code (0 Credits)</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateAiSummary}
              disabled={isGeneratingAi}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer gap-1.5 shadow-2xs"
            >
              <Sparkles className="h-3 w-3" />
              <span>AI Summary (Gemini)</span>
            </Button>
          </div>
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
      <div className="space-y-3 text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed font-sans">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="leading-relaxed">
            {p}
          </p>
        ))}

        {bullets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block">
              Key Features &amp; Topics
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

          {/* Clean View Tabs: Document Overview | Live Webpage Preview */}
          <div className="px-6 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-1 bg-white dark:bg-[#151515]">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Overview &amp; Knowledge</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
                activeTab === "preview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Webpage Preview (Visual)</span>
            </button>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {activeTab === "overview" ? (
              <div className="space-y-5">
                {/* Visual Snapshot Card */}
                <div
                  onClick={handleOpenExternal}
                  className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 aspect-21/9 max-h-56 shadow-2xs group cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={snapshotUrl}
                    alt={bookmark.title}
                    className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-300"
                    onError={() => setSnapshotError(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-3.5">
                    <span className="text-white text-xs font-medium bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded">
                      {bookmark.domain}
                    </span>
                    <span className="text-[11px] text-white/90 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <span>Open Live Site</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>

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
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span>Description &amp; Overview</span>
                      </h3>
                      {saveSuccess && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                          <Check className="h-3 w-3" /> Saved in Database
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Built-in Code/Library Extraction (0 AI Credits) */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExtractWithCode}
                        disabled={isExtractingCode || isGeneratingAi}
                        className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                        title="Extract structured summary from HTML using built-in code (0 AI credits)"
                      >
                        {isExtractingCode ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3 text-amber-500" />
                        )}
                        <span>Code Extract (0 Credits)</span>
                      </Button>

                      {/* Optional AI Summary */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAiSummary}
                        disabled={isGeneratingAi || isExtractingCode}
                        className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/60 shadow-2xs"
                        title="Optional AI summary using Gemini LLM"
                      >
                        {isGeneratingAi ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <span>AI Summary</span>
                      </Button>

                      {/* Edit Notes Toggle */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingDescription(!isEditingDescription)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit notes manually"
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
                      {isGeneratingAi || isExtractingCode ? (
                        <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500" />
                          <p className="font-medium text-slate-700 dark:text-neutral-300">
                            {isGeneratingAi ? "Generating AI summary..." : "Extracting structured summary with built-in code..."}
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
              /* Webpage Preview View (Visual Snapshot - Never Blocked) */
              <div className="space-y-3">
                {/* Simulated Desktop Browser Frame */}
                <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] overflow-hidden shadow-md flex flex-col">
                  {/* Browser Top Navigation Bar */}
                  <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-neutral-850 border-b border-slate-200 dark:border-neutral-700 flex items-center justify-between gap-3 text-xs">
                    {/* Traffic Light Dots */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    </div>

                    {/* URL Address Bar */}
                    <div className="flex-1 max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-md px-3 py-1 flex items-center gap-2 border border-slate-200 dark:border-neutral-700 shadow-inner truncate">
                      <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-mono text-[11px] text-slate-700 dark:text-neutral-300 truncate">
                        {bookmark.url}
                      </span>
                    </div>

                    {/* Mode Switcher & Reload */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-200/80 dark:bg-neutral-800 p-0.5 rounded-lg border border-slate-300 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("snapshot")}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            previewMode === "snapshot"
                              ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="High-resolution visual screenshot (Never blocked by websites)"
                        >
                          Visual Snapshot
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode("iframe")}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            previewMode === "iframe"
                              ? "bg-white dark:bg-neutral-700 text-foreground shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Try live interactive iframe"
                        >
                          Live Iframe
                        </button>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSnapshotKey((k) => k + 1);
                          setIframeKey((k) => k + 1);
                        }}
                        className="h-7 w-7 p-0 cursor-pointer"
                        title="Reload preview"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleOpenExternal}
                        className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1 shadow-2xs"
                      >
                        <span>Open Site</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Browser Body */}
                  {previewMode === "snapshot" ? (
                    <div
                      onClick={handleOpenExternal}
                      className="relative bg-slate-900 min-h-[440px] max-h-[620px] overflow-hidden cursor-pointer group flex items-start justify-center"
                    >
                      {/* High-Resolution Live Webpage Snapshot */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={snapshotKey}
                        src={snapshotUrl}
                        alt={`Snapshot of ${bookmark.title}`}
                        className="w-full h-auto object-cover object-top transition-transform duration-300 group-hover:scale-101"
                        onError={() => setSnapshotError(true)}
                      />

                      {/* Click overlay banner */}
                      <div className="absolute bottom-4 inset-x-4 max-w-sm mx-auto bg-slate-950/85 backdrop-blur-md text-white text-xs px-4 py-2 rounded-xl shadow-xl border border-white/10 flex items-center justify-between gap-2 opacity-95 group-hover:opacity-100 group-hover:scale-102 transition-all">
                        <div className="flex items-center gap-2 truncate">
                          <Camera className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="truncate">Visual Webpage Snapshot</span>
                        </div>
                        <span className="font-semibold text-blue-400 flex items-center gap-1 shrink-0">
                          Visit Site ↗
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {/* Iframe Notice & Quick Fallback */}
                      <div className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
                        <span className="truncate">
                          ⚠️ If you see &quot;This content is blocked&quot;, this site prevents embedding via <code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900/60 px-1 rounded">X-Frame-Options</code>.
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewMode("snapshot")}
                          className="font-bold underline hover:text-amber-950 dark:hover:text-amber-100 shrink-0 cursor-pointer"
                        >
                          Switch to Snapshot
                        </button>
                      </div>

                      <div className="h-[480px] bg-white">
                        <iframe
                          key={iframeKey}
                          src={bookmark.url}
                          title={bookmark.title}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          className="w-full h-full border-none"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}
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
