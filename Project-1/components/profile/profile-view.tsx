"use client";

import * as React from "react";
import {
  User,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Sparkles,
  Bookmark,
  FolderTree,
  RefreshCw,
  Edit2,
  Save,
  Link as LinkIcon,
  Globe,
  Database,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProfileViewProps {
  totalBookmarks?: number;
  totalFolders?: number;
  onRefreshData?: () => void;
  onNavigateHome?: () => void;
}

export function ProfileView({
  totalBookmarks = 0,
  totalFolders = 0,
  onRefreshData,
  onNavigateHome,
}: ProfileViewProps) {
  const { user, signOut, openAuthModal } = useAuth();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  const [displayName, setDisplayName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync state with current user
  React.useEffect(() => {
    if (user) {
      const name =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Markly User";

      const pic =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email || user.id}`;

      setDisplayName(name);
      setAvatarUrl(pic);
    }
  }, [user]);

  // Copy User ID
  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Update Profile Name in Supabase
  const handleSaveProfile = async () => {
    if (!displayName.trim() || !user) return;
    setIsSavingName(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim(),
        },
      });

      if (error) throw error;

      setIsEditingName(false);
      setStatusMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update profile",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // Link OAuth Identity (Google / GitHub)
  const handleLinkIdentity = async (provider: "google" | "github") => {
    setStatusMessage(null);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        setStatusMessage({
          type: "error",
          text: `Failed to link ${provider}: ${error.message}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || `Error linking ${provider}`,
      });
    }
  };

  // Manual Trigger Database Sync
  const handleSyncNow = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Synced successfully! (${data.bookmarksCount || 0} bookmarks, ${data.foldersCount || 0} folders)`,
        });
        if (onRefreshData) onRefreshData();
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Sync error: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Detected connected identities
  const providers: string[] =
    user?.app_metadata?.providers ||
    (user?.identities?.map((id: any) => id.provider) as string[]) ||
    [];

  const isGoogleLinked =
    providers.includes("google") ||
    user?.app_metadata?.provider === "google";

  const isGithubLinked =
    providers.includes("github") ||
    user?.app_metadata?.provider === "github";

  const isEmailLinked =
    user?.email &&
    (providers.includes("email") ||
      !isGoogleLinked ||
      !isGithubLinked);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-muted-foreground shadow-inner">
          <User className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            You are browsing in Guest Mode
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Sign in with Supabase, Google, or GitHub to get your own cloud database, real-time sync across devices, and personalized settings.
          </p>
        </div>
        <Button
          onClick={() => openAuthModal("login")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-6 cursor-pointer shadow-md"
        >
          Sign In or Create Account
        </Button>
      </div>
    );
  }

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <span>Account Profile</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your personal profile, linked authentication accounts, and Supabase cloud sync.
          </p>
        </div>
        {onNavigateHome && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateHome}
            className="text-xs h-8 cursor-pointer"
          >
            Back to Workspace
          </Button>
        )}
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 shadow-2xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          ) : (
            <Shield className="h-4 w-4 flex-shrink-0 text-rose-500" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mt-1">
          <div className="flex items-center gap-4">
            {/* Circular Avatar */}
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover border-2 border-white dark:border-neutral-700 shadow-md bg-slate-100 dark:bg-neutral-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;
                }}
              />
              <span
                className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-800 shadow-xs"
                title="Online & Synced"
              />
            </div>

            {/* Name & Basic Info */}
            <div className="space-y-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-8 px-2.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-neutral-700 bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Name"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSavingName}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(false)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {displayName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title="Edit Name"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  <span>{user.email}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Joined {createdDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 sm:self-center">
            <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 text-center">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {totalBookmarks}
              </div>
              <div className="text-[10px] text-muted-foreground">Bookmarks</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 text-center">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {totalFolders}
              </div>
              <div className="text-[10px] text-muted-foreground">Folders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & UID */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="h-4 w-4 text-indigo-500" />
          <span>Account Credentials & Identity</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground">User ID (UID)</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-900 dark:text-neutral-200 truncate">
                {user.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="h-7 px-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-foreground text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy User ID"
              >
                {copiedId ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground">Email Status</div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {user.email_confirmed_at ? "Verified & Authenticated" : "Active Session"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Accounts Section (Email, Google, GitHub) */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-blue-500" />
            <span>Connected Sign-in Methods</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Link your Google or GitHub account to sign in seamlessly with a single click.
          </p>
        </div>

        <div className="space-y-2.5">
          {/* 1. Email & Password */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Email & Password
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              <span>Connected</span>
            </div>
          </div>

          {/* 2. Google OAuth */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center justify-center">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Google Account
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isGoogleLinked
                    ? "Signed in / Linked with Google"
                    : "Not linked yet"}
                </div>
              </div>
            </div>

            {isGoogleLinked ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                <span>Linked</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLinkIdentity("google")}
                className="text-xs h-7 px-3 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <span>Link Google</span>
              </Button>
            )}
          </div>

          {/* 3. GitHub OAuth */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  GitHub Account
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isGithubLinked
                    ? "Signed in / Linked with GitHub"
                    : "Not linked yet"}
                </div>
              </div>
            </div>

            {isGithubLinked ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                <span>Linked</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLinkIdentity("github")}
                className="text-xs h-7 px-3 cursor-pointer border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <span>Link GitHub</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Database & Realtime Sync Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              <span>Supabase Cloud Database Sync</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your bookmarks and collections are mirrored to Supabase Postgres with offline caching.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="text-xs h-8 cursor-pointer gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-blue-500 ${
                isSyncing ? "animate-spin" : ""
              }`}
            />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </Button>
        </div>
      </div>

      {/* Danger Zone: Sign Out */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20 p-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-rose-900 dark:text-rose-300">
            Sign Out of Account
          </div>
          <div className="text-[11px] text-muted-foreground">
            End your 30-day session on this browser. Your bookmarks remain safely stored in Supabase.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="text-xs h-8 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
