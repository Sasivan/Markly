"use client";

import * as React from "react";
import { Folder, Tag, Star, Archive, Trash2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Folder as FolderType } from "@/server/db/schema";

interface BulkActionBarProps {
  selectedCount: number;
  folders: FolderType[];
  onClearSelection: () => void;
  onBulkMove: (folderId: string | null) => void;
  onBulkFavorite: (isFavorite: boolean) => void;
  onBulkArchive: (isArchived: boolean) => void;
  onBulkDelete: () => void;
  onBulkExport: (format: "json" | "csv") => void;
}

export function BulkActionBar({
  selectedCount,
  folders,
  onClearSelection,
  onBulkMove,
  onBulkFavorite,
  onBulkArchive,
  onBulkDelete,
  onBulkExport,
}: BulkActionBarProps) {
  const [moveDropdownOpen, setMoveDropdownOpen] = React.useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-[#1a1a1a] border-2 border-slate-300 dark:border-neutral-700 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-5 text-slate-900 dark:text-neutral-100">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-neutral-700">
        <span className="font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[11px] border border-blue-200 dark:border-blue-800">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
          title="Clear Selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Move to folder dropdown */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1"
            onClick={() => setMoveDropdownOpen(!moveDropdownOpen)}
          >
            <Folder className="h-3 w-3" />
            <span>Move</span>
          </Button>

          {moveDropdownOpen && (
            <div className="absolute bottom-full mb-1 left-0 w-48 rounded-xl border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] p-1.5 shadow-2xl z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMoveDropdownOpen(false);
                  onBulkMove(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left cursor-pointer transition-colors"
              >
                <span>📥 Unsorted (Inbox)</span>
              </button>
              <div className="h-px bg-slate-200 dark:bg-neutral-700 my-1" />
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setMoveDropdownOpen(false);
                    onBulkMove(f.id);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left cursor-pointer truncate"
                >
                  <span>{f.icon || "📁"}</span>
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Favorite */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={() => onBulkFavorite(true)}
        >
          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span>Favorite</span>
        </Button>

        {/* Archive */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={() => onBulkArchive(true)}
        >
          <Archive className="h-3 w-3" />
          <span>Archive</span>
        </Button>

        {/* Export */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={() => onBulkExport("json")}
        >
          <Download className="h-3 w-3" />
          <span>Export</span>
        </Button>

        {/* Delete */}
        <Button
          size="sm"
          variant="destructive"
          className="text-xs h-7 gap-1"
          onClick={onBulkDelete}
        >
          <Trash2 className="h-3 w-3" />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
}
