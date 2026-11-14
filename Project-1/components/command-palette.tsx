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
  onSelectView: (view: "home" | "all" | "collections" | "favorites" | "recent" | "unsorted" | "archive") => void;
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

  const filteredBookmarks = React.useMemo(() => {
    if (!search.trim()) return bookmarks.slice(0, 25);
    const q = search.toLowerCase().trim();
    return bookmarks
      .filter((bm) => {
        const titleMatch = bm.title.toLowerCase().includes(q);
        const urlMatch = bm.url.toLowerCase().includes(q);
        const domainMatch = bm.domain.toLowerCase().includes(q);
        const tagsMatch = bm.tags?.some((t) => t.name.toLowerCase().includes(q));
        const folder = bm.folderId ? folders.find((f) => f.id === bm.folderId) : null;
        const folderMatch = folder?.name.toLowerCase().includes(q);
        return Boolean(titleMatch || urlMatch || domainMatch || tagsMatch || folderMatch);
      })
      .slice(0, 25);
  }, [bookmarks, folders, search]);

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
            <Command.Group heading="Actions" className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 px-2 py-1">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onOpenAddModal();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Add new bookmark</span>
                <span className="ml-auto text-[10px] text-slate-400 dark:text-neutral-500 font-mono">⌘N / N</span>
              </Command.Item>
            </Command.Group>

            {/* System Views */}
            <Command.Group heading="Views" className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 px-2 py-1 mt-1">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectFolder(null);
                  onSelectView("home");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-blue-500" />
                <span>Quick Access</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("favorites");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
              >
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>Favorites</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("recent");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span>Recently Added</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("unsorted");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
              >
                <Inbox className="h-3.5 w-3.5 text-violet-500" />
                <span>Inbox / Needs Organization</span>
              </Command.Item>
            </Command.Group>

            {/* Folders */}
            <Command.Group heading="Folders" className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 px-2 py-1 mt-1">
              {folders.map((folder) => (
                <Command.Item
                  key={folder.id}
                  value={`folder ${folder.name}`}
                  onSelect={() => {
                    onOpenChange(false);
                    onSelectFolder(folder.id);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 transition-colors"
                >
                  <FolderIconRenderer icon={folder.icon} className="h-4 w-4" color={folder.color} />
                  <span className="truncate">{folder.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Bookmarks */}
            <Command.Group heading="Bookmarks" className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 px-2 py-1 mt-1">
              {filteredBookmarks.map((bm) => {
                const folder = bm.folderId ? folders.find((f) => f.id === bm.folderId) : null;

                return (
                  <Command.Item
                    key={bm.id}
                    value={`${bm.title} ${bm.domain} ${bm.url} ${folder?.name || "unsorted"} ${bm.tags?.map((t) => t.name).join(" ") || ""}`}
                    onSelect={() => {
                      // Clicking anywhere on row opens the exact folder location!
                      if (bm.folderId) {
                        onSelectFolder(bm.folderId);
                        onSelectView("all");
                      } else {
                        onSelectFolder(null);
                        onSelectView("unsorted");
                      }
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-900 dark:text-neutral-100 group transition-colors"
                  >
                    <div className="h-5 w-5 rounded bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-neutral-400 flex-shrink-0">
                      {bm.domain.charAt(0).toUpperCase()}
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {/* Clicking name specifically opens the website! */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(bm.url, "_blank");
                            onOpenChange(false);
                          }}
                          className="font-medium truncate hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                          title={`Open site: ${bm.url}`}
                        >
                          {bm.title}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(bm.url, "_blank");
                            onOpenChange(false);
                          }}
                          className="text-muted-foreground hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Open site in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 truncate block font-mono">
                        {bm.domain}
                      </span>
                    </div>

                    {/* Exact folder location badge */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-neutral-800/80 text-muted-foreground border border-border/40 group-hover:border-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                        title="Click row to open this folder location"
                      >
                        <span>{folder ? (folder.icon || "📁") : "📥"}</span>
                        <span className="truncate max-w-[100px]">{folder ? folder.name : "Unsorted"}</span>
                      </span>
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

