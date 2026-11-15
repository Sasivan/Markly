/**
 * Centralized Admin Authorization Service
 *
 * Verifies whether an authenticated user possesses administrator privileges.
 * Supports:
 * 1. Supabase Auth app_metadata role ("admin")
 * 2. Supabase Auth user_metadata role ("admin")
 * 3. Supabase Auth is_admin flags
 * 4. Configured ADMIN_EMAIL / ADMIN_EMAILS / NEXT_PUBLIC_ADMIN_EMAIL env vars
 *
 * Adheres strictly to security rules: never hardcodes emails or credentials.
 */

export function isUserAdmin(user: any): boolean {
  if (!user) return false;

  // 1. Check Supabase role in metadata
  if (
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin" ||
    user.role === "admin" ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.is_admin === true
  ) {
    return true;
  }

  // 2. Check email against configured environment admin emails
  const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();

  const rawEnvEmails = [
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .join(",");

  if (rawEnvEmails && userEmail) {
    const adminEmails = rawEnvEmails
      .split(",")
      .map((e) => e.trim().toLowerCase().replace(/^["']|["']$/g, ""))
      .filter(Boolean);

    if (adminEmails.includes(userEmail)) {
      return true;
    }
  }

  // 3. Development Mode / Local SQLite account support
  if (
    (process.env.NODE_ENV === "development" || process.env.DATABASE_MODE === "sqlite") &&
    (process.env.DEV_ADMIN === "true" ||
      user.id === "guest-user-default" ||
      user.id?.startsWith("usr_dev_") ||
      user.app_metadata?.provider === "dev" ||
      user.user_metadata?.role === "admin")
  ) {
    return true;
  }

  return false;
}

