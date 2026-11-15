import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { folderName, tabs } = body;

    if (!Array.isArray(tabs) || tabs.length === 0) {
      return NextResponse.json({ success: false, error: "tabs array is required and must not be empty" }, { status: 400 });
    }

    const result = BookmarkRepository.stashOpenTabs(
      user.id,
      folderName || `Stashed Tabs (${new Date().toLocaleDateString()})`,
      tabs
    );

    if (!result) {
      return NextResponse.json({ success: false, error: "Failed to stash tabs" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      folder: result.folder,
      bookmarksCount: result.bookmarksCount,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

