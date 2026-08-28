# Independent product verification — FAIL

Tested 2026-08-28 UTC against candidate `289d9c5f0aa88fc2253d0dd8b400c0af504c5b32` and <https://payout-reconciliation-casefile.sociobot.in>.

**Disposition: FAIL.** The prior release-blocking deployment and reconciliation defects are fixed, but the product still misses the explicit 44 × 44 CSS-pixel touch-target requirement on several live controls. Do not mark the candidate complete until QA-2-01 is repaired and rechecked.

## Release defect

### QA-2-01 — Medium — legal/home links have undersized touch targets

Fresh Playwright measurement at a 390 × 844 viewport found these visible interactive hit areas on the deployed site:

| Route/control | Measured box |
| --- | ---: |
| `/` header `CASE/FILE` home link | 118.36 × 30 px |
| `/` unlock-panel `Privacy` link | 42.98 × 15 px |
| `/` unlock-panel `Terms` link | 35.69 × 15 px |
| `/privacy/` `CASE/FILE` home link | 86 × 16 px |
| `/privacy/` `Return to workspace` link | 168 × 27 px |
| `/privacy/` email link | 152 × 19 px |
| `/terms/` corresponding home/return/email links | 86 × 16, 168 × 27, 155 × 19 px |

The attached accessibility/mobile acceptance contract requires every touch/click target to be at least 44 × 44 CSS pixels. This is especially material on the legal routes, where returning to the workspace is the main navigation action. This check also confirms that the previously repaired footer links, template links, source-file controls, and redaction control meet the size requirement; the defect is limited to the links above.

## What passed from fresh evidence

### Clean candidate and repository gates

- Clean checked-out HEAD was exactly `289d9c5f0aa88fc2253d0dd8b400c0af504c5b32` before installation.
- `npm ci` passed: 58 packages installed; no audit findings.
- `npm test` passed: 8 Vitest tests and 14 Playwright tests.
- `npm run build` passed, including `tsc --noEmit`, and produced `dist/`.
- No lint script or lint configuration is present; `git diff --check` passed.
- `npm audit --audit-level=high` passed with zero vulnerabilities.

The exact production build is within the static-PWA budgets: main JS 34.29 KB raw / 12.07 KB gzip (≤200 KB), main CSS 18.32 KB raw / 4.61 KB gzip (≤50 KB), local hero WebP 62.66 KB (≤300 KB), no font payload, and 300 KB total `dist/`.

### Live deployment and response policy

- Fresh `dist/` and production matched byte-for-byte for all 18 publicly served deployable artifacts. `staticwebapp.config.json` is intentionally deployment configuration and correctly returns 404 as a public asset.
- Live root, hashed JS, manifest, and service worker returned 200. The root has CSP (including `frame-ancestors 'none'`), Permissions-Policy, `X-Frame-Options: DENY`, `nosniff`, HSTS, and strict-origin referrer policy. Hashed JS uses `Cache-Control: public, max-age=31536000, immutable`; the manifest is `application/manifest+json`; `sw.js` is `no-cache`.
- The advertised checkout now returns HTTP 303 to `https://checkout.dodopayments.com/session/...`.
- The required server-side rate-limit check now passes. After one baseline invalid-license request, a 200-request burst (40 concurrent) received 31 HTTP 200 and 169 HTTP 429 responses; every 429 inspected carried `Retry-After: 2` or `3` (and `x-ratelimit-after`). With concurrency, throttling began after 31 successful requests in that burst; that is the observed threshold, not an asserted quota.
- No sign-in or identity provider exists, so the Microsoft Entra tenant check is not applicable.

### Product workflow, privacy, and recovery

- Desktop sample intake → mapping → reconciliation created 8 findings at **95.8% bounded**: disclosed fees, refund, missing processor, processor-only, and ledger-only evidence groups.
- Default Markdown export contained no `ORD-1001`–`ORD-1008` references or customer email; reload retained the workspace in IndexedDB. CSV, Markdown, and JSON export controls were exercised by the repository suite.
- A blank required amount was rejected as `orders-blank.csv, row 2: Amount is empty. Enter a monetary value or remove this row before reconciling.` Replacing that source with a valid CSV recovered to reconciliation successfully.
- Invalid/recovery checks passed for an unclosed quoted field, `not-money`, mixed USD/EUR source files, and a file of 15 MB + 1 byte; each produced a specific corrective message.
- No normal-flow cross-origin requests occurred. Source review shows no analytics, tracking pixels, remote font, or CDN script; the only product runtime cross-origin path is the optional Sociobot license verification and it sends the license token only. Privacy and terms pages are present and live.

### Browser, accessibility, PWA, and performance

- Live desktop (1440 px) and 390 × 844 mobile/dark/reduced-motion normal workflows had no console or page errors, zero horizontal overflow, and zero axe serious/critical findings. Reduced-motion transition duration was `1e-05s`.
- Semantic smoke checks passed: title, `lang=en`, one `h1`, `main`, alt text, labeled buttons, skip link first in keyboard order, and visible focus for ordinary controls and the native file inputs.
- In a fresh service-worker install, CacheStorage included the hashed JS and CSS. After clearing the HTTP cache only and setting the browser offline, a reload still showed the app, persisted `sample-orders.csv`, and the `Offline` state. Registering an updated worker script surfaced **Update ready. Reload** and activated it after Reload.
- Live Lighthouse mobile report: Performance 98, Accessibility 100, Best Practices 100, SEO 100; FCP 1.9 s, LCP 1.9 s, TBT 0 ms, CLS 0. Lighthouse wrote a complete report but its teardown logged an unrelated `TARGET_CRASHED` after report generation.

## Required repair and recheck

Give the listed anchors an actual 44 × 44 px (or larger) hit box without reducing focus visibility or text contrast, rebuild, deploy, and rerun the 390 px target measurement on `/`, `/privacy/`, and `/terms/`. No product-code changes were made in this verification.
