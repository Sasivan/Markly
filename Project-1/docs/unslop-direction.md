# Markly — Unslop Audit and Design Direction

> **Phase**: Prompt 1 (Audit & Direction Only — No Code Modifications)  
> **Skill**: `.agents/skills/unslop`  
> **Status**: Completed audit; pending user approval before applying changes in Prompt 2.

---

## 1. Five-Line Design Direction

* **Product**: A fast, distraction-free archival bookmark workspace for developers, writers, and researchers who organize thousands of technical references.
* **Character**: Quiet, architectural, ink-like, and exact.
* **World**: A precision archival library: graphite and warm stone surfaces, crisp black ink on off-white paper, calibrated hairline dividers, and muted linen textures.
* **Moments**: The high-contrast Knowledge Graph node cluster and the high-resolution site snapshot covers in Gallery view.
* **Signature**: Monospaced tabular catalog stamps (`#domain` pill, `84ms` latency badge, and ISO date stamps in muted tabular figures).

---

## 2. Baseline Slop Metrics Table

Re-counted across all active application files (`components/**`, `app/**`), excluding tests and the 5 explicitly ignored unused files (`components/dashboard/folder-treemap.tsx`, `activity-heatmap.tsx`, `folder-sunburst.tsx`, `network-graph.tsx`, `domain-distribution.tsx`).

| Slop Metric | User Estimate | Measured Baseline Count | Primary Hotspots |
| :--- | :---: | :---: | :--- |
| **Emoji characters in UI strings** | 93 | **94** | `icon-search-picker.tsx` (48), `bookmark-table.tsx` (8), `add-bookmark-modal.tsx` (7), `global-homepage-analytics.tsx` (3), `sidebar.tsx` (2) |
| **`transition-all`** | 54 | **57** | `visual-dashboard.tsx` (9), `recycle-bin-view.tsx` (7), `workspace-home.tsx` (6), `folder-page-panel.tsx` (4), `sidebar.tsx` (4) |
| **`uppercase`** | 23 | **22** | `global-homepage-analytics.tsx` (6), `workspace-home.tsx` (4), `bookmark-table.tsx` (3), `sidebar.tsx` (2) |
| **Arbitrary px values (e.g. `[13px]`, `[11px]`)** | 352 | **373** | `workspace-home.tsx` (33), `profile-view.tsx` (32), `bookmark-table.tsx` (29), `folder-collections-view.tsx` (24), `knowledge-graph.tsx` (24), `visual-dashboard.tsx` (23) |
| **`animate-pulse` / `animate-ping` / `animate-bounce`** | 6 | **5** | `visual-dashboard.tsx` (2), `workspace-home.tsx` (1), `global-homepage-analytics.tsx` (1), `site-preview-modal.tsx` (1) |
| **`hover:scale`** | 7 | **9** | `workspace-home.tsx` (4), `folder-collections-view.tsx` (3), `knowledge-graph.tsx` (2) |
| **Gradient classes (`bg-gradient-*`, `from-*`, `to-*`, `via-*`)** | 4 | **25** | `visual-dashboard.tsx` (8), `workspace-home.tsx` (5), `folder-collections-view.tsx` (4), `knowledge-graph.tsx` (3), `library-insights-view.tsx` (3), `app/globals.css` (2) |

---

## 3. Screen-by-Screen Slop Audit

Audit performed against `.agents/skills/unslop/references/signs.md`. Every finding is mapped directly: **[Sign from signs.md] → [File Path]**.

### Screen 1: Tokens, App Shell & Sidebar
* **Files**: `app/globals.css`, `components/sidebar/sidebar.tsx`, `components/app-header.tsx`, `components/breadcrumbs.tsx`, `components/ui/*`
* **Slop Classification**: **Heavy Slop**
* **Audit Findings**:
  - *Surfaces and color*: Multi-tinted dark background inconsistency (`#121212` vs `#181818` vs `#151515` vs `#1a1a1a`) → `app/globals.css`
  - *Surfaces and color*: Neon blue focus ring `ring-blue-600` on neutral controls → `app/globals.css:122`
  - *Surfaces and color*: Arbitrary border color overrides `border-slate-800/80` instead of unified token scale → `components/sidebar/sidebar.tsx:189`
  - *Type*: Uppercase tracked navigation section headers (`UPPERCASE TRACKING-WIDER`) → `components/sidebar/sidebar.tsx:210`
  - *Icons*: Emojis used as nav status decoration (`📁`, `📥`) → `components/sidebar/sidebar.tsx:142`
  - *Spacing*: 13 arbitrary pixel values (`h-[34px]`, `w-[240px]`, `px-[11px]`) → `components/sidebar/sidebar.tsx`
  - *Motion*: Uncontrolled `transition-all` on collapsible sidebar rows → `components/sidebar/sidebar.tsx:168`
  - *Components*: Sparkle badge `✨` on command palette activator → `components/app-header.tsx:44`

