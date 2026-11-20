# Dither UI — Visual Direction and Reference Analysis

## 1. Sources inspected

- Dither UI main site: https://dither-ui.com/
- Dither docs: https://dither-ui.com/docs/
- Quick Start: https://dither-ui.com/docs/getting-started/
- File Tree example: https://dither-ui.com/docs/sidebar-tree/
- Dither background example: https://dither-ui.com/docs/dither/
- GitHub source: https://github.com/drvova/dither-ui
- Mobbin: https://mobbin.com/

### Reference status
The Dither docs' live site currently exposes Vue and Svelte code tabs. The Quick Start says to use the Vue 3 kit path and install the Dither kit's runtime requirements. The GitHub master source inspected in the public repository still contains a SolidJS package description/source layer. This discrepancy is a Stage 0 verification issue; use the official Vue tab and exact live source, not an assumed React/Solid port.

## 2. What the supplied screenshot shows

The screenshot is the Dither docs File Tree page:
- Near-black textured page background.
- Warm off-white display heading.
- Monospaced description/body copy.
- Floating rounded dark navigation bar.
- Left documentation category rail with counts and expandable sections.
- Large central rounded preview frame.
- Live File Tree component inside the frame, split into explorer and selected file preview.
- Thin nested guide rails and a highlighted selected file.
- Right “On this page” rail.
- Code/install snippet below the preview.

This is a strong reference for **Dither Lab**, not a template for every Markly screen. The previous result copied the docs composition instead of creating a different product experience.

## 3. Dither's own site design character

The official README describes the landing page as dark throughout, with bone-colored ink and Dither art providing the color. It uses:
- A large hero statement alongside a live Dither print.
- Brand diamond / visual mark.
- A bento of twelve live components, each leading to its docs.
- A narrative agent session showing a screen being built.
- A “what's inside” overview of kit, Studio and agent bridge.
- An installation section.
- A footer with grain, galaxy and dithered light trails.

The docs use a three-column structure: categories on the left, a live example and code in the center, and “On this page” on the right. The Studio is canvas-first with a library, layer tree, inspector, data editor, variations, reel/timeline and export.

## 4. What Markly should borrow

- Ordered dither as a material/texture system, not just a background image.
- Seeded deterministic visual variations, so refreshing does not randomly redesign a control.
- Dither fill/button/badge/toggle treatments.
- Dither charts, axes, legend, tooltip and series selection.
- Dither backgrounds as atmosphere around hero/canvas/empty states.
- Dither typography and selected text effects.
- Component composition vocabulary.
- Canvas-first layout for Visual Analytics.
- Dither File Tree from the screenshot for Markly folder navigation.
- Dither Lab's docs/preview/inspector structure for the component catalogue.

## 5. What Markly should not copy literally

- The three-column documentation shell on all app pages.
- The docs category navigation as the main product sidebar.
- Code/install snippets in the public homepage.
- The Dither Studio's source editing/export developer workflow as the default bookmark user workflow.
- Large animated effects behind the bookmark library.
- Every background and cursor effect on every page.
- Documentation labels, docs metadata and examples that do not belong in a bookmark product.

## 6. Markly's own art direction

Suggested working art direction (Antigravity may refine after visual experiments, but keep it recognizably Dither):

- Dark, near-black foundation with fine ordered-dither grain.
- Bone/ivory typography for primary content.
- Muted gray for metadata and secondary labels.
- Dither palette colors used with intention: one selected accent per surface or chart series group.
- Hairline separators; borders are quiet.
- Compact technical mono labels; strong display typography for hero headings.
- Dither buttons and controls should visibly change their pixel density/print on hover/press.
- Cards/surfaces should feel like printed modules or framed windows, not generic glass cards.
- Dither textures are layered as artwork and never reduce text contrast.
- Large visual energy reserved for Home hero, Visual Analytics and Dither Lab.

## 7. Homepage visual research

Mobbin is a reference library for real shipped web/mobile screens, flows and UI elements. Use it for research, not as a component library. Study several current landing pages and product homepages for:
- Hero composition.
- Navigation density.
- Product preview placement.
- Scroll storytelling.
- Feature narrative.
- CTA hierarchy.
- Footer composition.

Suggested Mobbin searches:
- “creative productivity tool website hero”
- “personal knowledge management homepage”
- “digital archive app landing”
- “bookmark manager web app”
- “dark creative software landing page”
- “editorial software homepage”
- “visual analytics product landing page”

Select 3–5 reference pages and record why each pattern works. Do not copy brand assets, screenshots or protected visual compositions. Use the patterns to develop an original Markly homepage.

## 8. Motion rules

- Dither reveal/transition effects are used only for route or section transitions where they clarify a change.
- Background canvases pause when offscreen and use static render mode when motion adds no value.
- Respect `prefers-reduced-motion`.
- No constant cursor trails across the application.
- No moving text in Library rows, folder names or normal metadata.
- No animated number changes unless the value actually changes.
- Keep chart interaction responsive; decorative rendering must not compete with pointer/keyboard interaction.

## 9. Visual references and URLs

| Reference | URL | Intended use |
|---|---|---|
| Dither UI landing | https://dither-ui.com/ | Brand treatment, hero art, bento rhythm, story and footer |
| Dither UI docs | https://dither-ui.com/docs/ | Dither Lab only |
| Dither UI File Tree | https://dither-ui.com/docs/sidebar-tree/ | Folder tree component |
| Dither UI Quick Start | https://dither-ui.com/docs/getting-started/ | Framework and kit integration |
| Dither UI Dither Background | https://dither-ui.com/docs/dither/ | Ordered-dither background treatment |
| Dither UI Studio | https://dither-ui.com/studio | Visual Analytics canvas interaction inspiration |
| Mobbin | https://mobbin.com/ | Landing-page and product pattern research, not a UI kit |
