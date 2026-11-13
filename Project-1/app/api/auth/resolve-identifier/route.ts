import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = body?.identifier?.trim();

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Please enter your username or email." }, { status: 400 });
    }

    // Clean input: remove leading @ if user typed @handle
    const raw = identifier.trim();
    const cleanId = raw.startsWith("@") ? raw.slice(1).trim() : raw;
    const lowerId = cleanId.toLowerCase();

    // 1. If identifier is an actual email (has valid user@domain.tld structure)
    const isActualEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
    if (isActualEmail) {
      // Check if user exists in local SQLite or Supabase
      const localUser = BookmarkRepository.getUserByUsername(lowerId);
      return NextResponse.json({
        success: true,
        email: lowerId,
        username: localUser?.username || lowerId.split("@")[0],
        isEmail: true,
      });
    }

    // 2. Check local SQLite users by username OR by email (ignore internal dummy emails)
    let localUser = BookmarkRepository.getUserByUsername(lowerId);
    if (!localUser) {
      try {
        const byEmail = BookmarkRepository.getUserByUsername(cleanId);
        if (byEmail) localUser = byEmail;
      } catch {}
    }

    if (localUser?.email && !localUser.email.endsWith("@markly.app") && !localUser.email.endsWith("@markly.internal")) {
      return NextResponse.json({
        success: true,
        email: localUser.email,
        username: localUser.username || lowerId,
        isEmail: false,
      });
    }

    // 3. Check Supabase Auth users via Admin API with prioritized matching
    try {
      const client = SupabaseManager.getClient();
      if (client) {
        const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (data?.users) {
          const usersList = data.users;

          // Priority 1: Explicitly chosen Markly username
          let match = usersList.find(
            (u) => (u.user_metadata?.username || "").toLowerCase() === lowerId
          );

          // Priority 2: Real registered email
          if (!match) {
            match = usersList.find((u) => (u.email || "").toLowerCase() === lowerId);
          }

          // Priority 3: Display Name / Full Name
          if (!match) {
            match = usersList.find(
              (u) => (u.user_metadata?.display_name || u.user_metadata?.full_name || "").toLowerCase() === lowerId
            );
          }

          // Priority 4: Email prefix (e.g. user part before @)
          if (!match) {
            match = usersList.find(
              (u) => (u.email || "").split("@")[0].toLowerCase() === lowerId
            );
          }

          // Priority 5: Fallback to OAuth preferred_username
          if (!match) {
            match = usersList.find(
              (u) => (u.user_metadata?.preferred_username || "").toLowerCase() === lowerId
            );
          }

          if (match?.email) {
            // Also ensure local user cache is updated with this real email and username
            BookmarkRepository.ensureUser(
              match.id,
              match.email,
              match.user_metadata?.display_name || match.user_metadata?.full_name,
              match.user_metadata?.avatar_url,
              lowerId
            );

            // Directly update SQLite email if it was a dummy email
            try {
              BookmarkRepository.updateUserProfile(match.id, { email: match.email, username: lowerId });
            } catch {}

            return NextResponse.json({
              success: true,
              email: match.email,
              username: lowerId,
              isEmail: false,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Supabase resolve identifier notice:", e);
    }

    // 4. Not found
    return NextResponse.json({
      success: false,
      error: `No account found with username "${identifier}". Please check your username or log in with your email address.`,
    });
  } catch (error: any) {
    console.error("Resolve identifier error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve identifier" },
      { status: 500 }
    );
  }
}

