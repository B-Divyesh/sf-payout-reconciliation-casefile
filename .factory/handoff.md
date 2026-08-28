# Payout Reconciliation Casefile — repair handoff

## Outcome

**PASS — QA-2-01 repaired and deployed.**

- Work order: `payout-reconciliation-casefile-repair-2`
- Repaired candidate: `289d9c5f0aa88fc2253d0dd8b400c0af504c5b32`
- Verifier report commit: `287396f305ebb4351ed479bcbf1e1a8327dc2637`
- Repair commit: `da6b8c5` (`fix: enforce legal link touch targets`)
- Live URL: <https://payout-reconciliation-casefile.sociobot.in>
- Verified and deployed: 2026-08-28 UTC

The sole release blocker in `.factory/verification-2.md` was reproduced before editing. At 390 × 844, the root brand was 118.36 × 30 px, the unlock Privacy/Terms links were 42.98 × 15 and 35.69 × 15 px, and legal-page links were 16–27.19 px high.

The shared root cause was incomplete touch-target coverage: prior rules covered nav, footer, template, source-file, and redaction controls but omitted the root header brand, inline unlock legal links, and anchors in the separate legal stylesheet.

## Repair

- Gave the shared app brand a 44 px minimum height.
- Gave unlock-panel Privacy and Terms links a 44 × 44 px minimum hit area with spacing.
- Gave legal-page header and email anchors a 44 px minimum hit area.
- Applied the same target and focus baseline to the offline fallback link.
- Added an exact Playwright regression that sets 390 × 844 and asserts every visible anchor on `/`, `/privacy/`, and `/terms/` is at least 44 × 44 CSS pixels.

Live post-deploy measurements:

| Route/control | Live box |
| --- | ---: |
| `/` `CASE/FILE` | 118.36 × 44 px |
| `/` unlock `Privacy` / `Terms` | 44 × 44 px each |
| `/privacy/` home / return / email | 85.53 × 44, 168.16 × 44, 152.39 × 44 px |
| `/terms/` home / return / email | 85.53 × 44, 168.16 × 44, 155.23 × 44 px |

Every other visible link on those routes also passed the 44 × 44 assertion. The researched brief, visual thesis, reconciliation behavior, storage model, billing path, and deployment class are unchanged.

## Clean and automated verification

```bash
npm ci
npm test
npm run build
npm audit --audit-level=high
git diff --check
```

- `npm ci`: 58 packages installed; zero audit findings.
- `npm test`: 8/8 Vitest unit/integration tests and 16/16 Playwright desktop/mobile tests passed.
- `npm run build`: TypeScript `tsc --noEmit` and Vite production build passed; `dist/index.html` exists.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `git diff --check`: passed. This repository has no separate lint script or lint configuration; the production build is the type gate.
- Package/consumer testing is not applicable to this static PWA.

Production build budgets:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| Main JavaScript | 34.29 KB | 12.07 KB |
| Main CSS | 18.46 KB | 4.63 KB |
| Hero WebP | 62.66 KB | — |
| Fonts | 0 KB | — |

Total `dist/` size is 223,566 bytes. These remain below the 200 KB JS, 50 KB CSS, 300 KB hero, and 120 KB font budgets.

## Browser, accessibility, privacy, and PWA evidence

- Live Chromium at 1440 × 900 and 390 × 844 completed sample load and reconciliation at **95.8% bounded** with no console/page errors, cross-origin normal-flow requests, or horizontal overflow.
- Live mobile dark mode plus reduced motion had zero axe serious/critical findings. Light and dark checks for `/`, `/privacy/`, and `/terms/` also had zero serious/critical findings.
- Reduced-motion transitions resolve to `1e-05s`.
- Keyboard smoke: the skip link is first and has a visible solid outline; all three source inputs and backup import expose 44 px or larger visible label targets with a 3 px focus outline.
- `verify-url.sh` passed live: HTTP 200, 817 ms load, title, `lang=en`, one `h1`, `main`, alt text, labeled buttons, and zero console/page errors.
- A fresh service-worker install precached the fingerprinted JS and CSS. After clearing only the HTTP cache and going offline, reload retained the app, `sample-orders.csv`, and the `Offline` state.
- Installing a changed worker produced **Update ready. Reload** with a waiting worker and active controller.
- The full sample flow made only same-origin requests. No analytics, tracking pixels, remote fonts, or CDN scripts are present. License verification remains the only optional runtime cross-origin request and sends only the supplied token.

Live Lighthouse 12.8.2 mobile report:

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP / LCP | 1.0 s / 1.3 s |
| TBT / CLS | 0 ms / 0 |

Lighthouse wrote the complete scored report, then logged the known sandbox `TARGET_CRASHED` during full-page screenshot teardown. The report and metrics were complete before that teardown error.

## Deployment, response policy, and live identity

Deployment used the work-order static configuration:

```bash
/opt/fleet/lib/deploy-static.sh payout-reconciliation-casefile dist
```

Azure Static Web Apps reused the existing `centralus` app, completed deployment `c73a884e-ea5c-434b-a2ec-7f7d2ecb9ab1`, kept the custom domain Ready, and returned HTTPS 200.

- All 20 publicly served build artifacts match local `dist/` byte-for-byte. `_headers` and `staticwebapp.config.json` are deployment inputs, not public assets.
- Live root, hashed JS, manifest, and service worker return 200. Hashed JS uses `public, max-age=31536000, immutable`; the manifest is `application/manifest+json`; `sw.js` is `no-cache`.
- Live responses include CSP with `frame-ancestors 'none'`, Permissions-Policy, `X-Frame-Options: DENY`, HSTS, `nosniff`, and strict-origin referrer policy.
- Checkout returns HTTP 303 to `https://checkout.dodopayments.com/session/...`.
- After one baseline invalid-license request, a 200-request burst returned 29 HTTP 200 and 171 HTTP 429 responses in 1.36 seconds. Observed 429 responses carried `Retry-After: 3` or `4`.
- There is no sign-in or identity provider, so Microsoft Entra tenant verification is not applicable.

## Known gaps and next step

No release-blocking product gap is known. The next step is an independent verification pass against this deployed repair commit.