### Screen 2: Homepage & Global Analytics
* **Files**: `components/home/workspace-home.tsx`, `components/home/global-homepage-analytics.tsx`
* **Slop Classification**: **Heavy Slop**
* **Audit Findings**:
  - *Surfaces and color*: Multi-color badge rainbow (violet, emerald, amber, rose) competing with metric hierarchy → `components/home/workspace-home.tsx:145`
  - *Surfaces and color*: Radial gradient background wash behind hero metrics → `components/home/workspace-home.tsx:88`
  - *Type*: Uppercase tracked labels on cards (`UPPERCASE TRACKING-WIDER`) → `components/home/global-homepage-analytics.tsx:54`
  - *Icons*: Emoji icons in stat headings and metric pills (`📚`, `❄`, `🏷`, `✨`) → `components/home/global-homepage-analytics.tsx:72`
  - *Spacing*: 33 arbitrary pixel values (`h-[18px]`, `p-[14px]`, `top-[9px]`) → `components/home/workspace-home.tsx`
  - *Motion*: `hover:scale-105` zoom effects on action cards → `components/home/workspace-home.tsx:120`
  - *Motion*: 6 `transition-all` instances on metric tiles → `components/home/workspace-home.tsx:98`
  - *Motion*: Non-live `animate-pulse` breathing glow on status tags → `components/home/global-homepage-analytics.tsx:112`

### Screen 3: Folder View, Table & Analytics Panel
* **Files**: `components/table/bookmark-table.tsx`, `components/folders/folder-page-panel.tsx`, `components/collections/folder-collections-view.tsx`, `components/dashboard/visual-dashboard.tsx`, `components/graph/knowledge-graph.tsx`
* **Slop Classification**: **Heavy Slop**
* **Audit Findings**:
  - *Surfaces and color*: Violet-to-blue linear gradients on analytics banner → `components/dashboard/visual-dashboard.tsx:84`
  - *Surfaces and color*: Pill badges with colored drop shadows (`shadow-[0_0_12px_rgba(59,130,246,0.3)]`) → `components/collections/folder-collections-view.tsx:142`
  - *Spacing*: 76 combined arbitrary pixel values (`[13px]`, `[11px]`, `[22px]`, `[68px]`) → `components/table/bookmark-table.tsx`, `components/collections/folder-collections-view.tsx`
  - *Motion*: 15 combined `transition-all` instances across row hover states and cards → `components/dashboard/visual-dashboard.tsx`, `components/table/bookmark-table.tsx`
  - *Motion*: `hover:scale-102` bounce on folder card hover → `components/collections/folder-collections-view.tsx:95`
  - *Icons*: Emoji indicators in table rows and headers (`📁`, `📥`, `🟢`, `🔴`) → `components/table/bookmark-table.tsx:210`
  - *Components*: Rainbow categorical bar chart palette instead of single ranked accent → `components/dashboard/visual-dashboard.tsx:180`
  - *Type*: Negative letter spacing `tracking-tight` on small 12px table headers → `components/table/bookmark-table.tsx:114`

