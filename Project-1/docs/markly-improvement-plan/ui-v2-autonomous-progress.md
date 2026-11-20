# Markly UI-v2 — Autonomous Modernization Checkpoint

**Last updated:** 2026-11-20 (session 16, block T)
**Branch in this workspace:** `freebuff/ee77ed75f4262ee35b1561f3` — a copy of `ui-v2` @ `31743dc` (the Cloud workspace shipped without a checkout, so `ui-v2` was cloned and imported here). `main` was never touched; nothing was pushed, merged or deployed.
**Upstream ZIP:** none was present in the workspace or repository. Design guidance used: `docs/unslop-direction.md`, `docs/phase10-plan.md`, `docs/phase11-plan.md`, `AGENTS.md`, `.agents/skills/unslop/**`.

---

## 1. Block status

| Block | Scope | Status |
| :--- | :--- | :--- |
| **A — Home** | Masthead, metric strip, search, empty state, widget grid | **Complete** |
| **B — Bookmark views** | Table, board, cards, list, compact, toolbar, menus, empty state | **Complete** |
| **C — Folder system** | Collections, folder page panel, sidebar tree, breadcrumbs | **Complete at page/shell level** (recursive logic untouched) |
| **D — Search, smart collections, sharing** | `search-results-view`, `smart-collections-view`, `shared-links-view` | **Complete** (mastheads, metric strips, empty states, nested-scroll fix) |
| **E — Visuals, graph, insights** | `visuals-page-view`, `library-insights-view`, `domain-insights-view`, `knowledge-graph`, folder visual analytics | **Complete at page level** (chart text/tokens, HUD, menus); studio panel interiors inherit tokens |
| **F — Profile, sessions, feedback, trash, share** | `profile-view`, `sessions-view`, `feedback-view`, `recycle-bin-view`, `app/share/[folderId]` | **Complete** (mastheads, token surfaces, empty states) |
| **G — Universal components** | Buttons, inputs, badges, skeletons, dialogs, menus, popovers, selectors | **Complete for shared primitives and overlay surfaces**; universal colour/icon picker internals normalised (no glass, no scale-on-hover); preset-hub internals inherit tokens |
| **H — Responsive, a11y, consistency** | Breakpoints, focus, reduced motion, theme parity, mobile access | **Complete at system level**; per-view 390/768 auditing still needs a browser |
| **I — Modal interiors (session 5)** | Site preview, API key, import/export, library cleanup, stash tabs | **Complete** |
| **J — Table composition + keyboard/theme (session 7)** | Bookmark table column grid, row rhythm, header labels; keyboard walkthrough; light-theme render | **Complete** (Supabase-backed data still unverified — no credentials in this workspace) |
| **K — Studio chrome + widget-icon palette (session 8)** | Intelligence/plot/sites-matrix studio panels, universal visual builder chips, home widget icons, search tag chips, sidebar and extension icons | **Complete** |
| **L — Drag-and-drop feedback + AI panel (session 9)** | Kanban drop-target highlight, board drop payload fix, add-bookmark AI suggestion panel | **Complete** |
| **M — Phone shell (session 10)** | Off-canvas sidebar drawer below `lg`, touch-width table, wrapping folder-visual header, 390 sweep of the never-rendered views | **Complete** |
| **N — Overlays and light theme at phone width (session 11)** | Six modals, both pickers, the site preview, the command palette and the light palette measured at 390; one no-op hover fixed | **Complete** |
| **P — Clipping-aware breakpoint sweep (session 13)** | 14 views at 390 and 11 at 768 measured for elements past the viewport edge, not just document overflow; no clipped content outside intended scrollers | **Complete** |
| **O — Search facet filters at phone width (session 12)** | Status segmented control wrapped inside the card instead of running 29 px past the viewport; presets row verified as a wrapped, non-clipping strip | **Complete** |
| **Q — Resizable dialogs and the edit-bookmark form (session 14)** | Shared resize handles sat 6 px outside every dialog's scroll box, giving each one a stray horizontal scrollbar; edit-bookmark's flags cell overflowed its half-column at 390 | **Complete** |
| **R — Folder management dialogs on phones (session 15)** | The phone drawer shared `z-50` with dialogs, so move/copy/delete/customize opened *behind* it; the five folder dialogs are now rendered and measured at 390 | **Complete** |
| **S — Light theme for the folder dialogs (session 16)** | With `html.light` the delete/copy dialogs render on the paper palette over the drawer, with no dark-surface leakage | **Complete** |
| **T — Narrow phone widths, 320 and 360 (session 16)** | The header action group ran 60 px past a 320 px viewport, cutting off *Sign in*; the accent picker and add-button padding now step down below `sm` | **Complete** |

All blocks A–T are now complete at the level this sandbox can verify. What remains is genuinely browser-dependent or credential-dependent: the signed-in views (real Supabase data) and the knowledge graph, which is empty in guest mode.

## 2. Changes in session 5

### Session 16, block T — 320 px and 360 px

Every previous phone check used 390 px. Measuring 320 and 360 (iPhone SE / small Android) found the first real overflow in the shell since the drawer work.

**Evidence:** `docs/screenshots/ui-v2/home-320.png`, `home-360.png`, `home-390.png`.

* **The header ran off a 320 px screen.** With the rail at 48 px the header has 272 px, of which 248 is content. The right-hand action group measured 308 px starting at x 72, ending at 380 — 60 px outside the viewport — so the *Sign in* button and its icon were cut in half. Cause: the accent-picker control alone costs 68 px and was still shown below `sm`, plus the add-bookmark button kept its desktop padding.
* **Fix.** The accent picker is now wrapped in `hidden sm:flex` (it returns at 640 px, like *Presets*, *Keyboard shortcuts*, *Extension* and *Stash* already do) and the add button is `px-2 sm:px-3`. Re-measured: group 230 px at 320 (right edge 308, inside the 308 px content box), 245 px at 360, 256 px at 390; *Sign in* right edge is 308 at 320 and 378 at 390; **0 clipped elements in `main` and `document.scrollWidth === innerWidth` at all three widths**.
* **Add-bookmark dialog at these widths:** 320 → 301 × 529, 360 → 338 × 511, both inside the viewport with `scrollWidth === clientWidth`.
* **320 px view sweep:** all fourteen rail destinations — Home, All sites, Favorites, Recently visited, Smart collections, Tab sessions, Shared, Folder collections, Visuals, Knowledge graph, Archive, Recycle bin, Feedback, Profile — measure `document.scrollWidth` 320, `main.clientWidth` 272 and **0 clipped elements** outside intended scrollers.
* **Still cramped, not broken:** the metric cards keep their 2-up grid at 320 (≈118 px each) and *0 dead link* wraps onto three lines there; nothing clips and the view is still readable, so it was left as is rather than restructured on evidence-free preference.


