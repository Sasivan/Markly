"use client";

import * as React from "react";
import {
  User,
  Mail,
  Shield,
  Key,
  CheckCircle2,
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
  MapPin,
  Lock,
  Eye,
  EyeOff,
  FileText,
  LogIn,
  Camera,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDailyAiQuota, type DailyAiQuota } from "@/lib/ai-config";
import { DicebearAvatarModal } from "./dicebear-avatar-modal";

interface ProfileViewProps {
  totalBookmarks?: number;
  totalFolders?: number;
  onRefreshData?: () => void;
  onNavigateHome?: () => void;
  onOpenApiKeyModal?: () => void;
}

export function ProfileView({
  totalBookmarks = 0,
  totalFolders = 0,
  onRefreshData,
  onNavigateHome,
  onOpenApiKeyModal,
}: ProfileViewProps) {
  const { user, signOut, openAuthModal, isLoading } = useAuth();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  // Basic Details State
  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [isSavingUsername, setIsSavingUsername] = React.useState(false);

  // Real-time username verification state
  const [usernameCheck, setUsernameCheck] = React.useState<{
    state: "idle" | "checking" | "available" | "unavailable" | "unchanged";
    message?: string;
  }>({ state: "idle" });

  const [dob, setDob] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false);

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isSavingDetails, setIsSavingDetails] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Daily AI quota state (tracks 30 free daily requests or custom key status)
  const [aiQuota, setAiQuota] = React.useState<DailyAiQuota>(() => getDailyAiQuota(user?.id));

  React.useEffect(() => {
    const syncQuota = () => {
      setAiQuota(getDailyAiQuota(user?.id));
    };
    syncQuota();
    window.addEventListener("markly-ai-quota-updated", syncQuota);
    window.addEventListener("storage", syncQuota);
    return () => {
      window.removeEventListener("markly-ai-quota-updated", syncQuota);
      window.removeEventListener("storage", syncQuota);
    };
  }, [user?.id]);

  // Compute default avatar for removal / reset
  const defaultAvatar = React.useMemo(() => {
    if (user) {
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email || user.id)}`;
    }
    return "https://api.dicebear.com/7.x/bottts/svg?seed=markly_guest";
  }, [user]);

  // Password Setup / Change State
  const [showPasswordForm, setShowPasswordForm] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPasswordText, setShowPasswordText] = React.useState(false);
  const [isSettingPassword, setIsSettingPassword] = React.useState(false);

  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync state with current user or guest storage
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
      setDob(user.user_metadata?.dob || "");
      setBio(user.user_metadata?.bio || "");
      setLocation(user.user_metadata?.location || "");
      setUsername(user.user_metadata?.username || user.user_metadata?.preferred_username || "");
    } else if (typeof window !== "undefined") {
      // Load guest profile from localStorage
      try {
        const stored = localStorage.getItem("markly_guest_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          setDisplayName(parsed.displayName || "Guest Explorer");
          setDob(parsed.dob || "");
          setBio(parsed.bio || "Exploring Markly in offline local mode.");
          setLocation(parsed.location || "");
          setAvatarUrl(
            parsed.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=markly_guest"
          );
        } else {
          setDisplayName("Guest Explorer");
          setBio("Exploring Markly in offline local mode.");
          setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=markly_guest");
        }
      } catch {
        setDisplayName("Guest Explorer");
      }
    }
  }, [user]);

  // Real-time debounce check for unique username
  React.useEffect(() => {
    if (!isEditingUsername) {
      setUsernameCheck({ state: "idle" });
      return;
    }

    const clean = username.trim().toLowerCase();
    const currentUsername = (user?.user_metadata?.username || "").trim().toLowerCase();

    if (!clean) {
      setUsernameCheck({ state: "idle" });
      return;
    }

    if (currentUsername && clean === currentUsername) {
      setUsernameCheck({
        state: "unchanged",
        message: "This is your current username.",
      });
      return;
    }

    if (clean.length < 3) {
      setUsernameCheck({
        state: "unavailable",
        message: "Username must be at least 3 characters.",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(clean)) {
      setUsernameCheck({
        state: "unavailable",
        message: "Only letters, numbers, underscores, dots, or hyphens.",
      });
      return;
    }

    setUsernameCheck({ state: "checking", message: "Verifying uniqueness..." });
    const timer = setTimeout(async () => {
      try {
        const uId = user?.id || "";
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(clean)}${uId ? `&userId=${encodeURIComponent(uId)}` : ""}`
        );
        const data = await res.json();
        if (data.available) {
          setUsernameCheck({ state: "available", message: `@${clean} is available!` });
        } else {
          setUsernameCheck({
            state: "unavailable",
            message: data.error || "Username is already taken.",
          });
        }
      } catch {
        setUsernameCheck({ state: "idle" });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [username, isEditingUsername, isEditingDetails, user]);

  // Handle changing avatar from DiceBear modal or file upload
  const handleApplyAvatar = async (newUrl: string) => {
    setAvatarUrl(newUrl);
    try {
      if (user) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: newUrl,
            picture: newUrl,
          },
        });
      }
      fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl: newUrl }),
      }).catch(() => {});

      if (typeof window !== "undefined") {
        localStorage.setItem("markly_user_avatar", newUrl);
        window.dispatchEvent(new CustomEvent("markly-avatar-updated", { detail: { avatarUrl: newUrl } }));
      }

      setStatusMessage({
        type: "success",
        text: "Avatar updated successfully!",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.warn("Avatar apply notice:", err);
    }
  };

  // Update Profile Details in Supabase (or localStorage if guest)
  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;

    setIsSavingDetails(true);
    setStatusMessage(null);

    try {
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            display_name: displayName.trim(),
            full_name: displayName.trim(),
            dob: dob.trim(),
            bio: bio.trim(),
            location: location.trim(),
            avatar_url: avatarUrl.trim(),
          },
        });
        if (error) throw error;

        // Sync with server profile database & SQLite cache
        fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            avatarUrl: avatarUrl.trim() || undefined,
          }),
        }).catch(() => {});
      } else if (typeof window !== "undefined") {
        localStorage.setItem(
          "markly_guest_profile",
          JSON.stringify({
            displayName: displayName.trim(),
            username: username.trim().toLowerCase(),
            dob: dob.trim(),
            bio: bio.trim(),
            location: location.trim(),
            avatarUrl: avatarUrl.trim(),
          })
        );
      }

      setIsEditingDetails(false);
      setStatusMessage({
        type: "success",
        text: "Profile details updated successfully!",
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update profile",
      });
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Save unique username in Supabase and SQLite
  const handleSaveUsername = async () => {
    if (!user || !username.trim()) return;
    const clean = username.trim().toLowerCase();
    const currentUsername = (user?.user_metadata?.username || "").trim().toLowerCase();

    // If unchanged, simply dismiss edit state
    if (currentUsername && clean === currentUsername) {
      setIsEditingUsername(false);
      return;
    }

    if (usernameCheck.state === "unavailable") {
      setStatusMessage({
        type: "error",
        text: usernameCheck.message || "Please choose an available username.",
      });
      return;
    }

    if (usernameCheck.state === "checking") {
      setStatusMessage({
        type: "error",
        text: "Please wait while we verify username uniqueness.",
      });
      return;
    }

    setIsSavingUsername(true);
    setStatusMessage(null);

    try {
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            username: clean,
          },
        });
        if (error) throw error;

        // Sync with server profile database & SQLite cache
        fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            avatarUrl: avatarUrl.trim() || undefined,
          }),
        }).catch(() => {});
      }

      setIsEditingUsername(false);
      setStatusMessage({
        type: "success",
        text: `Username set to @${clean}! You can now log in using @${clean} or your email.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update username",
      });
    } finally {
      setIsSavingUsername(false);
    }
  };

  // Set / Update Email Password (works for OAuth & Email users via Admin API)
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setStatusMessage({
        type: "error",
        text: "Password must be at least 6 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    if (!user?.id) {
      setStatusMessage({
        type: "error",
        text: "Please sign in to set or change your account password.",
      });
      return;
    }

    setIsSettingPassword(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setStatusMessage({
        type: "success",
        text: "Account password updated successfully! You can now log in using either your username & password or Google/GitHub.",
      });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update password",
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Link OAuth Identity (Google / GitHub)
  const handleLinkIdentity = async (provider: "google" | "github") => {
    setStatusMessage(null);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.linkIdentity({
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
    if (!user?.id) {
      setStatusMessage({
        type: "success",
        text: "Guest mode: your links and folders are safely stored in your local browser cache.",
      });
      return;
    }
    setIsSyncing(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = { error: `Server response: ${res.status}` };
      }
      if (res.ok && data?.success) {
        setStatusMessage({
          type: "success",
          text: `Synced successfully! (${data.bookmarksCount || 0} bookmarks, ${data.foldersCount || 0} folders)`,
        });
        if (onRefreshData) onRefreshData();
      } else {
        throw new Error(data?.error || `Sync could not complete (${res.status})`);
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Sync note: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4500);
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

  // While loading auth state, show a clean skeleton so it never flashes guest or login screens
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 border border-border" />
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-neutral-800 border border-border" />
      </div>
    );
  }

  const isGuest = !user;
  const createdDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Local Offline Storage";

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
            Manage your personal profile details, linked authentication accounts, and database sync.
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
          className={`p-3 rounded-md border text-xs flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono"
              : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 font-mono"
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
      <div className="rounded-lg border border-border bg-card p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Circular Avatar */}
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover border border-border bg-secondary"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;
                }}
              />
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute inset-0 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-mono font-medium cursor-pointer"
                title="Change Avatar (DiceBear or Upload)"
              >
                <Camera className="h-4 w-4 mb-0.5" />
                <span>Change</span>
              </button>
              <span
                className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background ${
                  isGuest ? "bg-amber-500" : "bg-emerald-500"
                }`}
                title={isGuest ? "Local Offline Mode" : "Online & Synced"}
              />
            </div>

            {/* Name & Basic Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {displayName}
                </h2>
                {isGuest && (
                  <span className="px-2 py-0.5 rounded-sm text-xs font-mono bg-secondary text-muted-foreground border border-border">
                    Local Guest Mode
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{user?.email || "guest@local.device"}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isGuest ? "Active Session" : `Joined ${createdDate}`}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Camera className="h-3 w-3" />
                  <span>Change Avatar</span>
                </button>
                {avatarUrl !== defaultAvatar && (
                  <>
                    <span className="text-muted-foreground text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => handleApplyAvatar(defaultAvatar)}
                      className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      title="Reset avatar to default"
                    >
                      <span>Reset Avatar</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 sm:self-center">
            <div className="px-3.5 py-1.5 rounded-md border border-border bg-card text-center">
              <div className="text-sm font-semibold font-mono text-foreground">
                {totalBookmarks}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Bookmarks</div>
            </div>
            <div className="px-3.5 py-1.5 rounded-md border border-border bg-card text-center">
              <div className="text-sm font-semibold font-mono text-foreground">
                {totalFolders}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Folders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Mode Invitation Banner */}
      {isGuest && (
        <div className="rounded-md border border-dashed border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Connect Cloud Sync (Optional)</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg">
              Sign in with Google, GitHub, or Email to back up your bookmarks to Supabase, sync across all your devices in real-time, and link multiple login providers.
            </p>
          </div>
          <Button
            onClick={() => openAuthModal("login")}
            className="text-xs h-8 px-4 cursor-pointer flex-shrink-0"
          >
            <LogIn className="h-3.5 w-3.5 mr-1" />
            <span>Sign In or Sign Up</span>
          </Button>
        </div>
      )}

      {/* AI Daily Usage & Quota Card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-secondary text-primary flex items-center justify-center flex-shrink-0 border border-border">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>AI Summary & Metadata Quota</span>
                {aiQuota.hasCustomKey ? (
                  <span className="px-2 py-0.5 rounded-sm text-xs font-mono font-medium bg-secondary text-foreground border border-border">
                    Custom Key: Unlimited
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-sm text-xs font-mono font-medium bg-secondary text-foreground border border-border">
                    Free Tier: 30 Credits / Day
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {aiQuota.hasCustomKey
                  ? "Your personal Google Gemini API key is active. Site summaries and bookmark enrichment have unlimited usage."
                  : "Every user receives 30 free AI enrichment & summary credits per day. Resets daily at midnight UTC."}
              </p>
            </div>
          </div>

          {onOpenApiKeyModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenApiKeyModal}
              className="text-xs h-8 cursor-pointer gap-1.5 border-border hover:bg-secondary flex-shrink-0"
            >
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{aiQuota.hasCustomKey ? "Change Gemini Key" : "Add Custom API Key"}</span>
            </Button>
          )}
        </div>

        {/* Usage Progress Bar */}
        <div className="p-3.5 rounded-md border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">
              {aiQuota.hasCustomKey ? "Daily Usage Mode: Custom Gemini Key" : "Today's Usage:"}
            </span>
            <span className={aiQuota.isQuotaExceeded ? "text-amber-600 font-semibold" : "text-foreground"}>
              {aiQuota.hasCustomKey ? (
                "Unlimited Requests (Personal Key Active)"
              ) : (
                `${aiQuota.used} of ${aiQuota.limit} used (${aiQuota.remaining} remaining today)`
              )}
            </span>
          </div>

          {!aiQuota.hasCustomKey && (
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  aiQuota.isQuotaExceeded ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, Math.round((aiQuota.used / aiQuota.limit) * 100))}%` }}
              />
            </div>
          )}

          <p className="text-xs font-mono text-muted-foreground pt-0.5">
            {aiQuota.isQuotaExceeded
              ? "Free daily limit reached for today. You can still save any bookmark normally; AI will resume tomorrow or immediately upon adding your own Gemini key."
              : "Bookmarks always save cleanly even if quota is reached. Enter your own free Gemini API key anytime for unlimited uses."}
          </p>
        </div>
      </div>

      {/* 1. Basic Details Card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Personal Details</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your profile information and details.
            </p>
          </div>
          {!isEditingDetails ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingDetails(true)}
              className="text-xs h-7 px-3 cursor-pointer gap-1.5"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit Details</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={isSavingDetails}
                className="text-xs h-7 px-3 cursor-pointer gap-1.5"
              >
                <Save className="h-3 w-3" />
                <span>{isSavingDetails ? "Saving..." : "Save Details"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDetails(false)}
                className="text-xs h-7 px-2.5 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {!isEditingDetails ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-md border border-border bg-card space-y-1">
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Full Name</span>
              </div>
              <div className="text-xs font-medium text-foreground">
                {displayName || "Not set"}
              </div>
            </div>

            <div className="p-3 rounded-md border border-border bg-card space-y-1">
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Date of Birth (DOB)</span>
              </div>
              <div className="text-xs font-medium text-foreground">
                {dob ? (
                  new Date(dob).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                ) : (
                  <span className="text-muted-foreground font-normal">Not provided</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-md border border-border bg-card space-y-1">
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Location</span>
              </div>
              <div className="text-xs font-medium text-foreground">
                {location || <span className="text-muted-foreground font-normal">Not set</span>}
              </div>
            </div>

            <div className="sm:col-span-2 p-3 rounded-md border border-border bg-card space-y-1">
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Bio / About</span>
              </div>
              <div className="text-xs text-foreground line-clamp-2">
                {bio || <span className="text-muted-foreground font-normal">No bio added yet</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Date of Birth (DOB)
                </label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Location
                </label>
                <Input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Bio / About
              </label>
              <Input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short sentence about you..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Connected Sign-in Methods & Password Management (When logged in) */}
      {!isGuest ? (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              <span>Connected Sign-in Methods & Password</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log in via Google, GitHub, or Email & Password interchangeably for this account.
            </p>
          </div>

          <div className="space-y-3">
            {/* Unique Username Row */}
            <div className="p-3.5 rounded-md border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-foreground font-medium font-mono text-sm border border-border">
                    @
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Unique Markly Username
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {username ? `@${username}` : "No username set yet"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingUsername(!isEditingUsername)}
                    className="text-xs h-7 px-2.5 cursor-pointer border-border hover:bg-secondary"
                  >
                    <Edit2 className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span>{isEditingUsername ? "Cancel" : username ? "Change Username" : "Create Username"}</span>
                  </Button>
                </div>
              </div>

              {isEditingUsername && (
                <div className="mt-2 pt-3 border-t border-border space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    Choose a unique username. Every username is unique and allows you to log in interchangeably with your email and password.
                  </p>
                  <div className="space-y-1.5 max-w-md">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-muted-foreground">@</span>
                        <Input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                          placeholder="your_unique_username"
                          className={`pl-7 pr-8 h-8 text-xs font-mono transition-colors ${
                            usernameCheck.state === "available"
                              ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                              : usernameCheck.state === "unavailable"
                              ? "border-rose-500 focus-visible:ring-rose-500/30"
                              : ""
                          }`}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {usernameCheck.state === "checking" && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          )}
                          {(usernameCheck.state === "available" || usernameCheck.state === "unchanged") && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {usernameCheck.state === "unavailable" && (
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        disabled={
                          isSavingUsername ||
                          !username.trim() ||
                          usernameCheck.state === "unavailable" ||
                          usernameCheck.state === "checking"
                        }
                        onClick={handleSaveUsername}
                        className="text-xs h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                      >
                        {isSavingUsername ? "Saving..." : "Save Username"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsEditingUsername(false)}
                        className="text-xs h-8 px-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                    </div>

                    {usernameCheck.message && (
                      <div
                        className={`flex items-center gap-1.5 text-xs font-mono pt-0.5 ${
                          usernameCheck.state === "available" || usernameCheck.state === "unchanged"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : usernameCheck.state === "unavailable"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-primary"
                        }`}
                      >
                        {usernameCheck.state === "checking" && (
                          <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                        )}
                        {(usernameCheck.state === "available" || usernameCheck.state === "unchanged") && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        )}
                        {usernameCheck.state === "unavailable" && (
                          <XCircle className="h-3 w-3 text-rose-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{usernameCheck.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Email & Password Row */}
            <div className="p-3.5 rounded-md border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-foreground border border-border">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Email & Password
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-secondary text-foreground text-xs font-mono font-medium border border-border">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>Active</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-xs h-7 px-2.5 cursor-pointer border-border hover:bg-secondary"
                  >
                    <Lock className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span>{showPasswordForm ? "Close" : "Set / Change Password"}</span>
                  </Button>
                </div>
              </div>

              {/* Set / Change Password Form */}
              {showPasswordForm && (
                <form
                  onSubmit={handleSetPassword}
                  className="mt-2 pt-3 border-t border-border space-y-3"
                >
                  <p className="text-xs text-muted-foreground">
                    Set an email password. Once set, you can sign in using either Google/GitHub or this password.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        New Password (min 6 characters)
                      </label>
                      <div className="relative">
                        <Input
                          type={showPasswordText ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-8 text-xs pr-8 font-mono"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswordText ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Confirm New Password
                      </label>
                      <Input
                        type={showPasswordText ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-8 text-xs font-mono"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-xs h-7 px-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSettingPassword || !newPassword || newPassword !== confirmPassword}
                      className="text-xs h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                    >
                      {isSettingPassword ? "Saving Password..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Google OAuth Row */}
            <div className="p-3.5 rounded-md border border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center">
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
                  <div className="text-xs font-semibold text-foreground">
                    Google Account
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {isGoogleLinked ? "Connected with Google" : "Not connected yet"}
                  </div>
                </div>
              </div>

              {isGoogleLinked ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-secondary text-foreground text-xs font-mono font-medium border border-border">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Linked</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkIdentity("google")}
                  className="text-xs h-7 px-3 cursor-pointer border-border hover:bg-secondary"
                >
                  <span>Link Google</span>
                </Button>
              )}
            </div>

            {/* GitHub OAuth Row */}
            <div className="p-3.5 rounded-md border border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-secondary text-foreground flex items-center justify-center border border-border">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    GitHub Account
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {isGithubLinked ? "Connected with GitHub" : "Not connected yet"}
                  </div>
                </div>
              </div>

              {isGithubLinked ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-secondary text-foreground text-xs font-mono font-medium border border-border">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Linked</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkIdentity("github")}
                  className="text-xs h-7 px-3 cursor-pointer border-border hover:bg-secondary"
                >
                  <span>Link GitHub</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Cloud Database & Realtime Sync Card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span>Database & Cloud Sync</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isGuest
                ? "Operating in local SQLite cache. Connect Supabase to sync your data to the cloud."
                : "Your bookmarks and collections are mirrored to Supabase Postgres with offline caching."}
            </p>
          </div>
          {!isGuest ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="text-xs h-8 cursor-pointer gap-1.5 border-border hover:bg-secondary"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-muted-foreground ${
                  isSyncing ? "animate-spin" : ""
                }`}
              />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => openAuthModal("login")}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In to Cloud</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sign Out (Only when logged in) */}
      {!isGuest && (
        <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-foreground">
              Sign Out of Account
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              End your 30-day session on this browser. Your bookmarks remain safely stored in Supabase.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="text-xs h-8 border-border hover:bg-secondary cursor-pointer gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      )}

      {/* DiceBear & Custom Image Avatar Modal */}
      <DicebearAvatarModal
        open={isAvatarModalOpen}
        onOpenChange={setIsAvatarModalOpen}
        currentAvatarUrl={avatarUrl}
        defaultAvatarUrl={defaultAvatar}
        onSelectAvatar={handleApplyAvatar}
      />
    </div>
  );
}
