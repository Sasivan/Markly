"use client";

import * as React from "react";
import { ArrowRight, Folder } from "lucide-react";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder as FolderType } from "@/server/db/schema";

interface ChildSubfoldersBarProps {
  currentFolder: FolderType;
  childFolders: FolderType[];
  bookmarksCountMap: Record<string, number>;
  onSelectFolder: (folderId: string, isParent?: boolean) => void;
}

export function ChildSubfoldersBar({
  currentFolder,
  childFolders,
  bookmarksCountMap,
  onSelectFolder,
}: ChildSubfoldersBarProps) {
  if (childFolders.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Subfolders in {currentFolder.name} ({childFolders.length})</span>
        </span>
        <span className="text-xs text-muted-foreground font-mono">Click card to enter subfolder</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {childFolders.map((child) => {
          const count = bookmarksCountMap[child.id] || 0;

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelectFolder(child.id, false)}
              className="p-3 rounded-xl border border-border bg-card shadow-xs hover:border-border-hover text-left transition-colors cursor-pointer group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm border border-border/40"
                  style={{ backgroundColor: `${child.color}20` }}
                >
                  <FolderIconRenderer icon={child.icon} color={child.color} className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                    {child.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono tabular-nums">
                    {count} {count === 1 ? "site" : "sites"}
                  </div>
                </div>
              </div>

              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform duration-150 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

