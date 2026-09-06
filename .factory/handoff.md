# Payout Reconciliation Casefile — repair 3 handoff

## Outcome

**PASS — repaired implementation is deployed and verified.**

- Work order: `payout-reconciliation-casefile-repair-3`
- Implementation SHA: `b78a3f09bcbcc3b9bdf17cc8037cf651851017e0`
- Documentation revision: the later report-only commit containing this handoff (`HEAD`)
- Live URL: <https://payout-reconciliation-casefile.sociobot.in>
- Demo URL: <https://payout-reconciliation-casefile.sociobot.in/demo/>
- Verified: 2026-09-06 UTC

The final live deployment matches every publicly served file in the `b78a3f0` build byte-for-byte. Deployment configuration files are intentionally not public.

## Repairs completed

### Reconciliation safety

- Exact references no longer bypass the selected date window.
- A linked order and payout need amount agreement before a timing result can be explained.
- Refund explanations now require defensible order, fee, processor, and ledger amounts.
- The recorded $100 order versus $1 payout and ledger now becomes a $99 bounded-review finding.
- A same-reference row 120 days away stays unmatched with a ±1-day window.
- Unit and browser regressions cover both adversarial cases.

### Claims and demo sandbox

- Added `.factory/claims.json` with nine public claims and one tagged test for each claim.
- Added `/demo/` and `?demo=1` support with an immediately completed eight-finding sample.
- Demo mode stays in memory and never reads or writes the real IndexedDB workspace or license storage.
- Added the persistent demo label, **Reset demo**, and **Start for real**.
- Confirmed on the live site that changing and resetting the demo preserved a separately saved real workspace.
- Added `.factory/demo.md` with the entry point, sample contents, reset behavior, and storage boundary.

### First read, accessibility, and site structure

- The first screen now states the job, names small ecommerce operators and accountants, and presents both first actions.
- Replaced metaphor-led headings with plain task language and added `.factory/copy-audit.md`.
- Repaired all remaining 44×44 CSS-pixel targets, including desktop footer links and the redaction checkbox.
- Added complete canonical, Open Graph, Twitter, favicon, and Apple touch metadata.
- Added a local 1200×630 social image derived from the original generated artwork.
- Added consistent headers, footers, build identity, and route-specific titles to legal and error pages.
- Added a designed 404 document. A missing live URL returns HTTP 404 with that document.
- Replaced the inline-styled offline page with a CSP-safe built page.
- A rejected or revoked license now has a visible **Remove stored license** action.

### Paid deliverables

- Preserved the registered $29 one-time Analyst offer.
- Implemented saved column mappings for later files with the same headers.
- Verified local casefile snapshots and matching windows up to 60 days.
- Wrote the public offer record to `/work/.evidence/billing-offer.json`.

## Clean verification

A detached worktree at exact implementation SHA `b78a3f09bcbcc3b9bdf17cc8037cf651851017e0` was used.

```bash
npm ci
# Every command in .factory/claims.json, one by one
npm test
npm run build
npm audit --audit-level=high
git diff --check
```

- All 9 declared claim commands passed.
- Vitest: 10/10 passed.
- Playwright: 36/36 passed across desktop and 390×844 mobile projects.
- Audit: zero vulnerabilities.
- Build: passed and produced `dist/index.html` plus demo, privacy, terms, offline, and 404 documents.
- Initial JavaScript: 37.12 KB raw / 12.82 KB gzip.
- Main CSS: 19.77 KB raw / 4.89 KB gzip.
- Hero WebP: 62.66 KB. Fonts: 0 KB.

## Live verification

- Factory `verify-url.sh`: root and demo returned 200 with zero console or page errors.
- Fresh desktop and phone contexts identified the job, audience, and sample action before scrolling.
- The one-click demo showed its persistent label, three files, 8 findings, and 95.8% bounded coverage.
- Demo reset and exit preserved separately created real workspace data.
- The live $100/$1 fixture returned **Bounded review**, `$99.00`, and no “amounts agree” text.
- The live 120-day fixture returned missing/source-only findings and no timing explanation.
- A service-worker context reloaded `/demo/` offline after its HTTP cache was cleared.
- Axe found zero serious or critical issues on root, demo dark/reduced-motion, privacy, terms, and 404 states.
- Root, demo, privacy, terms, and offline returned 200 with distinct titles, one `h1`, one `main`, and no console errors.
- An unknown path returned HTTP 404 and the designed recovery page.
- CSP, frame restriction, Permissions Policy, `nosniff`, referrer policy, immutable assets, manifest MIME, and no-cache service worker headers are live.
- Checkout returned 303 to the hosted Dodo checkout. Its public payload confirmed USD 29.00 and `one_time_price`.
- An 80-request verification burst returned 30×200 and 50×429. Every 429 response had `Retry-After`.
- All public build files matched the deployed bytes.

Lighthouse 13.4.1 produced a complete live mobile report before Chromium crashed during teardown:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1.01 s |
| LCP | 1.38 s |
| TBT | 65 ms |
| CLS | 0 |

The teardown crash did not affect the completed JSON report at `/work/.evidence/lighthouse.json`.

## Evidence

- `/work/.evidence/live-root/verify.json`
- `/work/.evidence/live-demo/verify.json`
- `/work/.evidence/live-root/screenshot-desktop.png`
- `/work/.evidence/live-root/screenshot-mobile.png`
- `/work/.evidence/live-desktop.png`
- `/work/.evidence/live-phone.png`
- `/work/.evidence/lighthouse.json`
- `/work/.evidence/catalog-description.txt`
- `/work/.evidence/billing-offer.json`

## Known limits

- Matching is evidence grouping, not bookkeeping or accounting advice. Users must check findings against original exports.
- The product intentionally has no account connection, journal posting, tax calculation, or shared backend.
- Browser storage remains device-local. JSON backup is the supported transfer and recovery path.
