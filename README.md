# Payout Reconciliation Casefile

An offline-first browser utility for small ecommerce operators and accountants who need to explain why an order export, processor settlement export, and ledger export do not agree.

Casefile imports three CSVs, lets the user confirm column mappings, and groups differences into evidence-backed reasons: disclosed processor fees, refunds, settlement timing, missing ledger or processor rows, duplicates, and source-only records. It exports a redacted Markdown casefile and findings CSV without uploading financial data.

Live product: <https://payout-reconciliation-casefile.sociobot.in>

## What v1 includes

- Flexible CSV parsing with quoted cells, accounting negatives, common-header detection, and explicit field mapping
- Reference-first matching with configurable ±1/3/7/14 day windows (up to 60 days with the one-time Analyst unlock) and 2¢ tolerance
- Explainable, expandable evidence for every match and bounded exception group
- Redacted-by-default Markdown and CSV reports; customer names/emails are never exported
- Current-workspace persistence and JSON backup/restore using browser-local IndexedDB
- $29 one-time Analyst unlock through the Sociobot license API for reusable local archives and wider windows
- Installable PWA shell with persisted state and tested offline reload
- Light and OS-driven dark treatments, keyboard paths, 390 px mobile layout, reduced-motion behavior, and accessible semantics

This tool does not connect accounts, post journal entries, calculate tax/VAT, or provide accounting advice. A casefile should be checked against the original exports.

## CSV expectations

Each file needs a header row and at least these fields:

| Export | Required | Useful optional fields |
| --- | --- | --- |
| Orders | reference, date, gross amount | refund, customer, currency |
| Processor | order/reference, settlement date, settled net amount | fee, memo/type, currency |
| Ledger | reference, posting date, amount | memo, currency |

Column names do not need to match exactly; the mapping step is authoritative. Use the settled **net** amount for processor data. One casefile must contain one currency; split mixed-currency exports before reconciliation. Downloadable templates are included in the UI.

## Develop and verify

Requires Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

The exact quality commands are:

```bash
npm test
npm run build
```

`npm test` runs Vitest engine tests—including a seeded 1,000-order reconciliation—and Playwright desktop/mobile, accessibility, download, persistence, and offline tests. Playwright 1.58.2 is pinned. `npm run build` type-checks and writes the deployable static site to `dist/`, with `dist/index.html` at its root.

To inspect the production build:

```bash
npm run preview
```

## Architecture and privacy

The stack is Vite + vanilla TypeScript. Matching and report generation run on the main thread with no backend dependency. Workspace records live in IndexedDB; the optional license token and once-daily verification verdict live in localStorage. The only runtime cross-origin request is a license verification when a user has supplied a token. There are no analytics, tracking pixels, remote fonts, or CDN scripts.

The generated hero source, exact prompt, and review record are in `assets/src/`; the optimized WebP ships locally. Design decisions and provenance are in [`.factory/design.md`](.factory/design.md).

## Deployment

Deploy the contents of `dist/` as a static site. Route `/privacy/` and `/terms/` to their generated `index.html` files. The service worker is rooted at `/sw.js`; HTTPS is required outside localhost. Product registration, DNS, and billing configuration are factory responsibilities and are intentionally not in this repository.

## License

MIT. See [`LICENSE`](LICENSE).
