import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_EMAIL = "sasivan177@gmail.com";

const statusSchema = z.object({
  status: z.enum(["received", "under_review", "processing", "fixed", "planned", "closed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    const success = BookmarkRepository.updateFeedbackStatus(id, parsed.data.status);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Feedback item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, status: parsed.data.status });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("PATCH /api/feedback/[id]/status error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