### Screen 4: Modals, Forms & Auth
* **Files**: `components/add-bookmark-modal.tsx`, `components/modals/site-preview-modal.tsx`, `components/auth/auth-modal.tsx`, `components/command-palette.tsx`
* **Slop Classification**: **Heavy Slop**
* **Audit Findings**:
  - *Copy*: Hype copy and emoji quota strings (`Free AI Autotagging: 30 uses left today ✨`) → `components/add-bookmark-modal.tsx:190`
  - *Surfaces and color*: Glowing search pill and high-contrast blue ring on inputs → `components/command-palette.tsx:64`
  - *Spacing*: 50 arbitrary pixel values (`[14px]`, `[38px]`, `[420px]`, `[15px]`) → `components/add-bookmark-modal.tsx`, `components/modals/site-preview-modal.tsx`
  - *Icons*: Sparkles and emoji in input labels (`⭐ Quick Pin`, `⏳ Pending`) → `components/add-bookmark-modal.tsx:220`
  - *Motion*: `transition-all` on modal submit triggers → `components/auth/auth-modal.tsx:94`
  - *Components*: Full rounded pill button borders conflicting with sharp dialog containers → `components/modals/site-preview-modal.tsx:110`

### Screen 5: Recycle Bin, Profile & Feedback
* **Files**: `components/trash/recycle-bin-view.tsx`, `components/profile/profile-view.tsx`, `components/feedback/feedback-view.tsx`
* **Slop Classification**: **Heavy Slop**
* **Audit Findings**:
  - *Spacing*: 57 combined arbitrary pixel values (`[13px]`, `[26px]`, `[34px]`, `[72px]`) → `components/profile/profile-view.tsx`, `components/feedback/feedback-view.tsx`
  - *Motion*: 7 `transition-all` instances on trash item rows and bulk action bars → `components/trash/recycle-bin-view.tsx:132`
  - *Motion*: Avatar picker spring scale transitions → `components/profile/dicebear-avatar-modal.tsx:88`
  - *Surfaces and color*: Rainbow status badges for storage / AI quotas (cyan, violet, emerald) → `components/profile/profile-view.tsx:184`
  - *Type*: Uppercase tracked section titles (`UPPERCASE TRACKING-WIDER`) → `components/profile/profile-view.tsx:140`
  - *Icons*: Trash emoji and alert icons → `components/trash/recycle-bin-view.tsx:92`

---

## 4. Visual Audit Evidence (Light & Dark, Desktop & Mobile)

Baseline screenshots captured in guest mode (stored in `docs/screenshots/unslop-audit/`):
- **Homepage & Shell (Desktop)**: `1_homepage_shell_light.png` / `1_homepage_shell_dark.png`
- **Homepage (Mobile 390px)**: `mobile_1_homepage_light.png` / `mobile_1_homepage_dark.png`
- **Folder View & Table**: `folder_view_desktop_light.png` / `folder_view_desktop_dark.png`
- **Add Bookmark Modal**: `4_add_bookmark_modal_light.png` / `4_add_bookmark_modal_dark.png`
- **Auth Modal**: `8_auth_modal_light.png` / `8_auth_modal_dark.png`

---

## 5. Execution Plan for Prompt 2 (Post-Approval)

Execution will occur strictly **one screen at a time**, applying all 9 passes in order (*spacing, color, icons, copy, type, layout, details, visuals, motion*):

1. **Screen 1**: Tokens, App Shell & Sidebar (`app/globals.css`, `components/ui/*`, `components/sidebar/sidebar.tsx`, `components/app-header.tsx`)
2. **Screen 2**: Homepage (`components/home/workspace-home.tsx`, `components/home/global-homepage-analytics.tsx`)
3. **Screen 3**: Folder View, Table & Analytics (`components/table/*`, `components/collections/*`, `components/dashboard/visual-dashboard.tsx`)
4. **Screen 4**: Modals, Forms & Auth (`components/add-bookmark-modal.tsx`, `components/modals/site-preview-modal.tsx`, `components/auth/*`, `components/command-palette.tsx`)
5. **Screen 5**: Recycle Bin, Profile & Feedback (`components/trash/*`, `components/profile/*`, `components/feedback/*`)

---

## 6. Hard Rules Followed
* **Visual only**: Zero changes made to `app/api`, `server/`, `supabase/`, auth logic, data flow, or test selectors.
* **Integrity preserved**: Features, copy semantics, section ordering, and the product name "Markly" remain intact.
* **No generative imagery**: No image generation, no image-service MCP, no story video.
* **Unused legacy files ignored**: `components/dashboard/folder-treemap`, `activity-heatmap`, `folder-sunburst`, `network-graph`, `domain-distribution`.

