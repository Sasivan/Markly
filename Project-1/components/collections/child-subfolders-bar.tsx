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
        <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5 text-indigo-500" />
          <span>Subfolders in {currentFolder.name} ({childFolders.length})</span>
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">Click card to enter subfolder</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {childFolders.map((child) => {
          const count = bookmarksCountMap[child.id] || 0;

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelectFolder(child.id, false)}
              className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm text-left transition-all cursor-pointer group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm shadow-2xs"
                  style={{ backgroundColor: `${child.color}20` }}
                >
                  <FolderIconRenderer icon={child.icon} color={child.color} className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {child.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {count} {count === 1 ? "site" : "sites"}
                  </div>
                </div>
              </div>

              <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

