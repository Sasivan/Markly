# Markly — Information Architecture and Page-by-Page Designs

## 1. Route map

| Route | Page | Role |
|---|---|---|
| `/` | Immersive Home | The main brand/product homepage; not a dashboard |
| `/library` | Library | Canonical list of saved links |
| `/favorites` | Favorites | Favorite links, same link renderer as Library |
| `/recent` | Recently | Recently visited links |
| `/stash` | Stash | Saved browsing sessions / reading batches |
| `/folders/:folderId` | Folder | Folder content and subfolders |
| `/analytics` | Visual Analytics | Dedicated chart/graph/visual-box workspace |
| `/trash` | Recycle Bin | Restore and permanently remove deleted records |
| `/feedback` | Feedback | Send/manage feedback |
| `/profile` | Profile | Profile, preferences and local workspace settings |
| `/lab` | Dither Lab | Full interactive Dither catalogue and examples |
| `/settings` | Settings | Optional preferences, data portability and accessibility |
| `*` | Not Found | Dither-native 404 |

Search is global and overlays any route. Search result navigation can open Library with the query, or show a full search route if the implementation needs a dedicated URL. It should still use the same Library result component.

## 2. Immersive homepage `/`

**This is the user's most important visual request. It must not look like a dashboard.** Clicking the Markly wordmark from anywhere returns here.

### Header
- Minimal Dither wordmark/diamond.
- Navigation: Archive, Visual Analytics, About/How it works.
- Search icon/command hint.
- Primary button: Open Archive.
- Responsive compact navigation using Dither Sidebar/Rail/Nav Menu patterns only if useful; don't add a large SaaS mega-menu.

### Hero
- Full-viewport or near-full-viewport hero with one carefully art-directed Dither background layer (e.g. Dither, Grainient, Silk, Aurora, Dot Grid or Poster).
- Large, confident headline: “A quieter place for everything worth keeping.” (Copy can be refined, but keep the concise editorial style.)
- Short support line about saving, finding and revisiting useful links.
- Primary CTA: Open Archive.
- Secondary CTA: Explore Visual Analytics.
- Central product artifact: an animated/dithered “living archive” visual made from a restrained constellation of saved-link nodes/cards/folder layers. It must be an actual product preview/interactive composition, not a fake metric dashboard.
- No KPI cards, chart grid, large table, activity heatmap or full folder dashboard above the fold.

### Story sections
1. **Capture** — show one link being saved and routed into a folder, using Dither Input, Button, Tag/Field and File Tree visuals.
2. **Find** — show a real-style search surface with result highlighting and keyboard command hint.
3. **Organize** — show the File Tree example from Dither UI with nested folders, expand/collapse all, guide rails and selected item header; this is a visual centerpiece.
4. **Return** — show Favorites, Recently and Stash as clear destinations.
5. **Understand** — show one compelling chart/visualization sample and a link to Visual Analytics; do not turn the section into a chart gallery.
6. **Built with Dither** — a small, carefully curated sample of the Dither UI component language, linking to Dither Lab.
7. Footer — product links, Dither credit and data/privacy note.

### Homepage visual rhythm
- Use large sections with one visual idea each.
- Alternate text/preview arrangements; do not duplicate the same three-column card grid.
- Dither patterns may appear as backgrounds, image treatment, transition and typography details.
- Maintain legibility; moving backgrounds must remain behind content and be paused when not visible.
- Include mobile art direction, not just squeezed desktop.

## 3. Shared application shell

After “Open Archive”, enter a focused application shell.

### Desktop
- Left: compact Dither Sidebar with main nav and a dedicated Folders group/tree.
- Top: brand link to homepage, global search trigger, Add Link button, user/profile access.
- Main: route content.
- Optional right inspector only on surfaces that benefit from a detail preview or Visual Analytics properties.
- Do not keep all panels open by default.

### Mobile
- Compact top bar.
- Drawer/rail navigation.
- Folder tree in a dedicated folder browsing view or drawer, not a permanently squeezed left column.
- Search stays one tap away.
- Touch targets and scrolling should be intentional.

### Primary nav order
1. Library
2. Favorites
3. Recently
4. Stash
5. Folders (tree group)
6. Visual Analytics

Secondary/footer:
- Recycle Bin
- Feedback
- Profile
- Dither Lab (can live under “More” or “Tools” so it does not compete with core jobs)

The brand wordmark always links to `/`, not `/library`.

## 4. Library `/library`

- Page title and count.
- One obvious search/input bar.
- Compact filter toolbar for folder, tag and date/status filters that the app actually supports.
- A clean link list/table as the default.
- Each row: favicon/thumbnail, title, domain, folder path, tags, added/visited metadata and a restrained action menu.
- Optional card/list view toggle only if it helps a real use case; no parallel view zoo.
- Add Link action.
- Empty state with a clear “Add your first link” CTA.
- Search, sort, filter, favorite, open, detail, edit and delete behavior.

Do not add chart/analytics panels to Library.

## 5. Favorites `/favorites`

- Same Link Row/list design as Library.
- A concise title and favorite count.
- Optional search/filter reuses Library controls.
- Avoid repeating analytics or dashboard sections.
- Empty state explains how to favorite a link.

