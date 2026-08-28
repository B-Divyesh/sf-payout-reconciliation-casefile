# Independent product verification — FAIL

Tested on 2026-08-28 UTC.

- Candidate: `594c21698fa4007d459496560b4ff55f8be52088`
- Live URL: <https://payout-reconciliation-casefile.sociobot.in>
- Work order: `payout-reconciliation-casefile-verify-1`
- Environment: Node `v22.23.2`, npm `10.9.8`, Chrome for Testing `145.0.7632.6`, Playwright `1.58.2`
- Result: **FAIL — do not promote as complete.**

The live site is the candidate: every one of the 20 files emitted by a fresh candidate build was downloaded from the production origin and compared byte-for-byte; all 20 matched. This rules out a stale deployment as the cause of the defects below.

## Release-blocking defects

### QA-01 — High — checkout is unavailable

The visible **Buy once — $29** link targets the required Sociobot endpoint, but a fresh request to that live target returns HTTP 404 instead of hosted checkout:

```text
GET https://api.sociobot.in/api/v1/products/payout-reconciliation-casefile/checkout
404 {"error":"enabled factory product","status":404}
```

The advertised one-time purchase cannot be started. This confirms, rather than clears, the earlier deployment/configuration caveat.

### QA-02 — High — default Markdown redaction exposes complete order references

With **Redact order references in exports** left checked, the generated Markdown masks the leading display reference but repeats the complete identifier in the finding title. Fresh sample output includes:

```text
### ORD…01 — Expected fee on ORD-1001
### ORD…02 — Expected fee on ORD-1002
### ORD…03 — Refund carried through for ORD-1003
```

The CSV report correctly masks references and neither report contains mapped customer email fields. The Markdown defect nevertheless violates the brief's redacted-by-default requirement and contradicts the UI, README, and privacy notice.

### QA-03 — High — missing required amounts silently become zero and can be certified as balanced

Three validly structured CSVs containing a reference and date but a blank required amount were accepted. Reconciliation then reported:

```text
100% bounded
SECRET-991 balances — EXPLAINED · BALANCED
Orders $0.00 · Processor $0.00 · Ledger $0.00 · Variance $0.00
```

A finance evidence tool must reject a missing required monetary value rather than turn it into a defensible zero. By contrast, the app correctly rejected `not-money`, an unclosed quote, a mixed USD/EUR casefile, and an over-15-MB file, and recovered after replacement.

### QA-04 — High — the service-worker app shell omits the built JS and CSS

Immediately after first load, CacheStorage contained only nine shell entries: `/`, `/index.html`, `/offline.html`, the manifest, hero, and icons. It did not contain `/assets/main-C6-bY2o4.js` or `/assets/main-DYHZlVeL.css`.

An ordinary immediate offline reload passed because the browser HTTP cache still held those files. After clearing only the HTTP cache while retaining the installed service worker and its CacheStorage, offline reload failed both built assets with `net::ERR_FAILED`; the page contained only the skip-link, no `<h1>`, and no functioning application. The PWA's offline guarantee therefore depends on an evictable short-lived HTTP cache and does not meet the precached app-shell contract.

The update mechanism itself was exercised by registering the same worker under a test query: the **Update ready. Reload** toast appeared, `SKIP_WAITING` activated it, the page reloaded, and the app remained functional.

### QA-05 — High — billing verification has no observable rate limit

A 160-request concurrent burst to the product's read-only invalid-license verification endpoint returned 160 HTTP 200 responses. A follow-up 400 requests in batches of 50 also returned 400 HTTP 200 responses. Across **560 rapid requests in about 2.4 seconds**, no HTTP 429 and no `Retry-After` header appeared. No threshold was observed through 560 requests. This fails the work order's explicit server-endpoint rate-limit gate.

### QA-06 — High — dark mode has serious WCAG contrast failures

The post-reconciliation 390 px dark/reduced-motion state produced one axe `color-contrast` violation with four serious nodes:

- Skip link: white on `#80a0ff`, 2.5:1.
- “Exhibit A”: white on `#80a0ff`, 2.5:1.
- **Verify license**: `#171a15` on `#22251e`, 1.13:1.
- Footer description: `#d7dacc` on `#f7f2e7`, 1.27:1.

Light-mode initial and reconciled screens, and both legal pages in dark mode, had zero axe serious/critical findings.

### QA-07 — High — primary file inputs have no visible keyboard focus

The three upload controls and backup-import control are visually hidden, remain in the Tab order, and receive a 3 px outline inside a clipped 1×1 px box. Their visible `<label>` triggers are not focusable and do not reflect focus. A keyboard-only user can land on and activate an upload control but cannot see which source action has focus. This blocks the primary three-file workflow from meeting the visible-focus contract.

