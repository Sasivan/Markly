"use client";

import * as React from "react";
import * as IconoirIcons from "iconoir-react";

interface FolderIconRendererProps {
  icon?: string | null;
  className?: string;
  color?: string;
}

export function FolderIconRenderer({
  icon,
  className = "h-4 w-4",
  color,
}: FolderIconRendererProps) {
  if (!icon) {
    const DefaultFolder = IconoirIcons.Folder;
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: color && color !== "gray" ? color : undefined }}
      >
        <DefaultFolder className={className} />
      </span>
    );
  }

  // Check if it's an iconoir icon name (e.g. "iconoir:Folder" or "Folder")
  const cleanName = icon.startsWith("iconoir:") ? icon.replace("iconoir:", "") : icon;
  const IconComponent = (IconoirIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[cleanName];

  if (IconComponent) {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: color && color !== "gray" ? color : undefined }}
      >
        <IconComponent className={className} />
      </span>
    );
  }

  // Fallback to emoji or text
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0 leading-none"
      style={{ color: color && color !== "gray" ? color : undefined }}
    >
      {icon}
    </span>
  );
}