## 6. Recently `/recent`

- Same Link Row/list design.
- Group by date only if it improves scanning.
- Display relative time and exact date on hover/selection.
- Recent means visited/used according to the defined product model; do not mix it with recently added unless that is a clearly labeled separate filter.

## 7. Stash `/stash`

- Stash sessions as distinct, compact groups.
- Session title, created/updated time and number of links.
- Each session opens a list of its links.
- Actions: rename, add/remove links, open links, open all, copy URLs, export and delete where implemented.
- “New Stash” is the primary action.
- Create flow uses the Dither Dialog/Drawer and the shared link selector.
- No fake automatic browser tab collection; expose manual/selected link addition unless a real browser extension exists.

## 8. Folder page `/folders/:folderId`

- Persistent Dither File Tree on desktop.
- Folder header with name, icon/color identity and breadcrumb path.
- Toolbar: Add Link, New Subfolder, Rename/Move/Share/More where supported.
- Subfolders presented as a clean expandable child list or compact folder grid.
- Links presented using the exact same Library row component.
- No default charts or analytics blocks.
- “Analyze this folder” opens Visual Analytics with the folder selected.
- The tree needs expand/collapse all, nested guide rails, active selection, inline rename/context menu where supported.
- The selected folder name may echo in the page header, following the Dither File Tree example.

## 9. Visual Analytics `/analytics`

This is the only default home for data visualizations.

### Layout
- Header: Visual Analytics, current scope and date range.
- Scope selector: Entire Archive / Folder / Tag / Domain (only scopes supported by available data).
- Board toolbar: Add Visual, Save Board, View/Arrange, Reset where supported.
- Canvas: grid/infinite canvas board with visual boxes; no overwhelming default dashboard.
- Right inspector: only when a visual is selected; otherwise hidden.

### Add visual flow
1. Choose a Dither chart or supported Dither visualization.
2. Choose a data scope.
3. Select available dimension/measure.
4. Apply filters.
5. Preview and add to board.
6. Resize/reorder visual box.
7. Save board.

### Visual types
- Area / Line: activity trend over time.
- Bar: links by domain, folder, tag, month or other available dimension.
- Pie: small, meaningful category breakdown.
- Radar: only if data has meaningful comparable dimensions; do not create artificial metrics.
- Sparkline: compact trends in small metric summaries.
- Graph: link/folder/tag relationship exploration if an actual relationship dataset is defined.
- Other Dither chart/visual components from the current catalogue can be included in the Lab or added to Analytics when backed by real data.

Every chart must use real stored data or an explicitly loaded sample dataset. If no data exists, show an empty state, not invented results.

## 10. Recycle Bin `/trash`

- Separate list for deleted links, folders and sessions if those entity types support soft deletion.
- Show deleted item name, type, deletion date and original folder/path where known.
- Restore action.
- Permanent deletion with Dither Alert Dialog.
- Empty Bin action with explicit confirmation.
- No analytics dashboard.

## 11. Feedback `/feedback`

- Simple message form with category/description only if those fields are required.
- Show locally created feedback records/outbox until a real configured endpoint exists.
- Status and confirmation should be clear.
- Do not pretend feedback was submitted to a server when no endpoint exists.

## 12. Profile `/profile`

- Local profile name/avatar if configured.
- Preferences: theme, motion, density and data export/import only if implemented.
- Storage usage estimate if reliable.
- Clear data action requires confirmation.
- No fake account/security settings when no auth provider is configured.

## 13. Dither Lab `/lab`

This is the answer to “use every Dither UI component without cluttering the product.”

- Searchable left category navigation.
- Main live preview canvas.
- Right inspector/API/props panel.
- Categories: Overview, Primitives, Typography, Handbook, Examples, Components, Backgrounds, Text, Animations and Utils.
- Each catalogue item gets a live, interactive preview, variants and source reference where available.
- Each item is marked with adoption status and Markly usage location.
- Backgrounds and animations are opt-in previews, not global effects.
- Examples are isolated previews, not app functionality.
- User can adjust Dither seed/palette/bloom/cell/animation controls if the component supports them.
- Do not copy the docs website's layout to the main Markly homepage; Dither Lab may intentionally borrow its docs three-column preview structure because it is a component explorer.

## 14. Search / command surface

- Global trigger accessible from every app route.
- Keyboard hint Ctrl/Cmd+K.
- Recent searches and search suggestions only if stored.
- Search across title, URL/domain, description, tags, notes and folder path.
- Result item shows title, favicon, domain and metadata.
- Enter opens selected result/detail; arrow keys navigate; Escape closes and restores focus.
- This is a core behavior, not a fake search design demo.

## 15. Page completeness checklist

- [ ] Homepage immersive/marketing-style, not dashboard
- [ ] Library
- [ ] Favorites
- [ ] Recently
- [ ] Stash
- [ ] Recursive Folder Tree and folder detail
- [ ] Visual Analytics
- [ ] Recycle Bin
- [ ] Feedback
- [ ] Profile
- [ ] Dither Lab with all category/item previews
- [ ] Search/command overlay
- [ ] Add/Edit Link dialogs
- [ ] Empty, loading, error, success and destructive confirmation states
- [ ] 390px mobile, tablet and desktop layouts
