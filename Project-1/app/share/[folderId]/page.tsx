"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Folder as FolderIcon,
  Search,
  ExternalLink,
  Tag,
  Bookmark,
  Globe,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Check,
  Download,
  Lock,
  Clock,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { BookmarkIcon } from "@/components/ui/bookmark-icon";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";

interface SharedBookmark {
  id: string;
  title: string;
  url: string;
  domain: string;
  iconUrl?: string;
  description?: string;
  tags?: string[];
}

interface SharedCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
  expiresAt?: number | null;
  passwordProtected?: boolean;
  passwordHash?: string;
  items: SharedBookmark[];
}

export default function PublicSharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [collection, setCollection] = React.useState<SharedCollection | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [imported, setImported] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  const handleAddToLibrary = async () => {
    if (!collection || collection.items.length === 0) return;
    setImporting(true);
    try {
      const folderRes = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collection.name,
          icon: collection.icon || "Folder",
          color: collection.color || "#2563eb",
        }),
      });

      if (folderRes.ok) {
        const folderData = await folderRes.json();
        const folderId = folderData?.folder?.id;
        for (const item of collection.items) {
          try {
            await fetch("/api/bookmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: item.title,
                url: item.url,
                folderId: folderId || null,
                description: item.description || "",
                tags: item.tags || [],
              }),
            });
          } catch {
            // continue
          }
        }
        setImported(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } else {
        const pending = {
          folderName: collection.name,
          icon: collection.icon,
          color: collection.color,
          items: collection.items,
        };
        localStorage.setItem("markly_pending_import_collection", JSON.stringify(pending));
        setImported(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      }
    } catch {
      const pending = {
        folderName: collection.name,
        icon: collection.icon,
        color: collection.color,
        items: collection.items,
      };
      localStorage.setItem("markly_pending_import_collection", JSON.stringify(pending));
      setImported(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } finally {
      setImporting(false);
    }
  };

  React.useEffect(() => {
    setMounted(true);
    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const decoded = decodeURIComponent(escape(atob(dataParam)));
        const parsed = JSON.parse(decoded) as SharedCollection;
        setCollection(parsed);
      } catch (err) {
        console.error("Failed to parse shared collection", err);
      }
    } else {
      // Fallback sample if no query payload passed
      const folderId = (params?.folderId as string) || "collection";
      setCollection({
        id: folderId,
        name: "Curated Collection",
        icon: "📁",
        color: "#2563eb",
        items: [],
      });
    }
  }, [params, searchParams]);

  const filteredItems = React.useMemo(() => {
    if (!collection) return [];
    if (!searchQuery.trim()) return collection.items;
    const q = searchQuery.toLowerCase();
    return collection.items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [collection, searchQuery]);

  const isExpired = Boolean(
    collection?.expiresAt && Date.now() > collection.expiresAt
  );

  const isPasswordRequired = Boolean(
    collection?.passwordProtected && !isUnlocked
  );

  const handleUnlockPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection?.passwordHash) {
      setIsUnlocked(true);
      return;
    }
    if (btoa(passwordInput.trim()) === collection.passwordHash) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Public Header Bar */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
            M
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Markly Collections
          </span>
        </div>

        <div className="flex items-center gap-2">
          {collection && collection.items.length > 0 && (
            <button
              type="button"
              onClick={handleAddToLibrary}
              disabled={importing || imported}
              className={`h-8 px-3 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                imported
                  ? "bg-emerald-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {imported ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Added to Library! Opening...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{importing ? "Adding..." : "Add to My Library"}</span>
                </>
              )}
            </button>
          )}

          <a
            href="/"
            className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-secondary text-foreground font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Open App</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-6">
        {isExpired ? (
          <div className="p-8 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-3 max-w-lg mx-auto my-12">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-foreground">This Link Has Expired</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The owner of this collection configured this share link to expire. Please request an updated share link from the author.
            </p>
            <div className="pt-2">
              <a href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                Go to Markly Home
              </a>
            </div>
          </div>
        ) : isPasswordRequired ? (
          <div className="p-8 rounded-xl border border-border bg-card text-center space-y-4 max-w-md mx-auto my-12 shadow-md">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Password Protected Collection</h2>
              <p className="text-xs text-muted-foreground">
                Enter the password provided by the collection owner to view these bookmarks.
              </p>
            </div>
            <form onSubmit={handleUnlockPassword} className="space-y-3 text-left">
              <div className="space-y-1">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Enter password..."
                  className={`w-full h-9 px-3 rounded-md border bg-background text-xs text-foreground focus:outline-none focus:ring-1 ${
                    passwordError ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring"
                  }`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-[11px] text-destructive">Incorrect password. Please try again.</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium cursor-pointer hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Unlock Collection</span>
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Collection Hero */}
            <div className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <FolderIconRenderer
              icon={collection?.icon || "📁"}
              color={collection?.color || "#2563eb"}
              className="h-9 w-9 flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-semibold">
                  Curated Collection
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  • {collection?.items.length || 0} links
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-1">
                {collection?.name || "Shared Collection"}
              </h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              A public collection of curated web resources and tools, organized on Markly.
            </p>

            {collection && collection.items.length > 0 && (
              <button
                type="button"
                onClick={handleAddToLibrary}
                disabled={importing || imported}
                className={`h-8 px-3.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs ${
                  imported
                    ? "bg-emerald-600 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
              >
                {imported ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Added to Library!</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>{importing ? "Adding..." : `Add ${collection.items.length} Links to My Library`}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* In-Collection Search Input */}
          <div className="pt-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles, domains, or topics in this collection..."
                className="w-full h-8 pl-9 pr-3 rounded-lg bg-secondary/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Bookmarks Grid */}
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border bg-secondary/20 space-y-2">
            <Bookmark className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">
              {collection?.items.length === 0 ? "Empty Collection" : "No matching bookmarks"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {collection?.items.length === 0
                ? "This shared collection currently contains no bookmarks."
                : `No bookmarks match "${searchQuery}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredItems.map((bm) => (
              <a
                key={bm.id}
                href={bm.url}
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-xl border border-border bg-card shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <BookmarkIcon
                        src={bm.iconUrl}
                        domain={bm.domain}
                        alt={bm.title}
                        className="h-5 w-5 rounded object-contain flex-shrink-0"
                      />
                      <span className="text-[11px] font-mono text-muted-foreground truncate">
                        {bm.domain}
                      </span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {bm.title || bm.url}
                  </h3>

                  {bm.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {bm.description}
                    </p>
                  )}
                </div>

                {bm.tags && bm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                    {bm.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border p-6 text-center text-xs text-muted-foreground">
        Curated with Markly — Notion-Style Bookmark Manager & Visual Analytics.
      </footer>
    </div>
  );
}

