import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { validateHostForSSRF } from "@/server/scraper/ssrf";
import { normalizeUrl } from "@/server/scraper/url";

export async function POST(req: Request) {
  try {
    const bookmarks = BookmarkRepository.getBookmarks();
    let checkedCount = 0;
    let deadCount = 0;
    let aliveCount = 0;

    // Process bookmarks in batches of 5 to avoid overwhelming network
    const BATCH_SIZE = 5;
    for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
      const batch = bookmarks.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (bm) => {
          checkedCount++;
          let isAlive = false;

          try {
            const { domain } = normalizeUrl(bm.url);
            // SSRF guard
            await validateHostForSSRF(domain);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            // Attempt fast HEAD request
            let res = await fetch(bm.url, {
              method: "HEAD",
              headers: { "User-Agent": "Mozilla/5.0 MarklyBot/1.0" },
              signal: controller.signal,
            }).catch(() => null);

            // If HEAD fails or forbidden, try GET
            if (!res || !res.ok) {
              res = await fetch(bm.url, {
                method: "GET",
                headers: { "User-Agent": "Mozilla/5.0 MarklyBot/1.0" },
                signal: controller.signal,
              }).catch(() => null);
            }

            clearTimeout(timeout);

            if (res && res.status < 400) {
              isAlive = true;
            }
          } catch {
            isAlive = false;
          }

          const newStatus = isAlive ? "alive" : "dead";
          if (newStatus === "dead") deadCount++;
          else aliveCount++;

          if (bm.status !== newStatus) {
            BookmarkRepository.updateBookmark(bm.id, { status: newStatus });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      checkedCount,
      aliveCount,
      deadCount,
      message: `Health check completed: ${aliveCount} reachable, ${deadCount} dead links.`,
    });
  } catch (error: any) {
    console.error("POST /api/health-check error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

