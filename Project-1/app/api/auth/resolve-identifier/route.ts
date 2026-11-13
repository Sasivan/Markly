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

    // 1. If identifier is an email (contains @), return directly
    if (identifier.includes("@")) {
      return NextResponse.json({
        success: true,
        email: identifier.toLowerCase(),
        isEmail: true,
      });
    }

    const lowerId = identifier.toLowerCase();

    // 2. Check local SQLite users
    const localUser = BookmarkRepository.getUserByUsername(lowerId);
    if (localUser?.email) {
      return NextResponse.json({
        success: true,
        email: localUser.email,
        username: localUser.username,
        isEmail: false,
      });
    }

    // 3. Check Supabase Auth users via Admin API
    try {
      const client = SupabaseManager.getClient();
      if (client) {
        const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (data?.users) {
          const match = data.users.find((u) => {
            const uName = (u.user_metadata?.username || u.user_metadata?.preferred_username || "").toLowerCase();
            return uName === lowerId;
          });

          if (match?.email) {
            // Also ensure local user cache is updated with this username
            BookmarkRepository.ensureUser(
              match.id,
              match.email,
              match.user_metadata?.display_name || match.user_metadata?.full_name,
              match.user_metadata?.avatar_url,
              lowerId
            );

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
