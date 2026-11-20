# Antigravity Master Prompt — Start Markly from Scratch with Dither UI

You are building a new Markly product from a clean branch. This is not a redesign of the old Markly codebase. Do not use old page layouts, old React/Next components, previous dashboard structure, prior UI modernization docs or conversation-specific old component designs.

## Goal

Create a fresh, immersive, modern bookmark/archive product called Markly whose entire visual and UI component language comes from Dither UI.

Official source:
- https://dither-ui.com/
- https://dither-ui.com/docs/
- https://github.com/drvova/dither-ui

Read every file in `docs/markly-dither-fresh-start/` first, especially:
- `00-READ-ME-FIRST.md`
- `01-PRODUCT-CONCEPT-AND-USER-JOURNEYS.md`
- `02-INFORMATION-ARCHITECTURE-AND-PAGE-DESIGNS.md`
- `03-DITHER-VISUAL-DIRECTION.md`
- `04-COMPLETE-DITHER-CATALOGUE-ADOPTION.md`
- `05-FRESH-TECHNICAL-ARCHITECTURE.md`
- `06-STAGED-EXECUTION-AND-QUALITY-GATES.md`

## Absolute constraints

1. Use Dither UI as the only UI design/component source. Do not use shadcn, Radix, MUI, Mantine, Chakra, HeroUI, Base UI, React Aria, Bootstrap or any other component library.
2. Use the official Dither framework variant that is verifiably supported by its live docs. Prefer Vue 3 + Vite + TypeScript if the official Vue kit/source can be obtained and built.
3. The current Dither docs expose Vue/Svelte tabs, but the GitHub master source inspected may describe a Solid package. Verify the exact current Vue quickstart and source path before scaffolding. Never import Solid components directly into Vue/React.
4. Start from the intentionally empty branch. Do not work on `main`. Verify branch and working tree, preserve owner-provided docs.
5. Do not use previous Markly app code as a template. The UI, routing, page layout and component structure are a new design.
6. No deployment or production services during this task.
7. Implement actual pages and behavior; do not return only screenshots or a Figma-style mockup.
8. Build every route and every Dither catalogue preview described in the docs. Every Dither catalogue item must be represented in `/lab` at minimum, and suitable components must also be used in real Markly pages.
9. Keep the main application simple: all advanced analytics are on one dedicated Visual Analytics page. Home is an immersive product homepage, not a dashboard.
10. Preserve privacy and safe data handling. Use IndexedDB local-first persistence unless a real backend is explicitly provided. Do not invent auth, feedback or sync endpoints.

## Product information architecture

Implement the pages defined in `02-INFORMATION-ARCHITECTURE-AND-PAGE-DESIGNS.md`:
- `/` immersive homepage with Dither hero art, story-driven sections and CTA to Open Archive.
- `/library` canonical bookmark list and search/filter.
- `/favorites`
- `/recent`
- `/stash`
- `/folders/:folderId`
- `/analytics` dedicated visual analytics/visual box/graph workspace.
- `/trash`
- `/feedback`
- `/profile`
- `/lab` exhaustive Dither UI catalogue and preview playground.
- `/settings` if needed for supported preferences/data portability.
- Global command/search overlay.

Do not create a dashboard as the homepage. Clicking the brand name always returns to `/`.

## Required core features

- Add/edit/delete/open bookmarks.
- Global search across title, URL/domain, description, notes, tags and folder path.
- Favorites.
- Recently visited.
- Stash sessions.
- Recursive folder tree and folder pages.
- Add/move/reorder/rename folders.
- Dedicated Visual Analytics with Dither charts and saved visual boxes.
- Recycle Bin, restore and permanent delete.
- Feedback page.
- Profile/preferences.
- Import/export and data portability.
- Dither Lab with all catalogue items.

## All Dither catalogue categories must be covered

Use the supplied counts as target:
- Overview 1
- Primitives 19
- Typography 25
- Handbook 7
- Examples 32
- Components 103
- Backgrounds 49
- Text 24
- Animations 50
- Utils 2

At Stage 0, crawl the current official docs and generate an exact item-level manifest. Reconcile the current docs count if it differs (indexed site currently reports 102 for Components in some surfaces, while the owner target/screenshot says 103). Never invent a missing item. Every item must be previewed in Dither Lab or assigned an explicit reason and status; the owner expects full catalogue usage, so prefer live Lab previews.

## Framework and kit verification — must happen first

