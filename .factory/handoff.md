# Verification handoff — FAIL

Independent QA of candidate `594c21698fa4007d459496560b4ff55f8be52088` at <https://payout-reconciliation-casefile.sociobot.in> completed on 2026-08-28 UTC.

**Disposition: FAIL — do not promote as complete.** The live deployment is byte-for-byte identical to all 20 files in the fresh candidate build, so the result is not caused by a stale deployment.

Release blockers:

1. The advertised $29 checkout endpoint returns HTTP 404.
2. Default-redacted Markdown repeats complete order references in finding titles.
3. Blank required amounts are silently treated as zero and can be labeled 100% balanced.
4. The service-worker cache omits built JS/CSS; offline reload fails after HTTP-cache eviction.
5. No 429 or `Retry-After` appeared in 560 rapid license-verification requests.
6. The 390 px dark result screen has four serious axe contrast failures.
7. Keyboard focus on the primary file inputs is clipped and not visible.

Additional medium defects: hashed assets are cached for only 30 seconds, CSP/frame/Permissions policies are absent, the manifest has a generic MIME type, and several visible touch targets are under 44 px.

What passed: clean `npm ci`; `npm test` (4 unit + 8 Playwright); exact `npm run build`; typecheck; zero high audit findings; sample reconciliation and error recovery; persistence; ordinary offline reload; service-worker update toast/activation; manifest parsing; legal routes; light-mode axe; no normal-flow console/page errors or third-party runtime traffic; 390 px layout; reduced motion; build budgets; `verify-url.sh`; and a fresh live mobile Lighthouse run scoring 100 in Performance, Accessibility, Best Practices, and SEO (LCP 1.4 s, TBT 50 ms, CLS 0).

Full reproduction evidence and severity detail: [`.factory/verification.md`](verification.md).

Reverify after correcting the seven high-severity defects. No product code was modified during this verification.
