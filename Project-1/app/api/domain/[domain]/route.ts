import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";
import { requireUser, handleAuthError } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const user = await requireUser();
    const { domain } = await params;
    if (!domain) {
      return NextResponse.json({ success: false, error: "Domain parameter required" }, { status: 400 });
    }

    const decodedDomain = decodeURIComponent(domain);
    const domainStats = BookmarkRepository.getDomainStats(decodedDomain, user.id);

    return NextResponse.json({ success: true, domainStats });
  } catch (error) {
    const authRes = handleAuthError(error);
    if (authRes) return authRes;
    console.error("GET /api/domain/[domain] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch domain stats" }, { status: 500 });
  }
}