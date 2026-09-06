# Explain payout mismatches — independent verification 4

Verified 2026-09-06 UTC.

- Verdict: **FAIL**
- Candidate implementation: `b78a3f09bcbcc3b9bdf17cc8037cf651851017e0`
- Documentation reviewed: `0aae841abe8e106fe522fddd4ee1c6a7cd264925`
- Live URL: <https://payout-reconciliation-casefile.sociobot.in>
- Demo URL: <https://payout-reconciliation-casefile.sociobot.in/demo/>
- Findings: **2** — one high, one medium
- Public claims without the required tagged claim test: **6**

**Disposition: FAIL. Do not declare this release complete.** The central workflow works, all nine declared claims pass, and the deployed files match the candidate. The release still fails the required 200% text-resize baseline and the every-claim-is-a-test contract.

## Findings

### QA-4-01 — Medium — 200% text resizing pushes result content off the phone viewport

In a fresh 390 × 844 Chromium context with dark mode and reduced motion, setting the root text size to 200% widened the document from 390 to 408 CSS pixels. Content extended 18 pixels beyond the viewport.

Affected content included:

- the `95.8% coverage` seal, whose text reached x=407.88;
- the processor and variance totals, which reached x=406.59;
- all three source cards, which reached x=406.75;
- the processor filename, whose text overflowed its own box.

The page requires horizontal movement and shows clipped content at the right edge. This fails the attached requirement that text resize to 200% without loss. Normal-size phone and desktop layouts have no horizontal overflow.

Evidence: `/work/.evidence/verify4-phone-dark-200-percent.png` and the live Playwright measurement (`clientWidth=390`, `scrollWidth=408`).

### QA-4-02 — High — six public claims are missing required tagged sandbox tests

`.factory/claims.json` declares nine claims, and all nine commands pass. A live-page and README cross-check found six additional statements a visitor can rely on that have no matching claim record and no exact `@claim:<id>` test:

1. The app groups processor fees, refunds, timing shifts, missing rows, duplicates, and source-only records (`README.md`).
2. It imports quoted CSV cells, accounting negatives, and common column names (`README.md`).
3. Amount agreement uses a two-cent tolerance (live matching controls and `README.md`).
4. Matching amounts recover renamed transactions (live **How matching works** section).
5. License verification sends only the token to the Sociobot API (`README.md`).
6. **Clear workspace** and **Remove stored license** delete the locally stored data (`/privacy/`).

Some parts have incidental unit or browser coverage. That does not meet the attached contract: each public claim must be listed once and asserted by one tagged sandbox command. The exact two-cent boundary, duplicate grouping, renamed-reference recovery, and real-workspace deletion are not asserted by any current claim command.

## First screen

Fresh desktop and phone contexts answered all three questions before scrolling:

- Job: explain payout mismatches from three exports.
- Audience: small ecommerce operators and accountants.
- First action: **Try it with sample data**; the adjacent note says it opens a completed casefile.

The headline has six words and names the job. The page uses plain terms and no metaphor heading. Screenshots: `/work/.evidence/verify4-first-read-desktop.png` and `/work/.evidence/verify4-first-read-phone.png`.

## Demo and real-data isolation

The first-screen action opened `/demo/` in one click. The first populated screen showed:

- the persistent **Demo — sample data, nothing is saved to your real workspace** label;
- three named sample files;
- eight realistic findings;
- `95.8% bounded`;
- fees, a refund, a missing processor row, a processor-only row, and a ledger-only row.

The label remained visible after scrolling to the page end. Changing the demo name and selecting **Reset demo** restored the original sample. A separately saved real case name remained unchanged after **Start for real**. The demo flow made only same-origin requests.

## Declared claims

Every command in `.factory/claims.json` was run separately from the detached candidate checkout after `npm ci`.

| Claim ID | Result | Observable evidence |
| --- | --- | --- |
| `demo-sandbox` | Pass | completed sample; reset; preserved real IndexedDB workspace |
| `local-processing` | Pass | reconcile/export request log contained only the product origin |
| `offline-reload` | Pass | service-worker shell survived cleared HTTP cache and offline reload |
| `redacted-reports` | Pass | Markdown and CSV hid full references and customer email; CSV had 8 findings |
| `matching-boundaries` | Pass | $100/$1 stayed reviewable; 120-day row stayed outside ±1 day |
| `workspace-persistence` | Pass | imported real workspace survived reload |
| `csv-intake` | Pass | blank amount was rejected; valid replacement recovered |
| `paid-analyst-tools` | Pass | 60-day option, saved mapping, archive, and checkout redirect worked |
| `accessible-interface` | Pass | declared keyboard, 44 px, reduced-motion, dark-mode axe checks passed |

The unlisted claims in QA-4-02 prevent the claims gate from passing despite these nine results.

## Clean checkout and build

A detached worktree at the exact implementation SHA was clean before installation and after verification.

| Gate | Result |
| --- | --- |
| `npm ci` | Pass; 60 packages, zero vulnerabilities |
| Nine claim commands | Pass; 9/9 |
| `npm test` | Pass; 10/10 Vitest and 36/36 Playwright |
| `npm run build` | Pass; produced `dist/` |
| `npm audit --audit-level=high` | Pass; zero vulnerabilities |
| `git diff --check` | Pass |

