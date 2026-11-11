import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { normalizeUrl } from "@/server/scraper/url";
import { safeFetchHtml } from "@/server/scraper/fetcher";
import { parseHtmlMetadata } from "@/server/scraper/parser";
import { checkRateLimit } from "@/server/scraper/ratelimit";
import { BookmarkRepository } from "@/server/db/repository";
import { suggestWithAi, suggestFolderAndTags } from "@/server/ai/suggest";

const ScrapeSchema = z.object({
  url: z.string().min(1, "URL is required"),
  folderId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional().default(false),
  tagNames: z.array(z.string()).optional(),
  saveImmediately: z.boolean().optional().default(true),
  forceDuplicate: z.boolean().optional().default(false),
  customTitle: z.string().optional(),
  customDescription: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const rateLimit = checkRateLimit(ip, 30, 60 * 1000);

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
          error: parsed.error.issues[0]?.message || "Invalid input payload",
        },
        { status: 400 }
      );
    }

    const { url: inputUrl, folderId, isFavorite, tagNames, saveImmediately, forceDuplicate, customTitle, customDescription } = parsed.data;

    // 3. URL Normalization
    let normResult;
    try {
      normResult = normalizeUrl(inputUrl);
    } catch (normErr: any) {
      return NextResponse.json(
        { success: false, error: normErr.message },
        { status: 400 }
      );
    }

    const { url, canonicalUrl, domain } = normResult;

    // Extract current user and AI configuration from payload or cookies
    const cookieStore = await cookies();
    const userId = rawBody.userId || cookieStore.get("markly_user_id")?.value || "usr_default_markly";
    let aiConfig =
      rawBody.aiConfig ||
      cookieStore.get("markly_ai_config")?.value ||
      cookieStore.get("markly_gemini_api_key")?.value ||
      process.env.GEMINI_API_KEY;
    if (typeof aiConfig === "string" && aiConfig.startsWith("%7B")) {
      try {
        aiConfig = decodeURIComponent(aiConfig);
      } catch {}
    }

    // 4. Duplicate Detection Check (only when actively saving a new bookmark)
    if (saveImmediately) {
      const existingBookmark = BookmarkRepository.findDuplicate(canonicalUrl, userId);
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
    // If remote site fails or blocks bots, fallback gracefully so bookmark can always be saved
    let fetchResult;
    try {
      fetchResult = await safeFetchHtml(url);
    } catch (fetchErr: any) {
      console.warn("safeFetchHtml notice, falling back to minimal metadata:", fetchErr.message);
      fetchResult = {
        html: `<html><head><title>${domain}</title></head><body></body></html>`,
        finalUrl: url,
        statusCode: 200,
        contentType: "text/html",
      };
    }

    // 6. Parse Metadata & Convert Icon to 64x64 WebP
    const metadata = await parseHtmlMetadata(fetchResult.html, fetchResult.finalUrl, domain);

    // 7. Persist to Database if requested
    let bookmark = null;
    if (saveImmediately) {
      let finalFolderId = folderId || null;
      let finalTags = tagNames && tagNames.length > 0 ? tagNames : [];

      // If folder or tags are not specified, run AI Suggestion Engine (capped at 2500ms timeout)
      if (!finalFolderId || finalTags.length === 0) {
        try {
          const userFolders = BookmarkRepository.getAllFolders(userId);
          const inputData = {
            title: metadata.title || domain,
            description: metadata.description || undefined,
            domain,
            url: fetchResult.finalUrl,
            folders: userFolders.map((f) => ({ id: f.id, name: f.name })),
          };

          const aiPromise = suggestWithAi(inputData, aiConfig);
          const timeoutFallback = new Promise<any>((resolve) =>
            setTimeout(() => resolve(suggestFolderAndTags(inputData)), 2500)
          );

          const aiSuggestions = await Promise.race([aiPromise, timeoutFallback]);

          if (!finalFolderId && aiSuggestions.suggestedFolderId) {
            finalFolderId = aiSuggestions.suggestedFolderId;
          }
          if (finalTags.length === 0 && aiSuggestions.suggestedTags?.length > 0) {
            finalTags = aiSuggestions.suggestedTags;
          }
        } catch {
          // Graceful fallback to domain tag
        }
      }

      if (finalTags.length === 0) {
        finalTags = [domain.split(".")[0]];
      }

      bookmark = BookmarkRepository.createBookmark({
        url: fetchResult.finalUrl,
        canonicalUrl: metadata.canonicalUrl || canonicalUrl,
        title: customTitle?.trim() || metadata.title || domain,
        description: customDescription?.trim() || metadata.description || undefined,
        iconUrl: metadata.iconUrl,
        imageUrl: metadata.imageUrl || undefined,
        domain,
        folderId: finalFolderId,
        isFavorite,
        tagNames: finalTags,
        userId,
      });
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
    console.error("POST /api/scrape unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

