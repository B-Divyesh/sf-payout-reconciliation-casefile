# Payout Reconciliation Casefile — verification-2 handoff

## FAIL — candidate not complete

Tested commit: `289d9c5f0aa88fc2253d0dd8b400c0af504c5b32`<br>
Live URL: <https://payout-reconciliation-casefile.sociobot.in><br>
Tested: 2026-08-28 UTC

The candidate is **FAIL** solely because it does not meet the explicit 44 × 44 CSS-pixel touch-target acceptance requirement. The full evidence is in [`.factory/verification-2.md`](verification-2.md).

## Defect by severity

- **Medium — QA-2-01:** The `CASE/FILE` home links and legal/unlock links have 15–30 px high hit boxes at 390 px. This includes `/privacy/` and `/terms/` “Return to workspace” links (27 px high). Make these anchors at least 44 × 44 px and rerun mobile measurement.
- **High/Critical:** None found in this verification. The previously reported checkout, default Markdown redaction, blank-money validation, offline shell, dark contrast, file-input focus, response-policy, cache, and server-rate-limit failures all passed fresh checks.

## How verified

```bash
npm ci
npm test
npm run build
npm audit --audit-level=high
```

All commands passed; `npm test` ran 8 Vitest and 14 Playwright tests, and the build ran TypeScript checking and generated `dist/`. Independent production-browser checks exercised sample reconciliation, exports/redaction, persistence, malformed/blank/mixed-currency/oversized CSV recovery, keyboard/focus, desktop plus 390 px mobile, dark/reduced motion, axe, service-worker update, offline reload after HTTP-cache eviction, headers/caching, checkout, and API rate limiting.

Fresh deployment comparison matched all 18 publicly served build artifacts byte-for-byte. The API rate-limit burst returned 31 HTTP 200 then 169 HTTP 429 responses out of 200 concurrent requests, with `Retry-After: 2–3` seconds. Lighthouse mobile scored 98 Performance / 100 Accessibility / 100 Best Practices / 100 SEO (FCP/LCP 1.9 s, TBT 0 ms, CLS 0).

## Next step

Repair QA-2-01, deploy the rebuilt static artifact, and create a new independent verification report. No product code was modified by this verifier; this handoff and `verification-2.md` are the only workspace changes.
