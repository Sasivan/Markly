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
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Globe,
  Edit2,
  Trash2,
  Archive,
  FolderPlus,
  Loader2,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { CopyBookmarkModal } from "./copy-bookmark-modal";
import { useAuth } from "@/components/auth/auth-context";
import {
  getAiRequestHeaders,
  getDailyAiQuota,
  incrementDailyAiUsage,
  type DailyAiQuota,
} from "@/lib/ai-config";

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
  const [description, setDescription] = React.useState("");
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [copiedNotes, setCopiedNotes] = React.useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [isExtractingCode, setIsExtractingCode] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [copyModalOpen, setCopyModalOpen] = React.useState(false);
  const [quotaWarning, setQuotaWarning] = React.useState<string | null>(null);

  // Daily AI quota state
  const [aiQuota, setAiQuota] = React.useState<DailyAiQuota>(() =>
    getDailyAiQuota(user?.id)
  );

  React.useEffect(() => {
    const syncQuota = () => {
      setAiQuota(getDailyAiQuota(user?.id));
    };
    syncQuota();
    window.addEventListener("markly-ai-quota-updated", syncQuota);
    window.addEventListener("storage", syncQuota);
    return () => {
      window.removeEventListener("markly-ai-quota-updated", syncQuota);
      window.removeEventListener("storage", syncQuota);
    };
  }, [user?.id]);

  // Sync state whenever bookmark changes
  React.useEffect(() => {
    if (bookmark) {
      setDescription(bookmark.description || "");
      setIsEditingDescription(false);
      setSaveSuccess(false);
      setQuotaWarning(null);
    }
  }, [bookmark]);

  if (!bookmark) return null;

  const currentFolder = folders.find((f) => f.id === bookmark.folderId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyNotes = () => {
    if (!description) return;
    navigator.clipboard.writeText(description);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  // 1. Built-in Code / Library Extractor (0 AI Credits)
  const handleExtractWithCode = async () => {
    setIsExtractingCode(true);
    setQuotaWarning(null);
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

  // 2. Optional AI Summary Generator (Gemini) with Daily Limit Check
  const handleGenerateAiSummary = async () => {
    setQuotaWarning(null);
    const quota = getDailyAiQuota(user?.id);

    if (quota.isQuotaExceeded && !quota.hasCustomKey) {
      setQuotaWarning(
        `Daily free AI limit (${quota.limit}/${quota.limit}) reached. Free credits reset tomorrow at midnight UTC. You can still use "Code Extract (0 Credits)" for unlimited summaries, or enter your personal Gemini API key in your Profile.`
      );
      return;
    }

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
        incrementDailyAiUsage(user?.id);
        setAiQuota(getDailyAiQuota(user?.id));
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

  // Parse markdown bold **text** safely into React nodes
  const parseInlineMarkdown = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong
            key={i}
            className="font-semibold text-slate-900 dark:text-neutral-100"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Render clear, formatted rich text with distinct paragraphs, headings, and styled bullet points
  const renderFormattedDescription = (text: string) => {
    if (!text.trim()) {
      return (
        <div className="py-10 text-center text-muted-foreground text-xs space-y-3.5 bg-slate-50/50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-slate-200 dark:border-neutral-800">
          <FileText className="h-9 w-9 mx-auto text-indigo-400 opacity-60" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 dark:text-neutral-200 text-sm">
              No description or notes saved yet.
            </p>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto">
              Extract a structured summary with 1-click built-in code (0 credits) or use Google Gemini AI.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExtractWithCode}
              disabled={isExtractingCode}
              className="h-8 text-xs cursor-pointer gap-1.5 border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Extract with Code (0 Credits)</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateAiSummary}
              disabled={isGeneratingAi}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer gap-1.5 shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                AI Summary (
                {aiQuota.hasCustomKey
                  ? "Unlimited"
                  : `${aiQuota.remaining} left`}
                )
              </span>
            </Button>
          </div>
        </div>
      );
    }

    const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets: string[] = [];
    const paragraphs: string[] = [];

    rawLines.forEach((line) => {
      if (
        line.startsWith("•") ||
        line.startsWith("- ") ||
        line.startsWith("* ") ||
        line.startsWith("+ ")
      ) {
        bullets.push(line.replace(/^[•\-\*\+]\s*/, ""));
      } else {
        paragraphs.push(line);
      }
    });

    return (
      <div className="space-y-4 text-sm leading-relaxed text-slate-800 dark:text-neutral-200 font-sans">
        {/* Paragraphs with clean spacing */}
        {paragraphs.map((p, idx) => (
          <p
            key={idx}
            className="leading-relaxed text-slate-800 dark:text-neutral-200 font-normal"
          >
            {parseInlineMarkdown(p)}
          </p>
        ))}

        {/* Structured Bullets / Highlights */}
        {bullets.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-neutral-800/80 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block">
              Key Features &amp; Highlights
            </span>
            <ul className="space-y-2">
              {bullets.map((b, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 leading-relaxed"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-2 shrink-0" />
                  <span>{parseInlineMarkdown(b)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const wordCount = description.trim()
    ? description.trim().split(/\s+/).length
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#141414] border-slate-200 dark:border-neutral-800 shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{bookmark.title} - Site Details</DialogTitle>
          </DialogHeader>

          {/* Top Header Bar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-2xs">
                <BookmarkIcon
                  src={bookmark.iconUrl}
                  alt={bookmark.title}
                  domain={bookmark.domain}
                  className="h-5 w-5 rounded-sm object-contain"
                />
              </div>
              <div className="min-w-0">
                {/* Clickable Title Link */}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    try {
                      onRecordVisit?.(bookmark);
                    } catch {}
                  }}
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1.5 truncate group"
                  title={`Open ${bookmark.url} in new tab`}
                >
                  <span className="truncate">{bookmark.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </a>

                {/* Domain & Status Badge */}
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        onRecordVisit?.(bookmark);
                      } catch {}
                    }}
                    className="text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 font-mono truncate hover:underline"
                    title={`Visit ${bookmark.domain}`}
                  >
                    {bookmark.domain}
                  </a>
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

            {/* Header Actions */}
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
                    <span className="hidden sm:inline text-emerald-600 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </Button>

              {/* Native Open External Link */}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    onRecordVisit?.(bookmark);
                  } catch {}
                }}
                className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5 shadow-2xs transition-colors"
                title="Open website in new browser tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Site</span>
              </a>
            </div>
          </div>

          {/* Modal Body - Pure Notion-style Details & Knowledge */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Notion-Style Properties Bar */}
            <div className="rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 p-4 space-y-3 text-xs">
              {/* Row 1: Direct URL */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <span>URL</span>
                </span>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        onRecordVisit?.(bookmark);
                      } catch {}
                    }}
                    className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline truncate inline-flex items-center gap-1"
                    title={`Open ${bookmark.url}`}
                  >
                    <span className="truncate">{bookmark.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                  </a>
                </div>
              </div>

              {/* Row 2: Folder Location */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <FolderIcon className="h-3.5 w-3.5 text-indigo-500" />
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

              {/* Row 3: Tags */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <TagIcon className="h-3.5 w-3.5 text-violet-500" />
                  <span>Tags</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {bookmark.tags && bookmark.tags.length > 0 ? (
                    bookmark.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-none"
                      >
                        #{tag.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[11px]">No tags assigned</span>
                  )}
                </div>
              </div>

              {/* Row 4: Grid stats (Visits & Saved Date) */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Visits:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {bookmark.visitCount} {bookmark.visitCount === 1 ? "open" : "opens"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Saved:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quota Exhausted Alert Banner */}
            {quotaWarning && (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">Daily Free AI Limit Reached</p>
                  <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    {quotaWarning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuotaWarning(null)}
                  className="text-amber-700 dark:text-amber-400 hover:underline text-[11px] font-bold cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Structured Knowledge Document Section */}
            <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 space-y-4 shadow-xs">
              {/* Section Header & Enrichment Toolbar */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800/80 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span>Site Overview &amp; Knowledge</span>
                  </h3>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved in Database
                    </span>
                  )}
                </div>

                {/* Enrichment Action Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
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

                  {/* Optional AI Summary (Gemini) with credit indicator */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAi || isExtractingCode}
                    className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/70 shadow-2xs"
                    title={`Generate summary using Gemini AI. ${
                      aiQuota.hasCustomKey
                        ? "Personal API key active (Unlimited requests)"
                        : `Free tier: ${aiQuota.remaining} of ${aiQuota.limit} daily credits left`
                    }`}
                  >
                    {isGeneratingAi ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <span>
                      AI Summary (
                      {aiQuota.hasCustomKey
                        ? "Unlimited"
                        : `${aiQuota.remaining} left`}
                      )
                    </span>
                  </Button>

                  {/* Copy Description text */}
                  {description && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyNotes}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy description to clipboard"
                    >
                      {copiedNotes ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}

                  {/* Edit Notes Toggle */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDescription(!isEditingDescription)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Edit description manually"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Document Reader Mode vs. Inline Editor */}
              {isEditingDescription ? (
                <div className="space-y-3 animate-in fade-in">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write detailed notes or description for this site..."
                    rows={8}
                    className="w-full text-xs sm:text-sm p-4 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-foreground"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {description.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    <div className="flex items-center gap-2">
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
                        className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5"
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
                </div>
              ) : (
                <div className="py-1">
                  {isGeneratingAi || isExtractingCode ? (
                    <div className="py-8 text-center text-xs text-muted-foreground space-y-2.5">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                      <p className="font-semibold text-slate-800 dark:text-neutral-200 text-sm">
                        {isGeneratingAi
                          ? "Generating clear AI summary..."
                          : "Extracting structured summary with built-in code..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isGeneratingAi
                          ? "Using Google Gemini to extract key features and overview"
                          : "Extracting metadata and article text (0 AI credits used)"}
                      </p>
                    </div>
                  ) : (
                    renderFormattedDescription(description)
                  )}
                </div>
              )}

              {/* Document Footer Info */}
              {!isEditingDescription && description && (
                <div className="pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{wordCount} words • Saved in Database</span>
                  <span className="font-mono text-[10px]">
                    Status: {bookmark.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Bottom Action Bar */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/80 flex items-center justify-between gap-3 flex-wrap">
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

              {/* Native Open in New Tab Button */}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    onRecordVisit?.(bookmark);
                  } catch {}
                }}
                className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5 shadow-xs transition-colors"
                title="Open website in new browser tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in New Tab</span>
              </a>
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
