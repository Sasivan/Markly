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
    const userEmail = cookieStore.get("markly_user_email")?.value || body.userEmail;

    // Determine if requester is the developer owner (sasivan177@gmail.com)
    let isDeveloperOwner =
      userEmail === "sasivan177@gmail.com" ||
      userId === "84055f37-6af8-4e8b-aaea-dcd1628af4db";

    if (!isDeveloperOwner && userId) {
      try {
        const u = BookmarkRepository.getUserById(userId);
        if (u?.email === "sasivan177@gmail.com" || u?.username === "sasivan") {
          isDeveloperOwner = true;
        }
      } catch {}
    }

    // Support Universal AI configuration (JSON or API key string)
    let aiConfig =
      bodyAiConfig ||
      bodyApiKey ||
      req.headers.get("x-ai-config") ||
      req.headers.get("x-gemini-api-key") ||
      cookieStore.get("markly_ai_config")?.value ||
      cookieStore.get("markly_gemini_api_key")?.value;

    // ONLY sasivan177@gmail.com gets server environment GEMINI_API_KEY as fallback
    // Other users must paste their own API key
    if (!aiConfig && isDeveloperOwner) {
      aiConfig = process.env.GEMINI_API_KEY;
    }

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
