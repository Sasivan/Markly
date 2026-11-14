import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sqlite } from "@/server/db/client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    // Query profiles table using caller's verified session (guarded by RLS)
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("Profiles fetch error:", error);
    }

    // Fallback to local SQLite if not yet synced
    const localUser = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;

    return NextResponse.json({
      success: true,
      profile: profile || {
        id: user.id,
        username: localUser?.username || user.user_metadata?.username,
        display_name: localUser?.display_name || user.user_metadata?.display_name || "Markly User",
        avatar_url: localUser?.avatar_url || user.user_metadata?.avatar_url,
      },
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Profile GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { displayName, avatarUrl } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (displayName !== undefined) updates.display_name = displayName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    // 1. Update profiles table using caller's verified session (guarded by RLS)
    try {
      const supabase = await createClient();
      await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
    } catch (e) {
      console.warn("Profiles update notice:", e);
    }

    // 2. Update local SQLite cache
    const existing = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(user.id);
    if (existing) {
      if (avatarUrl !== undefined && displayName !== undefined) {
        sqlite.prepare("UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?").run(displayName, avatarUrl, user.id);
      } else if (avatarUrl !== undefined) {
        sqlite.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, user.id);
      } else if (displayName !== undefined) {
        sqlite.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(displayName, user.id);
      }
    } else {
      sqlite.prepare(`
        INSERT INTO users (id, email, display_name, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.email || `${user.id}@markly.app`,
        displayName || "Markly User",
        avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
        Date.now()
      );
    }

    return NextResponse.json({ success: true, avatarUrl, displayName });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Profile update error:", err);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}