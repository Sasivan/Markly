import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { suggestWithAi } from "@/server/ai/suggest";
import { BookmarkRepository } from "@/server/db/repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, domain, url, apiKey: bodyApiKey, aiConfig: bodyAiConfig } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("markly_user_id")?.value || "usr_default_markly";

    // Support Universal AI configuration (JSON or API key string)
    let aiConfig =
      bodyAiConfig ||
      bodyApiKey ||
      req.headers.get("x-ai-config") ||
      req.headers.get("x-gemini-api-key") ||
      cookieStore.get("markly_ai_config")?.value ||
      cookieStore.get("markly_gemini_api_key")?.value ||
      process.env.GEMINI_API_KEY;

    if (typeof aiConfig === "string" && aiConfig.startsWith("%7B")) {
      try {
        aiConfig = decodeURIComponent(aiConfig);
      } catch {}
    }

    const folders = BookmarkRepository.getAllFolders(userId);
    const suggestions = await suggestWithAi(
      {
        title: title || "",
        description: description || "",
        domain: domain || "",
        url,
        folders: folders.map((f) => ({ id: f.id, name: f.name })),
      },
      aiConfig
    );

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (err: any) {
    console.error("AI suggest error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
