import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sqlite } from "@/server/db/client";
import { DEFAULT_USER_ID } from "@/server/db/repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const userId = body.userId || cookieStore.get("markly_user_id")?.value || DEFAULT_USER_ID;

    const { displayName, avatarUrl } = body;

    if (userId) {
      // Check if user exists in SQLite
      const existing = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (existing) {
        if (avatarUrl !== undefined && displayName !== undefined) {
          sqlite.prepare("UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?").run(displayName, avatarUrl, userId);
        } else if (avatarUrl !== undefined) {
          sqlite.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, userId);
        } else if (displayName !== undefined) {
          sqlite.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(displayName, userId);
        }
      } else {
        sqlite.prepare(`
          INSERT INTO users (id, email, display_name, avatar_url, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          userId,
          body.email || `${userId}@markly.app`,
          displayName || "Markly User",
          avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          Date.now()
        );
      }
    }

    const response = NextResponse.json({ success: true, avatarUrl, displayName });

    if (avatarUrl) {
      response.cookies.set("markly_user_avatar", avatarUrl, {
        path: "/",
        maxAge: 2592000, // 30 days
        sameSite: "lax",
      });
    }

    return response;
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

