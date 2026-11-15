"use client";

import * as React from "react";
import {
  Layers,
  Clipboard,
  FolderPlus,
  Loader2,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  Laptop,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StashTabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StashTabsModal({ isOpen, onClose, onSuccess }: StashTabsModalProps) {
  const [folderName, setFolderName] = React.useState(
    `Session Stash — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
  );
  const [rawText, setRawText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successCount, setSuccessCount] = React.useState<number | null>(null);

  // Parse lines/links from raw text
  const detectedTabs = React.useMemo(() => {
    if (!rawText.trim()) return [];
    const lines = rawText.split("\n");
    const urls: { title?: string; url: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check for Markdown link: [Title](url)
      const mdMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (mdMatch) {
        urls.push({ title: mdMatch[1], url: mdMatch[2] });
        continue;
      }

      // Check for raw URL: http:// or https:// or domain-like
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        urls.push({ url: urlMatch[1] });
      } else if (line.includes(".") && !line.includes(" ")) {
        urls.push({ url: `https://${line}` });
      }
    }

    return urls;
  }, [rawText]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
      }
    } catch {
      setError("Clipboard access denied. Please paste directly into the box.");
    }
  };

  const handleStash = async () => {
    if (detectedTabs.length === 0) {
      setError("Please paste at least one valid website URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bookmarks/stash-tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName: folderName.trim() || `Session Stash (${new Date().toLocaleDateString()})`,
          tabs: detectedTabs,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to stash tabs.");
      }

      setSuccessCount(data.bookmarksCount || detectedTabs.length);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccessCount(null);
        setRawText("");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to stash tabs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border p-5 text-foreground space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Stash Open Tabs</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Save multi-tab browsing sessions like Toby into a dedicated folder.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successCount !== null ? (
          <div className="py-6 text-center space-y-2">
            <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              {successCount} tabs stashed into &quot;{folderName}&quot;!
            </div>
            <p className="text-xs text-muted-foreground">Your collection has been created.</p>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            {/* Target Folder Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Session Collection Name</span>
              </label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Research Session, Morning Reading..."
                className="h-8 text-xs bg-background"
                disabled={loading}
              />
            </div>

            {/* Paste URLs Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Paste URLs (one per line)</span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Paste Clipboard</span>
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={5}
                placeholder="https://github.com&#10;https://react.dev&#10;https://news.ycombinator.com"
                className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={loading}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Detected: <strong className="text-foreground">{detectedTabs.length}</strong> links
                </span>
                <span className="text-[10px]">Supports Markdown links and raw URLs</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs cursor-pointer"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleStash}
                disabled={loading || detectedTabs.length === 0}
                className="h-8 text-xs bg-primary text-primary-foreground cursor-pointer gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                <span>Stash {detectedTabs.length > 0 ? `(${detectedTabs.length})` : ""} Tabs</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
