import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    if (!domain) {
      return NextResponse.json({ success: false, error: "Domain parameter required" }, { status: 400 });
    }

    const decodedDomain = decodeURIComponent(domain);
    const domainStats = BookmarkRepository.getDomainStats(decodedDomain);

    return NextResponse.json({ success: true, domainStats });
  } catch (error) {
    console.error("GET /api/domain/[domain] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch domain stats" }, { status: 500 });
  }
}

