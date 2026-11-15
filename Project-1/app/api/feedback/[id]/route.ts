import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";
import { isUserAdmin } from "@/server/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const isAdmin = isUserAdmin(user);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const deleted = BookmarkRepository.deleteFeedback(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("DELETE /api/feedback/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
