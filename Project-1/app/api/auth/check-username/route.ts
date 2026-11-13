import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username")?.trim().toLowerCase();
    const excludeUserId = searchParams.get("userId") || undefined;

    if (!username) {
      return NextResponse.json({ available: false, error: "Username is required" }, { status: 400 });
    }

    // Format validation: 3-30 chars, alphanumeric, underscore, dot, hyphen
    const validFormat = /^[a-zA-Z0-9_.-]{3,30}$/.test(username);
    if (!validFormat) {
      return NextResponse.json({
        available: false,
        error: "Username must be 3-30 characters and only contain letters, numbers, underscores, dots, or hyphens.",
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

    // 2. Check Supabase Auth users
    try {
      const client = SupabaseManager.getClient();
      if (client) {
        const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (data?.users) {
          const match = data.users.find((u) => {
            if (excludeUserId && u.id === excludeUserId) return false;
            const uName = (u.user_metadata?.username || "").toLowerCase();
            return uName === username;
          });

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
    return NextResponse.json({ available: false, error: error.message || "Failed to check username" }, { status: 500 });
  }
}

