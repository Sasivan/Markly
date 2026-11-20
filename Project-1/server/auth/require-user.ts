import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { validateCsrfOrigin } from "./csrf";

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

export class CsrfError extends Error {
  status: number;
  response: NextResponse;

  constructor(message: string = "Forbidden", status: number = 403) {
    super(message);
    this.name = "CsrfError";
    this.status = status;
    this.response = NextResponse.json({ error: "Forbidden" }, { status });
  }
}

export async function requireUser(req?: Request): Promise<User> {
  // Enforce CSRF verification on every authenticated route.
  // Prefer the Request object if passed, otherwise read headers() directly from Next.js request store.
  if (req) {
    if (!validateCsrfOrigin(req)) {
      throw new CsrfError("Forbidden", 403);
    }
  } else {
    try {
      const headerList = await headers();
      if (!validateCsrfOrigin(headerList)) {
        throw new CsrfError("Forbidden", 403);
      }
    } catch (e: any) {
      if (e instanceof CsrfError) throw e;
      // Ignore request scope error when called outside Next.js request context
    }
  }

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
    if (err instanceof AuthError || err instanceof CsrfError) {
      throw err;
    }
    throw new AuthError("Unauthorized", 401);
  }
}

export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof CsrfError || (err as any)?.status === 403) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (err instanceof AuthError || (err as any)?.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
