# Stage 0: Dither UI Source Verification & Blocker Report

**Date:** 2026-11-21  
**Product:** Markly (Fresh Start)  
**Branch:** `markly-D` (verified clean root commit `ecaee9c`)  
**Status:** **STAGE 0 GATE - ARCHITECTURAL DECISION REQUIRED**

---

## 1. Executive Summary

As required by `00-READ-ME-FIRST.md` and `06-STAGED-EXECUTION-AND-QUALITY-GATES.md`, Antigravity performed a rigorous, live investigation into the official Dither UI website (`https://dither-ui.com/`), documentation, and GitHub repository (`https://github.com/drvova/dither-ui`).

### The Critical Finding:
**The official Vue 3 kit and Svelte port were permanently removed from the Dither UI repository in Pull Request #41 on November 13, 2026.**

The GitHub repository `master` branch and the live website `https://dither-ui.com/` are now **exclusively SolidJS** (`@solidjs/start` and `@dither-ui/kit` for Solid).

Per the strict project constraint:
> *"If Vue source cannot be obtained, stop and produce a blocker report. Do not substitute Solid, React port, another UI kit or full framework migration without owner approval."*
> *"If official Vue source is not obtainable: Stop only framework selection. Document exact URLs/paths and mismatch. Do not use a Solid kit inside Vue. Do not switch frameworks silently. Ask the owner for the desired direction if no supported source can be verified."*

We have stopped at the framework gate and are presenting the exact evidence and options below.

---

## 2. Detailed Technical Audit & Evidence

### A. GitHub Pull Request #41 (Merged 2026-11-13T04:20:29Z)
- **PR URL:** `https://github.com/drvova/dither-ui/pull/41`
- **Title:** `Solid only: the kit and the site move to SolidJS and SolidStart, in one workspace of packages`
- **Merge Commit:** `1d5048dbec406972e4e3e8cbfa720a9bc1224fa1`
- **Base Commit:** `ac2a46684f8e3e90fe00c79693b6237a584be00a`
- **PR Body Excerpt:**
  > *"The kit and the site are SolidJS and SolidStart, and nothing else. The Vue kit and site and the Svelte port are deleted, and the repository is one npm workspace of packages.*  
  > *Removed: The Vue kit, the Vue site, their specs, ESLint and vue-tsc. The Svelte kit and its site, the docs' framework switch and the Svelte code it derived... What a reader is told: Titles, descriptions, crawler files, the landing, the agent skill, the Studio's code export, the docs' code and the READMEs say and write Solid. A spec fails if shipped copy names Vue or Svelte."*

### B. Live Website Verification (`https://dither-ui.com/docs/getting-started/`)
- In the live HTML of `getting-started`:
  ```bash
  # Step 1: Copy kit
  npx degit drvova/dither-ui/packages/dither-kit/src src/dither-kit
  # Step 2: Runtime dependencies
  npm i d3-scale d3-shape clsx tailwind-merge # ("you already have Solid, and Tailwind if you use it")
  # Step 3: Alias
  resolve: { alias: { "@dither-kit": "/src/dither-kit/solid" } }
  paths: { "@dither-kit": ["./src/dither-kit/solid"] }
  ```
- **Live Tabs Explanation:** The switches visible on the docs header are **Styling switches** (`tailwind`, `css`, `modules`, `stylex`), powered by `@dither-ui/restyle`, not framework switches.
- **Manifest Audit (`https://dither-ui.com/add/manifest.json`):**
  - Total files in kit: 800
  - File breakdown: 587 `.tsx` (Solid JSX), 144 `.ts`, 69 `.css`
  - `.vue` files: **0**
  - `.svelte` files: **0**

### C. The Historical Vue 3 Source
- Prior to PR #41, at commit `ac2a46684f8e3e90fe00c79693b6237a584be00a`:
  - `dither-kit/package.json` had: `"name": "dither-ui"`, `"peerDependencies": { "vue": "^3.5.0" }`.
  - It contained earlier versions of the engine and components. However, multiple newer animations, backgrounds, forms, and charts were introduced/refined during PR #41 through PR #45.

