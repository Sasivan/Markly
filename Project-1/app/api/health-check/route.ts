import { NextResponse } from "next/server";

// Temporarily disabled – will be re-enabled in Stage 4 with proper auth.
export async function POST() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
