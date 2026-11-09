import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export async function POST() {
  try {
    const result = await SupabaseManager.syncLocalToSupabase();
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Sync failed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      syncedFolders: result.syncedFolders,
      syncedBookmarks: result.syncedBookmarks,
      syncedTags: result.syncedTags,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

