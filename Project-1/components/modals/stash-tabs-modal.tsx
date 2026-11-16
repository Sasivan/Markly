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
  Columns3,
  RotateCcw,
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
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";

interface StashTabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StashTabsModal({ isOpen, onClose, onSuccess }: StashTabsModalProps) {
  const [folderName, setFolderName] = React.useState(
    `Session Stash — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
  );
  const [folderColor, setFolderColor] = React.useState("#3b82f6");
  const [rawText, setRawText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successCount, setSuccessCount] = React.useState<number | null>(null);

  // Resizable Modal Hook with horizontal/vertical persistence
  const {
    format,
    toggleFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "stash_tabs",
    defaultHorizontalWidth: 840,
    defaultVerticalWidth: 520,
    defaultHorizontalHeight: 540,
    defaultVerticalHeight: 560,
  });

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
          color: folderColor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to stash tabs");
      }

      setSuccessCount(data.bookmarksCount || detectedTabs.length);
      onSuccess?.();
      setTimeout(() => {
        onClose();
        setSuccessCount(null);
        setRawText("");
      }, 1500);
    } catch (e: any) {
      setError(e.message || "An error occurred while saving the session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        style={modalStyle}
        className="relative bg-card border-border p-5 text-foreground flex flex-col overflow-hidden max-w-[95vw] max-h-[92vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="space-y-1 pb-2.5 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center border text-white shadow-xs"
                style={{ backgroundColor: folderColor, borderColor: `${folderColor}80` }}
              >
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Stash Open Tabs</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Save multi-tab browsing sessions into a dedicated folder collection.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Format Toggle (Vertical vs Horizontal) */}
              <button
                type="button"
                onClick={() => toggleFormat(format === "horizontal" ? "vertical" : "horizontal")}
                title={`Switch to ${format === "horizontal" ? "Vertical" : "Horizontal"} popup`}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60"
              >
                <Columns3 className="h-3.5 w-3.5" />
              </button>

              {/* Restore Defaults Button */}
              {hasCustomSize && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  title="Restore default popup size"
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="my-2 p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successCount !== null ? (
          <div className="py-12 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
            <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              {successCount} tabs stashed into &quot;{folderName}&quot;!
            </div>
            <p className="text-xs text-muted-foreground">Your collection has been created successfully.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 py-3">
            <div className={`grid gap-4 ${format === "horizontal" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {/* Left Column: URLs & Folder Name */}
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
                    rows={format === "horizontal" ? 8 : 4}
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
              </div>

              {/* Universal Color Palette & Accent Picker */}
              <div className="space-y-2 p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">Session Accent Color</span>
                  <span className="text-[10px] text-muted-foreground block">Pick a color for the created stash folder</span>
                </div>
                <UniversalColorPicker
                  color={folderColor}
                  onChange={setFolderColor}
                  label="Session Accent Color"
                  compact={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        {successCount === null && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border flex-shrink-0">
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
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
              <span>Stash {detectedTabs.length > 0 ? `(${detectedTabs.length})` : ""} Tabs</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
