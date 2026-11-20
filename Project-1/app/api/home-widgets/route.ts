import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, handleAuthError } from "@/server/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  safeParseStoredWidgets,
  MAX_CUSTOM_WIDGETS,
  MAX_VIZ_CONFIG_BYTES,
} from "@/lib/viz/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_TOTAL_WIDGETS = 50;
const MAX_PAYLOAD_BYTES = 65536; // 64 KB total body cap

const singleWidgetPayloadSchema = z
  .object({
    id: z.string().min(1).max(128),
    label: z.string().min(1).max(128),
    visible: z.boolean().default(true),
    span: z.enum(["1", "2"]).optional(),
    rowSpan: z.union([z.literal(1), z.literal(2)]).optional(),
    colSpan: z
      .union([
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(6),
        z.literal(8),
        z.literal(9),
        z.literal(12),
      ])
      .optional(),
    kind: z.enum(["builtin", "custom", "studio"]).optional(),
    category: z.string().optional(),
    vizConfig: z.record(z.string(), z.unknown()).optional(),
    plotConfig: z.any().optional(),
    chartConfig: z.any().optional(),
    intelConfig: z.any().optional(),
    siteConfig: z.any().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  })
  .passthrough();

const putWidgetsBodySchema = z.object({
  widgets: z.array(singleWidgetPayloadSchema).max(MAX_TOTAL_WIDGETS),
});

/**
 * GET /api/home-widgets
 * Retrieves the current authenticated user's home widgets from Supabase, ordered by position.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("dashboard_widgets")
      .select("id, config, position")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve dashboard widgets" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, widgets: [] });
    }

    const rawConfigs = data.map((row: any) => row.config);
    const sanitized = safeParseStoredWidgets(rawConfigs);

    return NextResponse.json({ success: true, widgets: sanitized });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json(
      { success: false, error: "Failed to retrieve dashboard widgets" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/home-widgets
 * Saves the authenticated user's home widgets into Supabase.
 * Enforces caps: max 64KB payload, max 16KB per config, max 30 custom widgets, max 50 total widgets.
 */
export async function PUT(req: Request) {
  try {
    const user = await requireUser(req);

    // Read body text first to enforce strict total payload size cap
    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "Payload exceeds maximum allowed size" },
        { status: 413 }
      );
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    const validation = putWidgetsBodySchema.safeParse(rawJson);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid widget payload structure" },
        { status: 400 }
      );
    }

    // Verify individual widget size caps before processing
    for (const w of validation.data.widgets) {
      if (w.vizConfig && JSON.stringify(w.vizConfig).length > MAX_VIZ_CONFIG_BYTES) {
        return NextResponse.json(
          { success: false, error: "Widget config exceeds 16KB limit" },
          { status: 413 }
        );
      }
      if (JSON.stringify(w).length > MAX_VIZ_CONFIG_BYTES) {
        return NextResponse.json(
          { success: false, error: "Widget payload exceeds 16KB limit" },
          { status: 413 }
        );
      }
    }

    // Sanitize and validate through domain parser
    const sanitized = safeParseStoredWidgets(validation.data.widgets);

    const customCount = sanitized.filter(
      (w) => w.kind === "custom" || w.kind === "studio" || w.id.startsWith("custom:") || w.id.startsWith("studio_")
    ).length;

    if (customCount > MAX_CUSTOM_WIDGETS) {
      return NextResponse.json(
        {
          success: false,
          error: `Custom widgets limit of ${MAX_CUSTOM_WIDGETS} exceeded`,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Prepare rows for persistence
    const rowsToInsert = sanitized.map((widget, position) => {
      const configStr = JSON.stringify(widget);
      if (configStr.length > MAX_VIZ_CONFIG_BYTES) {
        throw new Error("WIDGET_CONFIG_TOO_LARGE");
      }
      return {
        user_id: user.id,
        config: widget,
        position,
        updated_at: new Date().toISOString(),
      };
    });

    // Replace user's widgets safely within RLS boundary
    const { error: deleteError } = await supabase
      .from("dashboard_widgets")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: "Failed to update dashboard widgets" },
        { status: 500 }
      );
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("dashboard_widgets")
        .insert(rowsToInsert);

      if (insertError) {
        return NextResponse.json(
          { success: false, error: "Failed to persist dashboard widgets" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, widgets: sanitized });
  } catch (error: any) {
    if (error?.message === "WIDGET_CONFIG_TOO_LARGE") {
      return NextResponse.json(
        { success: false, error: "Widget config exceeds 16KB limit" },
        { status: 413 }
      );
    }
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json(
      { success: false, error: "Failed to persist dashboard widgets" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/home-widgets?id=...
 * Deletes a specific custom visual widget belonging to the user.
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const widgetId = searchParams.get("id");

    if (!widgetId) {
      return NextResponse.json(
        { success: false, error: "Widget id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Delete single widget by matching config->>'id' within user boundary
    const { error } = await supabase
      .from("dashboard_widgets")
      .delete()
      .eq("user_id", user.id)
      .filter("config->>id", "eq", widgetId);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to delete widget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json(
      { success: false, error: "Failed to delete widget" },
      { status: 500 }
    );
  }
}
