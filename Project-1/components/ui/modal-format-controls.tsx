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
      <div className="flex shrink-0 items-center rounded-md border border-border bg-secondary/50 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => onToggleFormat("horizontal")}
          title="Horizontal side-by-side layout (Columns)"
          aria-label="Horizontal layout"
          className={`h-6 w-6 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${
            format === "horizontal"
              ? "bg-foreground text-background shadow-surface font-semibold"
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
          className={`h-6 w-6 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${
            format === "vertical"
              ? "bg-foreground text-background shadow-surface font-semibold"
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
          className="h-7 w-7 shrink-0 cursor-pointer rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.85} />
        </button>
      )}
    </div>
  );
}
