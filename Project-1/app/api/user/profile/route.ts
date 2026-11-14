import { NextResponse } from "next/server";
import { sqlite } from "@/server/db/client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { displayName, avatarUrl } = body;

    // Check if user exists in SQLite
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