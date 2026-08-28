# Payout Reconciliation Casefile — verification 3 handoff

## Outcome

**FAIL — candidate must not be released.**

- Work order: `payout-reconciliation-casefile-verify-3`
- Candidate: `41754fe6bf77092a3440c8c47727e88a46f8a723`
- Live URL: <https://payout-reconciliation-casefile.sociobot.in>
- Verified: 2026-08-28 UTC
- Full evidence: [`.factory/verification-3.md`](verification-3.md)

The live deployment matches all 20 publicly served files in the candidate build byte-for-byte. The result is therefore based on product defects, not stale deployment or the previously reported deployment-only issue.

## Release blockers

1. **Critical reconciliation error:** a $100 order paired by exact reference with $1 processor/ledger rows is reported as an explained timing shift and 100% bounded despite a visible $99 variance. A same-reference row 120 days later is also called inside a ±1-day window.
2. **Missing claims gate:** `.factory/claims.json` is absent and there are no `@claim:*` tests, despite many offline, privacy, redaction, export, and matching claims.
3. **Failed first-read gate:** the first screen explains the task and has a one-click sample, but does not name the intended small ecommerce operator or accountant.
4. **No demo sandbox:** sample data writes to the ordinary `casefile-local-v1/current` workspace, survives reload, and has no demo banner/reset/exit. `/?demo=1` loads no sample and `.factory/demo.md` is missing.
5. **Desktop target-size gap:** root footer Privacy and Terms links measure 43 × 44 and 35.7 × 44 CSS pixels.
6. **Site contract gaps:** no designed 404, root title is 66 characters, required canonical/social/apple metadata is absent, legal skeleton/footer build identity is incomplete, and `.factory/copy-audit.md` is missing.

Low-severity privacy cleanup: a rejected or later-revoked callback token remains in localStorage while the locked UI provides no remove action.

## Verification summary

```bash
npm ci
npm test
npm run build
npm audit --audit-level=high
git diff --check
```

- `npm ci`: passed; 58 packages, zero vulnerabilities.
- `npm test`: passed; 8/8 Vitest and 16/16 Playwright tests.
- `npm run build`: passed TypeScript and production build; `dist/` generated.
- Audit and diff checks passed. No separate lint script/configuration exists.
- Bundle budgets pass: 34.29 KB JS, 18.46 KB CSS, 62.66 KB hero, no fonts, 223,566-byte `dist/`.
- Live Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.1 s, TBT 0 ms, CLS 0.
- Axe serious/critical: zero in checked desktop/mobile, light/dark, results, Privacy, and Terms states.
- Offline reload after clearing HTTP cache passed; JS/CSS were precached. Service-worker update toast/activation passed.
- Normal sample/export flow emitted no console/page errors or cross-origin requests. Redacted Markdown/CSV omitted full references and customer email.
- Checkout returned 303 to hosted Dodo checkout. A 200-request verify burst produced 30×200 and 170×429 in 767 ms; all 429 responses had `Retry-After: 4`.
- No sign-in exists, so the Entra authority check is not applicable. This static PWA is not a library/CLI and has no product backend beyond the billing API.

## Next step

Repair every blocker above, add claim/demo regression coverage, deploy the new commit, and request a fresh independent verification. No product code was changed during this QA pass.
