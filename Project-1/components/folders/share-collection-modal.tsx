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
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Download,
  Folder as FolderIcon,
  Globe,
  Lock,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import type { Folder, BookmarkWithDetails } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface ShareCollectionModalProps {
  folder: Folder | null;
  bookmarks: BookmarkWithDetails[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCollectionModal({
  folder,
  bookmarks,
  open,
  onOpenChange,
}: ShareCollectionModalProps) {
  const {
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "share_collection",
    defaultVerticalWidth: 480,
    defaultHorizontalWidth: 540,
    defaultVerticalHeight: 520,
    defaultHorizontalHeight: 520,
    minWidth: 380,
    minHeight: 400,
  });

  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const [shareToken, setShareToken] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [expiration, setExpiration] = React.useState<"never" | "24h" | "7d" | "30d">("never");
  const [password, setPassword] = React.useState("");

  const folderBookmarks = React.useMemo(() => {
    if (!folder) return [];
    return bookmarks.filter((b) => b.folderId === folder.id && !b.isArchived);
  }, [folder, bookmarks]);

  // Sync real database-backed share
  const syncShare = React.useCallback(async () => {
    if (!folder || !open || typeof window === "undefined") return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: folder.id,
          password: password.trim() || undefined,
          expiresIn: expiration,
        }),
      });
      const data = await res.json();
      if (data.success && data.share) {
        setShareToken(data.share.shareToken);
        setShareUrl(`${window.location.origin}/share/${data.share.shareToken}`);
        window.dispatchEvent(new CustomEvent("markly-shared-updated"));
      }
    } catch (e) {
      console.warn("Share sync notice:", e);
    } finally {
      setIsGenerating(false);
    }
  }, [folder, open, expiration, password]);

  React.useEffect(() => {
    syncShare();
  }, [syncShare]);

  const handleRevokeShare = async () => {
    if (!folder) return;
    setIsRevoking(true);
    try {
      await fetch(`/api/shares?folderId=${folder.id}`, { method: "DELETE" });
      setShareToken(null);
      setShareUrl("");
      window.dispatchEvent(new CustomEvent("markly-shared-updated"));
    } catch (e) {
      console.warn("Revoke error:", e);
    } finally {
      setIsRevoking(false);
    }
  };

  if (!folder) return null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyMarkdown = async () => {
    const lines = [
      `# ${folder.name}`,
      `Curated collection of ${folderBookmarks.length} links on Markly.\n`,
      ...folderBookmarks.map((b) => `- [${b.title || b.url}](${b.url})${b.description ? ` — ${b.description}` : ""}`),
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadJson = () => {
    const data = {
      collection: folder.name,
      exportedAt: new Date().toISOString(),
      linksCount: folderBookmarks.length,
      links: folderBookmarks.map((b) => ({
        title: b.title,
        url: b.url,
        domain: b.domain,
        description: b.description,
        tags: b.tags?.map((t) => (typeof t === "string" ? t : t.name)) || [],
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folder.name.toLowerCase().replace(/\s+/g, "-")}-collection.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative max-w-[95vw] bg-card border border-border p-5 shadow-2xl max-h-[92vh] overflow-y-auto rounded-xl"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Share2 className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Share Collection
              </DialogTitle>
            </div>

            {hasCustomSize && (
              <button
                type="button"
                onClick={handleRestoreDefaults}
                title="Restore default modal size"
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60 shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Share this curated folder collection publicly or export it as markdown or JSON.
          </DialogDescription>
        </DialogHeader>

        {/* Collection Summary Card */}
        <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderIconRenderer
              icon={folder.icon}
              color={folder.color}
              className="h-6 w-6 flex-shrink-0"
            />
            <div className="truncate">
              <div className="font-semibold text-xs text-foreground truncate">{folder.name}</div>
              <div className="text-[11px] font-mono text-muted-foreground">
                {folderBookmarks.length} link{folderBookmarks.length === 1 ? "" : "s"} ready to share
              </div>
            </div>
          </div>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="h-7 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-[11px] font-medium text-foreground flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Preview Page</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>

        {/* Link Security & Expiration Settings (Feature 5.2) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Link Expiration</span>
            </label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value as any)}
              className="w-full h-7.5 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="never">Never Expires</option>
              <option value="24h">Expires in 24 Hours</option>
              <option value="7d">Expires in 7 Days</option>
              <option value="30d">Expires in 30 Days</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span>Password (Optional)</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for public"
              className="w-full h-7.5 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Share Link Input */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-medium text-foreground flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Public Web Link</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 h-8 px-2.5 rounded-md bg-background border border-input text-xs text-foreground font-mono truncate focus:outline-none"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCopyLink}
              disabled={isGenerating || !shareUrl}
              className="h-8 px-3 cursor-pointer text-xs gap-1.5 flex-shrink-0"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </Button>
            {shareToken && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevokeShare}
                disabled={isRevoking}
                className="h-8 px-2.5 cursor-pointer text-xs text-destructive hover:bg-destructive/10 border-destructive/20 shrink-0"
                title="Revoke and delete this share link from database"
              >
                {isRevoking ? "Revoking..." : "Revoke"}
              </Button>
            )}
          </div>
        </div>

        {/* Additional Export Options */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="text-xs font-semibold text-foreground">Portable Exports</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center justify-center gap-1.5 h-8 px-2 rounded-md border border-border bg-secondary/40 hover:bg-secondary text-xs text-foreground cursor-pointer transition-colors"
            >
              {copiedMarkdown ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
              <span>{copiedMarkdown ? "Copied MD" : "Copy Markdown"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center justify-center gap-1.5 h-8 px-2 rounded-md border border-border bg-secondary/40 hover:bg-secondary text-xs text-foreground cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        <div className="mt-2 pt-3 border-t border-border flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

