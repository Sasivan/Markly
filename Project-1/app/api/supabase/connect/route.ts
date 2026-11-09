import { NextRequest, NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, anonKey, serviceRoleKey } = body;

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "Supabase Project URL and API Key are required." },
        { status: 400 }
      );
    }

    // Clean URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const config = {
      url: cleanUrl,
      anonKey: anonKey.trim(),
      serviceRoleKey: serviceRoleKey ? serviceRoleKey.trim() : undefined,
      connectedAt: Date.now(),
      autoSync: true,
    };

    // Test connection
    const testResult = await SupabaseManager.testConnection(config);
    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.error || "Connection failed. Please check your credentials." },
        { status: 400 }
      );
    }

    // Save valid config
    SupabaseManager.saveConfig(config);

    // Initial sync of existing local data
    const syncResult = await SupabaseManager.syncLocalToSupabase();

    return NextResponse.json({
      success: true,
      message: "Connected to Supabase successfully!",
      config: {
        url: config.url,
        connectedAt: config.connectedAt,
      },
      tablesFound: testResult.tablesFound,
      syncResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