### Session 16 — the folder dialogs in light theme

The session-15 dialogs were only seen in dark mode. This pass toggled the theme through the header control (`html.light`, body `rgb(247, 246, 242)`) and reopened them.

**Evidence:** `docs/screenshots/ui-v2/light-delete-folder-390.png`, `light-copy-folder-390.png`.

* **Delete folder at 390 in light:** panel 358 × 383 at left 16 → right 374, background `rgb(255, 254, 251)` with text `rgb(27, 26, 23)`, `scrollWidth === clientWidth` (346/346). The destructive card keeps its tint, the neutral option card stays on the paper surface, and the drawer behind is dimmed by the dialog scrim rather than showing through, so the `z-[45]` change behaves the same in both themes.
* **Copy folder in light (desktop):** renders on the same paper surfaces — search field, the *Root collections* list with its *Current* rows, disabled *Frontend & UI*, and the primary *Copy folder* button all read correctly; no dark panels or white-on-white text.
* **No code change was needed** for this block; the checks are the deliverable.
* **A tooling note:** the cloud browser resets its viewport between `preview_playwright` calls (back to 976 CSS px), so every width-sensitive check has to set the viewport, navigate, act and measure inside a single call. Two captures in session 15 were taken after such a reset and are only used for their visual, not their measurements.


### Session 15 — folder management dialogs and the drawer stacking bug

The five folder dialogs (new folder, move, copy, delete, customize) had never been rendered. Rendering them at 390 exposed a stacking defect that made four of them unusable on phones.

**Evidence:** `docs/screenshots/ui-v2/add-folder-390.png`, `add-folder-1280.png`, `move-folder-390.png`, `copy-folder-390.png`, `delete-folder-390.png`, `folder-customize-390.png`.

* **Dialogs opened from the folder tree painted behind the phone drawer.** The drawer is `fixed … z-50` and so is every dialog, and the drawer wins the tie, so *Move folder*, *Copy folder*, *Delete folder* and *Customize Folder* were centred in the viewport but only a 90 px strip of them showed past the 260 px drawer — the title, fields and confirm button were all hidden. The drawer is now `z-[45]` with its scrim at `z-[44]`: still above the app header (`z-40`), still covering the header at the top-left (probe at 10,10 lands inside the drawer), but below dialogs at `z-50`. Re-measured on *Move folder*: panel at left 16 → right 374, and the element at the panel's left edge is the panel itself; the dialog scrim (`fixed inset-0 bg-black/55`) is what `elementFromPoint` returns over the drawer, so the drawer is inert while a dialog is open.
* **All five dialogs fit 390.** New folder 367 × 304, move 358 × 382, copy 358 × 520, delete 306 wide with both option cards and its footer visible, customize 358 × 472 — each with `scrollWidth === clientWidth`, inside the 844 px viewport, and no document overflow. At 1440 the new-folder dialog is 720 × 286 with 0 clipped children.
* **Add folder could not be reached from the rail.** It lives on sidebar page 2, which only exists in the expanded drawer at phone width; opening it closes when the drawer collapses, so the 390 measurement goes drawer → page 2 → *Add new folder*.
* **Two more overlays rendered.** *Copy Site to Folder* (bookmark-table row action) is 358 × 510 at 390 with `scrollWidth === clientWidth`; *New Smart Dynamic Collection* fits 367 × 681 with its preview card, six quick presets in two columns, identity row, filter/rule pair and footer all visible. Sidebar *Rename* turns out to be an inline field in the tree, not a dialog — the inline input fits its row at 390.
* **A note on deep links (confirmed again).** A cold load of `/?view=smart-collections` renders the workspace home, so those views were reached by clicking the rail — the same finding as session 8.


### Session 14 — resizable dialogs, and the edit-bookmark form at phone width

The last overlays that had never been rendered were the auth modal, the edit-bookmark dialog and the home layout board. Rendering them surfaced one shared defect and one local one.

**Evidence:** `docs/screenshots/ui-v2/auth-1280.png`, `auth-390.png`, `edit-bookmark-1280.png`, `edit-bookmark-390.png`, `home-layout-390.png`.

