# Phase 10 – Security & Architecture Hardening Plan

> Security fixes ONLY. No new features, no UI redesign.

---

## Stage 0 – Security Rules in AGENTS.md

**Files changed:**
- `AGENTS.md` — add security rules block OUTSIDE the `<!-- BEGIN:nextjs-agent-rules -->` markers

---

## Stage 1 – Emergency Lockdown

### Routes to DELETE entirely
| File | Reason |
|------|--------|
| `app/api/user/ai-config/route.ts` | Returns env API key with no auth |
| `app/api/auth/update-credentials/route.ts` | Calls `auth.admin.updateUserById` with no auth |
| `app/api/auth/confirm-user/route.ts` | Confirms any email with no auth via admin API |
| `app/api/supabase/connect/route.ts` | Lets anyone rewrite server Supabase config |
| `app/api/supabase/disconnect/route.ts` | Lets anyone clear server Supabase config |
| `app/api/supabase/sync/route.ts` | Lets anyone trigger full sync |
| `app/api/supabase/status/route.ts` | Leaks config details |
| `app/api/auth/migrate-local/route.ts` | Bulk-reassigns all default-user data with no auth |

### Routes to STUB → 401
| File | Reason |
|------|--------|
| `app/api/export/route.ts` | No auth; uses DEFAULT_USER_ID |
| `app/api/health-check/route.ts` | No auth; uses DEFAULT_USER_ID; native fetch follows redirects |
| `app/api/recycle-bin/route.ts` PATCH handler | No ownership check |

### Components to edit
| File | Changes |
|------|---------|
| `components/auth/auth-context.tsx` | Remove `persistUserSession()`, `clearUserSession()`, all `markly_user_id` cookie reads/writes; remove calls to `/api/auth/confirm-user`; remove `userId` from sync-user body |
| `components/ai/api-key-modal.tsx` | Remove all calls to `/api/user/ai-config`; remove `markly_gemini_api_key` cookie writes; remove hardcoded sasivan checks; keep only localStorage |
| `components/profile/profile-view.tsx` | Remove calls to `/api/auth/update-credentials`; replace with client-side `supabase.auth.updateUser()` |

### Server files to edit
| File | Changes |
|------|---------|
| `server/db/repository.ts` | Remove `getUserApiKey()`, `setUserApiKey()`, `cleanupInactiveUsers()`, call to `cleanupInactiveUsers()` in `recordUserLogin()`, all hardcoded emails/UUIDs, `gemini_api_key` SQL column references |
| `server/supabase/supabase-client.ts` | Remove `saveConfig()`, `clearConfig()`, SQLite `app_settings` read path; env-only config |
| `app/api/ai/suggest/route.ts` | Remove `isDeveloperOwner` logic, hardcoded identity, cookie reads; AI config from `x-ai-config` header only |
| `app/api/scrape/route.ts` | Remove `isDeveloperOwner` logic, hardcoded identity, cookie reads; userId from session in Stage 2; for Stage 1 require session or userId from header X-User-Id NOT trusted |
| `app/api/auth/sync-user/route.ts` | Remove `auth.admin.getUserById` call; remove setting `markly_user_id` response cookie; userId from body still used in Stage 1 (cleaned in Stage 2) |

---

## Stage 2 – Real Server-Side Authentication

### New files to CREATE
| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | `createServerClient` via `@supabase/ssr` using Next.js `cookies()` |
| `server/auth/require-user.ts` | `requireUser()` → calls `supabase.auth.getUser()`, throws 401 JSON on failure |

### Routes to REFACTOR (add requireUser + remove userId from params)
- `app/api/bookmarks/route.ts`
- `app/api/bookmarks/[id]/route.ts`
- `app/api/bookmarks/[id]/visit/route.ts`
- `app/api/bookmarks/bulk/route.ts`
- `app/api/folders/route.ts`
- `app/api/folders/[id]/route.ts`
- `app/api/folders/reorder/route.ts`
- `app/api/recycle-bin/route.ts`
- `app/api/recycle-bin/[id]/route.ts`
- `app/api/workspace/bootstrap/route.ts`
- `app/api/stats/route.ts`
- `app/api/graph/route.ts`
- `app/api/export/route.ts` (re-enable with auth)
- `app/api/import/route.ts`
- `app/api/scrape/route.ts` (wire userId from session)
- `app/api/ai/suggest/route.ts` (wire userId from session)
- `app/api/user/profile/route.ts`
- `app/api/domain/[domain]/route.ts`
- `app/api/health-check/route.ts` (re-enable with auth)
- `app/api/auth/sync-user/route.ts` (get userId from session, not body)

### Repository changes
- Remove `DEFAULT_USER_ID` default parameter from every method
- Every `get/update/delete by id` ALSO filters by `user_id = session user's id`

### Frontend changes
- Remove `userId` from all fetch URLs and request bodies
- Remove `markly_user_id` cookie reads from all hooks and pages
- Session cookie from `@supabase/ssr` handles auth automatically

