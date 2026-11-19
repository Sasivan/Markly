"use client";

import * as React from "react";
import { Columns2, Rows3, RotateCcw } from "lucide-react";

interface ModalFormatControlsProps {
  format: "vertical" | "horizontal";
  onToggleFormat: (format: "vertical" | "horizontal") => void;
  hasCustomSize?: boolean;
  onRestoreDefaults?: () => void;
  className?: string;
}

export function ModalFormatControls({
  format,
  onToggleFormat,
  hasCustomSize = false,
  onRestoreDefaults,
  className = "",
}: ModalFormatControlsProps) {
  return (
    <div className={`flex items-center gap-2 shrink-0 select-none ${className}`}>
      {/* 2 Format Toggle Buttons Container: Horizontal (columns) vs Vertical (rows) wrt window auto */}
      <div className="flex items-center p-0.5 rounded-xl border border-border/80 bg-background/60 dark:bg-slate-900/70 backdrop-blur-xs text-xs shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => onToggleFormat("horizontal")}
          title="Horizontal side-by-side layout (Columns)"
          aria-label="Horizontal layout"
          className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 ${
            format === "horizontal"
              ? "bg-slate-800 dark:bg-slate-800/90 text-white shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Columns2 className="h-4 w-4" strokeWidth={1.85} />
        </button>

        <button
          type="button"
          onClick={() => onToggleFormat("vertical")}
          title="Vertical stacked layout (Rows)"
          aria-label="Vertical layout"
          className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 ${
            format === "vertical"
              ? "bg-slate-800 dark:bg-slate-800/90 text-white shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Rows3 className="h-4 w-4" strokeWidth={1.85} />
        </button>
      </div>

      {/* Reset Circle button - dynamically appears on any change from window auto */}
      {hasCustomSize && onRestoreDefaults && (
        <button
          type="button"
          onClick={onRestoreDefaults}
          title="Reset dimensions & format to window defaults"
          aria-label="Reset dimensions & format to window defaults"
          className="h-8 w-8 rounded-xl border border-border/80 bg-background/60 dark:bg-slate-900/70 hover:bg-secondary/70 backdrop-blur-xs text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-150 shadow-2xs shrink-0 active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.85} />
        </button>
      )}
    </div>
  );
}
