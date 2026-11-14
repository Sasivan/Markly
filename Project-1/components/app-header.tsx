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
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
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
  const { user, signOut, signOutAllDevices, openAuthModal } = useAuth();
  const [customAvatar, setCustomAvatar] = React.useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

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
    recent: "Recently Visited",
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

        {/* 3. API Key & AI Settings */}
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

        {/* 5. User Profile Avatar & Dropdown Menu */}
        <div ref={userMenuRef} className="relative flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={user ? `Account Menu (${user.email})` : "Account Menu (Guest Mode)"}
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
            <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate max-w-20 hidden sm:inline group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {user ? (user.user_metadata?.username ? `@${user.user_metadata.username}` : user.user_metadata?.display_name || user.email?.split("@")[0] || "Profile") : "Profile"}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
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

          {/* User Popover / Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {user ? (
                <div className="space-y-1">
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-neutral-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Authenticated Session</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors text-left"
                  >
                    <User className="h-4 w-4 text-blue-500" />
                    <span>Account Profile & Settings</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-neutral-800 my-1 pt-1" />

                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out (This Device)</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOutAllDevices();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors text-left"
                    title="Revokes session tokens on all devices"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Sign Out All Devices</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-neutral-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Guest Session</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Temporary in-memory browsing
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      openAuthModal("login");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors text-left"
                  >
                    <User className="h-4 w-4" />
                    <span>Sign In to Your Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      openAuthModal("signup");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors text-left"
                  >
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <span>Create Free Account</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
