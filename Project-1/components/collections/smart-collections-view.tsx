"use client";

import * as React from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Folder as FolderIcon,
  Star,
  Globe,
  Tag as TagIcon,
  StickyNote,
  Eye,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { CreateSmartCollectionModal } from "@/components/modals/create-smart-collection-modal";
import type { BookmarkWithDetails, SmartCollection } from "@/server/db/schema";

interface SmartCollectionsViewProps {
  bookmarks: BookmarkWithDetails[];
  onOpenPreview?: (bm: BookmarkWithDetails) => void;
  onNavigateHome?: () => void;
}

interface SmartRule {
  field: "tags" | "favorite" | "domain" | "status" | "notes" | "visitCount" | "recency";
  operator?: string;
  value: string;
}

function matchBookmarkToRules(bm: BookmarkWithDetails, rules: SmartRule[], matchMode: "all" | "any" = "all"): boolean {
  if (!rules || rules.length === 0) return true;

  const results = rules.map((rule) => {
    switch (rule.field) {
      case "favorite":
        return rule.value === "starred" ? Boolean(bm.isFavorite) : !bm.isFavorite;
      case "domain":
        return (bm.domain || "").toLowerCase().includes((rule.value || "").toLowerCase());
      case "tags":
        return (bm.tags || []).some((t) => {
          const tName = typeof t === "string" ? t : t.name;
          return tName.toLowerCase().includes((rule.value || "").toLowerCase());
        });
      case "status":
        return rule.value === "dead" ? bm.status === "dead" : bm.status !== "dead";
      case "notes":
        return rule.value === "has_notes"
          ? Boolean(bm.notes && bm.notes.trim().length > 0)
          : !bm.notes || bm.notes.trim().length === 0;
      case "visitCount": {
        const threshold = parseInt(rule.value, 10) || 1;
        return (bm.visitCount || 0) >= threshold;
      }
      case "recency": {
        const days = parseInt(rule.value, 10) || 7;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return new Date(bm.createdAt) >= cutoff;
      }
      default:
        return true;
    }
  });

  return matchMode === "any" ? results.some(Boolean) : results.every(Boolean);
}

export function SmartCollectionsView({
  bookmarks,
  onOpenPreview,
  onNavigateHome,
}: SmartCollectionsViewProps) {
  const [collections, setCollections] = React.useState<SmartCollection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchCollections = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/smart-collections");
      const json = await res.json();
      if (json.success && Array.isArray(json.collections)) {
        setCollections(json.collections);
        if (json.collections.length > 0 && !selectedCollectionId) {
          setSelectedCollectionId(json.collections[0].id);
        }
      }
    } catch {
      setError("Failed to load smart collections");
    } finally {
      setLoading(false);
    }
  }, [selectedCollectionId]);

  React.useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete smart collection "${name}"?`)) return;
    try {
      const res = await fetch(`/api/smart-collections?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
        if (selectedCollectionId === id) {
          setSelectedCollectionId(null);
        }
      }
    } catch (e) {
      console.error("Failed to delete smart collection:", e);
    }
  };

  // Filter collections by search query
  const filteredCollections = React.useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, searchQuery]);

  // Selected collection and its matching bookmarks
  const selectedCollection = React.useMemo(() => {
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  const matchingBookmarks = React.useMemo(() => {
    if (!selectedCollection) return [];
    try {
      const rules = JSON.parse(selectedCollection.rulesJson) as SmartRule[];
      return bookmarks.filter((bm) => matchBookmarkToRules(bm, rules));
    } catch {
      return [];
    }
  }, [selectedCollection, bookmarks]);

  return (
    <div className="space-y-6">
      {/* Create Smart Collection Modal */}
      <CreateSmartCollectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchCollections}
        bookmarks={bookmarks}
      />

      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">Smart Collections</h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold border border-border">
                  {collections.length} {collections.length === 1 ? "collection" : "collections"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic virtual folders that auto-populate bookmarks in real time using multi-criteria rule logic.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs cursor-pointer hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Smart Collection</span>
          </Button>
        </div>
      </div>

      {/* Main Grid & Master-Detail Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Loading smart collections...</span>
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto border border-purple-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">No Smart Collections Created Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Smart Collections allow you to automatically aggregate bookmarks based on starred status, domains, tags, visit frequency, or notes without duplicating links.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs bg-primary text-primary-foreground gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Smart Collection</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Smart Collections List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search smart collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-card border-border placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              {filteredCollections.map((col) => {
                const isSelected = selectedCollectionId === col.id;
                let parsedRules: SmartRule[] = [];
                try {
                  parsedRules = JSON.parse(col.rulesJson);
                } catch {}

                const count = bookmarks.filter((bm) => matchBookmarkToRules(bm, parsedRules)).length;

                return (
                  <div
                    key={col.id}
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: col.color || "#8b5cf6" }}
                        />
                        <span className="font-semibold text-xs text-foreground truncate">{col.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary font-medium text-foreground border border-border/60">
                          {count} {count === 1 ? "site" : "sites"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(col.id, col.name);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete collection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Rule Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {parsedRules.map((r, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/40"
                        >
                          {r.field}: {r.value}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Collection Matches Inspector */}
          <div className="lg:col-span-7">
            {selectedCollection ? (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCollection.color || "#8b5cf6" }}
                    />
                    <div>
                      <h2 className="text-sm font-bold text-foreground">{selectedCollection.name}</h2>
                      <span className="text-xs text-muted-foreground">
                        {matchingBookmarks.length} dynamic {matchingBookmarks.length === 1 ? "match" : "matches"}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (onNavigateHome) onNavigateHome();
                    }}
                    className="h-7 text-xs border-border hover:bg-secondary cursor-pointer"
                  >
                    <span>View in Table</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                {matchingBookmarks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                    <Filter className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
                    <p className="font-medium text-foreground">No bookmarks currently match these rules.</p>
                    <p>Bookmarks that meet the conditions will automatically appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                    {matchingBookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        onClick={() => onOpenPreview?.(bm)}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BookmarkIcon
                            src={bm.iconUrl}
                            alt={bm.title}
                            domain={bm.domain}
                            className="h-4 w-4 shrink-0"
                          />
                          <div className="truncate">
                            <div className="font-semibold text-foreground truncate">{bm.title}</div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">{bm.url}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {bm.isFavorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {bm.visitCount || 0} visits
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center text-xs text-muted-foreground">
                Select a smart collection to preview its live dynamic bookmark items.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

