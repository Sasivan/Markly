import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";
import { sanitizeGeminiModel } from "@/server/ai/suggest";
import { safeFetchHtml } from "@/server/scraper/fetcher";
import { parseHtmlMetadata } from "@/server/scraper/parser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const summaryRequestSchema = z.object({
  mode: z.enum(["ai", "scrape"]).default("ai"),
  save: z.boolean().default(false),
});

// POST /api/bookmarks/[id]/ai-summary
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = summaryRequestSchema.safeParse(body);
    const { mode, save } = parsed.success ? parsed.data : { mode: "ai", save: false };

    const bm = BookmarkRepository.getBookmarkById(id, user.id);
    if (!bm) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 }
      );
    }

    let summaryText = "";

    if (mode === "scrape") {
      // 0 AI Credits: Scrape metadata or use existing description
      try {
        const fetchRes = await safeFetchHtml(bm.url);
        if (fetchRes.html) {
          const meta = await parseHtmlMetadata(fetchRes.html, fetchRes.finalUrl || bm.url, bm.domain);
          summaryText = meta.description || bm.description || `${bm.title} (${bm.domain})`;
        } else {
          summaryText = bm.description || `${bm.title} (${bm.domain})`;
        }
      } catch {
        summaryText = bm.description || `${bm.title} (${bm.domain})`;
      }
    } else {
      // AI Generation mode
      let aiConfigHeader = req.headers.get("x-ai-config") || req.headers.get("x-gemini-api-key") || undefined;
      if (typeof aiConfigHeader === "string" && aiConfigHeader.startsWith("%7B")) {
        try {
          aiConfigHeader = decodeURIComponent(aiConfigHeader);
        } catch {}
      }

      let apiKey = "";
      let model = "gemini-flash-latest";

      if (aiConfigHeader) {
        try {
          const cfg = JSON.parse(aiConfigHeader);
          apiKey = cfg.apiKey || "";
          if (cfg.model) model = sanitizeGeminiModel(cfg.model);
        } catch {
          apiKey = aiConfigHeader.trim();
        }
      }

      if (!apiKey && process.env.GEMINI_API_KEY) {
        apiKey = process.env.GEMINI_API_KEY;
      }

      if (apiKey) {
        try {
          const prompt = `You are an AI assistant in Markly, a knowledge workspace. Write a high-quality, concise 2-sentence description and 3 key bullet points for this saved website:
- Title: "${bm.title}"
- URL: "${bm.url}"
- Domain: "${bm.domain}"
- Existing description: "${bm.description || ""}"

Structure your response with:
1. A clear overview of what the site/tool is and its core value proposition.
2. Three brief key features or use cases (bulleted with •).

Keep it informative, objective, and clear.`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 350,
                },
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timer);

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              summaryText = text.trim();
            }
          }
        } catch (e) {
          console.warn("Gemini summary generation error, falling back:", e);
        }
      }

      // Fallback if AI was unavailable or had no key
      if (!summaryText) {
        if (bm.description && bm.description.length > 25) {
          summaryText = `${bm.description}\n\n• Key Domain: ${bm.domain}\n• Reference URL: ${bm.url}\n• Tagged: ${bm.tags.map((t) => t.name).join(", ") || "General"}`;
        } else {
          summaryText = `${bm.title} is a resource hosted on ${bm.domain}.\n\n• Direct access: ${bm.url}\n• Category: ${bm.folderName || "Unsorted"}\n• Status: ${bm.status === "alive" ? "Verified Active" : "Pending Check"}`;
        }
      }
    }

    let isSaved = false;
    if (save && summaryText) {
      BookmarkRepository.updateBookmark(id, user.id, {
        description: summaryText,
      });
      isSaved = true;
    }

    return NextResponse.json({
      success: true,
      summary: summaryText,
      saved: isSaved,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/bookmarks/[id]/ai-summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate website summary" },
      { status: 500 }
    );
  }
}
