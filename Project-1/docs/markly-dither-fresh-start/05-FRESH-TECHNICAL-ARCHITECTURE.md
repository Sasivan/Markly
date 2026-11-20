# Markly — Fresh Technical Architecture

## 1. Framework and Dither integration gate

Preferred new stack, only after Stage 0 verifies the official Dither Vue source:
- Vue 3 + TypeScript.
- Vite.
- Official Dither UI Vue kit copied into the repository using the current official Quick Start.
- Tailwind only if the Dither Vue variant requires/uses it; otherwise load the kit's compiled CSS and keep custom styling scoped to Dither tokens.
- Vue Router for pages.
- Pinia only for meaningful cross-route app state.
- IndexedDB (via a small repository wrapper or Dexie if approved) for local-first data persistence.
- Vitest and Playwright for tests.

The official Dither Quick Start search result currently states: copy the kit with `npx degit drvova/dither-ui/dither-kit src/dither-kit`, install `d3-scale d3-shape clsx tailwind-merge`, and alias `@dither-kit`. Verify this exact command/path against the live Vue tab and GitHub HEAD before using it. Do not blindly copy this command if the source tree differs.

No React/Next migration is planned because the new branch is a new blank project. Do not preserve the old React app just because it existed in the repository's previous branch.

## 2. Data model (new product, no old database migration)

The first release should be local-first because no live backend configuration or auth contract was provided.

### Entities
- `Bookmark`: id, url, normalizedUrl, title, description, domain, faviconUrl (optional), thumbnailUrl (optional), notes, tags, folderId (nullable), isFavorite, createdAt, updatedAt, lastVisitedAt, visitCount, deletedAt (nullable), status.
- `Folder`: id, name, parentId (nullable), iconKey, colorKey, sortOrder, createdAt, updatedAt, deletedAt (nullable).
- `StashSession`: id, name, createdAt, updatedAt, itemIds, optional notes.
- `StashItem`: id, sessionId, bookmarkId (nullable), url/title snapshot, order.
- `Tag`: id, name, colorKey (if supported by Dither palette), createdAt.
- `VisualBoard`: id, name, scope, createdAt, updatedAt, order, layout settings.
- `VisualBox`: id, boardId, type, title, config (validated JSON shape), x/y/width/height/order.
- `FeedbackItem`: id, category, message, createdAt, deliveryState (`local-draft` / `outbox` / `sent` only when real provider exists).
- `ProfilePreferences`: theme, motionPreference, densityPreference, displayName, avatarSeed, createdAt/updatedAt.
- `TrashRecord`: entityType, entityId, deletedAt, restoreMetadata; may be represented through deletedAt on soft-deletable entities plus a recovery index.

### Data constraints
- Stable IDs.
- Folder parent references must exist; prevent cycles.
- A bookmark URL is normalized before duplicate detection.
- Soft delete first; permanent deletion is a separate confirmed action.
- Stash session snapshots remain meaningful if the source bookmark is deleted.
- VisualBox config is validated by visual type; do not use arbitrary `any`.
- VisualBoard scope must refer to a supported data scope.
- IndexedDB transactions must be atomic where related records are changed.
- Version the local database and supply migration functions for future schema changes.

## 3. Persistence

- Use IndexedDB for bookmarks, folders, tags, Stash, visual boards and trash.
- Keep tiny UI preferences in a separate preferences store only if appropriate.
- Do not store the full bookmark archive in localStorage.
- Provide JSON export/restore with schema version and validation.
- Do not invent cross-device sync; leave a typed `SyncAdapter` interface for future cloud integration.
- Do not require an auth provider in v1.
- If remote sync is later added, implement a separate adapter behind the repository interface and do not couple components to Supabase or another backend.

## 4. Repository/service layer

Use a clear separation:
- `domain/` types and validation.
- `data/` IndexedDB schema/repositories.
- `services/` bookmark/folder/search/stash/analytics/trash workflows.
- `features/` add/edit/search/import/export/visual-board flows.
- `components/dither/` Dither wrappers and Markly-specific compositions.
- `pages/` route-level screens.
- `router/` route map.
- `catalogue/` Dither Lab manifest and preview registry.

UI components never write directly to IndexedDB. They call a service; the service calls a repository. This makes a later cloud adapter possible.

## 5. Search

Search index fields:
- title
- URL
- domain
- description
- notes
- tags
- folder path

Implement a local index or indexed query over IndexedDB. Debounce keystrokes, show keyboard selection, and preserve query state in the URL when appropriate. Search results reuse the same BookmarkRow.

## 6. Folder tree

Use the Dither File Tree component/pattern as the visual and interaction baseline. Map Dither tree events to the new Folder repository:
- expand/collapse
- expand/collapse all
- selected item
- nested rail guides
- create child
- rename
- move
- reorder
- context actions

Keep one tree implementation reused by folder navigation, Add/Edit Bookmark folder destination and Stash/Visual Analytics scope selectors. Do not create separate tree renderers.

## 7. Visual Analytics

Use Dither UI's chart roots/parts and data visualization components. Keep one visualization board. Data selectors are driven by the actual Bookmark/Folder/Stash entities. All displayed chart data must be reproducible from stored records.

Suggested supported chart configurations:
- activity by date (Area/Line)
- bookmarks by domain (Bar)
- bookmarks by folder (Bar)
- tag distribution (Pie, where category count is small)
- visits by date (Line/Area, only if visit timestamps exist)
- folder relationship graph (only if graph edges are defined)
- sparklines for compact board-level stats

Chart boxes use typed config schemas per chart kind; saved config and layout persist through VisualBoard/VisualBox repositories.

## 8. Browser limitations

A normal web page cannot silently inspect all browser tabs. Stash v1 supports selected links/manual URLs and saved sessions. Automatic all-tabs capture requires a separately built browser extension with explicit permissions, manifest, privacy copy and user approval. Do not imply the web app can do this without an extension.

## 9. Privacy/security

- No secrets in frontend source.
- Validate URL schemes; accept `http` and `https` only for bookmarks unless the product explicitly supports another safe protocol.
- Avoid making arbitrary server-side URL requests; no SSRF-producing backend fetch without strict controls.
- Escape or sanitize untrusted titles/descriptions/notes in rendered UI.
- Do not use `v-html` with bookmark content.
- If import files are supported, validate file size, JSON structure and schema version before writing.
- If remote APIs are added later, require authenticated identity, ownership checks, server-side validation and generic error handling.
- Feedback must not claim server submission unless configured.

## 10. Accessibility and performance
- All Dither controls must preserve semantics, labels and keyboard support.
- Dither canvas/backgrounds must pause when offscreen and respect reduced motion.
- Static rendering by default for decorative backgrounds.
- Every chart root gets measured dimensions and a non-canvas textual summary.
- Large background effects never sit behind dense link rows.
- Provide keyboard and touch versions of tree operations.
- Lazy load Dither Lab previews and noncritical backgrounds.
