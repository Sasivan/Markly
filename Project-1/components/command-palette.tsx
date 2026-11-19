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
  onOpenSearchResults?: (query: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  folders,
  bookmarks,
  onSelectFolder,
  onSelectView,
  onOpenAddModal,
  onOpenSearchResults,
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState("");

  const filteredBookmarks = React.useMemo(() => {
    if (!search.trim()) return bookmarks.slice(0, 25);
    const searchTokens = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return bookmarks
      .filter((bm) => {
        const folder = bm.folderId ? folders.find((f) => f.id === bm.folderId) : null;
        const searchable = [
          bm.title || "",
          bm.domain || "",
          bm.url || "",
          bm.description || "",
          ...(bm.tags || []).map((t) => t.name),
          folder?.name || "",
        ]
          .join(" ")
          .toLowerCase();
        return searchTokens.every((token) => searchable.includes(token));
      })
      .slice(0, 25);
  }, [bookmarks, folders, search]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
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

      <div className="relative z-50 w-full max-w-xl rounded-lg border border-border bg-popover shadow-xl overflow-hidden text-popover-foreground">
        <Command className="w-full">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-3.5">
            <Search className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  e.preventDefault();
                  onOpenChange(false);
                  onOpenSearchResults?.(search.trim());
                }
              }}
              placeholder="Search bookmarks, folders, or press Enter to view all results..."
              className="w-full h-11 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          {/* List Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs">
            {search.trim() && (
              <Command.Group heading="Reference Results">
                <Command.Item
                  onSelect={() => {
                    onOpenChange(false);
                    onOpenSearchResults?.(search.trim());
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary cursor-pointer text-foreground font-medium"
                >
                  <Search className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">
                    Open full reference results for &quot;<strong className="text-primary">{search.trim()}</strong>&quot;
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                    ↵ Enter
                  </span>
                </Command.Item>
              </Command.Group>
            )}
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
            <Command.Group heading="Actions" className="text-xs font-mono text-muted-foreground px-2 py-1">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onOpenAddModal();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Add new bookmark</span>
                <span className="ml-auto text-xs text-muted-foreground font-mono">⌘N / N</span>
              </Command.Item>
            </Command.Group>

            {/* System Views */}
            <Command.Group heading="Views" className="text-xs font-mono text-muted-foreground px-2 py-1 mt-1">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectFolder(null);
                  onSelectView("home");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Workspace Home</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectFolder(null);
                  onSelectView("all");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Quick Access</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("favorites");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
              >
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>Favorites</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("recent");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Recently Added</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onSelectView("unsorted");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
              >
                <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Inbox / Needs Organization</span>
              </Command.Item>
            </Command.Group>

            {/* Folders */}
            <Command.Group heading="Folders" className="text-xs font-mono text-muted-foreground px-2 py-1 mt-1">
              {folders.map((folder) => (
                <Command.Item
                  key={folder.id}
                  value={`folder ${folder.name}`}
                  onSelect={() => {
                    onOpenChange(false);
                    onSelectFolder(folder.id);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground transition-colors"
                >
                  <FolderIconRenderer icon={folder.icon} className="h-4 w-4" color={folder.color} />
                  <span className="truncate">{folder.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Bookmarks */}
            <Command.Group heading="Bookmarks" className="text-xs font-mono text-muted-foreground px-2 py-1 mt-1">
              {filteredBookmarks.map((bm) => {
                const folder = bm.folderId ? folders.find((f) => f.id === bm.folderId) : null;

                return (
                  <Command.Item
                    key={bm.id}
                    value={`${bm.title} ${bm.domain} ${bm.url} ${folder?.name || "unsorted"} ${bm.tags?.map((t) => t.name).join(" ") || ""}`}
                    onSelect={() => {
                      if (bm.folderId) {
                        onSelectFolder(bm.folderId);
                        onSelectView("all");
                      } else {
                        onSelectFolder(null);
                        onSelectView("unsorted");
                      }
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md data-[selected=true]:bg-secondary hover:bg-secondary cursor-pointer text-foreground group transition-colors"
                  >
                    <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground flex-shrink-0">
                      {bm.domain.charAt(0).toUpperCase()}
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(bm.url, "_blank");
                            onOpenChange(false);
                          }}
                          className="font-medium truncate hover:text-primary hover:underline cursor-pointer"
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
                          className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Open site in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block font-mono">
                        {bm.domain}
                      </span>
                    </div>

                    {/* Exact folder location badge */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-secondary text-muted-foreground border border-border group-hover:border-primary/40 group-hover:text-foreground transition-colors"
                        title="Click row to open this folder location"
                      >
                        <FolderIconRenderer icon={folder?.icon || "inbox"} className="h-3 w-3" />
                        <span className="truncate max-w-24">{folder ? folder.name : "Unsorted"}</span>
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

