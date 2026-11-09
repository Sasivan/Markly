"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-context";
import { Sparkles, AlertCircle, RefreshCw, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck } from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    openAuthModal,
    signInWithPassword,
    signUpWithEmail,
    signInWithOAuth,
  } = useAuth();

  const [mode, setMode] = React.useState<"login" | "signup">(authModalMode);
  const [emailOrUser, setEmailOrUser] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMode(authModalMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [authModalMode, isAuthModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailOrUser.trim() || !password.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const res = await signInWithPassword(emailOrUser, password);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to log in.");
        }
      } else {
        const res = await signUpWithEmail(emailOrUser, password, displayName);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to sign up.");
        } else {
          setSuccessMessage("Account created successfully! Your library is now synced with Supabase.");
          setTimeout(() => {
            closeAuthModal();
          }, 1500);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await signInWithOAuth(provider);
      if (!res.success) {
        const err = res.error || "";
        if (err.includes("provider is not enabled") || err.includes("Unsupported provider") || err.includes("validation_failed")) {
          setErrorMessage(
            `${provider === "google" ? "Google" : "GitHub"} OAuth is not enabled in your Supabase project yet. Please use Email & Password above, or toggle on ${provider} in Supabase Dashboard > Authentication > Providers.`
          );
        } else {
          setErrorMessage(err || `Failed to sign in with ${provider}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-[#181818] border-2 border-slate-200 dark:border-neutral-800 shadow-2xl rounded-3xl animate-in zoom-in-95">
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white text-center relative">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl mx-auto shadow-inner border border-white/30 mb-3">
            M
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {mode === "login" ? "Welcome Back to Markly" : "Create Your Markly Account"}
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-xs mx-auto">
            {mode === "login"
              ? "Sign in to access and sync your bookmarks in real-time."
              : "Sign up to get your own cloud database with real-time Supabase sync."}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-center mt-5">
            <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-md border border-white/10 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4">
          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOAuth("google")}
              disabled={isLoading}
              className="h-9 cursor-pointer gap-2 text-xs font-semibold border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800"
            >
              {/* Google Colorful G Icon */}
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
              <span>Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOAuth("github")}
              disabled={isLoading}
              className="h-9 cursor-pointer gap-2 text-xs font-semibold border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800"
            >
              {/* GitHub Octocat Icon */}
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </Button>
          </div>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-[#181818] px-2 text-muted-foreground font-semibold">
                Or with username & password
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                  Full Name / Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. Alex Rivera"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-50 dark:bg-neutral-900"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                {mode === "login" ? "Email or Username" : "Email Address"}
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type={mode === "signup" ? "email" : "text"}
                  placeholder={mode === "login" ? "user@example.com or username" : "user@example.com"}
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 dark:bg-neutral-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 dark:bg-neutral-900"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 mt-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md gap-1.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In to Markly" : "Create Account & Sync Library"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Privacy & Cloud Notice */}
          <div className="pt-2 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Supabase Cloud Database & 100% Offline Local Backup</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

