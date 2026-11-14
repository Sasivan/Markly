import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUrl } from "@/server/scraper/url";
import { safeFetchHtml } from "@/server/scraper/fetcher";
import { parseHtmlMetadata, extractCodeSummary } from "@/server/scraper/parser";
import { checkRateLimit } from "@/server/scraper/ratelimit";
import { BookmarkRepository } from "@/server/db/repository";
import { suggestFolderAndTags, sanitizeGeminiModel } from "@/server/ai/suggest";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ScrapeSchema = z.object({
  url: z.string().min(1, "URL is required"),
  folderId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
  status: z.enum(["alive", "dead", "pending"]).optional().default("alive"),
  tagNames: z.array(z.string()).optional(),
  saveImmediately: z.boolean().optional().default(true),
  forceDuplicate: z.boolean().optional().default(false),
  customTitle: z.string().optional(),
  customDescription: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);

    // 1. Sliding Window Rate Limiting — scoped to session user ID (never trusts x-forwarded-for)
    const rateLimitKey = user.id ? `user:${user.id}` : (req.headers.get("x-real-ip") || "127.0.0.1");
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please wait ${rateLimit.resetInSec}s before scraping another URL.`,
        },
        { status: 429 }
      );
    }

    // 2. Body Validation
    const rawBody = await req.json();
    const parsed = ScrapeSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input payload",
        },
        { status: 400 }
      );
    }

    const {
      url: inputUrl,
      folderId,
      isFavorite,
      isArchived,
      status,
      tagNames,
      saveImmediately,
      forceDuplicate,
      customTitle,
      customDescription,
    } = parsed.data;

    // 3. URL Normalization
    let normResult;
    try {
      normResult = normalizeUrl(inputUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL provided" },
        { status: 400 }
      );
    }

    const { url, canonicalUrl, domain } = normResult;

    // Verify folder ownership if folderId is provided
    if (folderId) {
      const folder = BookmarkRepository.getFolderById(folderId, user.id);
      if (!folder) {
        return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
      }
    }

    // 4. Duplicate Detection Check (only when actively saving a new bookmark)
    if (saveImmediately) {
      const existingBookmark = BookmarkRepository.findDuplicate(canonicalUrl, user.id);
      if (existingBookmark && !forceDuplicate) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          existingBookmark,
          folderName: existingBookmark.folderName,
          message: `Already saved in folder "${existingBookmark.folderName}"`,
        });
      }
    }

    // 5. Safe Fetch HTML (with SSRF defense, 8s timeout, 2MB size cap, redirect inspector)
    let fetchResult;
    try {
      fetchResult = await safeFetchHtml(url);
    } catch {
      console.warn("safeFetchHtml notice, falling back to minimal metadata");
      fetchResult = {
        html: `<html><head><title>${domain}</title></head><body></body></html>`,
        finalUrl: url,
        statusCode: 200,
        contentType: "text/html",
      };
    }

    // 6. Parse Metadata
    const metadata = await parseHtmlMetadata(fetchResult.html, fetchResult.finalUrl, domain);

    // 7. Persist to Database if requested
    let bookmark = null;
    if (saveImmediately) {
      let finalFolderId = folderId || null;
      let finalTags = tagNames && tagNames.length > 0 ? tagNames : [];

      // Built-in library/code categorization (0 AI credits, instant & deterministic)
      if (!finalFolderId || finalTags.length === 0) {
        try {
          const userFolders = BookmarkRepository.getAllFolders(user.id);
          const inputData = {
            title: metadata.title || domain,
            description: metadata.description || undefined,
            domain,
            url: fetchResult.finalUrl,
            folders: userFolders.map((f) => ({ id: f.id, name: f.name })),
          };

          const heuristic = suggestFolderAndTags(inputData);
          if (!finalFolderId && heuristic.suggestedFolderId) {
            finalFolderId = heuristic.suggestedFolderId;
          }
          if (finalTags.length === 0 && heuristic.suggestedTags?.length > 0) {
            finalTags = heuristic.suggestedTags;
          }
        } catch {
          // Graceful fallback to domain tag
        }
      }

      if (finalTags.length === 0) {
        finalTags = [domain.split(".")[0]];
      }

      let finalDescription = customDescription?.trim();
      if (!finalDescription) {
        // Automatically generate rich structured summary by default
        let generatedSummary = "";

        // Check for AI API key (client x-ai-config header or server GEMINI_API_KEY)
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
            const prompt = `Write a high-quality 2-sentence overview and 3 key features (bulleted with •) for this website:
- Title: "${metadata.title || domain}"
- URL: "${fetchResult.finalUrl}"
- Domain: "${domain}"
- Summary info: "${metadata.description || ""}"
Keep it clear, objective, and structured.`;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);

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
                    maxOutputTokens: 300,
                  },
                }),
                signal: controller.signal,
              }
            );
            clearTimeout(timer);

            if (geminiRes.ok) {
              const data = await geminiRes.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && text.trim().length > 20) {
                generatedSummary = text.trim();
              }
            }
          } catch (e) {
            console.warn("AI summary generation during scrape fallback:", e);
          }
        }

        // Fallback to deterministic code / HTML summary extraction (0 AI credits)
        if (!generatedSummary) {
          generatedSummary = extractCodeSummary(
            fetchResult.html,
            metadata.title || domain,
            domain,
            metadata.description || undefined
          );
        }

        finalDescription = generatedSummary || metadata.description || undefined;
      }

      bookmark = BookmarkRepository.createBookmark({
        url: fetchResult.finalUrl,
        canonicalUrl: metadata.canonicalUrl || canonicalUrl,
        title: customTitle?.trim() || metadata.title || domain,
        description: finalDescription,
        iconUrl: metadata.iconUrl,
        imageUrl: metadata.imageUrl || undefined,
        domain,
        folderId: finalFolderId,
        isFavorite,
        isArchived,
        status: status || "alive",
        tagNames: finalTags,
        userId: user.id,
      });

      SupabaseManager.invalidateUserSyncCache(user.id);
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
      metadata,
      scraped: {
        ...metadata,
        ogImage: metadata.imageUrl,
      },
      bookmark,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/scrape unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}