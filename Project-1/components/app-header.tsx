"use client";

import * as React from "react";
import {
  Sparkles,
  ArrowUpDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  User,
  LogOut,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/components/auth/auth-context";
import type { Folder } from "@/server/db/schema";

interface AppHeaderProps {
  onOpenAddModal: () => void;
  onOpenImportExport: () => void;
  onOpenSearch?: () => void;
  onOpenApiKeyModal?: () => void;
  onOpenProfile?: () => void;
  onNavigateHome?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activeView?: string;
  activeFolder?: Folder | null;
}

export function AppHeader({
  onOpenAddModal,
  onOpenImportExport,
  onOpenSearch,
  onOpenApiKeyModal,
  onOpenProfile,
  onNavigateHome,
  isSidebarCollapsed,
  onToggleSidebar,
  activeView = "home",
  activeFolder,
}: AppHeaderProps) {
  const { user, signOut, openAuthModal } = useAuth();
  const [customAvatar, setCustomAvatar] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("markly_user_avatar");
      if (stored) setCustomAvatar(stored);

      const handler = (e: any) => {
        if (e.detail?.avatarUrl) {
          setCustomAvatar(e.detail.avatarUrl);
        }
      };
      window.addEventListener("markly-avatar-updated", handler);
      return () => window.removeEventListener("markly-avatar-updated", handler);
    }
  }, []);

  const displayAvatar =
    customAvatar ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    (user
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email || user.id}`
      : `https://api.dicebear.com/7.x/bottts/svg?seed=guest_markly`);

  const viewLabels: Record<string, string> = {
    home: "Workspace Home",
    all: "Quick Access",
    collections: "Folder Collections",
    favorites: "Starred Favorites",
    recent: "Recently Added",
    unsorted: "Inbox / Needs Organization",
    archive: "Archived Bookmarks",
    graph: "Knowledge Graph",
  };

  const currentLabel = activeFolder ? activeFolder.name : (viewLabels[activeView] || activeView);

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur z-10 flex-shrink-0">
      {/* Left side: Single Sidebar Toggle Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+\\)" : "Collapse Sidebar (Ctrl+\\)"}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-700 dark:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-slate-600 dark:text-neutral-400" />
          )}
        </button>
      </div>

      {/* Right side: 1 single Import/Export button + Search + Theme */}
      <div className="flex items-center gap-1.5">
        {/* 1. Add Bookmark Button */}
        <Button
          size="sm"
          variant="default"
          onClick={onOpenAddModal}
          className="text-xs h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs cursor-pointer active:translate-y-0.5 mr-1"
          title="Add Bookmark (N)"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span>Add Bookmark</span>
        </Button>

        {/* 2. Single Combined Icon for Import & Export */}
        <button
          type="button"
          onClick={onOpenImportExport}
          title="Import & Export Bookmarks (HTML / JSON / CSV)"
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>

        {/* 3. Icon Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          title="Search Bookmarks (⌘K)"
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* 4. API Key & AI Settings */}
        <button
          type="button"
          onClick={onOpenApiKeyModal}
          title="Custom Gemini API Key & AI Settings"
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors shadow-2xs"
        >
          <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
        </button>

        {/* 5. Icon Mode (Theme Toggle) */}
        <ThemeToggle />

        {/* 5. User Profile Avatar & Sign In */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={onOpenProfile}
            title={user ? `View Profile & Settings (${user.email})` : "View Profile (Local Mode)"}
            className="flex items-center gap-2 p-0.5 pr-2 rounded-full border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-neutral-700/60 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="relative flex-shrink-0">
              <img
                src={displayAvatar}
                alt={user?.user_metadata?.display_name || user?.email || "User"}
                className="h-7 w-7 rounded-full object-cover bg-slate-100 dark:bg-neutral-800 border border-white dark:border-neutral-700 shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email || "User"}`;
                }}
              />
              <span
                className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-neutral-900 ${
                  user ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate max-w-24 hidden sm:inline group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {user ? (user.user_metadata?.display_name || user.email?.split("@")[0] || "Profile") : "Profile"}
            </span>
          </button>

          {!user && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAuthModal("login")}
              className="text-xs h-7 px-2.5 gap-1 font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer shadow-2xs"
              title="Sign in with Supabase or create an account"
            >
              <User className="h-3 w-3 text-blue-500" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
