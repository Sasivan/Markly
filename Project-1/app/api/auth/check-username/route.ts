import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getTrustedClientIp } from "@/server/scraper/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Rate limiting: 20 checks per minute per IP
    const clientIp = getTrustedClientIp(req);
    const ipLimit = checkRateLimit(`check-username:ip:${clientIp}`, 20, 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { available: false, error: "Too many username checks. Please wait a minute." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username")?.trim().toLowerCase();

    // 2. Identify session user securely — never trust client-supplied ?userId=
    let excludeUserId: string | undefined = undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        excludeUserId = user.id;
      }
    } catch {}

    if (!username) {
      return NextResponse.json({ available: false, error: "Username is required" }, { status: 400 });
    }

    // Format validation: 3-30 chars, alphanumeric, underscore, dot, hyphen
    const validFormat = /^[a-z0-9_.-]{3,30}$/.test(username);
    if (!validFormat) {
      return NextResponse.json({
        available: false,
        error: "Username must be 3-30 characters and only contain lowercase letters, numbers, underscores, dots, or hyphens.",
      });
    }

    // Reserved usernames
    const reserved = ["admin", "root", "markly", "support", "help", "guest", "system", "anonymous"];
    if (reserved.includes(username)) {
      return NextResponse.json({ available: false, error: "This username is reserved." });
    }

    // 1. Check local SQLite
    const takenLocally = BookmarkRepository.isUsernameTaken(username, excludeUserId);
    if (takenLocally) {
      return NextResponse.json({ available: false, error: "Username is already taken." });
    }

    // 2. Check Supabase profiles table directly (never auth.admin.listUsers)
    try {
      const client = SupabaseManager.getClient();
      if (client) {
        const query = client
          .from("profiles")
          .select("id")
          .eq("username", username);

        const { data: profiles, error } = await query;
        if (!error && profiles && profiles.length > 0) {
          const match = profiles.find((p) => !excludeUserId || p.id !== excludeUserId);
          if (match) {
            return NextResponse.json({ available: false, error: "Username is already taken." });
          }
        }
      }
    } catch (e) {
      console.warn("Supabase username check notice:", e);
    }

    return NextResponse.json({ available: true, username });
  } catch (error: any) {
    console.error("Check username error:", error);
    return NextResponse.json({ available: false, error: "Failed to check username" }, { status: 500 });
  }
}
