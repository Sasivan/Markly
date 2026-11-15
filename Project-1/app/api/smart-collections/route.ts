import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const collections = BookmarkRepository.getSmartCollections(user.id);
    return NextResponse.json({ success: true, collections });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Failed to fetch smart collections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    if (!body.name || !body.rulesJson) {
      return NextResponse.json({ success: false, error: "name and rulesJson are required" }, { status: 400 });
    }
    const created = BookmarkRepository.createSmartCollection(user.id, {
      name: body.name.trim(),
      icon: body.icon || "Sparkles",
      color: body.color || "#3b82f6",
      rulesJson: typeof body.rulesJson === "string" ? body.rulesJson : JSON.stringify(body.rulesJson),
    });
    return NextResponse.json({ success: true, collection: created });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Failed to create smart collection" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }
    BookmarkRepository.deleteSmartCollection(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    return NextResponse.json({ success: false, error: "Failed to delete smart collection" }, { status: 500 });
  }
}
