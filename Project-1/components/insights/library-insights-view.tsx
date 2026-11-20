"use client";

import * as React from "react";
import {
  BarChart3,
  Globe,
  Folder as FolderIcon,
  Tag,
  Clock,
  ShieldCheck,
  Trash2,
  Compass,
  ArrowRight,
  ExternalLink,
  Layers,
  Star,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import type { Folder as FolderType, FolderTreeNode, BookmarkWithDetails } from "@/server/db/schema";

interface LibraryInsightsViewProps {
  bookmarks: BookmarkWithDetails[];
  folders: FolderType[];
  folderTree: FolderTreeNode[];
  onSelectFolder: (folderId: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectDomain?: (domain: string) => void;
  onEditBookmark?: (bm: BookmarkWithDetails) => void;
  onRefreshData?: () => void;
  onRecordVisit?: (bm: BookmarkWithDetails) => void;
}

type InsightsTab =
  | "overview"
  | "domains"
  | "collections"
  | "tags"
  | "activity"
  | "health"
  | "cleanup"
  | "explore";

export function LibraryInsightsView({
  bookmarks,
  folders,
  folderTree,
  onSelectFolder,
  onSelectTag,
  onSelectDomain,
  onEditBookmark,
  onRefreshData,
  onRecordVisit,
}: LibraryInsightsViewProps) {
  const [activeTab, setActiveTab] = React.useState<InsightsTab>("overview");

  // Summary statistics
  const totalCount = bookmarks.filter((b) => !b.isArchived).length;
  const aliveCount = bookmarks.filter((b) => !b.isArchived && b.status !== "dead").length;
  const deadCount = bookmarks.filter((b) => !b.isArchived && b.status === "dead").length;
  const healthPercent = totalCount > 0 ? Math.round((aliveCount / totalCount) * 100) : 100;
  const totalVisits = bookmarks.reduce((sum, b) => sum + (b.visitCount || 0), 0);

  // 1. Domains Leaderboard
  const domainStats = React.useMemo(() => {
    const map = new Map<string, { count: number; visits: number; iconUrl?: string | null }>();
    for (const bm of bookmarks) {
      if (bm.isArchived) continue;
      const d = bm.domain ? bm.domain.replace(/^www\./, "") : "other";
      if (!map.has(d)) {
        map.set(d, { count: 0, visits: 0, iconUrl: bm.iconUrl });
      }
      const entry = map.get(d)!;
      entry.count++;
      entry.visits += bm.visitCount || 0;
    }
    const maxCount = Math.max(...Array.from(map.values()).map((v) => v.count), 1);
    return Array.from(map.entries())
      .map(([domain, data]) => ({
        domain,
        ...data,
        percentage: Math.round((data.count / (totalCount || 1)) * 100),
        barWidth: Math.round((data.count / maxCount) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks, totalCount]);

  // 2. Collections breakdown
  const collectionStats = React.useMemo(() => {
    return folderTree.map((node) => {
      const childCount = node.children?.length || 0;
      const count = node.totalDescendantBookmarkCount || node.bookmarkCount || 0;
      return {
        id: node.id,
        name: node.name,
        icon: node.icon || "folder",
        color: node.color || "#3b82f6",
        count,
        childCount,
      };
    }).sort((a, b) => b.count - a.count);
  }, [folderTree]);

  // 3. Topics & Tags breakdown
  const tagStats = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const bm of bookmarks) {
      if (bm.isArchived) continue;
      for (const t of bm.tags || []) {
        map.set(t.name, (map.get(t.name) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / (totalCount || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks, totalCount]);

  // 4. Access & Activity: Most Visited
  const mostVisited = React.useMemo(() => {
    return [...bookmarks]
      .filter((b) => !b.isArchived)
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, 15);
  }, [bookmarks]);

  // 5. Cleanup Audits
  const cleanupAudits = React.useMemo(() => {
    // Duplicate URLs
    const urlMap = new Map<string, BookmarkWithDetails[]>();
    for (const b of bookmarks) {
      const clean = b.url.toLowerCase().trim().replace(/\/$/, "");
      if (!urlMap.has(clean)) urlMap.set(clean, []);
      urlMap.get(clean)!.push(b);
    }
    const duplicates: { url: string; items: BookmarkWithDetails[] }[] = [];
    for (const [url, items] of urlMap.entries()) {
      if (items.length > 1) duplicates.push({ url, items });
    }

    // Missing metadata
    const missingMetadata = bookmarks.filter(
      (b) => !b.isArchived && (!b.tags || b.tags.length === 0 || !b.description)
    );

    // Orphan bookmarks (no folder)
    const orphans = bookmarks.filter((b) => !b.isArchived && !b.folderId);

    // Empty folders
    const emptyFolders = folders.filter((f) => {
      const count = bookmarks.filter((b) => !b.isArchived && b.folderId === f.id).length;
      return count === 0;
    });

    return { duplicates, missingMetadata, orphans, emptyFolders };
  }, [bookmarks, folders]);

  const recordVisit = async (bm: BookmarkWithDetails) => {
    if (onRecordVisit) {
      onRecordVisit(bm);
      return;
    }
    try {
      await fetch(`/api/bookmarks/${bm.id}/visit`, { method: "POST" });
      onRefreshData?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mk-fade-in space-y-5 pb-12">
      {/* Masthead */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 xl:flex-row xl:items-end">
        <div className="space-y-2 min-w-0">
          <div className="mk-eyebrow flex items-center gap-2">
            <BarChart3 className="h-3 w-3" />
            <span>Intelligence hub</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
            Library insights
          </h1>
          <p className="mk-lede">
            An audit of your bookmarks, folder architecture, domain usage, link health and knowledge graph.
          </p>
        </div>

        {/* 8 Restructured Tabs Bar */}
        <div className="flex flex-wrap items-center gap-1 self-start rounded-md border border-border bg-muted/70 p-1 text-xs xl:self-auto">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "domains", label: "Domains", icon: Globe },
            { id: "collections", label: "Collections", icon: FolderIcon },
            { id: "tags", label: "Topics & Tags", icon: Tag },
            { id: "activity", label: "Access & Activity", icon: Clock },
            { id: "health", label: "Link Health", icon: ShieldCheck },
            { id: "cleanup", label: "Cleanup", icon: Trash2 },
            { id: "explore", label: "Explore", icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as InsightsTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-surface font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6 mk-fade-in">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-mono text-muted-foreground">Total Bookmarks</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-[-0.02em] text-foreground">{totalCount}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-mono text-muted-foreground">Folder Collections</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-[-0.02em] text-primary">{folders.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-mono text-muted-foreground">Unique Domains</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-[-0.02em] text-foreground">{domainStats.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-mono text-muted-foreground">Active Tags</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-[-0.02em] text-foreground">{tagStats.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-mono text-muted-foreground">Reachable Health</div>
              <div className="text-xl font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{healthPercent}%</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-mono text-muted-foreground">Recorded Visits</div>
              <div className="text-xl font-semibold font-mono text-amber-600 dark:text-amber-400 mt-1">{totalVisits}</div>
            </div>
          </div>

          {/* Quick Health & Cleanup Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card shadow-surface space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Link Health Status</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-sm">
                  {healthPercent}%
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{aliveCount} Reachable Sites</div>
                  <div className="text-xs text-muted-foreground">{deadCount} flagged as broken or unreachable</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-card shadow-surface space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                <Trash2 className="h-4 w-4 text-amber-500" />
                <span>Library Hygiene & Cleanup</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{cleanupAudits.duplicates.length}</span> Duplicates
                </div>
                <div>
                  <span className="font-semibold text-primary">{cleanupAudits.orphans.length}</span> Unsorted
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">{cleanupAudits.emptyFolders.length}</span> Empty
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("cleanup")}
                  className="ml-auto text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  Review Cleanup →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Domains */}
      {activeTab === "domains" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Domain Ranking & Share</h3>
                <p className="text-xs text-muted-foreground">Every domain saved in your workspace ranked by frequency</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{domainStats.length} Domains</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto mk-scroll pr-1">
              {domainStats.map((d, idx) => (
                <div
                  key={d.domain}
                  className="p-3 rounded-lg border border-border bg-muted/40 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="font-mono text-xs text-muted-foreground w-4">{idx + 1}</span>
                      <BookmarkIcon src={d.iconUrl} domain={d.domain} className="h-4 w-4 rounded" />
                      <span className="text-xs font-medium text-foreground truncate">{d.domain}</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-foreground">{d.count} sites</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${d.barWidth}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Collections */}
      {activeTab === "collections" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Folder Architecture & Collections</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collectionStats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectFolder(c.id)}
                  className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${c.color}20` }}>
                      <FolderIconRenderer icon={c.icon} color={c.color} className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-foreground truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.childCount > 0 ? `${c.childCount} subfolders` : "Direct collection"}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">{c.count} sites</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Topics & Tags */}
      {activeTab === "tags" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Topics & Tags Leaderboard</h3>
            <div className="flex flex-wrap gap-2">
              {tagStats.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onSelectTag?.(t.name)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:border-primary/50 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="text-primary font-mono">#{t.name}</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Access & Activity */}
      {activeTab === "activity" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Most Visited Bookmarks Leaderboard</h3>
            <div className="divide-y divide-border">
              {mostVisited.map((bm, idx) => (
                <div key={bm.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-4">{idx + 1}</span>
                    <BookmarkIcon src={bm.iconUrl} domain={bm.domain} className="h-5 w-5 rounded shrink-0" />
                    <div className="truncate">
                      <a href={bm.url} target="_blank" rel="noreferrer" onClick={() => recordVisit(bm)} className="text-xs font-medium text-foreground hover:underline truncate block">
                        {bm.title}
                      </a>
                      <span className="text-xs text-muted-foreground font-mono">{bm.domain}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs shrink-0">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{bm.visitCount || 0} visits</span>
                    <a href={bm.url} target="_blank" rel="noreferrer" onClick={() => recordVisit(bm)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Link Health */}
      {activeTab === "health" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Link Health Verification</h3>
                <p className="text-xs text-muted-foreground">{aliveCount} healthy • {deadCount} broken links</p>
              </div>
              <span className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400">{healthPercent}% Reachable</span>
            </div>

            {deadCount === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ All verified bookmarks in your library are alive and reachable!
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.filter((b) => b.status === "dead").map((bm) => (
                  <div key={bm.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-foreground">{bm.title}</div>
                      <a href={bm.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-destructive hover:underline">{bm.url}</a>
                    </div>
                    <button type="button" onClick={() => onEditBookmark?.(bm)} className="text-xs px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium cursor-pointer">
                      Fix Link
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Cleanup */}
      {activeTab === "cleanup" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Library Cleanup & Organization Audit</h3>
              <p className="text-xs text-muted-foreground">Identify redundant URLs, unorganized items, and empty folders</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-1">
                <div className="font-mono font-semibold text-base text-amber-600 dark:text-amber-400">{cleanupAudits.duplicates.length}</div>
                <div className="text-xs font-medium text-foreground">Duplicate URLs</div>
                <p className="text-xs text-muted-foreground">Links that exist more than once</p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-1">
                <div className="font-mono font-semibold text-base text-primary">{cleanupAudits.orphans.length}</div>
                <div className="text-xs font-medium text-foreground">Unsorted Items</div>
                <p className="text-xs text-muted-foreground">Bookmarks without a parent folder</p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-1">
                <div className="font-mono font-semibold text-base text-muted-foreground">{cleanupAudits.emptyFolders.length}</div>
                <div className="text-xs font-medium text-foreground">Empty Folders</div>
                <p className="text-xs text-muted-foreground">Folders containing zero bookmarks</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Explore */}
      {activeTab === "explore" && (
        <div className="space-y-4 mk-fade-in">
          <div className="p-5 rounded-xl border border-border bg-card shadow-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Obsidian Knowledge Graph & Visual Wall</h3>
                <p className="text-xs text-muted-foreground">Explore interconnected node relationships and favicons</p>
              </div>
            </div>

            <KnowledgeGraph mode="global" onSelectFolder={onSelectFolder} onSelectDomain={onSelectDomain} />
          </div>
        </div>
      )}
    </div>
  );
}
