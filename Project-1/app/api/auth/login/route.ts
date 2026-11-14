import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { BookmarkRepository } from "@/server/db/repository";
import { checkRateLimit, getTrustedClientIp } from "@/server/scraper/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier || "").trim();
    const password = body?.password || "";

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Username/email and password are required." },
        { status: 400 }
      );
    }

    // Rate limiting: 10 attempts per minute per IP and per identifier
    const clientIp = getTrustedClientIp(req);
    const ipLimit = checkRateLimit(`login:ip:${clientIp}`, 10, 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    const idLimit = checkRateLimit(`login:id:${identifier.toLowerCase()}`, 10, 60 * 1000);
    if (!idLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts for this account. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    let emailToUse = identifier;
    const cleanId = identifier.startsWith("@") ? identifier.slice(1).trim() : identifier;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);

    if (!isEmail) {
      const cleanUsername = cleanId.toLowerCase();

      // 1. Resolve username to user ID via profiles table in Supabase
      const client = SupabaseManager.getClient();
      let resolvedEmail: string | null = null;

      if (client) {
        try {
          const { data: profile } = await client
            .from("profiles")
            .select("id")
            .eq("username", cleanUsername)
            .maybeSingle();

          if (profile?.id) {
            const { data: userData } = await client.auth.admin.getUserById(profile.id);
            if (userData?.user?.email) {
              resolvedEmail = userData.user.email;
            }
          }
        } catch (e) {
          console.warn("Profiles lookup notice:", e);
        }
      }

      // 2. Fallback to local SQLite users cache if offline or not in Supabase yet
      if (!resolvedEmail) {
        const localUser = BookmarkRepository.getUserByUsername(cleanUsername);
        if (localUser?.email && !localUser.email.endsWith("@markly.app") && !localUser.email.endsWith("@markly.internal")) {
          resolvedEmail = localUser.email;
        }
      }

      if (!resolvedEmail) {
        // Return generic invalid credentials without leaking whether username exists
        return NextResponse.json(
          {
            success: false,
            error: "Invalid username/email or password.",
          },
          { status: 401 }
        );
      }

      emailToUse = resolvedEmail;
    }

    // 3. Authenticate with Supabase using server client (sets session cookies automatically)
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid username/email or password.",
        },
        { status: 401 }
      );
    }

    // Sync user data in local store
    try {
      BookmarkRepository.ensureUser(
        data.user.id,
        data.user.email,
        data.user.user_metadata?.display_name || data.user.user_metadata?.full_name,
        data.user.user_metadata?.avatar_url,
        data.user.user_metadata?.username
      );
    } catch {}

    // NEVER return email to caller if they logged in with username
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        user_metadata: data.user.user_metadata,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
