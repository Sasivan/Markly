"use client";

import * as React from "react";
import { Command } from "cmdk";
import {
  Sparkles,
  Folder as FolderIcon,
  Star,
  Clock,
  Inbox,
  Archive,
  Compass,
  Search,
  ExternalLink,
} from "lucide-react";
import type { Folder, BookmarkWithDetails } from "@/server/db/schema";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  bookmarks: BookmarkWithDetails[];
  onSelectFolder: (folderId: string | null) => void;
  onSelectView: (view: "home" | "all" | "favorites" | "recent" | "unsorted" | "archive") => void;
  onOpenAddModal: (prefilledUrl?: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  folders,
  bookmarks,
  onSelectFolder,
  onSelectView,
  onOpenAddModal,
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative z-50 w-full max-w-xl rounded-xl border-2 border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] shadow-2xl overflow-hidden text-slate-900 dark:text-neutral-100 animate-in zoom-in-95">
        <Command
          className="w-full"
          value={search}
          onValueChange={setSearch}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-3.5">
            <Search className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
            <Command.Input
              placeholder="Search bookmarks, folders, or type a URL to add..."
              className="w-full h-11 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          {/* List Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs">
            <Command.Empty className="py-6 text-center text-muted-foreground">
              {search.startsWith("http") || search.includes(".") ? (
                <div className="space-y-2">
                  <p>Ready to bookmark this link:</p>
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      onOpenAddModal(search);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Bookmark &quot;{search}&quot;
                  </button>
                </div>
              ) : (
                "No results found."
              )}
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onOpenAddModal();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Add new bookmark</span>
                <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+V / Cmd+V</span>
              </Command.Item>
            </Command.Group>

            {/* System Views */}
            <Command.Group heading="Views" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 mt-1">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectFolder(null);
                  onSelectView("home");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span>Workspace Home</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectFolder(null);
                  onSelectView("all");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-foreground"
              >
                <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                <span>All Bookmarks</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("favorites");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-foreground"
              >
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>Favorites</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("recent");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-foreground"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Recent</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("unsorted");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-foreground"
              >
                <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Unsorted (Inbox)</span>
              </Command.Item>
            </Command.Group>

            {/* Folders */}
            <Command.Group heading="Folders" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 mt-1">
              {folders.map((folder) => (
                <Command.Item
                  key={folder.id}
                  value={`folder ${folder.name}`}
                  onSelect={() => {
                    onOpenChange(false);
                    onSelectFolder(folder.id);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-foreground"
                >
                  <FolderIconRenderer icon={folder.icon} className="h-4 w-4" color={folder.color} />
                  <span>{folder.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Bookmarks */}
            <Command.Group heading="Bookmarks" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 mt-1">
              {bookmarks.slice(0, 15).map((bm) => (
                <Command.Item
                  key={bm.id}
                  value={`${bm.title} ${bm.domain} ${bm.url}`}
                  onSelect={() => {
                    window.open(bm.url, "_blank");
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group"
                >
                  <div className="h-4 w-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0">
                    {bm.domain.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate flex-1">
                    <div className="truncate font-medium">{bm.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{bm.domain}</div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

