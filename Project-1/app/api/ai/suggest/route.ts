import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { suggestWithGemini } from "@/server/ai/suggest";
import { BookmarkRepository } from "@/server/db/repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, domain, url, apiKey: bodyApiKey } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("markly_user_id")?.value || "usr_default_markly";
    const apiKey =
      bodyApiKey ||
      req.headers.get("x-gemini-api-key") ||
      cookieStore.get("markly_gemini_api_key")?.value ||
      process.env.GEMINI_API_KEY;

    const folders = BookmarkRepository.getAllFolders(userId);
    const suggestions = await suggestWithGemini(
      {
        title: title || "",
        description: description || "",
        domain: domain || "",
        url,
        folders: folders.map((f) => ({ id: f.id, name: f.name })),
      },
      apiKey
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
