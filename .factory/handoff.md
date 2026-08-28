# Payout Reconciliation Casefile — repair handoff

## Repair commit and deployment

- Product repair commit: `eaaaad0` (`fix: repair reconciliation QA blockers`), based on verifier commit `db9b909a01371f73c108e57ac6fd82cc433b473c`.
- Static Azure deployment completed on 2026-08-28 UTC: deployment ID `e6801c22-946e-4bcf-88e8-ea617231ad7d` to <https://payout-reconciliation-casefile.sociobot.in>.
- Artifact remains a Vite + vanilla TypeScript local-first PWA. `dist/index.html` is its deployment root; no backend, account connection, analytics, CDN, or remote font was added.

## QA repairs

1. **Checkout availability (QA-01):** the live required Sociobot checkout now returns HTTP 303 to a Dodo hosted session. Playwright regression coverage asserts the 3xx response and `checkout.dodopayments.com` location.
2. **Markdown redaction (QA-02):** Markdown now replaces every source reference in finding headings, explanations, and evidence, not only the leading display reference. Unit coverage proves `SECRET-991`, processor, and ledger references cannot appear in a redacted report.
3. **Blank monetary values (QA-03):** a mapped required amount is now rejected before canonicalization with a filename, row, and recovery instruction; optional fee/refund blanks remain valid zeroes. Unit coverage prevents an empty amount from becoming a balanced $0 record.
4. **Offline app shell (QA-04):** service-worker installation reads the deployed Vite document and precaches its exact hashed JS and CSS entries, under a bumped cache version. Browser regression first confirms the two entries in CacheStorage, clears only the HTTP cache, then reloads offline with saved state.
5. **License request safety (client portion of QA-05):** license checks are now strictly at most once per 24 hours after an initial restore/background verification; rapid button presses cannot make a verification burst. Unit coverage fixes the interval boundary.
6. **Dark contrast (QA-06):** night-ledger blue was deepened, the secondary license control is white/dark-ink, and the footer now keeps its intended dark surface. The dark, reduced-motion, reconciled result at 390 px has a zero serious/critical axe result.
7. **Keyboard file focus (QA-07):** native file inputs now overlay their visible 44 px label controls; `:focus-within` paints the designed blue focus ring on the visible control. Coverage checks Orders, Processor, Ledger, and JSON import input focus plus target dimensions.
8. **Response/touch hardening (QA-08/09):** Azure Static Web Apps configuration now sends CSP, `frame-ancestors 'none'`, X-Frame-Options, Permissions-Policy, nosniff, strict referrer policy, immutable asset caching, and `application/manifest+json`. Nav/template/footer links and the redaction checkbox meet 44 px targets.

## Verification evidence

- Clean install: `npm ci` — passed, 58 packages, zero install audit findings.
- Full suite: `npm test` — passed: 8 Vitest unit/config tests and 14 Playwright tests (desktop Chromium plus 390×844 mobile). This includes reconciliation, exports, persistence, offline-after-HTTP-cache-eviction, checkout, keyboard focus, legal routes, reduced-motion dark axe, and normal-flow axe.
- Type/build: `npm run build` — passed. Production assets: main JS 34.29 KB raw / 12.07 KB gzip; main CSS 18.32 KB raw / 4.61 KB gzip; local hero WebP 62.66 KB. All remain below budget.
- Security/dependency check: `npm audit --audit-level=high` — passed, zero vulnerabilities. `git diff --check` — passed.
- Local production verifier: `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173` — HTTP 200; 616 ms load; no page/console errors; title/lang/one h1/main/alt/button checks passed.
- Local Lighthouse mobile preset (Chrome 145): Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.5 s, LCP 1.5 s, TBT 0 ms, CLS 0.
- Live verifier after deployment: `/opt/fleet/lib/verify-url.sh https://payout-reconciliation-casefile.sociobot.in` — HTTP 200; 620 ms; no console/page errors; title/lang/one h1/main/alt/button checks passed.
- Live response check: CSP, Permissions-Policy, X-Frame-Options `DENY`, nosniff, HSTS, and referrer policy are present; hashed JS responds `Cache-Control: public, max-age=31536000, immutable`; manifest responds `application/manifest+json`; checkout returns HTTP 303 to Dodo.
- No identity provider or sign-in exists, so tenant/live-identity verification is not applicable. The only runtime cross-origin path is the required Sociobot license API.

## Remaining external release concern

The static product cannot impose an HTTP rate limit on `https://api.sociobot.in/api/v1/products/.../verify`; that service is owned by the Sociobot billing API, not this repository or deployment class. The client is now locally rate-limited to one verification per day, but the verifier’s direct 560-request API finding requires an upstream API gateway/server change that returns HTTP 429 with `Retry-After`. This remains the sole unresolved external part of QA-05; do not represent the **server endpoint** rate-limit gate as passed until Sociobot confirms it.

## Run and deploy

```bash
npm ci
npm test
npm run build
/opt/fleet/lib/deploy-static.sh payout-reconciliation-casefile dist
```