* **Every resizable dialog had a stray horizontal scrollbar.** `ModalResizeHandles` in `lib/use-resizable-modal.tsx` places its eight grips at `-right-1.5` / `-left-1.5` / `-bottom-1.5` / `-top-1.5` and the corners at `-1`, i.e. 6 px outside the shell. The dialog shell is the scroll container, so that 6 px became real overflow: measured `scrollWidth 674` vs `clientWidth 668` on the edit dialog at desktop width and `361` vs `355` at 390, with a visible horizontal bar at the bottom of the edit and layout dialogs. The grips now sit flush on the inner edge (`right-0`, `left-0`, `top-0`, `bottom-0`), so the hit area still covers the border but nothing overflows. Verified: `scrollWidth === clientWidth` on the edit dialog at 390 (355/355) and 1440 (568/568) and on the layout board at 1440 (968/968) and 390 (355/355); dragging the right grip still resizes (686 → 792 px), and the width is still persisted.
* **Edit-bookmark's flags cell overflowed its column.** The *Link Health Status* / flags row was a fixed `grid-cols-2`; at 390 the right cell had ~160 px while *Favorite* + *Archived* need ~166, so *Archived* was cut and the dialog scrolled sideways. That grid is now `grid-cols-1 sm:grid-cols-2` and the flags cell `flex flex-wrap items-center gap-x-4 gap-y-2 sm:pt-5`, so phones stack the two controls and desktop keeps the previous single row (measured at 1440: select top 742, flags top 747 — the same `pt-5` alignment as before).
* **The preview-image header wraps on phones.** `Site Preview Image` was squeezed onto two lines beside *Scrape Again*/*Upload* at 390; the header is now `flex-wrap justify-between gap-2`, so the label takes its own line and the two buttons sit beneath it, while desktop is unchanged.
* **Auth modal rendered for the first time.** 448 × 531 at 1280 and 367 × 567 at 390, both inside the viewport with 0 clipped children and 0 document overflow — Sign In / Sign Up segments, Google/GitHub, username + password with show-password toggle and the Supabase storage note all legible at phone width.
* **Layout board at 390.** 367 × 760 (bottom 802 of 844), footer wraps to two rows (*Reset Defaults* / *Set as Default* / *Presets Hub*, then *Cancel* / *Apply Layout*), no horizontal scroll after the handle fix.
* **The share dialog's link field collapsed on phones.** `Public Web Link` shared one non-wrapping row with *Copy Link* (and *Revoke* once a link exists), and the read-only input's `flex-1` let it shrink to a sliver — about 30 px at 390, so the link was unreadable. The row is now `flex-col` below `sm` (input `w-full min-w-0`, `sm:flex-1`), giving the field the dialog width (measured 315 px of 319 available) with the button beneath it; desktop keeps the inline 239 px field + button. `scrollWidth === clientWidth` at both widths, dialog 367 × 489 at 390.
* **Smart Auto-Routing Rules squeezed its header and form.** Same two patterns: the title shared one row with the format controls, and the rule form kept the type select and pattern field side by side, so at 390 the text field was reduced to a sliver. The header now wraps (`flex-wrap`), and the rule row stacks below `sm` (both controls `w-full`, input `sm:flex-1`), leaving desktop untouched at 540 × 449 with its 87 px select and 393 px field. At 390 the dialog is 367 × 505 with two full-width 315 px controls, `scrollWidth === clientWidth`.
* **The collection editor's header squeezed its description.** Below `sm` the title block shared a row with the format controls, so the lede wrapped into a ~195 px column. The header is now `flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between`; at 390 the description takes 251 px on two lines and the controls drop underneath, while desktop is unchanged (dialog 500 × 356, description 282 px).


Depth pass over the modal interiors and the remaining motion/colour debris.

### Session 13 — clipping-aware sweep at 390 and 768

The session-10 sweep only measured `document.scrollWidth`, which is 0 even when a card clips its own children — the exact way the status filter hid *Archived* in session 12. This pass measured every element inside `main`: an element counts as clipped when its right edge passes the viewport and it has no `overflow-x` ancestor to scroll it.

* **390, 14 views:** Home, All sites, Favorites, Recently visited, Smart collections, Tab sessions, Shared, Folder collections, Visuals, Knowledge graph, Archive, Recycle bin, Feedback, Profile — 0 clipped elements, 0 document overflow in each.
* **768, 11 views:** the same set minus Favorites/Recently visited/Archive — 0 clipped elements, 0 document overflow in each. The 720 px table lives in its intended scroller there and is excluded by the rule, matching the session-10 decision.
* **Overlays at 768:** add-bookmark 540 × 457 (bottom 740 of 1024) and the presets hub 700 × 642 (bottom 833) both fit; no section of either lands off-screen.

No code changes were needed for this block; the measurements are the deliverable.

### Session 12 — the search status filter wrapped at phone width

**Evidence:** `docs/screenshots/ui-v2/search-status-390.png` (fixed), `search-status-1280.png` (desktop unchanged), `search-presets-390.png`.

* **Defect found by measurement.** On the results view at 390 the Status segmented control was one 340 px row starting at x 79, so it ended at 419 and the *Archived* segment was clipped by the card. The row's label was a fixed `w-16`, which left the control too little room to sit on its own line, and the control itself could not wrap.
* **Fix.** The label is now `w-auto sm:w-16` and the control is `flex max-w-full flex-wrap`, so below `sm` it breaks onto its own rows inside the card. Measured after the fix: control 270 × 58 (two rows), *Archived* fully visible, 0 elements past the viewport edge, 0 document overflow.
* **Desktop unchanged.** At 1280 the label is back to 64 px and the control is a single 416 × 30 row of all five options, 0 overflow.
* **Presets strip checked too.** The saved-search chips wrap inside the 300 px card at 390 (bar 300 × 56, scrollWidth = clientWidth, first chip 210 px ending at 354), so they neither clip nor overlap the *Presets:* eyebrow.

### Session 11 — overlay and light-theme parity at phone width

**Evidence:** `docs/screenshots/ui-v2/light-phone-390.png`, `light-drawer-390.png`, `light-add-bookmark-390.png`, `search-results-390.png`.

* **Every overlay fits a 390 px viewport.** Import/export 367 × 703, API key 367 × 481, browser extension 367 × 760, stash tabs 367 × 449, keyboard shortcuts 367 × 760, presets hub 367 × 760, plus the site-preview dialog, the accent and icon pickers and the command palette: all sit inside the viewport with `right ≤ 390`, `bottom ≤ 844` and no horizontal scrolling of the dialog or the document.
* **Light theme reaches the phone shell.** With `html.light` at 390 the drawer is `rgb(242, 240, 234)` and the add-bookmark dialog is `rgb(255, 254, 251)` at 367 × 493, both with 0 document overflow, so the paper palette survives the new overlay layer rather than inheriting the dark scrim colours.
* **One no-op hover fixed.** The dicebear *Apply Avatar* button was `bg-primary hover:bg-primary … text-white` (hover changed nothing and the label ignored the theme's primary foreground); it is now `hover:bg-primary/90` with `text-primary-foreground`. The remaining `text-white` usages sit on emerald/rose/amber fills where they are the correct contrast colour.
* **Search results rendered for the first time.** `⌘K` → type → `Enter` at 390 opens the results view: *Search results* masthead, `2 matches`, 0 document overflow. The *Folder collections* index was rendered at 390 in the same pass (*Folder collections* masthead, 0 overflow); opening an individual folder page was not reached through the guest UI.
* **Source re-audit after the phone changes:** 0 arbitrary `text-[Npx]`, 0 `py-0.2`, 0 `transition-all`, 0 `scrollbar-thin`, 0 `animate-in` outside the chart directories.

### Session 10 — the phone shell and the 390 sweep

**Evidence:** `docs/screenshots/ui-v2/table-390.png`, `drawer-390.png`.

* **The sidebar is an off-canvas drawer below `lg`.** On a phone the expanded 260 px sidebar was a flex column, so the workspace was left with roughly 120 px: metric cards clipped, table columns reduced to slivers, toolbar labels cut off. Below 1024 px the sidebar now opens on its 48 px icon rail, and expanding it renders a `fixed` 260 px drawer (`z-50`, `shadow-overlay`) above the workspace with a `bg-foreground/25` scrim. It closes on scrim click, `Escape` or after choosing a view. Main content measures 342 px at 390 (was ~120) and stays full width while the drawer is open.
* **That drawer state is deliberately local.** An earlier iteration reused the persisted collapse toggle, which silently rewrote the desktop preference — 1280 then reopened on the rail. The phone drawer now keeps its own `phoneExpanded` state; opening it on a phone leaves the desktop cookie untouched (checked: cookie stayed `false` while the drawer was open).
* **The table is legible at touch width.** `table-fixed` with percentage columns squeezed eight columns into 298 px. Below `lg` the table keeps a 720 px minimum inside its existing `overflow-x-auto` scroller, so the columns read normally and the page itself no longer scrolls sideways; from 1024 up it is still `w-full` with `scrollWidth === clientWidth`.
* **The folder visual-intelligence header wraps on phones.** The *All Sites Visual Intelligence & Tabs* header was one non-wrapping row with a 916 px min-content, so the card was clipped and the whole main column scrolled horizontally. It now wraps (`flex-wrap`, right group `justify-end`): 300 px wide at 390 with `main.scrollWidth === main.clientWidth`, and still a single 946 × 49 row at 1280.
* **390 sweep of views that had never been rendered.** Smart collections, Tab sessions & stash, Shared collections, Folder collections, Recycle bin, Feedback, Profile & settings and Visual builder & charts were opened through the drawer at 390. Each renders its `h1`, reports `scrollWidth === innerWidth`, has nothing positioned past the viewport, and the drawer closes after navigation.

### Session 9 — drag-and-drop feedback and the AI panel

**Evidence:** `docs/screenshots/ui-v2/board-drop-target.png` (target column outlined mid-drag), `add-bookmark-ai-1280.png`.

* **Board view now shows where a card will land.** Dragging a card over a kanban column previously did nothing visible until the drop landed; the column now takes `border-primary bg-primary/5 ring-1 ring-primary/40` while a bookmark drag is over it, matching the folder tree's existing `ring-primary` indicator, and the state clears on dragleave and on drop. Observed in the production build: mid-drag the target column carried those classes, and after `mouseup` the highlight was gone.
* **Board drop moved the wrong rows.** `handleBulkMove` only ever read the table's checkbox selection, so dragging a card that was not selected sent `ids: []` to `/api/bookmarks/bulk` and nothing moved. It now accepts an explicit id list and the board's drop handler passes the ids parsed from the drag payload (one card, or a multi-row drag started from the table). Table-driven bulk moves keep reading the selection as before.
* **Add-bookmark AI panel checked, not rewritten.** At 1280 the dialog is 540 × 457 with the quota bar (*AI Autotagging: 30 of 30 uses left today*), *Add Key* link, URL field, destination folder select, comma-separated tag field and seven neutral `+tag` suggestion chips; `scrollWidth - innerWidth === 0`. The panel already inherited the token system, so no code change was needed.

* **Site-preview modal body rebuilt** (`components/modals/site-preview-modal.tsx`). The cover-style switcher was duplicated three times (one block per cover style) with `bg-black/75 backdrop-blur-md` glass; it is now a single `CoverStyleSwitcher` component on an opaque `bg-card` segmented surface with `aria-pressed`, so the control renders identically and stays legible over any snapshot. The two `bg-gradient-to-t from-black/60 …` image scrims became flat `bg-black/45` bands, the bottom chips lost `backdrop-blur-xs`, the monogram tile lost its blur, the `text-indigo-400` empty-state icon moved to `text-muted-foreground`, the Overview/Notes tabs moved from primary-filled pills to the shared token segment, the footer's `bg-primary hover:bg-primary` (no hover feedback) and `text-white` were fixed, and the body scroll region uses `mk-scroll`.
* **Stash-tabs, import/export, library-cleanup modals.** Cleanup wizard's four issue filters became one token segment (`bg-card` active) instead of four primary-filled pills; its list scroll region uses `mk-scroll`; the indigo empty-folder tile is now `bg-secondary`. Import/export's purple Notion-Toggle and indigo Obsidian-Canvas export chips joined the other seven on the neutral token chip.
* **Dead animation utilities removed.** `tailwindcss-animate` is not a dependency, so all 42 `animate-in … fade-in/zoom-in/slide-in-from-*` class strings across 26 files were inert. They now use the existing `mk-fade-in` keyframe (already reduced-motion safe through the global media query). No element gained or lost a feature; the entrance fades now actually run.
* **Non-existent utilities removed.** `scrollbar-thin` (3, requires an uninstalled plugin) → `mk-scroll`; `rounded-xs`/`py-0.2` type leftovers were already gone. `scrollbar-*`, `bg-gradient-*`, `hover:scale`, `backdrop-blur`, `animate-in`, arbitrary `text-[Npx]` and `transition-all` are now zero outside `components/viz`, `components/graph` and the unused `network-graph.tsx`.
* **Motion narrowed.** Every hover on a card, row or tile moved from `transition-all` to `transition-colors`; progress bars use `transition-[width,background-color]`; the home spectrum nodes use `transition-[stroke-width]`. Non-live `animate-pulse` removed from the widget HUD dot and the API-key status dot.
* **Colour de-raining.** Tab-reference badges (`T1…T4`) in the preset hub, the widget HUD and the visual builder collapsed from emerald/cyan/blue/purple to one mono chip. The API-key modal header moved from a blue→indigo gradient with white text to a `bg-secondary/60` token band. Feedback statuses reduced to neutral / amber (review) / primary (processing) / emerald (fixed) using alpha tints that work in both themes. Archive/section hover hovers that were purple are now neutral; the storage progress bar no longer hardcodes `bg-blue-500`; search-result selection and session/avatar tiles use `bg-primary/10`.
* **Skeleton shimmer gradient kept** — it is the animated mask of the shared `Skeleton` primitive, not decoration.

### Session 8 — studio chrome and the last colour rain

**Evidence:** `docs/screenshots/ui-v2/add-bookmark-1280.png`, `add-bookmark-390.png`, `view-visuals-1280.png`, `view-graph-1280.png`, `visual-builder-1280.png`, `home-1280.png`.

* **Studio panels no longer tint their own chrome.** The three studio boxes each carried a signature hue for *their own controls* (intelligence = purple, plot = cyan, sites matrix = emerald): active category tab, selected variation label, *Pin Home* / *+ Folder* icons and the confirm button. All of those now use `bg-primary text-primary-foreground`, `text-primary` or `text-muted-foreground` like the rest of the app. The studio **chart series colours are untouched** — those are user-chosen palettes, not chrome.
* **Health tiles use the semantic token.** The intelligence studio's *Broken / Error* tile and bar were hardcoded rose; they now use `destructive`, matching every other error surface, and the oversized `font-black` numbers became `font-semibold`.
* **One chip for all four studio tabs.** *Try Studio Unit* was emerald on T1, cyan on T2, blue on T3 and purple on T4 — four tints for the same action in one modal. It is now one primary-tinted outline chip with a primary icon on every tab.
* **Home widget icons de-rained.** The widget header icons used five hues (pink, amber, purple, emerald, teal) plus primary for two more kinds. All thirteen now use `text-muted-foreground`; the star widget keeps amber because that colour carries meaning (favourite), not identity.
* **Stray accents removed:** the selected tag chip in search results was `bg-indigo-500` (now primary), the sidebar's knowledge-graph icon was `text-indigo-400` (now inherits the row colour like every sibling), the browser-extension shortcut icon was purple, and the *Pin Home* icons in the classic-charts and sites-matrix studios plus the visuals page tag icon were cyan/pink. All are muted now, so `components/viz` contains **zero** purple/violet/indigo/pink/cyan/sky accent classes.

**Browser verification (production build, guest session).**

| Surface | Result |
| :--- | :--- |
| Add-bookmark modal @1280 | 620 × 457, AI autotagging bar, URL row, folder select, tag suggestions, optional section — no document overflow |
| Add-bookmark modal @390 | 367 × 511, stacked form, `document.scrollWidth === innerWidth`, body scrolls inside the dialog |
| Visuals page | Reached through the sidebar (*Visuals & Analytics*); h1 *Visuals & plot intelligence*, studio tabs and control grid on tokens, no overflow |
| Knowledge graph | Reached through the sidebar; HUD, filters, styling panel all on tokens, 47 SVG nodes rendered (0 graph nodes in guest mode — the graph API is auth-scoped) |
| Visual builder modal | 720 × 630, T1–T4 tabs, width/scale controls, *Try Studio Unit* on the unified primary chip |
| Home widget grid | 13 widget icons muted, one amber favourite star, no document overflow |

**Finding, not a change:** a cold load with `?view=visuals` or `?view=insights` renders the *All sites* workspace rather than that page — only sidebar clicks switch the workspace view. Deep-linkable views would be a behavioural change, so navigation was left exactly as it was.

### Session 7 — table composition, keyboard and light theme

**Evidence:** `docs/screenshots/ui-v2/table-1280.png`, `table-light-1280.png`, `table-1024.png`, `view-visuals-1280.png`, `view-insights-1280.png`, `view-profile-1280.png`.

* **Bookmark table rebuilt on a fixed column grid.** The 11-column table previously sized itself from content and overflowed its 1146 px pane by ~300 px at 1280, so *Added* sat off-screen behind a horizontal scrollbar and tag chips wrapped onto three lines (88 px rows). The table is now `table-fixed` with percentage column widths (`TABLE_COLUMN_WIDTHS`), so all enabled columns stay inside the card: measured `scrollWidth === clientWidth` at 1024, 1280 and 1440, no clipped header labels, and rows are a single 41 px line. Nothing is hidden from the table — the Columns menu still drives visibility and every value is still rendered.
* **Row content made legible at column width.** Tags show the first tag in full plus a `+N` count with the complete tag list in the cell's `title` (three chips had degraded to `#fron…`, `#…`, `#…`); *Added* now prints the date and keeps the exact timestamp in a tooltip; folder and health badges truncate with `min-w-0` and carry explanatory tooltips rather than clipping mid-word.
* **Header copy tightened** — *Parent Folder* → *Folder*, *Last Clicked* → *Last visit* — and the sort arrows are hidden below `xl`, where they alone were costing the width that pushed headers into ellipsis. Sorting is unchanged (the whole header is still the button).
* **Light theme rendered and checked** for the first time: `documentElement.class === "light"` with the warm paper background, and the table, metric strip, toolbar and badges all read correctly on it (`table-light-1280.png`).
* **Keyboard walkthrough performed.** `Ctrl+K` opens the command palette (its `ESC` hint and action list render), `Escape` closes it; the *Add bookmark* dialog opens with `role="dialog"` and closes on `Escape`; `Tab` moves focus to the avatar/menu buttons and the next stop, so the focus order is live.
* **Non-home views confirmed rendering** at 1280: *Library insights*, *Profile & settings* and the visuals shell all mount with their mastheads, with no document overflow and no runtime-error text.
* **Real Supabase still not connected.** This restored workspace contains only `.env.example`; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are absent, so the preview runs against the seeded demo data. Wiring a real project needs those three values added as project secrets, then a rebuild (the `NEXT_PUBLIC_*` values are baked at build time) and a server restart.

### Session 6 — first real browser verification

Previous sessions could not render the app. This one could: the Cloud browser reached the dev server on its preview origin, so the redesign was finally looked at.

**Evidence** (guest mode, seeded demo data): `docs/screenshots/ui-v2/home-1280.png`, `home-1024.png`, `home-768.png`, `home-390.png`.

* **The page renders and composes correctly.** Masthead, metric strip, search field, widget grid and sidebar rail all draw on the token palette; at 390 px the viewport stacks the metric strip into 2×2, wraps the masthead actions and the document has no horizontal overflow (`scrollWidth === innerWidth === 390`).
* **Defect found and fixed — activity heatmap.** In a full-width card at 1280 the heatmap used fixed 10 px cells, so it ended around two-thirds of the card width and left a large dead area, while the empty-day cells (`bg-secondary/70` on `bg-card`) were nearly invisible in dark mode. Its month labels were also laid out with `min-width` and a guessed 11 px gap, so they drifted away from the week columns. The grid now stretches (`flex-1` weeks, `aspect-square` cells) to fill the card at any width, falls back to a 460 px scrollable row below `sm`, has visible empty cells (`bg-secondary` + `border-border`), and positions month labels by column percentage so they track their weeks.
* **Defect found and fixed — widget grid at tablet width.** The home widget grid switched to its 12-column layout at `md`, so at 768 px two widgets shared ~330 px each: the scratchpad tab strip overflowed with its own scrollbar and the Quick Access items clipped mid-title. The 12-column layout and every widget span now start at `lg`; below that widgets stack full width (662 px at 768) with nothing clipped.
* **Console is clean.** The only messages are environment noise: HMR websocket 502s through the preview proxy, `manifest.webmanifest` 403 from the proxy, and CSP *report-only* inline-script notices from Next's dev runtime. No React errors, no failed app chunks.
* **What could not be exercised.** Sidebar navigation did not change the view in guest mode — clicking *All Sites* or *Visuals & Analytics* left the home masthead in place — so table, insights, visuals, sessions and profile were still verified only by compilation, HTTP 200 and the greps above. No visual claim is made for them. Light mode was not reached either: the theme toggle lives behind a menu this guest session does not expose.

### Session 4

* **Universal colour picker finished.** The harmonic-column swatches no longer scale on hover (they could overlap their neighbours); they now lift with a ring, and the same treatment replaced scale effects on the gradient presets and recent-colour dots. Column cards moved to `rounded-lg` with `hover:border-border-strong`. Zero `hover:scale` remains in the picker.
* **Universal icon picker.** The tile hover no longer scales; it uses `hover:bg-accent`, matching table rows and menu items.
* **Invalid utilities removed app-wide.** `py-0.2` (not a Tailwind step) appeared in 8 places across the dashboard widget, feedback, visual dashboard, preset hub and others — all now `py-0.5`. `text-[9px]` (2) became `text-3xs`.
* **Hover-scale sweep.** Interactive swatches in `color-palette-generator`, `viz-builder-dialog` and the bookmark row's icon button moved from `scale-105/110` to ring or colour feedback. Three subtle 105–110 % image hovers remain on decorative thumbnails only, which is within the direction's guidance.
* **Preset hub.** Preset cards lost the decorative `hover:border-primary/40` in favour of `hover:border-border-strong`, so hover emphasis is neutral rather than coloured.

### Session 3

* **Typography consolidation (app-wide codemod).** 433 arbitrary sizes replaced with the scale: `text-[10px]` → `text-3xs` (208) and `text-[11px]` → `text-2xs` (225). `font-bold` → `font-semibold` in every UI surface outside `components/viz` and `components/graph`, where bold axis/label weights are deliberate. Zero arbitrary `text-[Npx]` values remain.
* **Dark-mode defects fixed.** The icon picker rendered white tiles and white segmented buttons in dark mode (`bg-white`, `hover:bg-blue-50/50`, `ring-blue-400`); the API-key modal used white inputs and a blurred white tile; the site-preview active toggle was hardcoded white-on-black; the edit-bookmark image preview sat on `bg-white`. All now use `bg-card`/`bg-background`/`bg-secondary`, `border-border-strong`, `ring-ring` and `bg-foreground text-background`.
* **Loading states rebuilt.** Recycle bin and profile previously animated a whole-page `animate-pulse` block. Both now compose the `Skeleton` primitive into the real layout (list rows, masthead, card grid), with `aria-hidden` shimmer from the shared primitive; the recycle-bin row skeleton hides its action cluster below `sm`.
* **Hardcoded hex removed** from the recycle-bin empty state (`dark:bg-[#161616]/40`, `dark:bg-[#222]`).
* **Dialog accessibility.** `copy-folder-modal`, `move-folder-modal`, `copy-bookmark-modal` and the visuals export modal had no keyboard dismissal and no dialog semantics. Each now closes on `Escape`, exposes `role="dialog"`, `aria-modal="true"` and an accessible name, and uses the shared 140 ms fade that respects reduced motion.
* **Responsive hardening.** `main` gained `min-w-0` so long table/graph content can no longer push the sidebar. Add-bookmark's header now wraps instead of colliding with the format controls, its dialog uses `p-4 sm:p-5`, and the dialog body scrolls with `mk-scroll`. Remaining `scrollbar-none` and `drop-shadow-surface` usages eliminated.
* **Still-unused utilities removed from source**: `scrollbar-none` (9), `drop-shadow-surface` (2).

### Session 2

* **Search** — replaced the card-with-icon header with a masthead (eyebrow, 24px title, mono match count, lede), 44px query field on the shared `Input` primitive, `mk-scroll-x` preset rail.
* **Smart collections** — masthead, neutral empty state, fixed double-padding on the search field, list panel scroll containment.
* **Shared links** — removed a nested `overflow-y-auto` + duplicated padding + `max-w` wrapper that fought the main scroll container; 3-up metric strip in one bordered panel instead of three cards; removed the non-live `animate-pulse` status dot; token `select` styling.
* **Domain insights** — masthead with eyebrow/lede, mono-hosted title, segment control on token surfaces; removed its own `overflow-y-auto` (same nested-scroll defect).
* **Sessions** — masthead, removed rounded-pill badge cluster, empty state on neutral surfaces, hover border on session cards.
* **Library insights** — masthead with the 8-tab segmented control moved onto token surfaces; KPI numbers switched from bold to mono/semibold with tracking.
* **Profile** — masthead split from content, card surface tokenised (`bg-card`, `rounded-xl`).
* **Recycle bin** — removed `bg-secondary dark:bg-[#161616]/90 backdrop-blur-md` sticky header (glass + hardcoded hex) in favour of an opaque token header; masthead with item count; scroll containment.
* **Feedback** — masthead, admin badge moved to `Badge` tokens, segmented control on tokens.
* **Visuals** — masthead replacing the "Master Brain" badge banner; shorter, calmer copy; toast restyled to foreground/background with `shadow-overlay`.
* **Public share page** — token hero card, `mk-eyebrow` label, mono link count, calmer import button.
* **Block G overlays** — folder-tree-select dropdown, dashboard widget menus (3), bulk action bar menus (2), folder analytics menu, site-preview copy menu all moved to `.mk-menu`; universal colour/icon picker popovers de-glassed (`bg-card/95 backdrop-blur-md` → `bg-popover`), swatch scale-hover replaced with ring feedback, invalid `drop-shadow-surface` fixed; modal format controls de-glassed and de-fluffed; graph HUD overlays opaque; copy-bookmark and visuals overlays use the flat scrim.
* **Block H** — header action group is reachable on phones again (it had been hidden below `sm`); extension/stash/presets collapse progressively at `md`/`lg`. Added `aria-label`/`aria-expanded` to theme toggle, sidebar collapse, folder expand-all, add-folder and tree chevrons.

## 3. Coverage checklist

Legend: ✅ modernized · ◐ tokens/typography applied, interior composition pending · ⬜ untouched

| Area | Status |
| :--- | :---: |
| Global tokens, both themes, accent variants, chart tokens | ✅ |
| Typography system (Inter + JetBrains Mono, single scale) | ✅ |
| Scrollbars: global, sidebar, tree, table, menus, dialogs, insights lists, sessions | ✅ |
| Buttons, inputs, badges, skeletons, labels | ✅ |
| Dialogs: shell, scrim, focus restore, scroll lock, close primitive | ✅ |
| Custom modals: Escape, `role="dialog"`, `aria-modal`, motion-safe fades | ✅ |
| Context menus: folder tree, table, user, widget, bulk bar, analytics, site preview | ✅ |
| Command palette | ✅ |
| Auth modal | ✅ |
| Home masthead / metrics / search / empty state | ✅ |
| Bookmark table + all 5 view modes + toolbar menus | ✅ |
| Collections directory | ✅ |
| Folder page panel | ✅ |
| Sidebar nav, folder tree, breadcrumbs | ✅ |
| Search results | ✅ |
| Smart collections | ✅ |
| Shared links | ✅ |
| Sessions / stash | ✅ |
| Library insights | ✅ |
| Domain insights | ✅ |
| Visuals page shell | ✅ |
| Knowledge graph page + HUD | ✅ |
| Profile | ✅ |
| Recycle bin | ✅ |
| Feedback | ✅ |
| Public share page | ✅ |
| Universal colour picker | ✅ Palette, harmonic columns and HSL tabs on the shared rhythm |
| Universal icon picker | ✅ Grid, segmented mode switch and light/dark surfaces corrected |
| Universal identity picker / preset hub | ✅ Cards, empty state and hover emphasis normalised |
| Edit-bookmark modal | ✅ Rendered at 390 and 1440 (session 14): flags stack on phones, preview header wraps, no stray scrollbar |
| Auth modal | ✅ Rendered at 1280 and 390 (session 14), 0 clipped content |
| Home layout board modal | ✅ Rendered at 1440 and 390 (session 14), no horizontal scroll |
| Share-collection modal | ✅ Rendered at 1440 and 390 (session 14): link field full width on phones |
| Edit-collection modal | ✅ Rendered at 1440 and 390 (session 14): header stacks, no squeezed copy |
| Smart auto-routing modal | ✅ Rendered at 1440 and 390 (session 14): header wraps, rule form stacks |
| Add-bookmark modal | ✅ Rendered at 1280 and 390 (session 8): header wraps, AI autotagging bar, URL row, folder select, tag suggestions and optional section all legible with no overflow. AI suggestion panel re-checked at 1280 (session 9) |
| Site-preview modal | ✅ Body rebuilt on token surfaces; cover switcher de-duplicated |
| API-key modal | ✅ Gradient header replaced with token band; status dot static |
| Import/export modal | ✅ All nine export chips on one neutral token style |
| Library cleanup wizard | ✅ Token segment filters, scroll region, neutral tiles |
| Stash tabs modal | ✅ Token surfaces; scroll region |
| Dead utilities (`animate-in`, `scrollbar-thin`) | ✅ Zero remaining |
| Visual studio builder panels | ✅ Chrome on primary/muted tokens (session 8); chart series colours stay per-palette by design |
| Drag-and-drop affordances (bookmarks, folders) | ✅ Board column highlight observed with a real pointer drag; folder-tree `ring-primary`/`bg-primary/10` indicator observed on dragover and cleared on dragleave; drag payload carries the bookmark ids (session 9) |
| Activity heatmap (365-day) | ✅ Fills its card, visible empty cells, month labels aligned to week columns |
| Responsive composition at 320/360/390/768/1024/1280 | ✅ 320 and 360 added in session 16 (header action group steps down below `sm`, nothing clipped); 390/768/1024/1280 sampled earlier, all without document overflow: no document overflow at any width, masthead/metrics stack, widgets stack below `lg` and share columns above it. Session 10 added the phone drawer and removed the last horizontal page scroll at 390 |
| Phone navigation (sidebar below `lg`) | ✅ 48 px rail on load, 260 px overlay drawer with scrim, closes on scrim/`Escape`/navigation, desktop preference unchanged. Session 15 moved the drawer to `z-[45]` so dialogs opened from it are not hidden |
| Folder dialogs (add / move / copy / delete / customize) | ✅ Rendered at 390 and 1440 (session 15), all fully visible above the drawer |
| Copy-bookmark dialog | ✅ Rendered at 390 (session 15) |
| New smart collection dialog | ✅ Rendered at 390 (session 15) |
| Bookmark table column grid / row rhythm | ✅ Fixed percentage grid; one-line 41 px rows; no horizontal scroll at 1024/1280/1440. Below `lg` the table keeps a 720 px minimum inside its own scroller |
| Keyboard-only walkthrough | ✅ `Ctrl+K` palette open/close, dialog `Escape` dismissal, `Tab` focus traversal (guest session) |
| Light theme render | ✅ `html.light` captured at 1280 with the table, metrics and toolbar; phone-width light pass in session 11 (drawer 242,240,234 · dialog 255,254,251 · 0 overflow); folder dialogs checked in light at 390 and desktop in session 16 |

## 4. Verification

| Check | Result |
| :--- | :--- |
| `npx tsc --noEmit` | **Pass** (exit 0 after every batch, including session 14) |
| `npm run build` | **Pass** (exit 0 after every batch, including session 14; placeholder Supabase env required only because `/_not-found` prerender needs it) |
| Auth modal (session 14) | **Performed** — 448 × 531 @1280 and 367 × 567 @390, 0 clipped children, 0 document overflow |
| Edit-bookmark dialog (session 14) | **Performed** — `scrollWidth === clientWidth` at 390 (355/355) and 1440 (568/568); flags stack below `sm` and stay on one row at 1440; resize grip drags 686 → 792 px |
| Layout board (session 14) | **Performed** — 968/968 at 1440 and 355/355 at 390; footer wraps, fits 390 × 844 |
| Share-collection dialog (session 14) | **Performed** — 540 × 431 at 1440 and 367 × 489 at 390; link field 315 px at 390 with Copy Link beneath; 0 overflow |
| Edit-collection dialog (session 14) | **Performed** — 500 × 356 at 1440 and 367 × 416 at 390; header stacks on phones, description width 251 px; 0 overflow |
| Smart auto-routing dialog (session 14) | **Performed** — 540 × 449 at 1440 (87 px select, 393 px input) and 367 × 505 at 390 (two 315 px controls); 0 overflow |
| Folder dialogs (session 15) | **Performed** — add 367 × 304, move 358 × 382, copy 358 × 520, delete 306 wide with both option cards and footer visible, customize 358 × 472 at 390, all `scrollWidth === clientWidth` and fully on top of the drawer |
| Drawer stacking (session 15) | **Performed** — drawer `z-[45]` still covers the header (probe at 10,10 inside the drawer) while a dialog's scrim intercepts input over it |
| Copy-bookmark dialog (session 15) | **Performed** — 358 × 510 at 390, 0 overflow |
| New smart collection dialog (session 15) | **Performed** — 367 × 681 at 390 with presets, preview and footer visible; 0 overflow |
| Folder dialogs in light theme (session 16) | **Performed** — delete panel 358 × 383 at 390 on `rgb(255,254,251)` with `rgb(27,26,23)` text and 346/346 scroll width; copy dialog rendered at desktop on the same surfaces |
| Narrow phones 320/360 (session 16) | **Performed** — header group 230/245/256 px at 320/360/390 with *Sign in* fully visible; 0 clipped elements in `main`; add-bookmark 301 × 529 and 338 × 511; 14-view sweep at 320 with 0 clipped elements and no document overflow |
| Dev server routes | `/`, `?view=` all, insights, search, profile, trash, visuals, feedback → **all 200**, 0 error lines in `/tmp/markly-dev.log` after the session-5 changes |
| Slop greps (non-`viz`/`graph`) | `transition-all` 0 · `hover:scale` 0 · `backdrop-blur` 0 · `scrollbar-thin` 0 · `animate-in` 0 · arbitrary `text-[Npx]` 0 · `animate-pulse` 1 (add-bookmark skeleton) · `bg-gradient-to` 1 (skeleton shimmer) |
| Compiled CSS contains new primitives | **Verified** earlier via the emitted stylesheet (`mk-eyebrow`, `mk-menu`, `text-2xs`, `shadow-surface`, scrollbar tokens, `mk-page-title`) |
| `npm run lint` | **Cannot run** — `next lint` removed in Next 16 (upstream script broken) |
| Browser render (session 6) | **Performed** on the Cloud preview origin at 1280 and 390: home renders on the token palette, stacks correctly at 390, `scrollWidth === 390`; screenshots in `docs/screenshots/ui-v2/`. Console free of app errors (only proxy HMR 502s, manifest 403 and report-only CSP notices). |
| Per-view visual checks (table, insights, visuals, profile) | **Not performed** — guest-mode sidebar clicks do not change the view, so those screens were only compiled and HTTP-checked. No visual claims are made for them. |
| Light theme render | **Performed in session 7** — toggle reached via its `aria-label`, `html.light` confirmed, screenshot captured. |
| Bookmark table fit (session 7) | **Performed** — `scrollWidth === clientWidth` at 1024/1280/1440, 0 clipped header labels, 41 px rows, `document.scrollWidth === innerWidth` |
| Keyboard walkthrough (session 7) | **Performed** — palette, dialog dismissal and tab order all exercised in the production build |
| Studio chrome / widget icons (session 8) | **Verified by grep and render** — 0 purple/violet/indigo/pink/cyan/sky/rose chrome classes left in `components/viz`, 0 multi-hue widget icons; visuals, graph and builder rendered in the browser |
| Drag-and-drop affordance (session 9) | **Performed in the production build** — dragging a card over a board column applied `ring-primary` + `bg-primary/5`, and the highlight cleared on drop; the drop handler now passes the dragged ids to the bulk move |
| Add-bookmark AI panel (session 9) | **Performed** — 540 × 457 at 1280, quota bar and tag suggestions on tokens, 0 document overflow |
| Phone shell (session 10) | **Performed** — at 390 the rail is 48 px and main 342 px; the expanded drawer is `fixed`, 260 px, `z-50` with a scrim, and closes on navigation; at 768 the rail/main split is 48/720; at 1280 the sidebar is unchanged at 260 px with a 1020 px main |
| 390 view sweep (session 10) | **Performed** — Smart collections, Tab sessions, Shared collections, Folder collections, Recycle bin, Feedback, Profile and Visual builder each render with an `h1` and 0 overflow at 390 |
| Clipped-content sweep (session 13) | **Performed** — 14 views at 390 and 11 at 768 with 0 elements past the viewport outside scrollers |
| Search facet filters at 390 (session 12) | **Performed** — Status control wraps to 270×58 with *Archived* on screen; presets strip wraps with no clipping; desktop keeps one 416×30 row |
| Search results at 390 (session 11) | **Performed** — palette `Enter` navigates to the results view, *2 matches*, 0 overflow |
| Modal surfaces at 390 (session 11) | **Performed** — six dialogs, two pickers, site preview and command palette all inside the viewport with no dialog or document horizontal scroll |
| Real Supabase data | **Not performed** — no credentials in the workspace; preview runs on seeded demo data |

## 5. Issues found and fixed

1. **Nested scroll containers** in `shared-links-view` and `domain-insights-view` (both added their own `overflow-y-auto` + padding inside an already-scrolling main region) — removed.
2. **Non-live `animate-pulse`** on the shared-links "public status" dot — replaced with a static indicator.
3. **Glassmorphism and hardcoded hex** in the recycle-bin sticky header and several pickers/menus — replaced with token surfaces.
4. **Mobile regression from session 1**: the header action group (import/export, settings, shortcuts) was hidden below `sm` — now progressively disclosed instead.
5. Invalid utility `drop-shadow-surface` in the colour picker; `!animate-none` hacks in picker popovers.
6. Duplicate `bg-primary … shadow-surface` button class in shared-links resolved with `allowMultiple`.

## 6. Exact next task

0. **Typography/colour verification pass** — a grep-driven audit confirmed 0 arbitrary px sizes, no opaque `bg-white` surfaces (only two translucent `dark:hover:bg-white/10` hovers remain), 0 `scrollbar-none`, 0 `drop-shadow-surface`, 0 `ring-blue`. Re-run those greps after any further work.

1. **Universal pickers** — done in session 4.
2. **Large modals (depth pass)** — done in session 5 for site-preview, API key, import/export, library cleanup and stash tabs. The `add-bookmark-modal.tsx` AI-suggestion panel was checked at 1280 in session 9 and needed no rewrite.
3. **Visual studio interiors:** `viz/classic-charts-studio-box.tsx`, `observable-plot-studio-box.tsx`, `sites-matrix-studio-box.tsx`, `intelligence-systems-studio-box.tsx` — these keep per-series chart colours (user-chosen accents); only their card surfaces were normalised to `transition-colors`.
4. **Responsive + keyboard + drag-and-drop audit** — done in sessions 6, 7, 9 and 10 for 390/768/1024/1280/1440, dark and light themes, the keyboard walkthrough, the insights/profile/visuals/sessions/sharing/collections/trash/feedback views and the board's drop target. Remaining gap: **signed-in** views (the guest session shows seeded demo data), which needs a real Supabase project (see 5).
5. **Connect the real Supabase project** — add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as project secrets, rebuild, restart, then verify sign-in plus one authenticated read/write. This is the only remaining blocker and it is outside the codebase. Guest mode also leaves the knowledge graph empty (0 nodes) because `/api/graph` is session-scoped, so that surface can only be judged after sign-in.
6. **Retest** `npx tsc --noEmit` and `npm run build` after any further change.

## 7. Scope guarantees

* Untouched: `app/api/**`, `server/**`, `supabase/**`, schema, migrations, RLS, auth, persistence, API contracts, state management.
* No dependencies added or removed.
* `main` untouched; no merge, push or deploy.
