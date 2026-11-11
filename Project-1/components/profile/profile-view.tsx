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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { user, signOut, openAuthModal, isLoading } = useAuth();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  // Basic Details State
  const [displayName, setDisplayName] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isSavingDetails, setIsSavingDetails] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

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
      } else if (typeof window !== "undefined") {
        localStorage.setItem(
          "markly_guest_profile",
          JSON.stringify({
            displayName: displayName.trim(),
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

  // Set / Update Email Password
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

    setIsSettingPassword(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setStatusMessage({
        type: "success",
        text: "Account password updated! You can now log in using either your email & password or Google/GitHub.",
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
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-neutral-800 shadow-xs ${
                  isGuest ? "bg-amber-500" : "bg-emerald-500"
                }`}
                title={isGuest ? "Local Offline Mode" : "Online & Synced"}
              />
            </div>

            {/* Name & Basic Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {displayName}
                </h2>
                {isGuest && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Local Guest Mode
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  <span>{user?.email || "guest@local.device"}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isGuest ? "Active Session" : `Joined ${createdDate}`}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 sm:self-center">
            <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 text-center">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {totalBookmarks}
              </div>
              <div className="text-[10px] text-muted-foreground">Bookmarks</div>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 text-center">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {totalFolders}
              </div>
              <div className="text-[10px] text-muted-foreground">Folders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Mode Invitation Banner (Only if not logged in) */}
      {isGuest && (
        <div className="rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Connect Cloud Sync (Optional)</span>
            </div>
            <p className="text-[11px] text-muted-foreground max-w-lg">
              Sign in with Google, GitHub, or Email to back up your bookmarks to Supabase, sync across all your devices in real-time, and link multiple login providers.
            </p>
          </div>
          <Button
            onClick={() => openAuthModal("login")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-4 cursor-pointer shadow-xs flex-shrink-0"
          >
            <LogIn className="h-3.5 w-3.5 mr-1" />
            <span>Sign In or Sign Up</span>
          </Button>
        </div>
      )}

      {/* 1. Basic Details Card (Name, DOB, Location, Bio) - No UID */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
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
                className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-500" />
                <span>Full Name</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {displayName || "Not set"}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                <span>Date of Birth (DOB)</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
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

            <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Location</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {location || <span className="text-muted-foreground font-normal">Not set</span>}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-purple-500" />
                <span>Bio / About</span>
              </div>
              <div className="text-xs text-slate-800 dark:text-neutral-200 line-clamp-2">
                {bio || <span className="text-muted-foreground font-normal">No bio added yet</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
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
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
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
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
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

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                  Avatar Picture URL (optional)
                </label>
                <Input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
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
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-indigo-500" />
              <span>Connected Sign-in Methods & Password</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log in via Google, GitHub, or Email & Password interchangeably for this account.
            </p>
          </div>

          <div className="space-y-3">
            {/* Email & Password Row */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 space-y-3">
              <div className="flex items-center justify-between">
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

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Active</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-xs h-7 px-2.5 cursor-pointer border-slate-200 dark:border-neutral-700"
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
                  className="mt-2 pt-3 border-t border-slate-200 dark:border-neutral-800 space-y-3 animate-in fade-in"
                >
                  <p className="text-[11px] text-muted-foreground">
                    Set an email password. Once set, you can sign in using either Google/GitHub OR this password!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                        New Password (min 6 characters)
                      </label>
                      <div className="relative">
                        <Input
                          type={showPasswordText ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-8 text-xs pr-8"
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
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                        Confirm New Password
                      </label>
                      <Input
                        type={showPasswordText ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-8 text-xs"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="submit"
                      disabled={isSettingPassword || !newPassword || newPassword !== confirmPassword}
                      className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      {isSettingPassword ? "Saving Password..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Google OAuth Row */}
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
                    {isGoogleLinked ? "Connected with Google" : "Not connected yet"}
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

            {/* GitHub OAuth Row */}
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
                    {isGithubLinked ? "Connected with GitHub" : "Not connected yet"}
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
      ) : null}

      {/* 3. Cloud Database & Realtime Sync Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
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
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-blue-500 ${
                  isSyncing ? "animate-spin" : ""
                }`}
              />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => openAuthModal("login")}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In to Cloud</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sign Out (Only when logged in) */}
      {!isGuest && (
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
      )}
    </div>
  );
}
