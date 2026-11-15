"use client";

import * as React from "react";
import {
  ArrowUpDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  User,
  UserPlus,
  LogOut,
  KeyRound,
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
  Keyboard,
  Puzzle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { ThemeAccentPicker } from "./theme-accent-picker";
import { useAuth } from "@/components/auth/auth-context";
import type { Folder } from "@/server/db/schema";

interface AppHeaderProps {
  onOpenAddModal: () => void;
  onOpenImportExport: () => void;
  onOpenChromeExtension?: () => void;
  onOpenStashTabs?: () => void;
  onOpenSearch?: () => void;
  onOpenApiKeyModal?: () => void;
  onOpenProfile?: () => void;
  onNavigateHome?: () => void;
  onOpenShortcuts?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activeView?: string;
  activeFolder?: Folder | null;
}

export function AppHeader({
  onOpenAddModal,
  onOpenImportExport,
  onOpenChromeExtension,
  onOpenStashTabs,
  onOpenSearch,
  onOpenApiKeyModal,
  onOpenProfile,
  onNavigateHome,
  onOpenShortcuts,
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
    "smart-collections": "Smart Collections",
    sessions: "Tab Sessions & Stash",
    shared: "Shared Links & Collections",
    feedback: "Feedback & Community",
    profile: "Account Profile",
    trash: "Recycle Bin",
  };

  const currentLabel = activeFolder ? activeFolder.name : (viewLabels[activeView] || activeView);

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background relative z-40 flex-shrink-0">
      {/* Left side: Single Sidebar Toggle Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+\\)" : "Collapse Sidebar (Ctrl+\\)"}
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-primary" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
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
          className="h-8 px-3.5 mr-1"
          title="Add Bookmark (N)"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span>Add bookmark</span>
        </Button>

        {/* 2. Single Combined Icon for Import & Export */}
        <button
          type="button"
          onClick={onOpenImportExport}
          title="Import & Export Bookmarks (HTML / JSON / CSV)"
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>

        {/* 2.5. Chrome Browser Extension */}
        {onOpenChromeExtension && (
          <button
            type="button"
            onClick={onOpenChromeExtension}
            title="Markly Chrome Extension (Save sites directly from your browser)"
            className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
          >
            <Puzzle className="h-3.5 w-3.5 text-primary" />
          </button>
        )}

        {/* 2.6. Stash Open Tabs */}
        {onOpenStashTabs && (
          <button
            type="button"
            onClick={onOpenStashTabs}
            title="Stash Open Tabs (Session Snapshots)"
            className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-blue-500" />
          </button>
        )}

        {/* 3. API Key & AI Settings */}
        <button
          type="button"
          onClick={onOpenApiKeyModal}
          title="Custom Gemini API Key & AI Settings"
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
        >
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* 4. Keyboard Shortcuts Cheatsheet (?) */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          title="Keyboard Navigation & Shortcuts (?)"
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
        >
          <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* 5. Theme Accent Picker */}
        <ThemeAccentPicker />

        {/* 6. Theme Toggle */}
        <ThemeToggle />

        {/* 5. User Profile Avatar & Dropdown Menu */}
        <div ref={userMenuRef} className="relative flex items-center gap-1.5 pl-1.5 border-l border-border">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={user ? `Account Menu (${user.user_metadata?.display_name || user.email})` : "Account Menu (Guest Mode)"}
            className="flex items-center gap-1 p-0.5 pr-1.5 rounded-full border border-border bg-card hover:bg-secondary transition-colors cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <img
                src={displayAvatar}
                alt={user?.user_metadata?.display_name || user?.email || "User"}
                className="h-7 w-7 rounded-full object-cover bg-card border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email || "User"}`;
                }}
              />
              <span
                className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${
                  user ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          {!user && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAuthModal("login")}
              className="h-8 px-2.5 gap-1.5 font-medium cursor-pointer"
              title="Sign in with Supabase or create an account"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Sign In</span>
            </Button>
          )}

          {/* User Popover / Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-card shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {user ? (
                <div className="space-y-1">
                  <div className="px-2.5 py-2 border-b border-border/60 mb-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Authenticated</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors text-left"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Account profile & settings</span>
                  </button>

                  <div className="border-t border-border/60 my-1 pt-1" />

                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOutAllDevices();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-colors text-left"
                    title="Revokes session tokens on all devices"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Sign out all devices</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2.5 py-2 border-b border-border/60 mb-1">
                    <p className="text-xs font-medium text-foreground">Guest session</p>
                    <p className="text-xs text-muted-foreground">
                      Temporary in-memory browsing
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      openAuthModal("login");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors text-left"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Sign in to account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      openAuthModal("signup");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors text-left"
                  >
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span>Create account</span>
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
