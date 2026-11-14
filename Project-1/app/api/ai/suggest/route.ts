import { NextResponse } from "next/server";
import { suggestWithAi } from "@/server/ai/suggest";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
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

    const folders = BookmarkRepository.getAllFolders(user.id);

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
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("AI suggest error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}