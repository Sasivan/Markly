import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint has been removed. Use /api/auth/login instead." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Endpoint has been removed. Use /api/auth/login instead." },
    { status: 410 }
  );
}
