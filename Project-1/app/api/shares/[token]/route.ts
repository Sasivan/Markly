import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password") || "";

    const data = BookmarkRepository.getShareByToken(token);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Share not found or has been revoked" },
        { status: 404 }
      );
    }

    const { share, folder, bookmarks } = data;

    // Expiry check
    if (share.expiresAt && Date.now() > share.expiresAt) {
      return NextResponse.json(
        { success: false, error: "This share link has expired", isExpired: true },
        { status: 410 }
      );
    }

    // Password check
    if (share.passwordHash) {
      const providedHash = password ? Buffer.from(password.trim()).toString("base64") : "";
      if (providedHash !== share.passwordHash) {
        return NextResponse.json({
          success: true,
          isPasswordProtected: true,
          folder: {
            name: folder.name,
            icon: folder.icon,
            color: folder.color,
          },
          itemsCount: bookmarks.length,
          items: [],
        });
      }
    }

    // Increment view count asynchronously
    BookmarkRepository.incrementShareView(token);

    // Whitelist only public fields - never leak user IDs, emails, notes or internal metadata
    const sanitizedItems = bookmarks.map((b) => ({
      id: b.id,
      title: b.title,
      url: b.url,
      domain: b.domain,
      description: b.description || "",
      iconUrl: b.iconUrl,
      tags: b.tags?.map((t) => (typeof t === "string" ? t : t.name)) || [],
    }));

    return NextResponse.json({
      success: true,
      share: {
        token: share.shareToken,
        viewCount: share.viewCount + 1,
        expiresAt: share.expiresAt,
        isPasswordProtected: Boolean(share.passwordHash),
      },
      folder: {
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        color: folder.color,
      },
      items: sanitizedItems,
    });
  } catch (error: any) {
    console.error("GET /api/shares/[token] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
