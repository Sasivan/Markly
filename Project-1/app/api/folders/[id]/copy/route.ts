import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const copyFolderSchema = z.object({
  targetParentId: z.string().nullable().optional(),
  name: z.string().min(1).max(100).optional(),
});

// POST /api/folders/[id]/copy
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = copyFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetParentId, name } = parsed.data;

    const sourceFolder = BookmarkRepository.getFolderById(id, user.id);
    if (!sourceFolder) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 }
      );
    }

    const copiedFolder = await BookmarkRepository.copyFolder(
      id,
      targetParentId ?? null,
      user.id,
      name
    );

    return NextResponse.json({
      success: true,
      folder: copiedFolder,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/folders/[id]/copy error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to copy folder" },
      { status: 500 }
    );
  }
}