- Inspect official Dither UI Quick Start with Vue selected.
- Verify the exact `degit` path, install dependencies, aliases and CSS/theme import.
- Clone/download the exact current source and verify that it actually contains Vue components.
- Check the current license and retain attribution.
- Build a tiny test route with Dither Button, Sidebar/File Tree, Dialog/Popover, Chart, Background and Typography.
- Verify all compile, render, respond to interaction and work in the chosen framework.
- If Vue source cannot be obtained, stop and produce a blocker report. Do not substitute Solid, React port, another UI kit or full framework migration without owner approval.

## Build stages and autonomous execution

Follow stages 0–10 in `06-STAGED-EXECUTION-AND-QUALITY-GATES.md`. Execute sequentially, verifying each stage, but do not pause for approval between normal, non-destructive stages.

### Important implementation order
1. Dither source/framework verification and catalogue manifest.
2. Clean project scaffold and Dither smoke test.
3. App architecture, repositories and IndexedDB.
4. Shared Dither components/Markly compositions.
5. Immersive Home.
6. Library/Favorites/Recently/Folders/Stash/Recycle Bin.
7. Visual Analytics.
8. Feedback/Profile/Settings.
9. Full Dither Lab catalogue.
10. Final QA.

If Dither source/Framework gate fails, do not build fake Dither-style components and claim completion. Provide exact evidence of the blocker and wait only for that architectural decision; other research/IA tasks may continue.

## Visual design standard

The design must feel unmistakably like the Dither UI site and kit:
- Near-black / dither-textured foundations where appropriate.
- Bone/ivory type and subtle metadata.
- Ordered-dither surfaces, Dither button fills, Dither chart rendering and palette/tone language.
- Dither File Tree with nested rails and selected item echo.
- Immersive hero with live Dither art and a strong type composition.
- Dither Lab may use a three-column docs/preview/inspector layout.
- Core app pages are not documentation pages and must not copy the docs rails.
- Main Library and Folder pages prioritize content and scanning.
- Visual Analytics is the only rich chart canvas.
- Dither effects are controlled and performance-conscious; not all backgrounds/animations run at once.

Use Mobbin (https://mobbin.com/) for a short research pass on current real-world homepage patterns: select 3–5 references for hero, storytelling, navigation, product demo and footer, record a short reason for each, and create an original composition. Mobbin is research only, not a UI kit. Do not copy screenshots/assets.

## Progress state and interruption recovery

Create `docs/markly-dither-fresh-start/PROGRESS.json` and update it after each completed stage and meaningful batch. The file must record:
- currentBranch
- currentStage
- completedStages
- currentTaskId
- completedTaskIds
- pendingTaskIds
- blockedTaskIds and exact blocker
- filesCreated/modified
- testsRun and results
- catalogue totals and preview coverage
- lastVerifiedCommit
- nextExactAction
- timestamp

Also maintain `PROGRESS.md` as a human-readable summary and links to screenshots.

Do not infer how much was completed from chat history or vague notes. On resume, inspect actual files, tests, routes and git diff against PROGRESS.json, then correct the checkpoint if necessary.

## Test after each stage

Use the framework's actual test/build commands. Run:
- typecheck
- lint
- unit/component tests
- build
- Playwright/browser checks
- accessibility checks (manual keyboard/focus plus automation if available)
- IndexedDB persistence tests
- Dither Lab manifest coverage test

Check:
- 390, 768, 1024, 1280, 1440px.
- Reduced motion.
- Empty and populated database.
- keyboard + touch.
- browser refresh and data persistence.
- search and tree operations.
- chart rendering/resizing/save/reload.
- trash restore/permanent delete.
- all Dither preview routes.

## Do not do these things

- Do not reproduce the Dither Docs File Tree page as the Markly homepage.
- Do not create a dashboard homepage.
- Do not put charts on every page.
- Do not install a different UI library.
- Do not use generic hand-styled controls instead of Dither.
- Do not fake a 103rd component or any missing catalogue item.
- Do not force irrelevant examples into core product pages; put them in the Dither Lab.
- Do not leave a category represented only by a text list; catalogue entries require actual previews.
- Do not silently add external backend, auth, storage, analytics or feedback services.
- Do not delete source or branch history without explicit instruction.
- Do not claim work, tests or screenshots that were not actually done.

## Start now

Begin with Stage 0. Verify Dither's official Vue source and live docs, produce the catalogue manifest and prove a working Dither component in a clean Vue app. Then continue through the implementation stages. Work autonomously in bounded batches, write progress state, test and proceed until all stages are complete or a real blocker is reached.
