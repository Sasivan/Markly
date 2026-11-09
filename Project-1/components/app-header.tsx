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
  onNavigateHome,
  isSidebarCollapsed,
  onToggleSidebar,
  activeView = "home",
  activeFolder,
}: AppHeaderProps) {
  const { user, signOut, openAuthModal } = useAuth();

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

        {/* 5. User Profile / Sign In */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={signOut}
              title={`Signed in as ${user.email}. Click to sign out.`}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-neutral-300 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold truncate max-w-28">
                {user.user_metadata?.display_name || user.email?.split("@")[0] || "Account"}
              </span>
              <LogOut className="h-3 w-3 text-muted-foreground ml-0.5" />
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAuthModal("login")}
            className="text-xs h-8 px-3 gap-1.5 font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer shadow-2xs ml-0.5"
            title="Sign in with Supabase or create an account"
          >
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span>Sign In</span>
          </Button>
        )}
      </div>
    </header>
  );
}
