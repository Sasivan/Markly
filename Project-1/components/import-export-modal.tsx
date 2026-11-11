"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, Activity, FileText, Check, AlertCircle, Loader2, Bookmark, Puzzle, Sparkles } from "lucide-react";

interface ImportExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshData: () => void;
  onOpenSearch?: () => void;
}

export function ImportExportModal({ open, onOpenChange, onRefreshData }: ImportExportModalProps) {
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
      <DialogContent className="max-w-md p-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Import, Export & Health Check</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage your bookmarks portability and verify link availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4 text-xs">
          {/* Export Section */}
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 p-3.5 space-y-2 bg-slate-50/80 dark:bg-neutral-800/40">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Export Bookmarks</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Download your complete bookmark collection with folder structures.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href="/api/export?format=html"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-medium text-[11px] transition-colors shadow-2xs"
              >
                HTML (Browser standard)
              </a>
              <a
                href="/api/export?format=json"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-medium text-[11px] transition-colors shadow-2xs"
              >
                JSON
              </a>
              <a
                href="/api/export?format=csv"
                download
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-medium text-[11px] transition-colors shadow-2xs"
              >
                CSV
              </a>
            </div>
          </div>

          {/* Import Section */}
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 p-3.5 space-y-2 bg-slate-50/80 dark:bg-neutral-800/40">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Import Bookmarks</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
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
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                {importResult}
              </p>
            )}
          </div>

          {/* Health Check Section */}
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 p-3.5 space-y-2 bg-slate-50/80 dark:bg-neutral-800/40">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              <span>Link Health Check</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
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
              <p className="text-[11px] text-primary font-medium pt-1">
                {healthResult}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

