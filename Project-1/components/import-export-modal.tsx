"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, Activity, FileText, Check, AlertCircle, Loader2, Bookmark, Puzzle, Sparkles, Copy, RotateCcw } from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";

interface ImportExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshData: () => void;
  onOpenSearch?: () => void;
}

export function ImportExportModal({ open, onOpenChange, onRefreshData }: ImportExportModalProps) {
  const {
    format,
    toggleFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "import_export",
    defaultVerticalWidth: 500,
    defaultHorizontalWidth: 560,
    defaultVerticalHeight: 520,
    defaultHorizontalHeight: 520,
    minWidth: 380,
    minHeight: 400,
  });

  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = React.useState(false);
  const [healthResult, setHealthResult] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.message);
        onRefreshData();
      } else {
        setImportResult(`Import failed: ${data.error}`);
      }
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setCheckingHealth(true);
    setHealthResult(null);
    try {
      const res = await fetch("/api/health-check", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setHealthResult(data.message);
        onRefreshData();
      } else {
        setHealthResult(`Check failed: ${data.error}`);
      }
    } catch (err: any) {
      setHealthResult(`Error: ${err.message}`);
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative max-w-[95vw] p-5 max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-semibold">Import, Export & Health Check</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Manage your bookmarks portability and verify link availability.
              </DialogDescription>
            </div>

            <ModalFormatControls
              format={format}
              onToggleFormat={toggleFormat}
              hasCustomSize={hasCustomSize}
              onRestoreDefaults={handleRestoreDefaults}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4 text-xs">
          {/* Export Section */}
          <div className="rounded-md border border-border p-3.5 space-y-2 bg-card">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Export Bookmarks</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Download your complete bookmark collection with folder structures.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href="/api/export?format=markdown"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs font-mono transition-colors"
              >
                Markdown (.md)
              </a>
              <a
                href="/api/export?format=notion-toggle"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium text-xs font-mono transition-colors"
                title="Notion Toggle List Markdown"
              >
                Notion Toggles
              </a>
              <a
                href="/api/export?format=canvas"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium text-xs font-mono transition-colors"
                title="Obsidian Canvas Mindmap (.canvas JSON)"
              >
                Obsidian Canvas (.canvas)
              </a>
              <a
                href="/api/export?format=notion"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs font-mono transition-colors"
              >
                Notion CSV
              </a>
              <a
                href="/api/export?format=raindrop"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs font-mono transition-colors"
              >
                Raindrop.io CSV
              </a>
              <a
                href="/api/export?format=html"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs font-mono transition-colors"
              >
                HTML (Browser standard)
              </a>
              <a
                href="/api/export?format=json"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs font-mono transition-colors"
              >
                JSON
              </a>
              <a
                href="/api/export?format=csv"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs font-mono transition-colors"
              >
                CSV
              </a>
            </div>
          </div>


          {/* Import Section */}
          <div className="rounded-md border border-border p-3.5 space-y-2 bg-card">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-primary" />
              <span>Import Bookmarks</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Upload exported HTML bookmarks from Chrome, Arc, Safari, Firefox, or JSON.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".html,.htm,.json"
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="text-xs h-7 gap-1.5"
            >
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              <span>{importing ? "Importing bookmarks..." : "Choose Bookmark File"}</span>
            </Button>
            {importResult && (
              <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                {importResult}
              </p>
            )}
          </div>

          {/* Health Check Section */}
          <div className="rounded-md border border-border p-3.5 space-y-2 bg-card">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Link Health Check</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Scan all saved bookmarks in background to flag broken or 404 links.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunHealthCheck}
              disabled={checkingHealth}
              className="text-xs h-7 gap-1.5"
            >
              {checkingHealth ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Activity className="h-3 w-3" />}
              <span>{checkingHealth ? "Scanning bookmarks..." : "Run Health Check"}</span>
            </Button>
            {healthResult && (
              <p className="text-xs font-mono text-primary font-medium pt-1">
                {healthResult}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

