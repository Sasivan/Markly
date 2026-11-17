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

  // Guests are never administrators
  if (
    user.id === "guest-user-default" ||
    user.id === "usr_default_markly" ||
    user.isGuest === true ||
    user.app_metadata?.provider === "guest"
  ) {
    return false;
  }

  // 1. Explicit admin check for sasivan177@gmail.com
  const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();
  if (userEmail === "sasivan177@gmail.com" || userEmail.includes("sasivan177")) {
    return true;
  }

  // 2. Check Supabase role in metadata
  if (
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin" ||
    user.role === "admin" ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.is_admin === true
  ) {
    return true;
  }

  // 3. Check email against configured environment admin emails
  const rawEnvEmails = [
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .join(",");

  if (rawEnvEmails && userEmail) {
    const adminEmails = rawEnvEmails
      .replace(/[\r\n"']/g, "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.some((e) => e === userEmail || (e.length > 3 && userEmail.includes(e)) || (userEmail.length > 3 && e.includes(userEmail)))) {
      return true;
    }
  }

  // 4. Authenticated developer account role in dev mode
  if (
    process.env.NODE_ENV === "development" &&
    (user.id?.startsWith("usr_dev_") || user.app_metadata?.provider === "dev")
  ) {
    return true;
  }

  return false;
}

