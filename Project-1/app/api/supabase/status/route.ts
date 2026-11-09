import { NextResponse } from "next/server";
import { SupabaseManager } from "@/server/supabase/supabase-client";

export async function GET() {
  try {
    const config = SupabaseManager.getConfig();
    if (!config) {
      return NextResponse.json({
        connected: false,
        config: null,
      });
    }

    // Health and reachability ping check
    const client = SupabaseManager.getClient();
    let isReachable = false;
    let tables: string[] = [];

    if (config.url) {
      try {
        const pingKey = config.serviceRoleKey || config.anonKey;
        const res = await fetch(`${config.url}/rest/v1/`, {
          headers: {
            apikey: pingKey,
            Authorization: `Bearer ${pingKey}`,
          },
        });
        if (res.ok) {
          isReachable = true;
        }
      } catch (err) {
        console.warn("Supabase ping error:", err);
      }
    }

    if (client) {
      try {
        const { error: fErr } = await client.from("folders").select("id").limit(1);
        if (!fErr) tables.push("folders");

        const { error: bErr } = await client.from("bookmarks").select("id").limit(1);
        if (!bErr) tables.push("bookmarks");

        const { error: tErr } = await client.from("tags").select("id").limit(1);
        if (!tErr) tables.push("tags");

        const { error: btErr } = await client.from("bookmark_tags").select("bookmark_id").limit(1);
        if (!btErr) tables.push("bookmark_tags");
      } catch {}
    }

    return NextResponse.json({
      connected: Boolean(config.url && config.anonKey),
      isReachable,
      tables,
      hasTables: tables.length > 0,
      config: {
        url: config.url,
        connectedAt: config.connectedAt,
        autoSync: config.autoSync ?? true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