## Other defects and policy gaps

### QA-08 — Medium — response hardening and production caching are incomplete

The live origin sends HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It does not send a Content Security Policy, frame restriction (`frame-ancestors` or `X-Frame-Options`), or Permissions Policy. All resources, including hashed JS/CSS and images, use `Cache-Control: public, must-revalidate, max-age=30` rather than long-lived immutable caching. The manifest is served as `application/octet-stream`, although Chrome parsed it with no manifest errors.

### QA-09 — Medium — several touch targets are below 44 px

Visible examples include header navigation links at 25 px high, template links at 20 px high, privacy/terms links at 15–20 px high, and the 22×22 px redaction checkbox. This does not meet the attached 44×44 CSS-pixel target requirement.

## Evidence that passed

### Clean checkout and repository gates

A detached worktree at the exact candidate SHA was used; it was clean before installation.

- `npm ci`: passed; 58 packages installed, zero audit vulnerabilities.
- `npm test`: passed; 4/4 Vitest tests and 8/8 Playwright tests across desktop and 390×844 mobile.
- `npm run build`: passed; this runs `tsc --noEmit` and the exact Vite production build and produced `dist/`.
- `npm audit --audit-level=high`: passed with zero vulnerabilities.
- No lint script or separate lint configuration exists.

Build output is within budget:

| Asset | Raw | Gzip | Budget |
| --- | ---: | ---: | ---: |
| Initial JS | 33.81 KB | 11.94 KB | ≤200 KB raw |
| Main CSS | 17.50 KB | 4.47 KB | ≤50 KB raw |
| Hero WebP | 62.66 KB | — | ≤300 KB |
| Fonts | 0 KB | — | ≤120 KB |

Total `dist/` size is 292 KB. No remote fonts, CDN scripts, analytics, or tracking requests were observed.

### Functional and boundary coverage

- Sample intake → mapping → reconciliation produced 8 explainable findings at 95.8% bounded, including fees, refund, missing processor, processor-only, and ledger-only records.
- Markdown, CSV, and JSON downloads completed. CSV redaction and customer omission passed; JSON backup intentionally retains the local workspace data.
- A renamed transaction two days away was unmatched at ±1 day and explained as a timing shift at ±3 days.
- Missing required mappings keep reconciliation disabled and show **Needs attention**.
- Unclosed CSV quotes, malformed money, mixed currencies, and the 15 MB upper bound produced actionable errors; corrected replacement files reconciled successfully.
- IndexedDB workspace persistence, online reload, normal offline reload, filters, legal pages, and clear/import paths passed the repository scenarios.
- The sample workflow emitted no console/page errors and no cross-origin requests. Supplying an invalid license sent only that token to the Sociobot verify URL, stripped it from the product URL, received `{valid:false, reason:"invalid"}`, and left free features available. CORS allows the production origin and responses use `Cache-Control: no-store`.
- No sign-in exists, so Microsoft Entra tenant verification is not applicable. There is no product backend beyond the Sociobot unlock calls, and this is not a library or CLI.

### Browser, responsive, accessibility, and PWA checks

- Desktop 1440 px and mobile 390×844 were visually inspected after reconciliation; neither had horizontal overflow at normal size.
- Simulated 200% root text size retained all body content without horizontal document overflow.
- `prefers-reduced-motion: reduce` was active and transitions were reduced to effectively instant (`0.01ms`).
- Light mode had one `<h1>`, one `<main>`, `lang="en"`, a valid title, alt text, no unlabeled buttons, visible 3 px focus on ordinary controls, and zero axe serious/critical findings.
- `verify-url.sh`: HTTP 200, 1,481 ms load, zero console/page errors, title/lang/one h1/main/alt/button checks passed.
- Manifest: Chrome reported no errors; standalone display, versioned start URL, 192/512 icons, and maskable icon were present.
- Privacy and terms routes returned HTTP 200 and passed axe serious/critical checks in dark mode.

### Live performance

Fresh Lighthouse 12.8.2 mobile run against the live URL:

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1.0 s |
| LCP | 1.4 s |
| TBT | 50 ms |
| CLS | 0 |

The Lighthouse accessibility score is for its default light-mode initial page; the explicit dark, post-reconciliation axe run found QA-06.

## Required disposition

Do not mark this candidate complete. At minimum, repair and reverify QA-01 through QA-07. Then add regression coverage for blank required amounts, Markdown title/evidence redaction, dark-mode contrast, genuinely visible file-input focus, a service-worker-only cold offline reload, checkout availability, and a documented 429/`Retry-After` threshold. Harden response policies and touch targets before final acceptance.
