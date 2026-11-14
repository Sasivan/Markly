# Phase 11 Architecture & Roadmap Plan

## 1. Executive Summary

With Phase 10 hardening completed, Markly operates under a zero-trust server-side authentication model. All identity is derived exclusively from cryptographically verified Supabase sessions (`supabase.auth.getUser()`), all data endpoints enforce strict tenant ownership filtering, AI keys reside solely in browser local storage, and SSRF/rate-limiting/security headers guard network interactions.

Phase 11 focuses on UI/UX alignment with real authentication, finishing residual security hardening, and transitioning from the dual-write SQLite/Supabase hybrid model to a unified Supabase cloud architecture.

---

## 2. UI / UX Enhancements for Real Authentication

### 2.1 Authenticated State & Account Navigation
- **Persistent Profile Indicator**: Surface current user avatar, username, and online sync status in the sidebar footer and header.
- **User Profile Menu**: Expandable user popover with:
  - Account Profile settings (Display name, Avatar upload/generator).
  - Supabase session management & sign out.
  - Active retention days indicator.
- **Live Session Expiry Detection**: Detect token expiration in the client and present a non-disruptive re-authentication dialog rather than unexpected failures.

### 2.2 Guest Mode Experience
- **Guest Banner**: An informational, non-intrusive banner on top of the workspace explaining that guest sessions are ephemeral and run in-memory.
- **One-Click Cloud Onboarding**: When a guest adds bookmarks, a subtle "Save to Cloud" prompt allows instant signup while carrying over their temporary in-memory links into their newly created Supabase account.

### 2.3 Contextual Error Toasts & Feedback
- **Unified Notification Toasts**: Replace ad-hoc error banners with Radix-based toast notifications.
- **Specific Error Feedback**:
  - `401 Unauthorized`: "Your session has expired. Please sign in again."
  - `404 Not Found`: "The requested bookmark or collection was moved or deleted."
  - `429 Too Many Requests`: "Rate limit reached. Please wait X seconds before scraping."

---

## 3. Remaining Security Hardening

### 3.1 CSRF Defense
- While Route Handlers utilize `SameSite: Lax` cookies, mutating endpoints (`POST`, `PATCH`, `DELETE`) will verify the `Origin` and `Sec-Fetch-Site` request headers against `NEXT_PUBLIC_APP_URL` to prevent cross-origin request forgery.

### 3.2 Refresh Token Rotation & Session Revocation
- Configure Supabase GoTrue with single-use refresh token rotation and automatic reuse detection.
- Provide a "Sign Out All Devices" action in profile settings invoking `supabase.auth.signOut({ scope: "global" })`.

### 3.3 Security Audit Logging
- Create an `audit_logs` table recording critical security operations:
  - Login events & failed login attempts.
  - Password and email updates.
  - Bulk exports (`/api/export`).
  - Mass deletions (`/api/bookmarks/bulk`, `/api/recycle-bin`).

---

## 4. Architecture Modernization: Retiring SQLite

### 4.1 Single Source of Truth: Supabase PostgreSQL
- **Problem**: Markly currently maintains a local SQLite database with cloud synchronization to Supabase. This introduces complex cache invalidation, multi-instance drift, and tombstone tables (`deleted_folders`, `deleted_bookmarks`).
- **Solution**: Transition fully to Supabase PostgreSQL as the primary database:
  - Connect directly to PostgreSQL via `@supabase/ssr` with RLS.
  - Eliminate `better-sqlite3`, local `.db` files, and the `SupabaseManager.ensureUserSynced` reconciliation layer.
  - Remove tombstone tables as Postgres RLS handles direct deletes cleanly.

### 4.2 Postgres Full-Text Search
- Replace SQLite substring matching on `search_text` with native PostgreSQL `tsvector` and `tsquery`:
  ```sql
  ALTER TABLE bookmarks ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(domain, ''))) STORED;
  CREATE INDEX idx_bookmarks_search ON bookmarks USING GIN(search_vector);
  ```

---

## 5. Scope Boundary

> [!NOTE]
> Phase 11 is strictly planned above. No code or schema migrations for Phase 11 have been applied in this phase.

