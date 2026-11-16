"use client";

import * as React from "react";
import { UniversalColorPicker } from "./universal-color-picker";
import { UniversalIconPicker } from "./universal-icon-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

export interface UniversalIdentityPickerProps {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  label?: string;
  previewName?: string;
  className?: string;
  compact?: boolean;
}

/**
 * UniversalIdentityPicker
 * 
 * Standardized universal component for selecting an Icon and Theme/Accent Color pair.
 * Used everywhere across Markly (Folders, Smart Collections, Stash Sessions, Workspace, Settings)
 * so that any improvements to icon or color palettes inherit globally.
 */
export function UniversalIdentityPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
  label = "Identity & Accent",
  previewName,
  className = "",
  compact = false,
}: UniversalIdentityPickerProps) {
  const safeColor = color || "#3b82f6";
  const safeIcon = icon || "folder";

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <UniversalIconPicker
          icon={safeIcon}
          color={safeColor}
          onChange={onIconChange}
          label="Select Icon"
          compact={true}
        />
        <UniversalColorPicker
          color={safeColor}
          onChange={onColorChange}
          label="Select Accent Color"
          compact={true}
        />
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Dynamic Avatar Badge */}
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-border shadow-2xs transition-colors"
          style={{
            backgroundColor: `${safeColor}20`,
            borderColor: `${safeColor}40`,
          }}
        >
          <FolderIconRenderer icon={safeIcon} className="h-5 w-5" color={safeColor} />
        </div>

        {/* Labels / Title */}
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground uppercase font-mono block tracking-wider">
            {label}
          </span>
          {previewName ? (
            <span className="text-xs font-semibold text-foreground truncate block">
              {previewName}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate block">
              Pick icon & accent color
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons: Universal Icon + Color Pickers */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <UniversalIconPicker
          icon={safeIcon}
          color={safeColor}
          onChange={onIconChange}
          label="Change Icon"
          compact={true}
        />
        <UniversalColorPicker
          color={safeColor}
          onChange={onColorChange}
          label="Change Accent Color"
          compact={true}
        />
      </div>
    </div>
  );
}
