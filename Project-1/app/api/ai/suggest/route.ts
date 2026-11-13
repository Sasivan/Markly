import { NextResponse } from "next/server";
import { suggestWithAi } from "@/server/ai/suggest";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, domain, url } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    // AI config comes ONLY from x-ai-config request header — never from cookies or body
    let aiConfig = req.headers.get("x-ai-config") || req.headers.get("x-gemini-api-key") || undefined;

    if (typeof aiConfig === "string" && aiConfig.startsWith("%7B")) {
      try {
        aiConfig = decodeURIComponent(aiConfig);
      } catch {}
    }

    const suggestions = await suggestWithAi(
      {
        title: title || "",
        description: description || "",
        domain: domain || "",
        url,
        folders: [],
      },
      aiConfig
    );

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (err: any) {
    console.error("AI suggest error");
    return NextResponse.json(
      { success: false, error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
