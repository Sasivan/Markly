# Complete Dither UI Catalogue — Adoption Register

## 1. Exact category counts supplied by the owner

| Category | Target count | Required delivery |
|---|---:|---|
| Overview | 1 | One live quick-start/overview entry |
| Primitives | 19 | All primitive items |
| Typography | 25 | All typography items |
| Handbook | 7 | All handbook topics |
| Examples | 32 | All example patterns |
| Components | 103 | All component items |
| Backgrounds | 49 | All background items |
| Text | 24 | All text effects |
| Animations | 50 | All animation items |
| Utils | 2 | Both utility items |
| **Total** | **312** | Reconciled manifest |

## 2. Count reconciliation rule

Current Dither UI sources surfaced while preparing this pack are not fully synchronized:
- The user's docs navigation/screenshot specifies Components 103.
- A currently indexed official site snippet has reported 102 component sections.
- The inspected GitHub `master` tree has 80 `components/examples/*.tsx` preview modules and 92 `components/*.tsx` documentation modules including 12 family docs.
- The inspected GitHub Solid public barrel has 284 `default as` exports across the kit (many are backgrounds/text/animations and not all belong to the Components docs category).

These are different counting scopes. **Do not equate public exports with documentation section counts.** At Stage 0, Antigravity must open the current live category page and crawl its individual item links using the official Vue tab. Produce a frozen `catalogue-manifest.json` with every item, canonical docs URL, category, current count, source path if available and framework variant. Record any discrepancy from the supplied 312 target. Do not fabricate a missing 103rd component.

## 3. Mandatory per-item statuses

Every item gets exactly one:
- `core-product` — used in the real Markly workflow.
- `lab-preview` — rendered as a working isolated preview in Dither Lab.
- `example-gallery` — shown as a clearly labelled isolated screen/pattern example.
- `handbook-reference` — used as implementation/design guidance.
- `not-applicable-with-reason` — only allowed if truly impossible or irrelevant; if the owner requires 100% visible use, prefer a Lab preview instead.

The user requests every item to be used. The default is therefore a real preview in Dither Lab for every item. Product usage remains selective.

Each item row should contain:
- `id`
- `name`
- `category`
- `docsUrl`
- `sourceUrl` or source file path if available
- `frameworkVariant` (`vue`, `svelte`, `solid`, `framework-agnostic`, `unknown`)
- `status`
- `marklyLocation`
- `implementationFile`
- `previewRoute`
- `interactiveChecks`
- `license`
- `notes`

## 4. Overview — 1

- Quick Start — use as the initial Dither setup and visual/engine overview. Markly should not reproduce its install instructions as a user-facing feature.

## 5. Primitives — 19

The inspected source navigation listed these primitive items:
1. Box
2. Text
3. Divider
4. VisuallyHidden
5. Svg
6. Image (plain)
7. Spacer
8. Portal
9. Overlay
10. Measure
11. Clipboard
12. ClickOutside
13. FocusRing
14. FocusScope
15. HoverArea
16. Pressable
17. InView
18. Icon
19. IconSet

Target locations: Dither Lab / Primitives; product compositions also use Box/Text/Divider/Portal/Focus/Pressable/Image/Clipboard where appropriate.

## 6. Typography — 25

The inspected source navigation listed:
1. Heading
2. Label
3. Caption
4. Overline
5. Code
6. KbdCombo
7. Blockquote
8. Highlight
9. Truncate
10. LineClamp
11. MiddleEllipsis
12. EllipsisTooltip
13. Link
14. ExternalLink
15. SelectableText
16. CopyableText
17. NumberText
18. CurrencyText
19. PercentText
20. FileSizeText
21. DurationText
22. RelativeTime
23. DateTimeText
24. PluralText
25. Emoji

Target locations: Dither Lab / Typography; relevant product use for page titles, metadata, search highlight, numeric chart data, dates, code/key hints, links and URL copy. Currency/FileSize/Duration should be shown in Lab if Markly has no real data for them; do not fabricate real values.

## 7. Handbook — 7

Use all seven as internal implementation guidance:
1. Styling
2. Composition
3. Seeds
4. Engine
5. Verification
6. Motion
7. Accessibility

Record the exact current handbook URLs from the official docs crawler.

## 8. Examples — 32

The inspected example navigation family counts:
- Auth: 3 — Sign up, Magic link, Two-factor.
- Chat: 4 — Chat thread, AI assistant, Support chat, Team channel.
- Notifications: 1 — Notification center.
- Page: 6 — Dashboard, App shell, Monitoring, Team, Usage & billing, Sign in.
- Product: 3 — Pricing, Activity feed, Changelog.
- Sidebar: 12 — Basic dashboard, Admin with profile, E-commerce filters, Documentation nav, Dual layout, Personal dashboard, Floating left, Right side, Team switcher, File tree, Mobile drawer, Icon rail.
- Stats: 2 — Stat cards, Stats with charts.
- Table: 1 — Data table.

Total: 32.

Use the examples as isolated Dither Lab demonstrations. Reuse relevant patterns in Markly (App shell, File tree, Activity, Stats, Data table, Notifications, Sign in if auth is implemented). Do not add chat, billing, team management, pricing plans or two-factor authentication to the real product unless separately requested.

## 9. Components — 103

This count must be reconciled with the live docs as explained above. The inspected public repository's component docs directory contains 80 named preview modules plus 12 family-doc modules. The component preview module names from the inspected repository tree are listed below as a source-side cross-check:

