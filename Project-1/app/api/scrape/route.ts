import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUrl } from "@/server/scraper/url";
import { safeFetchHtml } from "@/server/scraper/fetcher";
import { parseHtmlMetadata } from "@/server/scraper/parser";
import { checkRateLimit } from "@/server/scraper/ratelimit";
import { BookmarkRepository, DEFAULT_USER_ID } from "@/server/db/repository";
import { suggestWithAi, suggestFolderAndTags } from "@/server/ai/suggest";

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
    // 1. Rate Limiting Check — use first IP from trusted header only
    const ip = req.headers.get("x-real-ip") || "127.0.0.1";
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
    } catch (normErr: any) {
      return NextResponse.json(
        { success: false, error: normErr.message },
        { status: 400 }
      );
    }

    const { url, canonicalUrl, domain } = normResult;

    // Stage 1: userId comes from body only (will be replaced with session in Stage 2)
    // NOTE: This is intentionally not reading from cookies — the cookie path was removed
    // as a security fix. Full session-based auth will replace this in Stage 2.
    const userId = (typeof rawBody.userId === "string" && rawBody.userId.trim()) || DEFAULT_USER_ID;

    // AI config from x-ai-config header ONLY — never from cookies or env
    let aiConfig = req.headers.get("x-ai-config") || req.headers.get("x-gemini-api-key") || undefined;
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
    let fetchResult;
    try {
      fetchResult = await safeFetchHtml(url);
    } catch (fetchErr: any) {
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
        isArchived,
        status: status || "alive",
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
    console.error("POST /api/scrape unexpected error");
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
