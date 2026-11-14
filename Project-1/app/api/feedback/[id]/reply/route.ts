import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_EMAIL = "sasivan177@gmail.com";

const replySchema = z.object({
  message: z.string().trim().min(1, "Reply message cannot be empty").max(2000, "Reply cannot exceed 2000 characters"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await req.json();

    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid reply" },
        { status: 400 }
      );
    }

    const isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Verify feedback exists and if not admin, ensure user owns this feedback
    const userFeedbacks = BookmarkRepository.getFeedbacks(isAdmin ? undefined : user.id);
    const targetFeedback = userFeedbacks.find((f) => f.id === id);
    if (!targetFeedback) {
      return NextResponse.json(
        { success: false, error: "Feedback not found or access denied" },
        { status: 404 }
      );
    }

    const reply = BookmarkRepository.addFeedbackReply({
      feedbackId: id,
      userId: user.id,
      userEmail: user.email,
      userName: isAdmin ? "Markly Support (Sasivan)" : (user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User"),
      userAvatar: user.user_metadata?.avatar_url || null,
      isAdmin,
      message: parsed.data.message,
    });

    return NextResponse.json({ success: true, reply }, { status: 201 });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/feedback/[id]/reply error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

