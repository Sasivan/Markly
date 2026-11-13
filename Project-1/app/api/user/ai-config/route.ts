import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookmarkRepository } from "@/server/db/repository";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const userId = searchParams.get("userId") || cookieStore.get("markly_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ success: true, apiKey: null, hasKey: false });
    }

    const key = BookmarkRepository.getUserApiKey(userId);
    return NextResponse.json({
      success: true,
      apiKey: key || "",
      hasKey: Boolean(key),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const userId = body.userId || cookieStore.get("markly_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
    }

    const apiKey = body.apiKey !== undefined ? body.apiKey?.trim() : null;
    BookmarkRepository.setUserApiKey(userId, apiKey);

    return NextResponse.json({
      success: true,
      message: "API key updated in database successfully",
      hasKey: Boolean(apiKey),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
