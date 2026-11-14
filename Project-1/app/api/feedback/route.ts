import { NextResponse } from "next/server";
import { z } from "zod";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_EMAIL = "sasivan177@gmail.com";

const createFeedbackSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title cannot exceed 150 characters"),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(3000, "Message cannot exceed 3000 characters"),
  category: z.enum(["feature", "bug", "improvement", "general"]).default("general"),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const myFeedback = BookmarkRepository.getFeedbacks(user.id);
    const allFeedback = isAdmin ? BookmarkRepository.getFeedbacks() : [];

    return NextResponse.json({
      success: true,
      isAdmin,
      myFeedback,
      allFeedback,
    });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/feedback error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const parsed = createFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const feedback = BookmarkRepository.createFeedback({
      userId: user.id,
      userEmail: user.email,
      userName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      userAvatar: user.user_metadata?.avatar_url || null,
      title: parsed.data.title,
      message: parsed.data.message,
      category: parsed.data.category,
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error: any) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("POST /api/feedback error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
