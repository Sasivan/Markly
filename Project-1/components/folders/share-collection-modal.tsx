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
} from "lucide-react";
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
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const [expiration, setExpiration] = React.useState<"never" | "24h" | "7d" | "30d">("never");
  const [password, setPassword] = React.useState("");

  const folderBookmarks = React.useMemo(() => {
    if (!folder) return [];
    return bookmarks.filter((b) => b.folderId === folder.id && !b.isArchived);
  }, [folder, bookmarks]);

  React.useEffect(() => {
    if (folder && typeof window !== "undefined") {
      let expiresAt: number | null = null;
      if (expiration === "24h") expiresAt = Date.now() + 24 * 3600 * 1000;
      else if (expiration === "7d") expiresAt = Date.now() + 7 * 24 * 3600 * 1000;
      else if (expiration === "30d") expiresAt = Date.now() + 30 * 24 * 3600 * 1000;

      // Build a portable lightweight public payload
      const payload: any = {
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        color: folder.color,
        expiresAt,
        passwordProtected: Boolean(password.trim()),
        passwordHash: password.trim() ? btoa(password.trim()) : undefined,
        items: folderBookmarks.map((b) => ({
          id: b.id,
          title: b.title,
          url: b.url,
          domain: b.domain,
          iconUrl: b.iconUrl,
          description: b.description || "",
          tags: b.tags?.map((t) => (typeof t === "string" ? t : t.name)) || [],
        })),
      };

      try {
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        const url = `${window.location.origin}/share/${folder.id}?data=${encoded}`;
        setShareUrl(url);

        // Register in local shared registry
        const stored = localStorage.getItem("markly_shared_folders");
        const list = stored ? JSON.parse(stored) : [];
        const existingIdx = list.findIndex((item: any) => item.folderId === folder.id);
        const record = {
          folderId: folder.id,
          name: folder.name,
          icon: folder.icon,
          color: folder.color,
          url,
          count: folderBookmarks.length,
          sharedAt: new Date().toISOString(),
          expiresAt,
          passwordProtected: Boolean(password.trim()),
        };
        if (existingIdx >= 0) {
          list[existingIdx] = record;
        } else {
          list.unshift(record);
        }
        localStorage.setItem("markly_shared_folders", JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("markly-shared-updated"));
      } catch {
        setShareUrl(`${window.location.origin}/share/${folder.id}`);
      }
    }
  }, [folder, folderBookmarks, expiration, password]);

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
      <DialogContent className="max-w-md bg-card border border-border p-5 shadow-xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Share Collection
            </DialogTitle>
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
              className="h-8 px-3 cursor-pointer text-xs gap-1.5 flex-shrink-0"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </Button>
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

