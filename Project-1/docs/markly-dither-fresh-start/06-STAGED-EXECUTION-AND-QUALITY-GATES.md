# Markly Fresh Start — Staged Execution and Quality Gates

## Execution model

Do not build the entire product in one prompt or one huge component. Antigravity should execute stages continuously, but each stage must have a working state, tested output and checkpoint before proceeding.

## Stage 0 — Source verification and empty-branch check

Tasks:
1. Verify the branch is the user's intentionally empty branch, not `main`.
2. Preserve all docs and any files the owner intentionally placed in it.
3. Inspect the live Dither website: Vue/Svelte framework switch, Quick Start, docs categories, current counts and exact copy-in commands.
4. Inspect GitHub HEAD and confirm which framework source folders actually exist.
5. Confirm which kit is licensed and which files are required.
6. Generate the full live catalogue manifest with 312 target categories/counts and record discrepancies.
7. Choose Vue 3 only after proving the official Vue kit can be installed/copied and built.

Exit gate:
- Written Dither source/framework verification report.
- Exact framework and copy command chosen.
- Catalogue manifest generated.
- No app scaffolding before the gate passes.

If official Vue source is not obtainable:
- Stop only framework selection.
- Document exact URLs/paths and mismatch.
- Do not use a Solid kit inside Vue.
- Do not switch frameworks silently.
- Ask the owner for the desired direction if no supported source can be verified.

## Stage 1 — Fresh scaffold and Dither smoke test

Create the app from scratch using the verified Dither-supported framework. Start with:
- Home route shell.
- Dither button/input/field.
- Dither file tree.
- Dither dialog/popover.
- Dither chart.
- Dither background.
- Typography/text example.
- One animation example.

Verify:
- Install/build.
- SSR/CSR behavior if applicable.
- Browser hydration if SSR is introduced.
- Keyboard and focus.
- Theme tokens.
- Dither seed stability.
- Reduced motion.
- No competing UI libraries.

Exit gate: working Dither-based preview app and source license/attribution.

## Stage 2 — Product foundation and navigation

Implement:
- Routes.
- Dither sidebar and responsive shell.
- Brand wordmark navigation to `/`.
- Global Search/command surface.
- Shared Dither File Tree.
- Add Bookmark dialog.
- Link row / link detail composition.
- Empty/loading/error states.

Use no persistent data initially beyond the repository interface and a tiny explicit demo fixture.

Exit gate: navigation and core components work on desktop/mobile.

## Stage 3 — Data and local-first persistence

Implement:
- IndexedDB database/schema.
- Repositories and service layer.
- Bookmark CRUD.
- Folder CRUD and nested tree.
- Tags.
- Favorites.
- Recently visited.
- Soft delete/trash/restore.
- Data backup/export/import.
- First-run sample archive option, never auto-insert fake data without explaining it.

Exit gate: refresh retains user data; CRUD, tree, delete/restore and import/export tests pass.

## Stage 4 — Immersive Home

Build the actual non-dashboard home:
- Dither art-directed hero.
- Editorial narrative.
- Main CTA to Open Archive.
- Search entry.
- Capture/Find/Organize/Return story sections.
- Visual Analytics teaser.
- Footer.
- Responsive/mobile-specific design.
- Brand always routes home.

Exit gate: homepage has no giant stats/chart dashboard and passes visual review.

## Stage 5 — Library, Favorites, Recently and Folder pages

Implement:
- One canonical BookmarkRow/List.
- Library search and filters.
- Favorites/Recently as scopes using same components.
- Dither File Tree and Folder detail.
- Stash as separate page and session management.
- Recycle Bin restore and permanent deletion.

Exit gate: all main archive workflows and folder interactions pass.

## Stage 6 — Visual Analytics

Implement:
- One analytics workspace.
- Scope selector.
- Add Visualization flow.
- Dither chart types.
- Visual box resize/reorder.
- Save board and reload.
- Graph tab where supported by actual data relationships.
- No chart blocks on Home or default folder page.

Exit gate: charts use actual IndexedDB records and saved boards restore full config.

## Stage 7 — Feedback, Profile, Settings and portability

Implement:
- Feedback local outbox.
- Profile/preferences.
- Motion/theme/density settings supported by Dither.
- Backup/restore.
- Storage usage/clear data if accurate.

Exit gate: all visible actions work and status labels are truthful.

## Stage 8 — Dither Lab and full catalogue use

Implement a searchable `/lab` with category navigation, preview canvas, props inspector and source attribution. Use the live manifest:
- Overview 1
- Primitives 19
- Typography 25
- Handbook 7
- Examples 32
- Components 103 (or current live reconciled count)
- Backgrounds 49
- Text 24
- Animations 50
- Utils 2

Every catalogue item must render at least one usable preview. Isolated examples use fixture data and are marked as examples. Do not add their irrelevant behavior to Markly's core feature set.

Exit gate: all manifest items have a preview route/component and status; all target counts are reconciled.

## Stage 9 — Final design and accessibility pass

- Audit every route, section, popup, menu, control, tooltip, input, chart, background and animation.
- Ensure a single Dither design language.
- Test 390, 768, 1024, 1280 and 1440 widths.
- Test keyboard, touch, reduced motion and screen reader semantics.
- Performance-test Dither backgrounds and charts.
- Fix all broken, clipped, hidden, overflowing or decorative-only controls.

## Stage 10 — Release readiness

- Run all tests and build.
- Inspect browser console and requests.
- Confirm no secrets or unintended remote services.
- Test browser refresh and data persistence.
- Verify empty state on a clean database.
- Verify import/export with malformed and valid files.
- Produce screenshots and final feature/manifest checklist.
- Do not deploy or merge unless the owner separately asks.

## Long-run autonomous behavior

Antigravity may execute stages continuously without asking approval between normal stages. It must:
- Finish a stage's exit gate.
- Write progress checkpoint.
- Proceed to next stage.
- If a blocker affects one area, document it and continue other safe work.
- Never claim the whole app is complete when a stage remains pending.
- Never skip the React/Vue/Kit source compatibility check.
