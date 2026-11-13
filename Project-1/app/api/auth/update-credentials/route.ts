import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, username, email, password } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const client = SupabaseManager.getClient();
    const updates: { username?: string; email?: string; displayName?: string } = {};

    // 1. If username update requested, check format & uniqueness
    if (username !== undefined) {
      const cleanUser = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUser)) {
        return NextResponse.json({
          success: false,
          error: "Username must be 3-30 characters and only contain letters, numbers, underscores, dots, or hyphens.",
        }, { status: 400 });
      }

      // Check taken locally
      if (BookmarkRepository.isUsernameTaken(cleanUser, userId)) {
        return NextResponse.json({ success: false, error: `Username "${cleanUser}" is already taken.` }, { status: 400 });
      }

      // Check taken on Supabase
      if (client) {
        const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (data?.users) {
          const match = data.users.find((u) => {
            if (u.id === userId) return false;
            const uName = (u.user_metadata?.username || "").toLowerCase();
            return uName === cleanUser;
          });
          if (match) {
            return NextResponse.json({ success: false, error: `Username "${cleanUser}" is already taken.` }, { status: 400 });
          }
        }
      }

      updates.username = cleanUser;
    }

    // 2. If email update requested
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes("@")) {
        return NextResponse.json({ success: false, error: "Please provide a valid email address." }, { status: 400 });
      }
      updates.email = cleanEmail;
    }

    // 3. Update Supabase Auth user record if client is available
    if (client) {
      const userUpdates: any = {};
      if (updates.email) userUpdates.email = updates.email;
      if (password && password.length >= 6) {
        userUpdates.password = password;
        userUpdates.email_confirm = true; // Guarantees password login is active immediately without waiting for re-verification
      }

      if (updates.username) {
        // Fetch existing metadata first so we don't overwrite other fields
        const { data: existingUser } = await client.auth.admin.getUserById(userId);
        userUpdates.user_metadata = {
          ...(existingUser?.user?.user_metadata || {}),
          username: updates.username,
        };
      }

      if (Object.keys(userUpdates).length > 0) {
        const { error: supaErr } = await client.auth.admin.updateUserById(userId, userUpdates);
        if (supaErr) {
          console.warn("Supabase admin updateUserById error:", supaErr);
          return NextResponse.json({ success: false, error: supaErr.message }, { status: 400 });
        }
      }
    }

    // 4. Update SQLite local cache
    BookmarkRepository.updateUserProfile(userId, updates);

    return NextResponse.json({
      success: true,
      message: "Credentials updated successfully!",
      username: updates.username,
      email: updates.email,
    });
  } catch (error: any) {
    console.error("Update credentials error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update credentials" },
      { status: 500 }
    );
  }
}

