import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

export class AuthError extends Error {
  status: number;
  response: NextResponse;

  constructor(message: string = "Unauthorized", status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.response = NextResponse.json({ error: "Unauthorized" }, { status });
  }
}

export async function requireUser(): Promise<User> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new AuthError("Unauthorized", 401);
    }

    return user;
  } catch (err: any) {
    if (err instanceof AuthError) {
      throw err;
    }
    throw new AuthError("Unauthorized", 401);
  }
}

export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AuthError || (err as any)?.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
