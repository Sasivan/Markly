"use client";

import * as React from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "signup";
  openAuthModal: (mode?: "login" | "signup") => void;
  closeAuthModal: () => void;
  signInWithPassword: (emailOrUser: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, username?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authModalMode, setAuthModalMode] = React.useState<"login" | "signup">("login");

  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  // Listen to Auth State Changes & handle OAuth URL Hash
  React.useEffect(() => {
    async function initSession() {
      try {
        // 1. Check if OAuth returned tokens in the URL hash (#access_token=...)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          const hashString = window.location.hash.startsWith("#")
            ? window.location.hash.substring(1)
            : window.location.hash;
          const hashParams = new URLSearchParams(hashString);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data: oauthSession } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (oauthSession?.session?.user) {
              const u = oauthSession.session.user;
              setUser(u);
              setSession(oauthSession.session);

              // Clean URL hash so the user doesn't see access token in address bar
              window.history.replaceState(null, "", window.location.pathname);

              // Auto-sync user data in the background (session cookie identifies user)
              fetch("/api/auth/sync-user", {
                method: "POST",
              }).catch(() => {});

              setIsLoading(false);
              return;
            }
          }
        }

        // 2. Normal session restore via Supabase
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
          setSession(data.session);

          // Clean hash if present
          if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();

    // 3. Auth state subscription (token refresh, sign in, sign out)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
      } else if (newSession?.user?.id) {
        setSession(newSession);
        setUser(newSession.user);
      }
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const openAuthModal = React.useCallback((mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = React.useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Sign In with email or username + password via secure server route /api/auth/login
  const signInWithPassword = async (emailOrUser: string, pass: string) => {
    try {
      const cleanInput = emailOrUser.trim();
      if (!cleanInput) {
        return { success: false, error: "Please enter your username or email." };
      }
      if (!pass) {
        return { success: false, error: "Please enter your password." };
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanInput, password: pass }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Invalid username/email or password.",
        };
      }

      // Re-hydrate client session tokens from refreshed cookie
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        setUser(sessionData.session.user);
        setSession(sessionData.session);
      } else if (data.user) {
        setUser(data.user);
      }

      closeAuthModal();

      // Trigger automatic sync for this user
      fetch("/api/auth/sync-user", {
        method: "POST",
      }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign in" };
    }
  };

  // Sign Up with email, password, and unique username
  const signUpWithEmail = async (email: string, pass: string, username?: string, name?: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = (username || cleanEmail.split("@")[0]).trim().toLowerCase();

      // 1. Verify username uniqueness before signup
      if (cleanUsername) {
        try {
          const checkRes = await fetch(`/api/auth/check-username?username=${encodeURIComponent(cleanUsername)}`);
          const checkData = await checkRes.json();
          if (!checkData.available) {
            return {
              success: false,
              error: checkData.error || `Username "${cleanUsername}" is already taken. Please choose another.`,
            };
          }
        } catch {}
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            display_name: name?.trim() || cleanUsername,
            username: cleanUsername,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered") || error.message.includes("already exists")) {
          return {
            success: false,
            error: "An account with this email already exists. Please switch to the Sign In tab to log in (or use Google/GitHub).",
          };
        }
        return { success: false, error: error.message };
      }

      // Check if user already exists (Supabase returns data.user with empty identities if already registered)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: "An account with this email already exists. Please switch to the Sign In tab to log in (or use Google/GitHub).",
        };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);

        // If session was not directly returned (e.g. Supabase email confirmation mode), attempt immediate sign in
        if (!data.session) {
          const loginAttempt = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });
          if (loginAttempt.data?.session?.user) {
            setUser(loginAttempt.data.session.user);
            setSession(loginAttempt.data.session);
          }
        }

        // Trigger automatic sync & minimal starter pack creation
        fetch("/api/auth/sync-user", {
          method: "POST",
        }).catch(() => {});

        closeAuthModal();
        return { success: true };
      }

      return { success: false, error: "Could not create account. Please try again." };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign up" };
    }
  };

  // Sign In with OAuth (Google / GitHub)
  const signInWithOAuth = async (provider: "google" | "github") => {
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "OAuth initiation failed" };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signInWithPassword,
        signUpWithEmail,
        signInWithOAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
