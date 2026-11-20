# Markly — Dither UI Fresh-Start Project Pack

**Product:** Markly  
**Work mode:** fresh project on a new empty Git branch  
**Visual/component source:** Dither UI only  
**Official site:** https://dither-ui.com/  
**Official docs:** https://dither-ui.com/docs/  
**Official repository:** https://github.com/drvova/dither-ui  
**Design research reference:** https://mobbin.com/

---

## 1. Why this is a fresh start

The screenshot supplied after the previous attempt shows a Dither documentation page being reproduced inside the product: a documentation category rail, one centered component preview, a right-side “On this page” rail and a code/install snippet. That is not a redesigned bookmark product.

This project must begin from a clean product concept. Do not use the previous Markly dashboard/page layouts, old application source files, old component structures, previous chat's page designs or previous UI modernization plans as a visual or implementation template.

The new product should feel like Markly, but its interface architecture is new.

## 2. Important framework decision

The Dither UI website currently exposes Vue and Svelte documentation variants. Its official Quick Start describes a Vue 3 setup and a copy-in kit, while the GitHub repository's current `master` README/package metadata inspected for this pack still describes a SolidJS source layer. These public surfaces are not perfectly aligned.

**Do not guess and do not copy Solid components into Vue.** During Stage 0, Antigravity must:
1. Open the live Dither UI Quick Start.
2. Select the Vue tab in the actual docs.
3. Inspect the current code snippets and exact copy/install command.
4. Inspect the GitHub repository at the referenced commit/ref and check whether that exact Vue kit path exists.
5. Use Vue 3 only if the live Vue source and dependencies can be obtained and built successfully.
6. If the live Vue tab is backed by source not present in the public repository, stop and report the exact source availability issue. Do not silently substitute Solid or a hand-written non-Dither kit.

Since this is a genuinely new project, Vue 3 + Vite + TypeScript is the preferred direction if the official Vue variant is verifiably available. This avoids the React/Solid adapter problem and is more aligned with Dither's current docs than reusing the old React/Next application.

Do not use shadcn, Radix, MUI, Mantine, Chakra, HeroUI, Base UI, React Aria, Bootstrap or another UI component library. The UI must come from Dither UI. Native browser elements may be used as the underlying platform semantics and accessible primitives, styled/composed through the Dither layer.

## 3. Product direction in one sentence

**Markly is an immersive, dither-native personal archive for saving, finding, grouping, revisiting and understanding useful links—with a calm core workspace and a powerful dedicated Visual Analytics canvas.**

The product should not be a dashboard where every screen contains charts, cards, counters, table variants and decorative panels.

## 4. Main product priorities

Keep these highly visible:
- Immersive public/product homepage (not a dashboard).
- Global Search / command surface.
- Library of saved links.
- Favorites.
- Recently visited.
- Stash / saved browsing sessions.
- A persistent recursive folder tree.
- Folder detail page.
- Dedicated Visual Analytics page where users create chart/graph/visual boxes.
- Recycle Bin.
- Feedback.
- Profile.

You may add well-justified features such as Tags, Reading Queue, Collections, Import/Export, Dither Lab and Settings, but do not add complexity for its own sake.

## 5. The “use every Dither item” rule

The Dither UI categories/counts supplied by the user are the catalogue coverage target:

| Category | Supplied count |
|---|---:|
| Overview | 1 |
| Primitives | 19 |
| Typography | 25 |
| Handbook | 7 |
| Examples | 32 |
| Components | 103 |
| Backgrounds | 49 |
| Text | 24 |
| Animations | 50 |
| Utils | 2 |
| **Total** | **312** |

These counts must be audited against the live website and current source. Search indexing and repository source inspected for this pack show a count discrepancy for Components (some current indexed surfaces say 102, while the supplied count and screenshot say 103). The agent must record the exact live docs count and reconcile it with the supplied target. Never invent an extra component or hide a real item merely to make the total match.

**Every catalogue item must be represented in the finished project at least once**, either:
- in the real product where the component is appropriate; or
- in a dedicated `/lab` Dither Lab catalogue preview where its working variant can be inspected.

Irrelevant examples such as chat, billing, wallet or two-factor patterns should not be forced into the main bookmark workflow. They belong in clearly labelled isolated Dither Lab examples. This is how we satisfy full catalogue coverage without making the product complicated.

## 6. Documents in this package

1. `00-READ-ME-FIRST.md` — project direction and rules.
2. `01-PRODUCT-CONCEPT-AND-USER-JOURNEYS.md` — product brief, features and core user journeys.
3. `02-INFORMATION-ARCHITECTURE-AND-PAGE-DESIGNS.md` — homepage, app shell and every page/section.
4. `03-DITHER-VISUAL-DIRECTION.md` — visual analysis of Dither's own website/docs/Studio and design rules for Markly.
5. `04-COMPLETE-DITHER-CATALOGUE-ADOPTION.md` — all category counts, item-level adoption policy and manifest requirements.
6. `05-FRESH-TECHNICAL-ARCHITECTURE.md` — new project architecture, data, persistence and framework gate.
7. `06-STAGED-EXECUTION-AND-QUALITY-GATES.md` — staged implementation, deliverables and acceptance criteria.
8. `07-ANTIGRAVITY-MASTER-PROMPT.md` — single master execution prompt.
9. `08-ANTIGRAVITY-RESUME-PROMPT.md` — state-aware interruption/resume prompt.
10. `catalogue-manifest-template.json` — machine-readable manifest template.

## 7. How to use this pack

1. Create/check out the empty branch you intend to use for the fresh project. Do not use `main`.
2. Place this folder in the repository, for example `docs/markly-dither-fresh-start/`.
3. Open the repository in Antigravity Agent/Code mode.
4. Give it the full pack and run the master prompt.
5. Do not permit it to scaffold the full app before Dither's official Vue source/quickstart is verified.
6. Let it implement one stage at a time, updating the durable state file after every stage.
7. If interrupted, use the resume prompt. The resume prompt reads actual stage/task state from a generated JSON progress file; it does not guess from memory.

## 8. What this does not do

This package does not modify your Git repository, production site, Supabase database or any previous Markly code. It is an implementation blueprint for Antigravity.
