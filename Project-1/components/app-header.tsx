"use client";

import * as React from "react";
import {
  ArrowUpDown,
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
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { UniversalPresetHub } from "@/components/presets/universal-preset-hub";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { ThemeAccentPicker } from "./theme-accent-picker";
import { useAuth } from "@/components/auth/auth-context";
import { cn } from "@/lib/utils";
import type { Folder } from "@/server/db/schema";

interface AppHeaderProps {
  onOpenAddModal: () => void;
  onOpenImportExport: () => void;
  onOpenChromeExtension?: () => void;
  onOpenStashTabs?: () => void;
  onOpenSearch?: () => void;
  onOpenSearchResults?: (query: string, snapshot?: any) => void;
  onOpenApiKeyModal?: () => void;
  onOpenProfile?: () => void;
  onNavigateHome?: () => void;
  onOpenShortcuts?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activeView?: string;
  activeFolder?: Folder | null;
}

/** Square, 32px action control used across the header for one consistent rhythm. */
function HeaderIconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md",
        "border border-transparent text-muted-foreground",
        "hover:border-border hover:bg-secondary/70 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "transition-colors cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}

export function AppHeader({
  onOpenAddModal,
  onOpenImportExport,
  onOpenChromeExtension,
  onOpenStashTabs,
  onOpenSearch,
  onOpenSearchResults,
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
  const [presetHubOpen, setPresetHubOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const isUserAdmin = React.useMemo(() => {
    if (!user) return false;
    const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").replace(/[\r\n"']/g, "").trim().toLowerCase();
    const uEmail = (user.email || user.user_metadata?.email || "").replace(/[\r\n"']/g, "").trim().toLowerCase();
    if (uEmail.startsWith("sasivan177@") || uEmail.includes("sasivan177")) return true;
    if (adminEnv && uEmail && (adminEnv === uEmail || adminEnv.includes(uEmail) || uEmail.includes(adminEnv))) return true;
    if (
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.role === "admin" ||
      user.app_metadata?.is_admin === true ||
      user.user_metadata?.is_admin === true
    ) {
      return true;
    }
    return false;
  }, [user]);

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
    home: "Workspace",
    all: "All sites",
    collections: "Folder collections",
    favorites: "Favorites",
    recent: "Recently visited",
    unsorted: "Unsorted",
    archive: "Archive",
    graph: "Knowledge graph",
    visuals: "Visuals",
    insights: "Library insights",
    "smart-collections": "Smart collections",
    sessions: "Tab sessions",
    shared: "Shared",
    feedback: "Feedback",
    profile: "Account",
    trash: "Recycle bin",
    search: "Search",
  };

  const currentLabel = activeFolder ? activeFolder.name : (viewLabels[activeView] || activeView);

  return (
    <header className="h-12 flex-shrink-0 border-b border-border bg-background relative z-40">
      <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4">
        {/* Left: mobile navigation toggle + current location. */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar (Ctrl+\\)" : "Collapse sidebar (Ctrl+\\)"}
            className="md:hidden h-8 w-8 rounded-md border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground cursor-pointer transition-colors"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 min-w-0 pl-0.5">
            <span className="mk-eyebrow">Markly</span>
            <span className="text-border-strong" aria-hidden="true">/</span>
            <span className="truncate text-xs font-medium text-foreground">{currentLabel}</span>
          </div>
        </div>

        {/* Right: actions, grouped by purpose. */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="default"
            onClick={onOpenAddModal}
            className="h-8 px-2 sm:px-3 mr-1 rounded-md shadow-surface"
            title="Add bookmark (N)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add bookmark</span>
          </Button>

          <div className="flex items-center gap-0.5">
            <HeaderIconButton label="Import & export bookmarks" onClick={onOpenImportExport}>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </HeaderIconButton>

            {onOpenChromeExtension && (
              <HeaderIconButton className="hidden md:inline-flex" label="Markly browser extension" onClick={onOpenChromeExtension}>
                <Puzzle className="h-3.5 w-3.5" />
              </HeaderIconButton>
            )}

            {onOpenStashTabs && (
              <HeaderIconButton className="hidden md:inline-flex" label="Stash open tabs" onClick={onOpenStashTabs}>
                <Layers className="h-3.5 w-3.5" />
              </HeaderIconButton>
            )}

            <HeaderIconButton label="AI & API settings" onClick={onOpenApiKeyModal}>
              <KeyRound className="h-3.5 w-3.5" />
            </HeaderIconButton>

                          <HeaderIconButton className="hidden sm:inline-flex" label="Keyboard shortcuts" onClick={onOpenShortcuts}>
              <Keyboard className="h-3.5 w-3.5" />
            </HeaderIconButton>

            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setPresetHubOpen(true)}
              title="Presets & layout hub"
              className="hidden lg:inline-flex h-8 px-2 items-center gap-1.5 rounded-md border border-transparent text-xs font-medium text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Presets</span>
            </button>

            <span className="hidden sm:flex">
              <ThemeAccentPicker />
            </span>
            <ThemeToggle />
          </div>

          {/* Account */}
          <div ref={userMenuRef} className="relative flex items-center gap-1.5 pl-1.5 ml-0.5 border-l border-border">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              title={user ? `Account menu (${user.user_metadata?.display_name || user.email})` : "Account menu (guest)"}
              className="flex items-center gap-1 p-0.5 pr-1 rounded-full border border-transparent hover:border-border hover:bg-secondary transition-colors cursor-pointer group"
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
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background ${
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
                className="h-8 px-2.5 gap-1.5"
                title="Sign in or create an account"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            )}

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 mk-menu z-50"
              >
                {user ? (
                  <div className="space-y-0.5">
                    <div className="px-2 py-2 mb-1 border-b border-border">
                      <p className="text-xs font-medium text-foreground truncate">
                        {user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-2xs text-muted-foreground truncate font-mono">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-2xs text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Authenticated · synced</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenProfile?.();
                      }}
                      className="mk-menu-item"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Account profile</span>
                    </button>

                    {isUserAdmin && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          window.dispatchEvent(new CustomEvent("markly-open-admin-feedback"));
                        }}
                        className="mk-menu-item my-1 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Admin moderation</span>
                      </button>
                    )}

                    <div className="mk-divider" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await signOut();
                      }}
                      className="mk-menu-item"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      <span>Sign out</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await signOutAllDevices();
                      }}
                      data-destructive="true"
                      className="mk-menu-item"
                      title="Revokes session tokens on all devices"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>Sign out all devices</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="px-2 py-2 mb-1 border-b border-border">
                      <p className="text-xs font-medium text-foreground">Guest session</p>
                      <p className="text-2xs text-muted-foreground">Temporary, in-memory browsing</p>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        openAuthModal("login");
                      }}
                      className="mk-menu-item"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Sign in to account</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        openAuthModal("signup");
                      }}
                      className="mk-menu-item"
                    >
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <span>Create account</span>
                    </button>

                    <div className="mk-divider" />
                    <p className="px-2 py-1.5 text-2xs leading-4 text-muted-foreground">
                      Guest bookmarks live only in this tab. Sign in to sync them permanently.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <UniversalPresetHub
        open={presetHubOpen}
        onOpenChange={setPresetHubOpen}
        activeCategory={
          activeFolder
            ? "folder"
            : activeView === "visuals"
            ? "visuals"
            : activeView === "search"
            ? "search"
            : "home"
        }
        currentFolderId={activeFolder?.id}
        folderName={activeFolder?.name}
        onRunSearch={(q, s) => onOpenSearchResults?.(q, s)}
      />
    </header>
  );
}
