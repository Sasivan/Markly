# Markly — Product Concept and User Journeys

## 1. Product point of view

Markly should feel like opening a carefully curated digital archive, not an admin dashboard.

The user lands on an immersive, editorial homepage with a strong Dither identity. From there they enter the working archive. Inside the application the hierarchy is simple: find a link, organize it, return to it, or understand the collection.

**Core promise:** Save anything worth revisiting. Find it immediately. See how your knowledge is growing.

## 2. Primary user jobs

1. Capture a link with title, URL, optional description, tags and folder.
2. Find a saved link quickly through global search.
3. Browse the entire archive without changing between several bespoke page systems.
4. Mark a link as a Favorite and access Favorites immediately.
5. See recently visited links and revisit them.
6. Stash a set of links as a browsing session or reading batch.
7. Organize links in a recursive folder tree.
8. View a folder's links and subfolders without a chart dashboard embedded in the folder page.
9. Open Visual Analytics, choose a dataset and create a chart/graph/visual box.
10. Restore accidentally removed items from Recycle Bin.
11. Manage profile/preferences and submit feedback.

## 3. New features that fit the concept

### Reading Queue
A focused queue for links the user intends to read. It is a status/list view, not another dashboard.

### Collections
Named collections that can group links across folders without changing the underlying folder hierarchy. Only implement if it can be represented clearly in the data model.

### Tags
Global tags for cross-folder discovery. Use a filter/collection surface, not tag charts on every page.

### Dither Lab
A secondary catalogue and visual playground for the entire Dither UI kit. It contains the full component gallery, 49 backgrounds, text effects, animations, UI examples, palette and print screens. It is deliberately separate from the everyday archive so Dither's full catalogue is available without overwhelming Home or Library.

### Import / Export
A controlled data portability page. Import should preview, validate and deduplicate before writing. Export should support a complete archive backup format. Implement after core persistence.

## 4. What should not exist in the core workspace

Do not recreate the previous app's every-page-analytics approach:
- No chart strip on every page.
- No domain analytics section on Home.
- No folder-level chart grid by default.
- No separate chart, plot and table visualizations repeated across Home, Insights, Folder and Domain screens.
- No multiple overlapping bookmark tables with slightly different behavior.
- No redundant “overview”, “insights”, “analytics”, “domain insights” and “visuals” top-level pages.
- No giant counter card grid.
- No cards around every row.

Advanced visualization belongs in one dedicated Visual Analytics area.

## 5. Main user journeys

### Journey A — Homepage to Library
1. User opens Markly.
2. Sees an immersive Dither-native landing/overview page, not the old dashboard.
3. Chooses “Open Archive”.
4. Enters Library with a clear search field, folder tree and saved-link list.

### Journey B — Capture and organize
1. User invokes Add Link from global header or keyboard shortcut.
2. Enters URL and optional metadata.
3. Selects destination using the shared recursive Dither File Tree picker.
4. Adds tags and saves.
5. The new link appears in Library and the selected folder.

### Journey C — Find
1. User opens global Search (Ctrl/Cmd+K).
2. Searches title, URL/domain, description, notes, tags and folder path.
3. Results use one shared Link Row/Link Card system.
4. Selecting a result opens its detail/preview surface.

### Journey D — Stash
1. User creates a Stash session.
2. Adds current links or selected Library links.
3. Names the session and saves it.
4. Later opens the session and opens/copies/restores its links.
5. Do not claim a web page can enumerate the browser's tabs automatically. Automatic tab capture requires a browser extension or explicit browser API permission; design the first version around user-selected links/manual URL entry unless an extension is separately implemented.

### Journey E — Folder organization
1. User expands the persistent File Tree.
2. Opens a folder.
3. Sees subfolders and its link list.
4. Creates/moves/renames folders using a shared tree and contextual actions.
5. Folder content remains focused on organization and links, not analytics panels.

### Journey F — Visual Analytics
1. User enters the dedicated Visual Analytics page.
2. Chooses Entire Archive, Folder, Tag, Date Range or Domain as a data scope.
3. Adds a visualization.
4. Chooses a Dither chart type or graph/visual component.
5. Configures dimensions/measures/filters with Dither controls.
6. Resizes/reorders the visual box on the board.
7. Saves the board.
8. Returns later and sees the same board and configuration.

### Journey G — Recycle Bin
1. User deletes a link or folder.
2. It enters Recycle Bin with deletion metadata.
3. User restores or permanently deletes it.
4. Permanent deletion requires a clear confirmation.

## 6. Roles and account assumption

No credentials, cloud backend contract or account provider were supplied for this clean start. Therefore:
- Implement the first working version as local-first with durable IndexedDB storage and a clean repository abstraction.
- Do not invent a Supabase project, email provider, auth secret or remote feedback endpoint.
- Profile initially represents the local workspace/profile and preferences.
- Feedback can be composed locally and copied/exported or placed in an outbox until a real endpoint is configured.
- Design data interfaces so cloud sync/auth can be added later without rewriting pages.
- Ask the owner only if a real external service credential or account decision is necessary.

## 7. Quality principles

- Fast route to search and saved links.
- Obvious folder context.
- Minimal redundant navigation.
- A single component language.
- High-quality keyboard and touch interaction.
- Visual richness concentrated on the homepage hero, Dither Lab and Visual Analytics canvas.
- Quiet reading surfaces for everyday links.
- No fake statistics when the user's archive is empty.
