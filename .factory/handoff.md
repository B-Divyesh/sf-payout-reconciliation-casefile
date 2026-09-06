# Payout Reconciliation Casefile — verification 4 handoff

## Outcome

**FAIL — two findings remain. Do not declare the product complete.**

- Work order: `payout-reconciliation-casefile-verify-4`
- Candidate implementation: `b78a3f09bcbcc3b9bdf17cc8037cf651851017e0`
- Documentation reviewed: `0aae841abe8e106fe522fddd4ee1c6a7cd264925`
- Live URL: <https://payout-reconciliation-casefile.sociobot.in>
- Full report: [`.factory/verification-4.md`](verification-4.md)

## Findings

1. **QA-4-01 — Medium:** at 200% text size on a 390 px phone viewport, the live demo widens by 18 px and pushes the coverage seal, totals, and source cards off the right edge.
2. **QA-4-02 — High:** six public claims are absent from `.factory/claims.json` and lack the required exact tagged sandbox tests.

Finding count: **2**. Untested public claim count: **6**.

## Verification completed

- Exact detached candidate checkout used; all 28 public build files match live byte-for-byte.
- All 9 declared claim commands passed separately.
- `npm test`: 10/10 unit and 36/36 browser tests passed.
- `npm run build`, `npm audit --audit-level=high`, and `git diff --check` passed.
- Fresh live desktop and phone first screens name the job, audience, and first action before scrolling.
- Demo sample, persistent label, reset, and separation from real IndexedDB data passed.
- Normal, invalid, recovery, exact-size, adversarial matching, redaction, offline, update, route, 404, legal, keyboard, target, reduced-motion, dark-mode axe, privacy, checkout, and rate-limit checks passed.
- Fresh Lighthouse mobile: 99 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 1.37 s, TBT 128 ms, CLS 0.

## Evidence

- `/work/.evidence/verify4-first-read-desktop.png`
- `/work/.evidence/verify4-first-read-phone.png`
- `/work/.evidence/verify4-phone-dark-200-percent.png`
- `/work/.evidence/verify4-live-offline-phone.png`
- `/work/.evidence/verify4-live-root/verify.json`
- `/work/.evidence/verify4-live-demo/verify.json`
- `/work/.evidence/verify4-lighthouse.json`

## Next steps

Repair 200% text reflow. Register or remove the six omitted public claims, with one tagged sandbox test for each retained claim. Deploy the implementation change, then run a fresh independent verification.
