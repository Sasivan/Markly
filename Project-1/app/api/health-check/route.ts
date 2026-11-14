import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { validateHostForSSRF } from "@/server/scraper/ssrf";
import { SupabaseManager } from "@/server/supabase/supabase-client";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkBookmarkAlive(initialUrl: string): Promise<boolean> {
  let currentUrl = initialUrl;
  let hops = 0;
  const MAX_HOPS = 3;

  while (hops <= MAX_HOPS) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      return false;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return false;
    }

    // SSRF Guard: DNS resolution + private IP range check on EVERY hop
    try {
      await validateHostForSSRF(parsedUrl.hostname);
    } catch {
      // Internal or blocked target detected — reject immediately
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let res: Response | null = null;
    try {
      res = await fetch(currentUrl, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0 MarklyBot/1.0" },
        redirect: "manual",
        signal: controller.signal,
      });

      // If HEAD is rejected by server (405 Method Not Allowed / 403 Forbidden), retry with GET
      if (res.status === 405 || res.status === 403) {
        res = await fetch(currentUrl, {
          method: "GET",
          headers: { "User-Agent": "Mozilla/5.0 MarklyBot/1.0" },
          redirect: "manual",
          signal: controller.signal,
        });
      }
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }

    // Handle redirects manually up to MAX_HOPS (3)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) return false;
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return false;
      }
      hops++;
      continue;
    }

    return res.status >= 200 && res.status < 400;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const bookmarks = BookmarkRepository.getBookmarks({ userId: user.id });
    let checkedCount = 0;
    let deadCount = 0;
    let aliveCount = 0;

    // Process bookmarks in batches of 5 to avoid network saturation
    const BATCH_SIZE = 5;
    for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
      const batch = bookmarks.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (bm) => {
          checkedCount++;
          const isAlive = await checkBookmarkAlive(bm.url);

          const newStatus = isAlive ? "alive" : "dead";
          if (newStatus === "dead") deadCount++;
          else aliveCount++;

          if (bm.status !== newStatus) {
            BookmarkRepository.updateBookmark(bm.id, user.id, { status: newStatus });
          }
        })
      );
    }

    SupabaseManager.invalidateUserSyncCache(user.id);

    return NextResponse.json({
      success: true,
      checkedCount,
      aliveCount,
      deadCount,
      message: `Health check completed: ${aliveCount} reachable, ${deadCount} dead links.`,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/health-check error:", error);
    return NextResponse.json({ success: false, error: "Health check failed" }, { status: 500 });
  }
}