import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: "Email or userId is required" },
        { status: 400 }
      );
    }

    const client = SupabaseManager.getClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Supabase client not configured" },
        { status: 500 }
      );
    }

    let targetUserId = userId;

    if (!targetUserId && email) {
      const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const lower = email.trim().toLowerCase();
      const match = data?.users?.find((u) => (u.email || "").toLowerCase() === lower);
      if (match) {
        targetUserId = match.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Confirm user email immediately via Supabase admin API
    const { data: updated, error } = await client.auth.admin.updateUserById(targetUserId, {
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email confirmed successfully!",
      user: {
        id: updated.user.id,
        email: updated.user.email,
        email_confirmed_at: updated.user.email_confirmed_at,
      },
    });
  } catch (err: any) {
    console.error("Confirm user error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to confirm user" },
      { status: 500 }
    );
  }
}

