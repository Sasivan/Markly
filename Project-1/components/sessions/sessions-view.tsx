"use client";

import * as React from "react";
import {
  Layers,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Calendar,
  Globe,
  Clock,
  Download,
  FolderPlus,
  Edit2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import type { BookmarkWithDetails, Folder } from "@/server/db/schema";

interface SessionsViewProps {
  folders: Folder[];
  bookmarks: BookmarkWithDetails[];
  onRefreshData: () => void;
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onSelectFolder?: (folderId: string) => void;
  onOpenStashModal: () => void;
}

export function SessionsView({
  folders,
  bookmarks,
  onRefreshData,
  onOpenPreview,
  onSelectFolder,
  onOpenStashModal,
}: SessionsViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedSessionId, setCopiedSessionId] = React.useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  // Group bookmarks by session folders (icon === 'Layers' or name includes 'Stash' or 'Session')
  const sessionFolders = React.useMemo(() => {
    return folders.filter(
      (f) =>
        f.icon === "Layers" ||
        f.name.toLowerCase().includes("stash") ||
        f.name.toLowerCase().includes("session")
    );
  }, [folders]);

  // Bookmarks grouped by folder
  const sessionsData = React.useMemo(() => {
    return sessionFolders.map((folder) => {
      const folderBookmarks = bookmarks.filter((b) => b.folderId === folder.id && !b.isArchived);
      return {
        folder,
        bookmarks: folderBookmarks,
      };
    });
  }, [sessionFolders, bookmarks]);

  // Filter sessions by search query
  const filteredSessions = React.useMemo(() => {
    if (!searchQuery.trim()) return sessionsData;
    const q = searchQuery.toLowerCase();
    return sessionsData.filter(
      (s) =>
        s.folder.name.toLowerCase().includes(q) ||
        s.bookmarks.some(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.domain.toLowerCase().includes(q)
        )
    );
  }, [sessionsData, searchQuery]);

  const handleOpenAllInBrowser = (tabs: BookmarkWithDetails[]) => {
    tabs.forEach((tab) => {
      window.open(tab.url, "_blank", "noopener,noreferrer");
    });
  };

  const handleCopyAllUrls = async (sessionId: string, tabs: BookmarkWithDetails[]) => {
    const urlsText = tabs.map((t) => `${t.title}\n${t.url}`).join("\n\n");
    await navigator.clipboard.writeText(urlsText);
    setCopiedSessionId(sessionId);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const handleExportJson = (folderName: string, tabs: BookmarkWithDetails[]) => {
    const exportData = {
      sessionName: folderName,
      exportedAt: new Date().toISOString(),
      tabsCount: tabs.length,
      tabs: tabs.map((t) => ({ title: t.title, url: t.url, domain: t.domain })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName.replace(/[^a-z0-9_-]/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteSession = async (folderId: string, folderName: string) => {
    if (!confirm(`Delete session "${folderName}" and all of its tabs?`)) return;
    try {
      await fetch(`/api/folders/${folderId}?mode=delete_all`, { method: "DELETE" });
      onRefreshData();
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleRenameSession = async (folderId: string) => {
    if (!editName.trim()) {
      setEditingFolderId(null);
      return;
    }
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditingFolderId(null);
      onRefreshData();
      window.dispatchEvent(new CustomEvent("markly-workspace-updated"));
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Sessions Page Header */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Window Snapshots & Tabs
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {sessionsData.length} {sessionsData.length === 1 ? "Session" : "Sessions"}
            </span>
          </div>
          <h1 className="text-lg font-bold text-foreground">Tab Sessions & Stash</h1>
          <p className="text-xs text-muted-foreground">
            Snapshot open browser windows into sessions, restore tab collections in 1-click, or export URLs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={onOpenStashModal}
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Stash Open Tabs</span>
          </Button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search sessions by title, domain, or tab URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs bg-card border-border pl-3 pr-8"
          />
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3 bg-card/40">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto border border-blue-500/20">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No tab sessions found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? "No sessions match your search query."
              : "You haven't stashed any browser window sessions yet. Use the Chrome Extension or click below to snapshot all open tabs."}
          </p>
          <Button
            size="sm"
            onClick={onOpenStashModal}
            className="h-8 text-xs gap-1.5 mt-2 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Stash Tabs Now</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(({ folder, bookmarks: tabs }) => (
            <div
              key={folder.id}
              className="rounded-xl border border-border bg-card shadow-xs overflow-hidden transition-colors"
            >
              {/* Session Card Header */}
              <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSession(folder.id);
                            if (e.key === "Escape") setEditingFolderId(null);
                          }}
                          autoFocus
                          className="h-7 text-xs bg-background w-60"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRenameSession(folder.id)}
                          className="h-7 px-2 text-xs"
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground truncate">{folder.name}</h2>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolderId(folder.id);
                            setEditName(folder.name);
                          }}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                          title="Rename session"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(folder.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span>
                        {tabs.length} {tabs.length === 1 ? "tab" : "tabs"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Actions Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAllInBrowser(tabs)}
                    disabled={tabs.length === 0}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                    title="Open all tabs in browser"
                  >
                    <ExternalLink className="h-3 w-3 text-blue-500" />
                    <span>Open All ({tabs.length})</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyAllUrls(folder.id, tabs)}
                    disabled={tabs.length === 0}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                    title="Copy all URLs to clipboard"
                  >
                    {copiedSessionId === folder.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{copiedSessionId === folder.id ? "Copied!" : "Copy URLs"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportJson(folder.name, tabs)}
                    disabled={tabs.length === 0}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                    title="Export session as JSON file"
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>

                  {onSelectFolder && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectFolder(folder.id)}
                      className="h-7 text-xs gap-1.5 cursor-pointer"
                      title="Open as folder table"
                    >
                      <FolderPlus className="h-3 w-3 text-muted-foreground" />
                      <span className="hidden sm:inline">Folder View</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSession(folder.id, folder.name)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tabs Grid / List */}
              <div className="p-3 divide-y divide-border/40">
                {tabs.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No tabs in this session.
                  </div>
                ) : (
                  tabs.map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => onOpenPreview?.(tab)}
                      className="py-2 px-2 hover:bg-secondary/40 rounded-lg flex items-center justify-between gap-3 text-xs group cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                        <BookmarkIcon
                          src={tab.iconUrl}
                          domain={tab.domain}
                          alt={tab.title}
                          className="h-4 w-4 shrink-0 rounded"
                        />
                        <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {tab.title}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground truncate hidden sm:inline">
                          {tab.domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={tab.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Open link in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

