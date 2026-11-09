import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export async function POST() {
  try {
    SupabaseManager.clearConfig();
    return NextResponse.json({ success: true, message: "Disconnected from Supabase." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

