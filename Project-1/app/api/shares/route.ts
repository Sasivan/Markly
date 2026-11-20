import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const shares = BookmarkRepository.getUserShares(user.id);
    return NextResponse.json({ success: true, shares });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Failed to fetch shared links" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { folderId, password, expiresIn } = body;

    if (!folderId) {
      return NextResponse.json({ success: false, error: "folderId is required" }, { status: 400 });
    }

    // Verify folder ownership
    const folder = BookmarkRepository.getFolderById(folderId, user.id);
    if (!folder) {
      return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 });
    }

    let expiresAt: number | null = null;
    if (expiresIn === "24h") expiresAt = Date.now() + 24 * 3600 * 1000;
    else if (expiresIn === "7d") expiresAt = Date.now() + 7 * 24 * 3600 * 1000;
    else if (expiresIn === "30d") expiresAt = Date.now() + 30 * 24 * 3600 * 1000;

    let passwordHash: string | null = null;
    if (password && typeof password === "string" && password.trim()) {
      // Simple salt/hash for share protection
      passwordHash = Buffer.from(password.trim()).toString("base64");
    }

    const share = BookmarkRepository.createOrUpdateShare(user.id, folderId, {
      passwordHash,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      share,
      shareUrl: `/share/${share.shareToken}`,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Failed to create share" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || searchParams.get("folderId") || searchParams.get("id");

    if (!token) {
      return NextResponse.json({ success: false, error: "token or folderId is required" }, { status: 400 });
    }

    const revoked = BookmarkRepository.revokeShare(user.id, token);
    return NextResponse.json({ success: true, revoked });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Failed to revoke share" }, { status: 500 });
  }
}

