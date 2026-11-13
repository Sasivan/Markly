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
  const effectiveColor = color && color !== "gray" && color !== "inherit" ? color : undefined;

  if (!icon || icon === "📁" || icon === "📂") {
    const DefaultFolder = IconoirIcons.Folder;
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: effectiveColor }}
      >
        <DefaultFolder className={className} />
      </span>
    );
  }

  // Check if it's an iconoir icon name (e.g. "iconoir:Folder", "Folder", or "folder")
  const cleanName = icon.startsWith("iconoir:") ? icon.replace("iconoir:", "") : icon;
  const iconsDict = IconoirIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;

  let IconComponent = iconsDict[cleanName];
  if (!IconComponent && cleanName.length > 0) {
    const pascalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    IconComponent = iconsDict[pascalName];
  }

  if (IconComponent) {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: effectiveColor }}
      >
        <IconComponent className={className} />
      </span>
    );
  }

  // Fallback to emoji or text
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0 leading-none"
      style={{ color: effectiveColor }}
    >
      {icon}
    </span>
  );
}
