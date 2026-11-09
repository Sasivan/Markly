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
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
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

  // Listen to Auth State Changes
  React.useEffect(() => {
    async function initSession() {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user || null);

        // Store user_id in document cookie so server API routes can extract it
        if (data.session?.user?.id) {
          document.cookie = `markly_user_id=${data.session.user.id}; path=/; max-age=2592000; SameSite=Lax`;
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      setIsLoading(false);

      if (newSession?.user?.id) {
        document.cookie = `markly_user_id=${newSession.user.id}; path=/; max-age=2592000; SameSite=Lax`;
      } else {
        document.cookie = "markly_user_id=; path=/; max-age=0";
      }
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
      const email = emailOrUser.includes("@")
        ? emailOrUser.trim()
        : `${emailOrUser.trim().toLowerCase()}@markly.internal`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setUser(data.user);
      setSession(data.session);
      closeAuthModal();

      // Trigger automatic sync for this user
      if (data.user?.id) {
        await fetch("/api/auth/sync-user", {
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

  // Sign Up with email, password, and optional name
  const signUpWithEmail = async (emailOrUser: string, pass: string, name?: string) => {
    try {
      const isEmail = emailOrUser.includes("@");
      const email = isEmail
        ? emailOrUser.trim()
        : `${emailOrUser.trim().toLowerCase()}@markly.internal`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            display_name: name || emailOrUser.split("@")[0],
            username: isEmail ? emailOrUser.split("@")[0] : emailOrUser,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);

        // Auto-migrate local bookmarks to the newly created user account
        await fetch("/api/auth/migrate-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id }),
        }).catch(() => {});
      }

      closeAuthModal();
      return { success: true };
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
      document.cookie = "markly_user_id=; path=/; max-age=0";
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

