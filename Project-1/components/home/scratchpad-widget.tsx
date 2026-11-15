"use client";

import * as React from "react";
import { StickyNote, Copy, Check, Trash2, Eye, EyeOff } from "lucide-react";

interface ScratchpadWidgetProps {
  bare?: boolean;
}

export function ScratchpadWidget({ bare = false }: ScratchpadWidgetProps) {
  const [content, setContent] = React.useState("");
  const [previewMode, setPreviewMode] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("markly_home_scratchpad");
      if (saved) {
        setContent(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    try {
      localStorage.setItem("markly_home_scratchpad", val);
      setLastSaved("Saved just now");
    } catch {
      // ignore
    }
  };

  const handleCopy = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    if (!content.trim()) return;
    if (window.confirm("Clear all scratchpad notes?")) {
      setContent("");
      try {
        localStorage.removeItem("markly_home_scratchpad");
        setLastSaved(null);
      } catch {
        // ignore
      }
    }
  };

  const wordsCount = React.useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  if (bare) {
    return (
      <div className="p-4 space-y-3">
        {/* Top action bar */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-mono text-muted-foreground">
            {lastSaved || "Markdown notes • Auto-saved"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreviewMode((prev) => !prev)}
              title={previewMode ? "Switch to Edit mode" : "Switch to Preview mode"}
              className="h-6 px-2 rounded-md border border-border bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            >
              {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{previewMode ? "Edit" : "Preview"}</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!content.trim()}
              title="Copy notes to clipboard"
              className="h-6 px-2 rounded-md border border-border bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!content.trim()}
              title="Clear notes"
              className="h-6 w-6 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-destructive disabled:opacity-40 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Editor / Preview Area */}
        <div>
          {previewMode ? (
            <div className="min-h-28 max-h-56 overflow-y-auto p-2.5 rounded-lg bg-secondary/30 border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
              {content.trim() ? content : <span className="text-muted-foreground italic">No notes written yet. Switch to Edit to jot down thoughts.</span>}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Type quick thoughts, draft markdown links [Example](https://...), or paste snippets..."
              rows={4}
              className="w-full resize-y min-h-24 max-h-64 rounded-lg bg-background border border-input p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono leading-relaxed"
            />
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>Markdown supported</span>
          <span>
            {content.length} chars • {wordsCount} words
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <StickyNote className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Quick Scratchpad</span>
              {lastSaved && (
                <span className="text-[10px] font-mono text-muted-foreground font-normal">
                  • {lastSaved}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Jot down quick links, thoughts, or research notes. Persisted automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewMode((prev) => !prev)}
            title={previewMode ? "Switch to Edit mode" : "Switch to Preview mode"}
            className="h-7 px-2 rounded-md border border-border bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
          >
            {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{previewMode ? "Edit" : "Preview"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!content.trim()}
            title="Copy notes to clipboard"
            className="h-7 px-2 rounded-md border border-border bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-1 cursor-pointer transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!content.trim()}
            title="Clear notes"
            className="h-7 w-7 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-destructive disabled:opacity-40 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="mt-2.5">
        {previewMode ? (
          <div className="min-h-28 max-h-56 overflow-y-auto p-2.5 rounded-lg bg-secondary/30 border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
            {content.trim() ? content : <span className="text-muted-foreground italic">No notes written yet. Switch to Edit to jot down thoughts.</span>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Type quick thoughts, draft markdown links [Example](https://...), or paste snippets..."
            rows={4}
            className="w-full resize-y min-h-24 max-h-64 rounded-lg bg-background border border-input p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono leading-relaxed"
          />
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>Markdown supported</span>
        <span>
          {content.length} chars • {wordsCount} words
        </span>
      </div>
    </div>
  );
}

