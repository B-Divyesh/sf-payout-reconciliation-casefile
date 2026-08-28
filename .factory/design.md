# Visual thesis: the reconciliation evidence desk

## Direction and rationale

The product uses a **neo-brutalist utility** language modeled on a physical close-of-books evidence desk: stacked source sheets, registration marks, rubber-stamp statuses, ruled tables, and a single electric-lime highlighter. Reconciliation is serious and exacting, so the interface is direct rather than decorative; the slightly offset shadows and exposed borders make each source and inference feel inspectable. It must not resemble an accounting dashboard or a generic SaaS landing page.

Clarity is the primary test: the three required source files, current reconciliation state, and next action are visible immediately. Decoration explains provenance—the illustration shows three paper trails becoming one bounded casefile—and never suggests account connections or automatic bookkeeping.

## Palette

The default is an explicitly light, paper-led treatment. A dark “night ledger” treatment is included via the OS preference and keeps the same ink/highlighter metaphor.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--paper` | `#F4F0E6` | `#161813` | page background / warm stock |
| `--sheet` | `#FFFDF7` | `#22251E` | active documents |
| `--ink` | `#171A15` | `#F7F2E7` | primary text and hard borders |
| `--muted` | `#5C6257` | `#B9C0B1` | secondary text (≥4.5:1) |
| `--signal` | `#C7F000` | `#D1F53A` | primary action / reconciliation highlighter |
| `--signal-ink` | `#111500` | `#111500` | text on signal |
| `--blue` | `#275DFF` | `#80A0FF` | linked / informational evidence |
| `--success` | `#177245` | `#6DD69D` | explained / balanced |
| `--warning` | `#8A4B00` | `#FFC36B` | bounded review |
| `--danger` | `#B42318` | `#FF8E86` | invalid / missing |

Color is always paired with a word, icon, or shape. Borders are ink, not low-contrast gray.

## Typography

- Display and interface: **Arial Black / Arial / system sans-serif**, using uppercase sparingly for compact evidence labels. Its blunt, dense shapes fit the stamped casefile world without shipping a font payload.
- Amounts, source rows, and identifiers: **ui-monospace / SFMono-Regular / Consolas / monospace**, always with tabular numerals.
- Scale: 0.78rem evidence labels, 1rem body, 1.25rem section title, 1.75rem result title, clamp(2.3rem–4.8rem) h1. Body line-height 1.55 and reading measure ≤72ch.

## Spacing, layout, and interaction grammar

The spacing rhythm is 4/8px: 4, 8, 12, 16, 24, 32, 48, 64. Desktop is a wide evidence desk with an asymmetrical 7/5 intro split; workflow content is capped at 1280px. At 390px, secondary explanatory copy and ornamental marks drop away, source panels stack, and results become labeled blocks instead of squeezed tables.

Controls have square 2px borders, 0–4px radii, and 4px offset shadows. Pressing a control returns the shadow to the plane. Selection uses the lime highlighter and a black inset marker. Focus uses a 3px blue outline plus 3px offset. Targets are at least 44px. Source tabs use arrows as well as Tab/Enter; drag-and-drop is additive to a fully labeled file input.

## Motion policy

Only state changes move: new evidence sheets rise 8px into place over 180ms; progress/highlight fills over 240ms; update notices enter from the bottom edge. No looping or ambient motion. With `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are instantaneous; hierarchy survives through border, scale, and color.

## Asset plan and provenance

- Hero: one generated editorial still life of three abstract transaction sheets feeding into a clipped casefile, with black registration marks and lime reconciliation strokes. It clarifies the three-source-to-one-explanation workflow. No people, logos, legible text, currency symbols, or product UI.
- Icons and status marks: hand-authored inline SVG/CSS geometry (paperclip, check, warning, file); MIT-licensed as part of this repository.
- App icons: hand-authored geometric “three sheets / one check” SVG, rasterized locally for PWA sizes.

### Image prompt sheet

**Subject:** three distinct stacks of anonymous transaction paper, aligned by black graph lines into one clipped evidence folder. **World:** tactile accountant’s evidence desk, neo-brutalist editorial still life. **Materials:** warm recycled paper, black toner, cobalt binder clip, fluorescent chartreuse highlighter. **Light:** hard overhead studio light with short crisp shadows. **Lens/composition:** orthographic-ish 50mm view, landscape, strong negative space, cropped paper edges, high detail. **Palette words:** warm ledger paper, carbon ink, cobalt blue, electric chartreuse. **Negative list:** no people, hands, brands, logos, readable text, numbers, currency symbols, gradients, glassmorphism, photorealistic office, watermark.

Generated with the factory Azure OpenAI image deployment (`factory-image`) on 2026-08-28. The selected source and exact prompt are kept in `assets/src/hero-casefile.json`; generated output is original to this product. Shipped WebP derivatives are local, with no remote asset dependency. The footer discloses AI-generated artwork.
