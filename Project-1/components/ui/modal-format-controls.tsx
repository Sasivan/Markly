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
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      {/* 2 Format Toggle Buttons (Horizontal side-by-side vs Vertical stacked) */}
      <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border text-xs shrink-0">
        <button
          type="button"
          onClick={() => onToggleFormat("horizontal")}
          title="Horizontal layout (Columns)"
          aria-label="Horizontal side-by-side layout"
          className={`h-7 w-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
            format === "horizontal"
              ? "bg-card text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Columns2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onToggleFormat("vertical")}
          title="Vertical layout (Rows)"
          aria-label="Vertical stacked layout"
          className={`h-7 w-7 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
            format === "vertical"
              ? "bg-card text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Rows3 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Reset Circle button - appears whenever custom size is detected */}
      {hasCustomSize && onRestoreDefaults && (
        <button
          type="button"
          onClick={onRestoreDefaults}
          title="Reset to default dimensions"
          aria-label="Reset to default dimensions"
          className="h-7 w-7 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
