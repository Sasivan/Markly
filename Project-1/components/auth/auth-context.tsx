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

// Helper to set 30-day cookie and local storage
function persistUserSession(userId: string) {
  if (typeof document !== "undefined") {
    // 30 days = 2592000 seconds
    document.cookie = `markly_user_id=${userId}; path=/; max-age=2592000; SameSite=Lax`;
    try {
      localStorage.setItem("markly_user_id", userId);
    } catch {}
  }
}

// Helper to remove session cookie and local storage
function clearUserSession() {
  if (typeof document !== "undefined") {
    document.cookie = "markly_user_id=; path=/; max-age=0; SameSite=Lax";
    try {
      localStorage.removeItem("markly_user_id");
    } catch {}
  }
}

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
        // 1. Immediately refresh 30-day cookie from localStorage if present
        if (typeof window !== "undefined") {
          const cachedUserId = localStorage.getItem("markly_user_id");
          if (cachedUserId) {
            persistUserSession(cachedUserId);
          }
        }

        // 2. Check if OAuth returned tokens in the URL hash (#access_token=...)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          const hashString = window.location.hash.startsWith("#")
            ? window.location.hash.substring(1)
            : window.location.hash;
          const hashParams = new URLSearchParams(hashString);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data: oauthSession, error: oauthErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (oauthSession?.session?.user) {
              const u = oauthSession.session.user;
              setUser(u);
              setSession(oauthSession.session);
              persistUserSession(u.id);

              // Clean URL hash so the user doesn't see the ugly access token in the address bar!
              window.history.replaceState(null, "", window.location.pathname);

              // Auto-sync user data in the background
              fetch("/api/auth/sync-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: u.id }),
              }).catch(() => {});

              setIsLoading(false);
              return;
            }
          }
        }

        // 3. Normal session restore via Supabase
        const { data, error } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
          setSession(data.session);
          persistUserSession(data.session.user.id);

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

    // 4. Auth state subscription (token refresh, sign in, sign out)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // ONLY clear session when event is explicitly SIGNED_OUT!
      // Never clear on INITIAL_SESSION or undefined to prevent losing login on page refresh!
      if (event === "SIGNED_OUT") {
        clearUserSession();
        setUser(null);
        setSession(null);
      } else if (newSession?.user?.id) {
        setSession(newSession);
        setUser(newSession.user);
        persistUserSession(newSession.user.id);
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

  // Sign In with email or username + password
  const signInWithPassword = async (emailOrUser: string, pass: string) => {
    try {
      const cleanInput = emailOrUser.trim();
      if (!cleanInput) {
        return { success: false, error: "Please enter your username or email." };
      }

      let emailToUse = cleanInput;
      const isActualEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInput);

      // If user typed a username (or @handle), resolve to their registered email first
      if (!isActualEmail) {
        try {
          const res = await fetch("/api/auth/resolve-identifier", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: cleanInput }),
          });
          const resolveData = await res.json();
          if (!resolveData.success || !resolveData.email) {
            return {
              success: false,
              error: resolveData.error || `No account found with username "${cleanInput}".`,
            };
          }
          emailToUse = resolveData.email;
        } catch {
          emailToUse = cleanInput.startsWith("@") ? cleanInput.slice(1) : cleanInput;
        }
      }

      let { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: pass,
      });

      // Handle "Email not confirmed" automatically via admin API auto-healing
      if (error && error.message.toLowerCase().includes("email not confirmed")) {
        try {
          const confirmRes = await fetch("/api/auth/confirm-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailToUse }),
          });
          const confirmData = await confirmRes.json();
          if (confirmData.success) {
            // Immediate retry now that email is confirmed!
            const retry = await supabase.auth.signInWithPassword({
              email: emailToUse,
              password: pass,
            });
            data = retry.data;
            error = retry.error;
          }
        } catch {}
      }

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          return {
            success: false,
            error: "Invalid username/email or password. If you signed up with Google or GitHub, please click Continue with Google/GitHub below.",
          };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        persistUserSession(data.user.id);
        closeAuthModal();

        // Trigger automatic sync for this user
        fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id }),
        }).catch(() => {});
      }

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
        // Auto-confirm newly registered user immediately so they can log in seamlessly
        try {
          await fetch("/api/auth/confirm-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, userId: data.user.id }),
          });
        } catch {}

        setUser(data.user);
        setSession(data.session);
        persistUserSession(data.user.id);

        // If session was not directly returned (e.g. Supabase email confirmation mode), attempt immediate sign in
        if (!data.session) {
          const loginAttempt = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });
          if (loginAttempt.data?.session?.user) {
            setUser(loginAttempt.data.session.user);
            setSession(loginAttempt.data.session);
            persistUserSession(loginAttempt.data.session.user.id);
          }
        }

        // Trigger automatic sync & minimal starter pack creation
        fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id }),
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
      clearUserSession();
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
