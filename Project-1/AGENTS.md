## Security rules — apply to every task

Identity comes ONLY from a verified Supabase session on the server (`supabase.auth.getUser()`). Never read `userId`, `email`, `role` or `isAdmin` from query params, body, cookies or headers. Every read/update/delete by id must also filter by the session user's id. No new API route without an auth check, zod validation, an ownership check, generic error messages, and tests for 401 and cross-user access. Never use the service-role key or `auth.admin.*` in a browser-reachable route unless the caller is verified and the action is limited to their own account. Never hardcode emails, user IDs or keys. Never put secrets in cookies, API responses or logs. Never add temporary or developer-only bypasses; if a feature seems to need an exception, stop and ask.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
