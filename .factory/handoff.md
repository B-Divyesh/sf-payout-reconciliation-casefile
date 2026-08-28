# Payout Reconciliation Casefile — build handoff

## Delivered

- A production-ready Vite + vanilla TypeScript PWA for reconciling orders, processor settlements, and ledger exports entirely in the browser.
- Flexible RFC-style CSV parsing, common-header detection, editable mappings, accounting-negative support, 2¢ tolerance, configurable fuzzy date windows, and an explicit mixed-currency guard.
- Explainable findings for balanced rows, disclosed processor fees, refunds, timing shifts, duplicates, missing processor/ledger rows, and isolated source-only records. No source row is silently discarded.
- Source totals, variance, coverage, filters, row-level evidence, redacted-by-default Markdown/CSV exports, and full workspace JSON backup/import.
- IndexedDB persistence for the active workspace and paid local archives. The free tier retains reconciliation and all exports.
- $29 one-time Analyst unlock using the required Sociobot checkout URL, return-token capture, `sb_license:payout-reconciliation-casefile` localStorage key, optimistic cached verdict, at-most-daily verification, invalid-license relocking, and paste-to-restore flow. No product ID is hardcoded.
- Installable manifest, hand-authored icons including maskable art, versioned service worker shell/runtime caches, offline fallback, update toast, and saved-state offline restoration.
- `/privacy/` and `/terms/`, MIT license, full README, sitemap/robots metadata, and no analytics, trackers, remote fonts, or CDN scripts.
- Product-specific neo-brutalist evidence-desk system and dark treatment. Original generated hero source/prompt/review are retained under `assets/src/`; the shipped WebP is 62 KB.

## Run and deploy

```bash
npm ci
npm test
npm run build
```

The exact build command is `npm run build`. Static output is `./dist`, with `dist/index.html` at its root. Preview with `npm run preview`.

## Verification performed

- `npm test`: passed — 4 Vitest tests plus 8 Playwright scenarios across desktop Chromium and a 390 × 844 Chromium mobile viewport.
- Seeded 1,000-order engine test: passed the ≥90% explained-or-bounded exception exposure requirement; every finding has a reason, explanation, and evidence list.
- Browser coverage: sample intake → mapping → reconcile → finding → Markdown download, keyboard skip path, 390 px overflow check, IndexedDB state restoration, offline reload, privacy route, and terms route.
- `@axe-core/playwright`: zero serious or critical violations after reconciliation.
- Factory `verify-url.sh` against the production preview: HTTP 200; title present; `lang="en"`; exactly one h1; main landmark present; no missing image alt text; no unlabeled buttons; no console/page errors. Recorded load: 630 ms.
- Lighthouse 12.8.2 mobile against the production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.7 s, TBT 0 ms, CLS 0.
- `npm audit --audit-level=high`: zero vulnerabilities.
- Production assets: initial JS 33.81 KB / 11.94 KB gzip; CSS 17.50 KB / 4.47 KB gzip; hero WebP 62 KB. All are below factory budgets.
- Manual visual review at 1440 px and 390 px confirmed hierarchy, readable mobile findings, no horizontal overflow, coherent generated imagery, and source/mapping/run states.

## Known v1 boundaries

- One casefile supports one currency. Mixed-currency input is rejected with an instruction to split exports, preventing invalid combined totals.
- Processor input should contain transaction-level settled-net rows. Aggregated payout batches are preserved as bounded processor/ledger-only groups; v1 does not guess a combinatorial split across many orders.
- Files are capped at 15 MB each to keep main-thread browser processing predictable. Large histories should be split by close period.
- License verification follows the live API contract but requires the factory-created product/license to complete a real purchase smoke test. Product registration, checkout configuration, DNS, and deployment remain factory tasks.

## Recommended next steps

1. Register the paid product and smoke-test checkout return, restore, refund/revocation, and CORS with a real test license.
2. Deploy `dist/` and repeat the factory URL verifier on the public HTTPS origin so service-worker scope and legal routes are confirmed behind production routing.
3. If operator evidence shows aggregate payouts are common, add an opt-in bounded subset matcher with strict row-count/time limits and clearly scored evidence.
