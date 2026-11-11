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
        icon: node.icon || "📁",
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Insights Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Intelligence Hub
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Library Insights & Analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            Comprehensive audit of your bookmarks, folder architecture, domain usage, link health, and knowledge graph.
          </p>
        </div>

        {/* 8 Restructured Tabs Bar */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs self-start md:self-auto">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
                  isActive
                    ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-purple-600 dark:text-purple-400" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="text-[11px] text-muted-foreground">Total Bookmarks</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="text-[11px] text-muted-foreground">Folder Collections</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{folders.length}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="text-[11px] text-muted-foreground">Unique Domains</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{domainStats.length}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="text-[11px] text-muted-foreground">Active Tags</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{tagStats.length}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="text-[11px] text-muted-foreground">Reachable Health</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{healthPercent}%</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="text-[11px] text-muted-foreground">Recorded Visits</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{totalVisits}</div>
            </div>
          </div>

          {/* Quick Health & Cleanup Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Link Health Status</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 font-bold text-sm">
                  {healthPercent}%
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{aliveCount} Reachable Sites</div>
                  <div className="text-[11px] text-muted-foreground">{deadCount} flagged as broken or unreachable</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <Trash2 className="h-4 w-4 text-amber-500" />
                <span>Library Hygiene & Cleanup</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="font-bold text-amber-600">{cleanupAudits.duplicates.length}</span> Duplicates
                </div>
                <div>
                  <span className="font-bold text-blue-600">{cleanupAudits.orphans.length}</span> Unsorted
                </div>
                <div>
                  <span className="font-bold text-slate-500">{cleanupAudits.emptyFolders.length}</span> Empty Folders
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("cleanup")}
                  className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
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
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Domain Ranking & Share</h3>
                <p className="text-xs text-muted-foreground">Every domain saved in your workspace ranked by frequency</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{domainStats.length} Domains</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {domainStats.map((d, idx) => (
                <div
                  key={d.domain}
                  className="p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 w-3">{idx + 1}</span>
                      <BookmarkIcon src={d.iconUrl} domain={d.domain} className="h-4 w-4 rounded" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{d.domain}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{d.count} sites</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${d.barWidth}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Collections */}
      {activeTab === "collections" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Folder Architecture & Collections</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collectionStats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectFolder(c.id)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-2xs" style={{ backgroundColor: `${c.color}20` }}>
                      <FolderIconRenderer icon={c.icon} color={c.color} className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">{c.childCount > 0 ? `${c.childCount} subfolders` : "Direct collection"}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">{c.count} sites</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Topics & Tags */}
      {activeTab === "tags" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Topics & Tags Leaderboard</h3>
            <div className="flex flex-wrap gap-2">
              {tagStats.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onSelectTag?.(t.name)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 hover:border-purple-400 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="text-purple-600 dark:text-purple-400">#{t.name}</span>
                  <span className="font-mono text-[10px] bg-slate-200 dark:bg-neutral-800 px-1.5 py-0.2 rounded">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Access & Activity */}
      {activeTab === "activity" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Most Visited Bookmarks Leaderboard</h3>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
              {mostVisited.map((bm, idx) => (
                <div key={bm.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}</span>
                    <BookmarkIcon src={bm.iconUrl} domain={bm.domain} className="h-5 w-5 rounded flex-shrink-0" />
                    <div className="truncate">
                      <a href={bm.url} target="_blank" rel="noreferrer" onClick={() => recordVisit(bm)} className="text-xs font-semibold text-slate-900 dark:text-white hover:underline truncate block">
                        {bm.title}
                      </a>
                      <span className="text-[10px] text-muted-foreground font-mono">{bm.domain}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs flex-shrink-0">
                    <span className="text-amber-600 font-bold">{bm.visitCount || 0} visits</span>
                    <a href={bm.url} target="_blank" rel="noreferrer" onClick={() => recordVisit(bm)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-foreground">
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
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Link Health Verification</h3>
                <p className="text-xs text-muted-foreground">{aliveCount} healthy • {deadCount} broken links</p>
              </div>
              <span className="text-xs font-semibold font-mono text-emerald-600">{healthPercent}% Reachable</span>
            </div>

            {deadCount === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-600 font-medium">
                ✓ All verified bookmarks in your library are alive and reachable!
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.filter((b) => b.status === "dead").map((bm) => (
                  <div key={bm.id} className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-rose-900 dark:text-rose-200">{bm.title}</div>
                      <a href={bm.url} target="_blank" rel="noreferrer" className="text-[11px] text-rose-600 hover:underline">{bm.url}</a>
                    </div>
                    <button type="button" onClick={() => onEditBookmark?.(bm)} className="text-xs px-2.5 py-1 rounded bg-rose-600 text-white font-medium cursor-pointer">
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
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Library Cleanup & Organization Audit</h3>
              <p className="text-xs text-muted-foreground">Identify redundant URLs, unorganized items, and empty folders</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 space-y-1">
                <div className="font-bold text-base text-amber-600">{cleanupAudits.duplicates.length}</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Duplicate URLs</div>
                <p className="text-[10px] text-muted-foreground">Links that exist more than once</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 space-y-1">
                <div className="font-bold text-base text-blue-600">{cleanupAudits.orphans.length}</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Unsorted Items</div>
                <p className="text-[10px] text-muted-foreground">Bookmarks without a parent folder</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 space-y-1">
                <div className="font-bold text-base text-purple-600">{cleanupAudits.emptyFolders.length}</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Empty Folders</div>
                <p className="text-[10px] text-muted-foreground">Folders containing zero bookmarks</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Explore */}
      {activeTab === "explore" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Obsidian Knowledge Graph & Visual Wall</h3>
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