Build sizes remain inside the product budgets:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| Initial JavaScript | 37.12 KB | 12.82 KB |
| Main CSS | 19.77 KB | 4.89 KB |
| Hero WebP | 62.66 KB | — |
| Fonts | 0 KB | — |

## Live functional and recovery checks

The normal demo reconciled to eight findings and exported redacted Markdown. Fresh live checks also passed:

- blank amount rejection and replacement recovery;
- malformed money rejection;
- mixed-currency rejection;
- unclosed quoted-field rejection;
- exactly 15 MB accepted and 15 MB plus one byte rejected;
- the $100 order versus $1 payout/ledger case stayed a `$99.00` bounded review;
- the same reference 120 days away stayed unmatched at ±1 day;
- default Markdown omitted `ORD-1001` and the sample customer email.

## Accessibility, routes, privacy, and PWA

Before the 200% resize, fresh phone dark/reduced-motion checks found:

- zero axe serious or critical violations;
- first Tab focus on the skip link;
- every visible interactive target at least 44 × 44 CSS pixels;
- reduced transition duration of at most 0.001 seconds;
- no normal-size horizontal overflow.

Root and demo passed the factory URL checker with no console or page errors. Root, demo, privacy, terms, offline, and the designed 404 each have a distinct title, `lang=en`, one `h1`, one `main`, route metadata, and working internal links. The unknown live route returned the expected HTTP 404 document.

The installed demo reloaded offline after the HTTP cache was cleared. The cached shell contained the fingerprinted JS and CSS. Registering a changed service-worker URL showed **Update ready. Reload**. Manifest name, versioned start URL, standalone display, theme colors, 192/512 icons, and maskable icon passed.

Normal demo use sent no financial data off origin. No analytics, remote fonts, trackers, or CDN scripts were observed. Privacy contact uses `mailto:`. This is a static browser product, so backend tenant isolation, SQLite restart persistence, health endpoints, and sign-in authority checks do not apply.

## Billing and response policy

- **Buy once — $29** returned HTTP 3xx to the hosted Dodo checkout origin.
- An invalid returned token was stripped from the URL, left free tools available, and could be removed from the locked screen.
- An 80-request invalid-license burst returned 30 × 200 and 50 × 429. Every 429 included `Retry-After`.
- Root responses include CSP with `frame-ancestors 'none'`, HSTS, `nosniff`, strict-origin referrer policy, Permissions Policy, and `X-Frame-Options: DENY`.
- Hashed JS uses one-year immutable caching, `sw.js` uses `no-cache`, and the manifest uses `application/manifest+json`.

## Deployment identity and performance

All 28 publicly served build files matched the fresh candidate build byte-for-byte. Deployment-only configuration files were excluded from the public-file comparison. Later documentation commits do not require a different product image.

Fresh Lighthouse 13.0.1 mobile results:

| Category or metric | Result |
| --- | ---: |
| Performance | 99 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 0.99 s |
| LCP | 1.37 s |
| TBT | 128 ms |
| CLS | 0 |

The prior 100 performance score was a valid point measurement; the fresh 99 remains above the required performance threshold. Report: `/work/.evidence/verify4-lighthouse.json`.

The deterministic local matcher is the appropriate implementation for this financial evidence task. An optional model call would add privacy and repeatability risk without filling a missing user step, so there is no missed AI feature finding.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| QA-01 checkout unavailable | Closed — hosted checkout redirect works |
| QA-02 Markdown leaked references | Closed — default Markdown and CSV are redacted |
| QA-03 blank amount became zero | Closed — rejected with a row-specific message |
| QA-04 shell omitted JS/CSS | Closed — cold offline reload passed |
| QA-05 no observable 429 | Closed — 50/80 requests throttled with `Retry-After` |
| QA-06 dark contrast | Closed — dark demo has zero serious/critical axe violations |
| QA-07 invisible file focus | Closed — live focus and target checks pass |
| QA-08 response hardening/cache gaps | Closed — required headers, MIME, and cache policy are live |
| QA-09 undersized targets | Closed at normal text size — all checked targets are at least 44 × 44 |
| QA-2-01 legal/home targets | Closed — phone and desktop measurements pass |
| QA-3-01 false amount/date explanations | Closed — both adversarial live cases pass |
| QA-3-02 missing claims registry | Partially closed — registry exists, but QA-4-02 finds six omissions |
| QA-3-03 audience absent | Closed — audience appears before scrolling |
| QA-3-04 sample not isolated | Closed — demo is in-memory with reset and exit |
| QA-3-05 narrow desktop footer links | Closed — desktop targets pass |
| QA-3-06 metadata/404/docs gaps | Closed — route metadata and HTTP 404 pass |
| QA-3-07 invalid license could not be removed | Closed — removal works on the locked screen |

## Required repair

1. Make the completed demo reflow at 200% text size on a 390 px viewport. The coverage seal, totals, filenames, and source cards must remain inside the viewport without losing content.
2. Add claim records and exactly one tagged sandbox test for each of the six public claims in QA-4-02, or remove those statements from public copy.
3. Rerun every claim command, the full suite, and an independent live 200% text check after deployment.