---

## 3. Catalogue Manifest Crawl (100% Match!)

We crawled all navigation definitions from the official live repository (`packages/site/src/pages/docs/`).
The result is an exact **312 items**, matching the owner's target count with **zero discrepancies**:

| Category | Owner Target | Live Crawled Count | Discrepancy |
|---|---:|---:|:---:|
| **Overview** | 1 | 1 | 0 |
| **Primitives** | 19 | 19 | 0 |
| **Typography** | 25 | 25 | 0 |
| **Handbook** | 7 | 7 | 0 |
| **Examples** | 32 | 32 | 0 |
| **Components** | 103 | 103 | 0 |
| **Backgrounds** | 49 | 49 | 0 |
| **Text** | 24 | 24 | 0 |
| **Animations** | 50 | 50 | 0 |
| **Utils** | 2 | 2 | 0 |
| **TOTAL** | **312** | **312** | **0** |

*Note on Components (103):*
Charts (6), Basics (4), Form (4), Field (7), Forms (30), Selection (8), Feedback (4), Structure (5), Layout (6), Media (6), Overlay (7), Surface (11), Navigation (5) = **103 components**.

The full item-level manifest has been frozen to:
- `markly-dither-fresh-start/catalogue-manifest.json`
- `docs/markly-dither-fresh-start/catalogue-manifest.json`

---

## 4. Architectural Decision Options for Owner

Please select how you would like to proceed:

### Option 1 (Recommended): SolidJS + Vite + TypeScript
- **Pros:**
  - 100% aligned with official Dither UI live kit and docs (`@dither-ui/kit` on master).
  - Uses the exact official `npx degit drvova/dither-ui/packages/dither-kit/src src/dither-kit` and `dither-add`.
  - Direct, native execution of all 312 Dither catalogue items and live previews with zero adaptations, zero wrappers, and optimal performance.
  - No React or shadcn dependencies.
- **Cons:**
  - Uses SolidJS instead of Vue 3.

### Option 2: Vue 3 + Vite using Historical Dither Git Ref (`ac2a46684`)
- **Pros:**
  - Keeps Vue 3 + Vite as preferred in the project brief.
  - Uses the author's original Vue 3 code before PR #41.
- **Cons:**
  - Pinned to a historical snapshot (2026-11-13).
  - Does not receive upstream bugfixes from PR #41–#45.
  - Newer components and patterns added in PR #41–#45 would need to be backported from Solid to Vue.

### Option 3: Vue 3 + Vite with Solid Custom Elements / Island Bridge
- **Pros:**
  - Markly application logic, routing, and stores written in Vue 3.
  - Official Dither components rendered inside isolated Solid island wrappers/custom elements.
- **Cons:**
  - Added architectural complexity.

---

## 5. Current Working State

- **Branch:** `markly-D`
- **Files created:**
  - `markly-dither-fresh-start/crawl-catalogue.mjs`
  - `markly-dither-fresh-start/crawled-nav-items.json`
  - `markly-dither-fresh-start/build-manifest.mjs`
  - `markly-dither-fresh-start/catalogue-manifest.json`
  - `docs/markly-dither-fresh-start/catalogue-manifest.json`
  - `markly-dither-fresh-start/PROGRESS.json`
  - `docs/markly-dither-fresh-start/PROGRESS.json`
  - `markly-dither-fresh-start/PROGRESS.md`
  - `docs/markly-dither-fresh-start/PROGRESS.md`
  - `markly-dither-fresh-start/STAGE-0-VERIFICATION-AND-BLOCKER-REPORT.md`
  - `docs/markly-dither-fresh-start/STAGE-0-VERIFICATION-AND-BLOCKER-REPORT.md`
- **All owner docs preserved untouched.**
- **No forbidden UI libraries or fake components introduced.**

Awaiting your decision on **Option 1**, **Option 2**, or **Option 3** to proceed immediately to Stage 1 scaffolding!