1. accordion
2. alert-dialog
3. area
4. autocomplete
5. avatar
6. badge
7. bar
8. bracket
9. breadcrumb
10. button
11. canvas
12. center-morph-modal
13. checkbox-group
14. checkbox
15. collapsible
16. combobox
17. command
18. console
19. context-menu
20. dialog
21. dither-shell
22. drawer
23. field
24. fieldset
25. form
26. gauge-2
27. gauge
28. gradient
29. grid
30. image
31. infinite-canvas
32. input
33. kbd
34. line
35. menu
36. menubar
37. meter
38. nav-menu
39. number-field
40. otp-field
41. pagination
42. pie
43. popover
44. preview-card
45. progress
46. radar
47. radio
48. rail
49. rating
50. schedule
51. scope
52. scroll-area
53. select
54. separator
55. shader
56. sidebar-group
57. sidebar-item
58. sidebar-sub
59. sidebar
60. skeleton
61. slider
62. sparkline
63. spinner
64. stepper
65. switch
66. tab-panel
67. tabs
68. textarea
69. thumbnail
70. timeline
71. toast
72. toggle-group
73. toggle
74. toolbar
75. tooltip
76. video-player
77. wheel-picker
78. world-2
79. world-3
80. world

Family documentation observed:
- Basics
- Charts
- Feedback
- Field
- Form
- Layout
- Media
- Navigation
- Overlay
- Selection
- Structure
- Surface

This source-side list is a cross-check, not a substitute for the live Vue docs. The final 103-item list must be generated from the current official docs category page and framework variant.

**Required Lab categories:** Basics, Charts, Feedback, Field, Form, Layout, Media, Navigation, Overlay, Selection, Structure, Surface. Every live item from the current Components section must have an interactive tile.

## 10. Backgrounds — 49

The inspected official source navigation lists:
1. Aurora
2. Circuit
3. Heat Trail
4. Waves
5. Line Waves
6. Threads
7. Silk
8. Plasma
9. Iridescence
10. Dot Grid
11. Ripple Grid
12. Pixel Snow
13. Beams
14. Light Rays
15. Side Rays
16. Light Pillar
17. Soft Aurora
18. Grid Motion
19. Grid Scan
20. Dot Field
21. Color Bends
22. Gradient Blinds
23. Grainient
24. Plasma Wave
25. Floating Lines
26. Flow Field
27. Radar
28. Dither
29. Letter Glitch
30. Shape Grid
31. Lightning
32. Orb
33. Prism
34. Galaxy
35. Liquid Chrome
36. Dark Veil
37. Balatro
38. Liquid Ether
39. Ballpit
40. Particles
41. Hyperspeed
42. Lightfall
43. Pixel Blast
44. Prismatic Burst
45. Evil Eye
46. Faulty Terminal
47. Ferrofluid
48. Poster

The inspected GitHub tree contains 49 background preview modules while the displayed navigation array contains 48 named labels. The extra source-side preview must be identified from the live docs route/registry during Stage 0; do not invent a name.

Every background gets a visible preview tile in Dither Lab / Backgrounds. The 49 effects should not all be used in the core app simultaneously. Each tile must support the actual available controls/seed when exposed by the kit. Use static/paused previews by default; start animation on selection or explicit play.

## 11. Text — 24

The inspected source navigation lists:
1. Gradient Text
2. Shiny Text
3. Glitch Text
4. Split Text
5. Rotating Text
6. Count Up
7. Number Flow
8. Text Type
9. Blur Text
10. Decrypted Text
11. Scramble Text
12. Shuffle
13. Falling Text
14. Scroll Reveal
15. Scroll Float
16. Scroll Velocity
17. Text Cursor
18. Text Pressure
19. Variable Proximity
20. True Focus
21. Circular Text
22. Curved Loop
23. Fuzzy Text
24. ASCII Text

All 24 need a live preview in Dither Lab / Text. Product use is restrained: display heading, selected number, visual title or hero motif. Do not animate every bookmark title, folder name, label or form field.

## 12. Animations — 50

The inspected source navigation lists:
1. Animated Content
2. Fade Content
3. Gradual Blur
4. Star Border
5. Electric Border
6. Glare Hover
7. Magnet
8. Click Spark
9. Blob Cursor
10. Crosshair
11. Ghost Cursor
12. Splash Cursor
13. Target Cursor
14. Pixel Trail
15. Image Trail
16. Meta Balls
17. Metallic Paint
18. Noise
19. Step Timing
20. Sequences
21. Container Queries
22. Stage
23. Cubes
24. Ribbons
25. Shape Blur
26. Strands
27. Laser Flow
28. Antigravity
29. Logo Loop
30. Magic Rings
31. Magnet Lines
32. Orbit Images
33. Pixel Transition
34. Dither Reveal
35. Dither Transition / Page Transition
36. Sticker Peel
37. Expand Tabs
38. Island
39. Card Stack
40. Dock
41. Preview Rail
42. Scroll Progress
43. Snap Button
44. Gooey Menu
45. Bouncy Accordion
46. Expanding Arrow
47. Slide Action
48. Hold Action
49. Wallet Card
50. Notification Stack

All 50 need a working preview in Dither Lab / Animations. Avoid global cursor takeover; cursor effects stay inside preview canvases. Respect reduced motion. Wallet/notification/hold-action examples are component demos only unless they map to an actual Markly operation.

## 13. Utils — 2

- Palette
- Print Screens

Both appear in Dither Lab / Utils and inform the Markly theme/seed/tone configuration.

## 14. Dither Lab acceptance

- All categories and category totals are visible.
- Every item has a real preview, not just a text list.
- Every preview identifies the source Dither docs item and available properties.
- Search across the catalogue works.
- Category filters work.
- Background and animation previews do not all autoplay.
- A user can open a preview in a larger stage.
- The item-level adoption manifest shows where the component is used in Markly.
- The actual totals are compared with the owner's target totals and discrepancies are documented.
