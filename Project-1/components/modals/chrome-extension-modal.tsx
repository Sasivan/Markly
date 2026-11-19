"use client";

import * as React from "react";
import JSZip from "jszip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Puzzle,
  Download,
  CheckCircle2,
  ExternalLink,
  Keyboard,
  ShieldCheck,
  FolderTree,
  Tag,
  Star,
  Copy,
  Check,
} from "lucide-react";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";
import { useResizableModal } from "@/lib/use-resizable-modal";

interface ChromeExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChromeExtensionModal({
  open,
  onOpenChange,
}: ChromeExtensionModalProps) {
  const [downloading, setDownloading] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const {
    format,
    toggleFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "chrome_extension_modal",
    defaultVerticalWidth: 620,
    defaultHorizontalWidth: 780,
    defaultVerticalHeight: 600,
    defaultHorizontalHeight: 520,
    minWidth: 460,
    minHeight: 400,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const files = ["manifest.json", "popup.html", "popup.js", "background.js"];
      for (const f of files) {
        const res = await fetch(`/extension/${f}`);
        if (!res.ok) throw new Error(`Failed to load ${f}`);
        const content = await res.text();
        zip.file(f, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "markly-chrome-extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate extension zip:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyChromeUrl = async () => {
    try {
      await navigator.clipboard.writeText("chrome://extensions");
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="p-6 max-h-[92vh] overflow-y-auto flex flex-col justify-between transition-none duration-0 select-none relative"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
                <Puzzle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span>Markly Chrome Extension</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                    Manifest V3 Ready
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Save any webpage, article, or site into your Markly library with 1 click from your browser.
                </DialogDescription>
              </div>
            </div>
            <ModalFormatControls
              format={format}
              onToggleFormat={toggleFormat}
              hasCustomSize={hasCustomSize}
              onRestoreDefaults={handleRestoreDefaults}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-3 text-xs">
          {/* Key Features Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <FolderTree className="h-3.5 w-3.5 text-primary" />
                <span>Pick Folder</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Directly select destination folder collection or send to Inbox.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Tag className="h-3.5 w-3.5 text-teal-500" />
                <span>Add Tags & Notes</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Add comma-separated tags, custom description, and personal notes.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>1-Click Star</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pin favorites immediately to Quick Access and Starred Sites.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Keyboard className="h-3.5 w-3.5 text-purple-500" />
                <span>Shortcut Alt+M</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Press Alt+M on any active webpage to trigger the saver instantly.
              </p>
            </div>
          </div>

          {/* Installation Steps */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="font-semibold text-foreground text-xs flex items-center justify-between">
              <span>Quick 3-Step Installation Guide:</span>
              <button
                type="button"
                onClick={handleCopyChromeUrl}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-normal"
              >
                {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedLink ? "Copied chrome://extensions" : "Copy chrome://extensions URL"}</span>
              </button>
            </div>

            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-foreground">Download extension files:</strong> Click the button below to download the extension package into a folder (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">Downloads/markly-extension</code>).
              </li>
              <li>
                <strong className="text-foreground">Open Chrome Extensions:</strong> In Google Chrome (or Edge/Brave), navigate to <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">chrome://extensions</code>.
              </li>
              <li>
                <strong className="text-foreground">Enable Developer Mode & Load:</strong> Toggle on <strong>Developer mode</strong> in the top-right corner, click <strong>Load unpacked</strong>, and select the downloaded folder!
              </li>
            </ol>
          </div>

          {/* Download & Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>No third-party tracking • Works with local and cloud Markly</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 cursor-pointer"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 gap-1.5 cursor-pointer shadow-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloading ? "Generating ZIP..." : "Download Extension ZIP"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={(e) => startResize("corner", e)}
          className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-muted-foreground/40 hover:text-foreground select-none z-50 text-[10px]"
          title="Drag to resize dialog"
        >
          ⋰
        </div>
      </DialogContent>
    </Dialog>
  );
}