---

## Stage 3 – Login Without Admin API

### Migration to write
- `supabase/migrations/001_profiles.sql` — STOP and ask user to run before Stage 3 code

### Routes to refactor
- `app/api/auth/resolve-identifier/route.ts` — query `profiles` table instead of `auth.admin.listUsers(perPage:1000)`
- `app/api/auth/check-username/route.ts` — query `profiles` table
- Remove resolve-identifier returning email to any caller → gate behind session OR remove email from response

### Auth context changes
- Username login: resolve username → email via `/api/auth/resolve-identifier` (keeps working, but email is no longer returned to unauthenticated clients — instead issue a login token server-side)
- Profile update: use `supabase.auth.updateUser()` client-side only

---

## Stage 4 – Hardening

### Changes
- Upgrade `zod` from `^3.24.2` to `>=4.6.7` in `package.json`
- `server/scraper/ratelimit.ts` — use real IP from trusted headers only (not `x-forwarded-for` raw value); in-memory + server-only
- `server/scraper/fetcher.ts` — disable redirect-following (pass `redirect: 'error'` to `fetch()`); verify existing SSRF guard
- Add security headers to `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- `app/api/health-check/route.ts` — re-enable with auth; use `no-redirect` fetch

---

## Stage 5 – Tests, RLS, CI

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/002_rls.sql` | RLS policies: every table has `auth.uid() = user_id` policies |
| `__tests__/api/auth.test.ts` | Tests: 401 on unauthenticated, cross-user 404 |
| `.github/workflows/ci.yml` | Run `tsc --noEmit` and `vitest run` on every PR |

### Documentation
- `README.md` — remove any reference to Supabase UI connect/disconnect
- `.gitignore` — add `.env*.local`, `*.db`, `*.db-shm`, `*.db-wal`

---

## Stage 6 – Phase 11 Plan

**Files created:**
- `docs/phase11-plan.md` — next phase plan (ONLY the plan, no implementation)

---

## Route → Auth Summary Table (target state after Phase 10)

| Route | Method | Auth Required | Ownership Check |
|-------|--------|---------------|-----------------|
| `/api/bookmarks` | GET | ✅ session | user_id = session uid |
| `/api/bookmarks` | POST | ✅ session | user_id = session uid |
| `/api/bookmarks/[id]` | GET/PATCH/DELETE | ✅ session | AND user_id filter |
| `/api/bookmarks/[id]/visit` | POST | ✅ session | AND user_id filter |
| `/api/bookmarks/bulk` | POST/DELETE | ✅ session | AND user_id filter |
| `/api/folders` | GET/POST | ✅ session | user_id = session uid |
| `/api/folders/[id]` | GET/PATCH/DELETE | ✅ session | AND user_id filter |
| `/api/folders/reorder` | POST | ✅ session | AND user_id filter |
| `/api/recycle-bin` | GET/PATCH | ✅ session | user_id = session uid |
| `/api/recycle-bin/[id]` | DELETE | ✅ session | AND user_id filter |
| `/api/workspace/bootstrap` | GET | ✅ session | user_id = session uid |
| `/api/stats` | GET | ✅ session | user_id = session uid |
| `/api/graph` | GET | ✅ session | user_id = session uid |
| `/api/export` | GET | ✅ session | user_id = session uid |
| `/api/import` | POST | ✅ session | user_id = session uid |
| `/api/scrape` | POST | ✅ session | user_id = session uid |
| `/api/ai/suggest` | POST | ✅ session | user_id = session uid |
| `/api/user/profile` | GET/PATCH | ✅ session | user_id = session uid |
| `/api/domain/[domain]` | GET | ✅ session | user_id = session uid |
| `/api/health-check` | POST | ✅ session | user's bookmarks only |
| `/api/auth/sync-user` | POST | ✅ session | session uid only |
| `/api/auth/check-username` | GET | ❌ public | n/a (availability only) |
| `/api/auth/resolve-identifier` | POST | ❌ public | returns email only if user confirmed |
| ~~`/api/user/ai-config`~~ | ~~GET~~ | 🗑️ deleted | — |
| ~~`/api/auth/update-credentials`~~ | ~~POST~~ | 🗑️ deleted | — |
| ~~`/api/auth/confirm-user`~~ | ~~POST~~ | 🗑️ deleted | — |
| ~~`/api/supabase/connect`~~ | ~~POST~~ | 🗑️ deleted | — |
| ~~`/api/supabase/disconnect`~~ | ~~POST~~ | 🗑️ deleted | — |
| ~~`/api/supabase/sync`~~ | ~~POST~~ | 🗑️ deleted | — |
| ~~`/api/supabase/status`~~ | ~~GET~~ | 🗑️ deleted | — |
| ~~`/api/auth/migrate-local`~~ | ~~POST~~ | 🗑️ deleted | — |

