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
  Globe,
  Edit2,
  Trash2,
  Archive,
  FolderPlus,
  Loader2,
  FileText,
  CheckCircle2,
  X,
  ChevronDown,
  Plus,
  Play,
  Video,
  Code2,
  History,
  StickyNote,
  BookOpen,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Columns2,
  Rows3,
  RotateCcw,
} from "lucide-react";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { CopyBookmarkModal } from "./copy-bookmark-modal";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";
import { UniversalFolderSelect } from "@/components/ui/universal-folder-select";

type CoverStyle = "screenshot" | "gradient" | "icon";

const COVER_STYLE_OPTIONS = [
  { key: "screenshot" as const, label: "Snapshot", icon: ImageIcon, title: "Live website snapshot cover" },
  { key: "gradient" as const, label: "Gradient", icon: Sparkles, title: "Gradient art monogram cover" },
  { key: "icon" as const, label: "Logo", icon: Globe, title: "Domain brand icon cover" },
];

function CoverStyleSwitcher({
  value,
  onChange,
}: {
  value: CoverStyle;
  onChange: (style: CoverStyle) => void;
}) {
  return (
    <div className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-overlay">
      {COVER_STYLE_OPTIONS.map(({ key, label, icon: Icon, title }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          title={title}
          className={`inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-mono text-3xs transition-colors ${
            value === key
              ? "bg-foreground font-semibold text-background"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Icon className="h-2.5 w-2.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

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

function getDomainGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 42%, 20%) 0%, hsl(${h2}, 52%, 11%) 100%)`;
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
  const {
    format,
    toggleFormat,
    hasCustomSize,
    handleRestoreDefaults,
    modalStyle,
    startResize,
  } = useResizableModal({
    modalId: "site_preview",
    defaultHorizontalWidth: 840,
    defaultVerticalWidth: 540,
    defaultHorizontalHeight: 560,
    defaultVerticalHeight: 580,
  });

  const [description, setDescription] = React.useState("");
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [copiedNotes, setCopiedNotes] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [copyModalOpen, setCopyModalOpen] = React.useState(false);
  const [snapshotError, setSnapshotError] = React.useState(false);

  // 2.3: Inline Folder & Tag Editor state
  const [currentTags, setCurrentTags] = React.useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = React.useState(false);
  const [newTagInput, setNewTagInput] = React.useState("");
  const [folderSaving, setFolderSaving] = React.useState(false);
  const [tagsSaving, setTagsSaving] = React.useState(false);

  // 2.4: 1-Click Formatted Citations & Markdown Copy state
  const [copyMenuOpen, setCopyMenuOpen] = React.useState(false);
  const [copiedFormat, setCopiedFormat] = React.useState<string | null>(null);
  const copyMenuRef = React.useRef<HTMLDivElement>(null);

  // Advanced Feature States: Tabs, Notes, and Wayback Healer
  const [activeModalTab, setActiveModalTab] = React.useState<"overview" | "notes">("overview");
  const [personalNotes, setPersonalNotes] = React.useState("");
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [notesSaving, setNotesSaving] = React.useState(false);
  const [notesSuccess, setNotesSuccess] = React.useState(false);

  // Cover Style: "screenshot" (Live Site / og:image) vs "gradient" (Monogram Art) vs "icon" (Domain Logo)
  const [coverStyle, setCoverStyle] = React.useState<CoverStyle>("screenshot");

  React.useEffect(() => {
    if (bookmark?.id && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_cover_pref_${bookmark.id}`);
        if (stored === "screenshot" || stored === "snapshot") {
          setCoverStyle("screenshot");
        } else if (stored === "gradient" || stored === "icon") {
          setCoverStyle(stored);
        } else {
          setCoverStyle("screenshot");
        }
      } catch {}
    }
  }, [bookmark?.id]);

  const handleSetCoverStyle = (style: CoverStyle) => {
    setCoverStyle(style);
    if (style === "screenshot") {
      setSnapshotError(false);
    }
    if (bookmark?.id) {
      try {
        localStorage.setItem(`markly_cover_pref_${bookmark.id}`, style);
        window.dispatchEvent(new CustomEvent("markly-cover-updated", { detail: { id: bookmark.id, style } }));
      } catch {}
    }
  };

  const [isHealing, setIsHealing] = React.useState(false);
  const [healSuccess, setHealSuccess] = React.useState(false);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
    }
    if (copyMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [copyMenuOpen]);

  // Sync state whenever bookmark changes
  React.useEffect(() => {
    if (bookmark) {
      setDescription(bookmark.description || "");
      setCurrentTags(
        bookmark.tags?.map((t) => (typeof t === "string" ? t : t.name)) || []
      );
      setIsEditingDescription(false);
      setSaveSuccess(false);
      setSnapshotError(false);
      setIsAddingTag(false);
      setNewTagInput("");
      setCopyMenuOpen(false);
      setCopiedFormat(null);
      setPersonalNotes((bookmark as any).notes || "");
      setIsEditingNotes(false);
      setNotesSuccess(false);
      setHealSuccess(false);
      setActiveModalTab("overview");
    }
  }, [bookmark]);

  const videoEmbedUrl = React.useMemo(() => {
    if (!bookmark?.url) return null;
    try {
      const u = new URL(bookmark.url);
      if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
        return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
      }
      if (u.hostname.includes("youtu.be")) {
        return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
      }
      if (u.hostname.includes("vimeo.com")) {
        const parts = u.pathname.split("/").filter(Boolean);
        const vid = parts[parts.length - 1];
        if (vid && /^\d+$/.test(vid)) {
          return `https://player.vimeo.com/video/${vid}`;
        }
      }
    } catch {}
    return null;
  }, [bookmark?.url]);

  const gitHubInfo = React.useMemo(() => {
    if (!bookmark?.url) return null;
    try {
      const u = new URL(bookmark.url);
      if (u.hostname === "github.com" || u.hostname.endsWith(".github.com")) {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1];
          return {
            owner,
            repo,
            fullName: `${owner}/${repo}`,
            cloneUrl: `https://github.com/${owner}/${repo}.git`,
            isGist: u.hostname === "gist.github.com",
          };
        }
      }
    } catch {}
    return null;
  }, [bookmark?.url]);

  const isCodeUrl = Boolean(gitHubInfo);

  // Personal Notes Save
  const handleSaveNotes = async () => {
    if (!bookmark) return;
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: personalNotes.trim() }),
      });
      const data = await res.json();
      if (data.success && data.bookmark) {
        setNotesSuccess(true);
        setIsEditingNotes(false);
        onUpdateBookmark?.(data.bookmark);
        setTimeout(() => setNotesSuccess(false), 3000);
      }
    } catch (e) {
      console.warn("Failed to save notes:", e);
    } finally {
      setNotesSaving(false);
    }
  };

  // Wayback Machine Auto-Healer
  const handleHealWayback = async () => {
    if (!bookmark) return;
    setIsHealing(true);
    const waybackUrl = `https://web.archive.org/web/${bookmark.url}`;
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "alive",
          description: bookmark.description ? `${bookmark.description}\n\n[Wayback Archive Backup](${waybackUrl})` : `Archived snapshot available on Wayback Machine: ${waybackUrl}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.bookmark) {
        setHealSuccess(true);
        onUpdateBookmark?.(data.bookmark);
        setTimeout(() => setHealSuccess(false), 3000);
      }
    } catch (e) {
      console.warn("Wayback heal error:", e);
    } finally {
      setIsHealing(false);
    }
    window.open(waybackUrl, "_blank");
  };

  if (!bookmark) return null;

  const currentFolder = folders.find((f) => f.id === bookmark.folderId);

  // Verified visual image URL with automatic live screenshot fallback
  const snapshotUrl =
    bookmark.imageUrl && !bookmark.imageUrl.includes("avatar-") && !snapshotError
      ? bookmark.imageUrl
      : `https://s0.wp.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=800`;

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

  // 2.3: Inline Folder Change
  const handleInlineFolderChange = async (newFolderId: string) => {
    const targetId = newFolderId ? newFolderId : null;
    setFolderSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetId }),
      });
      const data = await res.json();
      if (data.success && data.bookmark) {
        onUpdateBookmark?.(data.bookmark);
        onMoveBookmark?.(bookmark.id, targetId);
      }
    } catch (e) {
      console.error("Failed to update folder:", e);
    } finally {
      setFolderSaving(false);
    }
  };

  // 2.3: Inline Tag Management
  const handleSaveTags = async (tagsToSave: string[]) => {
    setTagsSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames: tagsToSave }),
      });
      const data = await res.json();
      if (data.success && data.bookmark) {
        setCurrentTags(tagsToSave);
        onUpdateBookmark?.(data.bookmark);
      }
    } catch (e) {
      console.error("Failed to update tags:", e);
    } finally {
      setTagsSaving(false);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    const updated = currentTags.filter((t) => t.toLowerCase() !== tagName.toLowerCase());
    handleSaveTags(updated);
  };

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim().replace(/^#/, "");
    if (!trimmed || currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = [...currentTags, trimmed];
    handleSaveTags(updated);
    setNewTagInput("");
    setIsAddingTag(false);
  };

  // 2.4: 1-Click Formatted Citations & Markdown Copy
  const handleCopyCitation = async (type: "url" | "markdown" | "html" | "bibtex") => {
    let text = "";
    if (type === "url") {
      text = bookmark.url;
    } else if (type === "markdown") {
      text = `[${bookmark.title}](${bookmark.url})`;
    } else if (type === "html") {
      text = `<a href="${bookmark.url}">${bookmark.title}</a>`;
    } else if (type === "bibtex") {
      const cleanKey = (bookmark.domain || "site").replace(/[^a-zA-Z0-9]/g, "") + "_" + bookmark.id.slice(0, 6);
      text = `@misc{${cleanKey},\n  title = {{${bookmark.title}}},\n  howpublished = {\\url{${bookmark.url}}},\n  note = {Accessed on ${new Date().toISOString().slice(0, 10)}}\n}`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(type);
      setTimeout(() => setCopiedFormat(null), 2000);
      setCopyMenuOpen(false);
    } catch (e) {
      console.error("Copy error:", e);
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
            className="font-semibold text-foreground"
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
        <div className="py-8 text-center text-muted-foreground text-xs space-y-2 bg-secondary rounded-xl border border-dashed border-border p-4">
          <FileText className="h-7 w-7 mx-auto text-muted-foreground opacity-60" />
          <p className="font-semibold text-foreground text-sm">
            No description saved for this site.
          </p>
          <p className="text-muted-foreground text-xs">
            Click the edit button above to add notes or description.
          </p>
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
      <div className="space-y-4 text-sm leading-relaxed text-foreground font-sans">
        {/* Paragraphs with clean spacing */}
        {paragraphs.map((p, idx) => (
          <p
            key={idx}
            className="leading-relaxed text-foreground font-normal"
          >
            {parseInlineMarkdown(p)}
          </p>
        ))}

        {/* Structured Bullets / Highlights */}
        {bullets.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-border/60 space-y-2.5">
            <span className="text-xs font-mono text-muted-foreground block">
              Key Features & Highlights
            </span>
            <ul className="space-y-2">
              {bullets.map((b, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground leading-relaxed"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
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
        <DialogContent
          style={modalStyle}
          className="relative max-w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-raised rounded-lg"
        >
          <ModalResizeHandles onStartResize={startResize} />
          <DialogHeader className="sr-only">
            <DialogTitle>{bookmark.title} - Site Details</DialogTitle>
          </DialogHeader>

          {/* Top Header Bar */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-border/60 flex items-center justify-between gap-3 bg-card">
            {/* Left Zone: Favicon & Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
              <div className="h-9 w-9 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                <BookmarkIcon
                  src={bookmark.iconUrl}
                  alt={bookmark.title}
                  domain={bookmark.domain}
                  className="h-5 w-5 rounded-sm object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                {/* Clickable Title Link */}
                <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        onRecordVisit?.(bookmark);
                      } catch {}
                    }}
                    className="hover:text-primary hover:underline inline-flex items-center gap-1.5 truncate max-w-full"
                    title={`Open ${bookmark.url} in new tab`}
                  >
                    <span className="truncate">{bookmark.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 shrink-0" />
                  </a>
                </h2>

                {/* Domain & Status Badge */}
                <div className="flex items-center gap-2 mt-0.5 truncate">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        onRecordVisit?.(bookmark);
                      } catch {}
                    }}
                    className="text-xs text-muted-foreground hover:text-primary font-mono truncate hover:underline"
                    title={`Visit ${bookmark.domain}`}
                  >
                    {bookmark.domain}
                  </a>
                  <Badge
                    variant="outline"
                    className={`text-xs font-mono px-1.5 py-0 border shrink-0 ${
                      bookmark.status === "dead"
                        ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                        : "border-border text-muted-foreground bg-secondary"
                    }`}
                  >
                    {bookmark.status === "dead" ? "Broken Link" : "Active"}
                  </Badge>

                  {bookmark.status === "dead" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleHealWayback}
                      disabled={isHealing}
                      className="h-5 px-1.5 text-3xs font-mono border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 flex items-center gap-1 cursor-pointer"
                      title="Look up and restore link from Internet Archive (Wayback Machine)"
                    >
                      <History className="h-2.5 w-2.5" />
                      <span>{isHealing ? "Healing..." : "Heal via Wayback"}</span>
                    </Button>
                  )}

                  {healSuccess && (
                    <span className="text-3xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> Restored
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Zone: Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Favorite toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onToggleFavorite?.(bookmark)}
                className="h-8 px-2 sm:px-2.5 text-xs gap-1.5 cursor-pointer border-border hover:bg-secondary"
                title={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    bookmark.isFavorite
                      ? "text-amber-500 fill-amber-500"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="hidden md:inline">
                  {bookmark.isFavorite ? "Favorited" : "Favorite"}
                </span>
              </Button>

              {/* 2.4: 1-Click Formatted Citations & Markdown Copy */}
              <div ref={copyMenuRef} className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCopyMenuOpen((prev) => !prev)}
                  className="h-8 px-2 sm:px-2.5 text-xs gap-1 cursor-pointer border-border hover:bg-secondary"
                  title="Copy citation or formatted link (Markdown, HTML, BibTeX, URL)"
                >
                  {copiedFormat ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">Copied {copiedFormat}!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Copy</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                </Button>

                {copyMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-52 mk-menu text-xs">
                    <div className="px-2 py-1 text-2xs font-medium text-muted-foreground border-b border-border/50 mb-1">
                      Copy Link / Citation
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCitation("url")}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground">Plain URL</span>
                      <span className="font-mono text-3xs text-muted-foreground">https://...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCitation("markdown")}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground">Markdown Link</span>
                      <span className="font-mono text-3xs text-muted-foreground">[Title](url)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCitation("html")}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground">HTML Link</span>
                      <span className="font-mono text-3xs text-muted-foreground">&lt;a&gt;...&lt;/a&gt;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCitation("bibtex")}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground">BibTeX Citation</span>
                      <span className="font-mono text-3xs text-muted-foreground">@misc</span>
                    </button>
                  </div>
                )}
              </div>

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
                className="inline-flex items-center justify-center h-8 px-2.5 sm:px-3 text-xs font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1.5 transition-colors shrink-0"
                title="Open website in new browser tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Site</span>
              </a>

              {/* Format Toggle (Vertical vs Horizontal) & Reset Controls */}
              <ModalFormatControls
                format={format}
                onToggleFormat={toggleFormat}
                hasCustomSize={hasCustomSize}
                onRestoreDefaults={handleRestoreDefaults}
              />

              {/* Dedicated Close Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground shrink-0 rounded-md hover:bg-secondary"
                title="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="mk-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {/* Video Player Embed (YouTube / Vimeo) or Visual Snapshot Cover */}
            {videoEmbedUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video max-h-72 w-full shadow-surface">
                <iframe
                  src={videoEmbedUrl}
                  title={bookmark.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : coverStyle === "screenshot" ? (
              <div className="relative rounded-md overflow-hidden border border-border bg-card aspect-21/9 max-h-52 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={snapshotUrl}
                  alt={bookmark.title}
                  className="w-full h-full object-cover object-top"
                  onError={() => setSnapshotError(true)}
                />
                <CoverStyleSwitcher value={coverStyle} onChange={handleSetCoverStyle} />
                <div className="absolute inset-0 flex items-end justify-between bg-black/45 p-3.5">
                  <span className="text-white text-xs font-mono bg-black/55 px-2.5 py-0.5 rounded-sm">
                    {bookmark.domain}
                  </span>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        onRecordVisit?.(bookmark);
                      } catch {}
                    }}
                    className="text-xs font-mono text-white/90 hover:text-white bg-black/50 hover:bg-black/65 px-2.5 py-1 rounded-sm flex items-center gap-1.5 transition-colors"
                  >
                    <span>Visit Live Site</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : coverStyle === "icon" ? (
              <div className="relative rounded-md overflow-hidden border border-border aspect-21/9 max-h-48 flex flex-col items-center justify-center p-4 bg-muted/40 select-none group">
                <CoverStyleSwitcher value={coverStyle} onChange={handleSetCoverStyle} />

                <div className="p-4 rounded-xl bg-card border border-border shadow-surface mb-2 flex items-center justify-center">
                  <BookmarkIcon
                    src={bookmark.iconUrl}
                    alt={bookmark.title}
                    domain={bookmark.domain}
                    className="h-10 w-10 rounded object-contain"
                  />
                </div>
                <div className="text-sm font-semibold text-foreground truncate max-w-[85%] text-center tracking-tight">
                  {bookmark.title}
                </div>
                <div className="text-xs font-mono text-muted-foreground truncate max-w-[80%] text-center mt-0.5">
                  {bookmark.domain}
                </div>
              </div>
            ) : (
              <div
                className="relative rounded-md overflow-hidden border border-border aspect-21/9 max-h-48 flex flex-col items-center justify-center p-4 select-none group"
                style={{ background: getDomainGradient(bookmark.domain || bookmark.title || "markly") }}
              >
                <CoverStyleSwitcher value={coverStyle} onChange={handleSetCoverStyle} />
                <div className="p-3 rounded-md bg-black/30 border border-white/15 mb-2 flex items-center justify-center">
                  <BookmarkIcon
                    src={bookmark.iconUrl}
                    alt={bookmark.title}
                    domain={bookmark.domain}
                    className="h-8 w-8 rounded object-contain"
                  />
                </div>
                <div className="text-sm font-semibold text-white/95 truncate max-w-[85%] text-center tracking-tight">
                  {bookmark.title}
                </div>
                <div className="text-xs font-mono text-white/60 truncate max-w-[80%] text-center mt-0.5">
                  {bookmark.domain}
                </div>
                <div className="absolute inset-0 flex items-end justify-between bg-black/45 p-3.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-white text-xs font-mono bg-black/55 px-2.5 py-0.5 rounded-sm">
                    {bookmark.domain}
                  </span>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        onRecordVisit?.(bookmark);
                      } catch {}
                    }}
                    className="text-xs font-mono text-white/90 hover:text-white bg-black/50 hover:bg-black/65 px-2.5 py-1 rounded-sm flex items-center gap-1.5 transition-colors"
                  >
                    <span>Visit Live Site</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* 4.3: GitHub Repository / Gist Quick Code Preview Card */}
            {gitHubInfo && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-foreground/5 text-foreground flex items-center justify-center border border-border">
                      <Code2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground font-mono">
                        {gitHubInfo.fullName}
                      </div>
                      <div className="text-3xs text-muted-foreground">
                        {gitHubInfo.isGist ? "GitHub Gist Code Snippet" : "GitHub Repository"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`git clone ${gitHubInfo.cloneUrl}`);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="h-7 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-xs text-foreground font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Copy Git Clone Command"
                  >
                    {copiedUrl ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    <span>git clone</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notion-Style Properties Bar */}
            <div className="rounded-md border border-border bg-card p-3.5 space-y-2.5 text-xs">
              {/* Row 1: Direct URL */}
              <div className="flex items-center gap-3">
                <span className="w-16 text-xs font-mono text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
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
                    className="font-mono text-xs text-primary hover:underline truncate inline-flex items-center gap-1"
                    title={`Open ${bookmark.url}`}
                  >
                    <span className="truncate">{bookmark.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                  </a>
                </div>
              </div>

              {/* Row 2: Folder Location (2.3: Inline Editable with Universal Tree Picker) */}
              <div className="flex items-center gap-3">
                <span className="w-16 text-xs font-mono text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Folder</span>
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
                  <div className="flex-1 min-w-0">
                    <UniversalFolderSelect
                      folders={folders}
                      value={bookmark.folderId}
                      onChange={(id) => handleInlineFolderChange(id || "")}
                      disabled={folderSaving}
                      allowRoot={true}
                      rootLabel="Unsorted (Inbox)"
                      placeholder="Select destination folder..."
                    />
                  </div>
                  {folderSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                </div>
              </div>

              {/* Row 3: Tags (2.3: Inline Editable) */}
              <div className="flex items-center gap-3">
                <span className="w-16 text-xs font-mono text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Tags</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {currentTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs font-mono px-2 py-0.5 bg-secondary text-foreground border border-border/50 flex items-center gap-1"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={tagsSaving}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        title={`Remove tag #${tag}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}

                  {isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag(newTagInput);
                          } else if (e.key === "Escape") {
                            setIsAddingTag(false);
                          }
                        }}
                        placeholder="tag name..."
                        autoFocus
                        className="h-6 px-1.5 w-24 text-2xs font-mono rounded bg-background border border-input text-foreground focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag(newTagInput)}
                        className="h-6 px-1.5 text-2xs rounded bg-primary text-primary-foreground cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(false)}
                        className="h-6 px-1 text-muted-foreground cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="text-xs font-mono px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>Add tag</span>
                    </button>
                  )}
                  {tagsSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              </div>

              {/* Row 4: Grid stats (Visits & Saved Date) */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">Visits:</span>
                  <span className="font-mono text-xs text-foreground">
                    {bookmark.visitCount} {bookmark.visitCount === 1 ? "open" : "opens"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">Saved:</span>
                  <span className="font-mono text-xs text-foreground">
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Tabs: Overview, Notes & Offline Snapshot */}
            <div className="inline-flex items-center gap-0.5 self-start rounded-md border border-border bg-secondary/60 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveModalTab("overview")}
                aria-pressed={activeModalTab === "overview"}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                  activeModalTab === "overview"
                    ? "bg-card text-foreground shadow-surface"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("notes")}
                aria-pressed={activeModalTab === "notes"}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                  activeModalTab === "notes"
                    ? "bg-card text-foreground shadow-surface"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <StickyNote className="h-3.5 w-3.5" />
                <span>Personal Notes</span>
                {personalNotes && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
            </div>

            {/* TAB 1: Overview & Knowledge */}
            {activeModalTab === "overview" && (
              <div className="rounded-md border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>Site Overview & Knowledge</span>
                    </h3>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mk-fade-in">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved in Database
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {description && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyNotes}
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                        title="Copy description to clipboard"
                      >
                        {copiedNotes ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 text-xs font-mono">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="text-xs font-mono">Copy</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDescription(!isEditingDescription)}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                      title="Edit description manually"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span className="text-xs font-mono">Edit</span>
                    </Button>
                  </div>
                </div>

                {isEditingDescription ? (
                  <div className="space-y-3">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                          e.preventDefault();
                          handleSaveDescription();
                        }
                      }}
                      placeholder="Write description or overview for this site (Markdown supported)..."
                      rows={8}
                      className="w-full text-xs sm:text-sm p-3.5 bg-background border border-border rounded-md leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-ring font-sans text-foreground font-mono"
                    />
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-3xs">
                        <span>Markdown supported</span>
                        <span>•</span>
                        <span>Ctrl+S to save</span>
                        <span>•</span>
                        <span>{description.trim().split(/\s+/).filter(Boolean).length} words</span>
                      </div>
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
                          className="h-7 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1.5"
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          <span>Save to Database</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    {renderFormattedDescription(description)}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Personal Notes & Highlights */}
            {activeModalTab === "notes" && (
              <div className="rounded-md border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-emerald-500" />
                      <span>Personal Takeaways & Notes</span>
                    </h3>
                    {notesSuccess && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mk-fade-in">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Notes Saved in SQLite
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(!isEditingNotes)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>{isEditingNotes ? "Preview" : "Edit Notes"}</span>
                  </Button>
                </div>

                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={personalNotes}
                      onChange={(e) => setPersonalNotes(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                          e.preventDefault();
                          handleSaveNotes();
                        }
                      }}
                      placeholder="Write personal takeaways, quotes, key findings, or thoughts for this site..."
                      rows={8}
                      className="w-full text-xs sm:text-sm p-3.5 bg-background border border-border rounded-md leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-ring font-sans text-foreground"
                    />
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span className="text-3xs">Ctrl+S to save directly to local SQLite DB</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={notesSaving}
                        className="h-7 text-xs bg-primary text-primary-foreground cursor-pointer gap-1.5 shadow-surface"
                      >
                        {notesSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span>Save Notes to DB</span>
                      </Button>
                    </div>
                  </div>
                ) : personalNotes ? (
                  <div className="space-y-2 py-1">
                    <div className="p-3.5 rounded-lg bg-secondary/40 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {personalNotes}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-xs space-y-2 rounded-xl border border-dashed border-border p-4">
                    <StickyNote className="h-7 w-7 mx-auto text-emerald-500/60" />
                    <p className="font-semibold text-foreground text-sm">No personal notes added yet.</p>
                    <p className="text-muted-foreground text-xs">Jot down why you saved this bookmark, key quotes, or action items.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingNotes(true)}
                      className="h-7 text-xs cursor-pointer mt-1"
                    >
                      <span>Add Note</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Bottom Action Bar */}
          <div className="px-5 sm:px-6 py-3 border-t border-border/60 bg-card flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Copy Site to Folder button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCopyModalOpen(true)}
                className="h-8 text-xs cursor-pointer border-border hover:bg-secondary text-foreground gap-1.5"
              >
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy to Folder...</span>
              </Button>

              {/* Archive button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onToggleArchive?.(bookmark)}
                className="h-8 text-xs cursor-pointer border-border hover:bg-secondary text-foreground gap-1.5"
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
                className="h-8 text-xs cursor-pointer border-border hover:bg-accent text-foreground gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5 text-primary" />
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
                className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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
