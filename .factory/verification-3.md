# Independent product verification 3 — FAIL

Tested 2026-08-28 UTC against candidate `41754fe6bf77092a3440c8c47727e88a46f8a723` and <https://payout-reconciliation-casefile.sociobot.in>.

**Disposition: FAIL — do not release.** The live deployment is byte-for-byte identical to the candidate, so this is not a deployment-only failure. The candidate has a critical reconciliation correctness defect and fails the mandatory claims, first-read, and demo-sandbox gates.

## Release-blocking defects

### QA-3-01 — Critical — materially different amounts are falsely marked explained

An exact reference overrides both amount agreement and the configured date window. This lets the product produce false evidence for the central job-to-be-done.

Fresh live reproduction with one row in each source:

```csv
# orders.csv
Order ID,Created at,Gross amount,Currency
ORD-BAD,2026-08-01,100,USD

# processor.csv
Order ID,Payout Date,Net Amount,Currency
ORD-BAD,2026-08-02,1,USD

# ledger.csv
Reference,Date,Amount,Currency
ORD-BAD,2026-08-02,1,USD
```

The live result was:

```text
100% bounded
Orders $100.00 | Processor $1.00 | Ledger $1.00 | Variance $99.00
1-day timing shift for ORD-BAD — EXPLAINED · TIMING — $1.00
```

The finding says the amounts agree even though the page shows a $99 variance. [Screenshot evidence](adversarial-wrong-amount.png).

A second reproduction selected a **±1 day** window with the same reference and equal amounts dated 2026-01-01 versus 2026-05-01. The result was `120-day timing shift for ORD-FAR — EXPLAINED · TIMING` and: “The amounts agree but the processor settled on a later date inside the configured window.” This is 119 days outside that window.

Source inspection confirms the cause: exact-reference candidates bypass the date and amount filters, while the timing branch checks processor-to-ledger agreement but not order-to-processor agreement.

### QA-3-02 — High — required claims registry and claim tests are absent

`.factory/claims.json` does not exist, so the required first action could not run any declared claim tests. A repository-wide search also found no `@claim:*` test tags. Per the acceptance contract, a missing claims manifest is independently release-blocking.

This is not an absence of product claims. Unregistered claims include:

- “Runs locally,” “Works offline,” and “Redacts by default” on the first screen.
- “Nothing uploads. Files stay in this browser’s private storage.”
- Markdown/CSV export, 2¢ tolerance, one-time paid capabilities, and customer-field privacy promises in the UI and README.
- “The app works offline after its first successful load” and other privacy promises on `/privacy/`.

Some outcomes happen to be covered by ordinary tests, but none is connected to a required claim ID and exact test command.

### QA-3-03 — High — cold first screen does not identify the intended user

On a fresh desktop context, the first screen said:

```text
Find the money between the lines.
Match orders, processor payouts, and ledger entries without connecting an account.
Every discrepancy gets a reason or a bounded review group.
```

It explains the task and provides a one-click **Try sample data** action, but it never says this is for a small ecommerce operator or accountant. The mandatory cold-read questions therefore resolve as:

- What it does: yes — matches three exports and explains discrepancies.
- For whom: **no**.
- What to click first: yes — **Try sample data**.

[Cold first-screen evidence](first-read-desktop.png).

### QA-3-04 — High — sample mode is not a sandbox

The one-click sample action works and immediately displays three realistic files. It does not implement the required demo isolation:

- Clicking **Try sample data** wrote `Sample — August payout review` to key `current` in the ordinary `casefile-local-v1` IndexedDB database.
- The sample state survived reload in the same namespace used for real work.
- There is no persistent “Demo — sample data, nothing is saved” banner, **Reset demo**, or **Start for real** action.
- A fresh visit to `/?demo=1` loaded no sample data and showed no demo banner.
- `.factory/demo.md` is missing, and neither README nor the sitemap documents a demo URL.

This can overwrite or mix with a visitor’s actual local workspace, contrary to the demo-sandbox acceptance contract. [Mobile sample evidence](sample-mobile.png).

### QA-3-05 — Medium — desktop footer targets remain narrower than 44 px

At 1440 × 900, the root footer’s visible **Privacy** and **Terms** anchors measured 43 × 44 and 35.7 × 44 CSS pixels. The same links reach 44 × 44 at the 390 px breakpoint, which is why the repository’s mobile-only link assertion passes. The attached accessibility contract requires every touch/click target to be at least 44 × 44.

### QA-3-06 — Medium — required route/metadata/documentation artifacts are incomplete

- An unknown route such as `/this-route-does-not-exist` returns HTTP 200 and renders the home app; there is no designed 404 route.
- The root title is 66 characters, over the 60-character contract.
- Root and legal documents have no canonical link, Open Graph metadata, Twitter card, or Apple touch icon. No 1200 × 630 social image ships.
- Legal pages do not use the required consistent site header/footer, and no route footer exposes a version/build ID.
- `.factory/copy-audit.md` is missing.

### QA-3-07 — Low — a rejected callback token cannot be removed from the locked UI

A fresh `?license=qa-invalid-browser-token` visit stripped the token from the address bar and correctly locked paid features after verification. The rejected token and invalid verdict remained in localStorage, but the locked UI exposes only the paste/verify form, not **Remove from this device**. This leaves a returned or later-revoked token stored indefinitely unless the user replaces it or clears site data, despite the Privacy page saying a license can be removed from the unlock section.

## Required-gate and clean-build evidence

The tracked tree was clean and `HEAD` was exactly the requested candidate before installation. Existing untracked files were evidence retained from the interrupted verification attempt.

| Gate | Fresh result |
| --- | --- |
| `.factory/claims.json` | **FAIL — missing** |
| `npm ci` | Pass; 58 packages, zero vulnerabilities |
| `npm test` | Pass; 8/8 Vitest and 16/16 Playwright tests |
| Type check | Pass through `npm run build` (`tsc --noEmit`) |
| Exact production build | Pass; Vite emitted `dist/` |
| Lint | Not available; no lint script/configuration |
| `npm audit --audit-level=high` | Pass; zero vulnerabilities |
| `git diff --check` | Pass |

This static PWA is not a library/CLI, so consumer package installation is not applicable. It has no product backend other than the Sociobot license calls and requires no sign-in, so backend persistence/concurrency and Entra authority checks are not applicable.

## Functional, boundary, and recovery evidence

- The one-click sample loaded three source files and reconciled to 8 findings at 95.8% bounded: 5 explained, 2 bounded review, and 1 unmatched. Totals were orders $524.00, processor $502.60, ledger $508.60, and variance $15.40.
- Markdown, findings CSV, and workspace JSON downloads completed. Default Markdown/CSV contained no full `ORD-1001`–`ORD-1008` references and no sample email; CSV had one header plus 8 finding rows. The JSON backup correctly retained full local workspace data.
- Sample state persisted in IndexedDB and survived reload.
- A renamed transaction two days away was unmatched at ±1 day and explained at ±3 days.
- A blank required amount produced `orders.csv, row 2: Amount is empty...`; replacing the file recovered successfully.
- Mixed USD/EUR files produced a specific split-by-currency error.
- An unclosed quoted field produced a corrective error; replacement with a valid CSV recovered.
- A file of exactly 15,728,640 bytes was accepted. A file of 15,728,641 bytes was rejected with a split-by-month instruction.
- The repository unit suite also exercised quoted cells, accounting negatives, malformed money, evidence grouping, redaction, and the seeded 1,000-order ≥90% coverage case.

QA-3-01 means these otherwise useful flows are not sufficient for release.

## Live deployment, privacy, billing, and response policy

- All 20 publicly served files from the fresh `dist/` matched production byte-for-byte. `_headers` and `staticwebapp.config.json` are deployment inputs and were excluded. Candidate and deployment identity therefore pass.
- A normal sample/reconcile/export flow made no cross-origin requests and produced no console, page, or request errors. Source review found no analytics, trackers, remote fonts, or CDN scripts.
- Supplying an invalid returned license stripped it from the product URL, sent one GET containing only that token to the Sociobot verification endpoint, left free features available, and showed the locked purchase state. The invalid token and verdict remained in localStorage; the UI offers no direct removal action while locked.
- Checkout returned HTTP 303 to `https://checkout.dodopayments.com/session/...`.
- Rate limiting passed. After a baseline request, a fresh 200-request burst at concurrency 40 completed in 767 ms with 30 HTTP 200 and 170 HTTP 429 responses. Every 429 carried `Retry-After: 4`; throttling was observed after 30 successful responses in that burst.
- Root responses carry CSP (including `frame-ancestors 'none'`), HSTS, `nosniff`, strict-origin referrer policy, Permissions Policy, and `X-Frame-Options: DENY`.
- Hashed JS uses `public, max-age=31536000, immutable`; `sw.js` is `no-cache`; the manifest has the correct MIME type. HTML uses a 30-second revalidation policy.

## Browser, accessibility, PWA, and performance evidence

- Live Chromium checks covered desktop 1440 × 900 and mobile 390 × 844, light and dark schemes, reduced motion, the initial and reconciled states, Privacy, and Terms.
- Axe reported zero serious/critical findings in desktop light initial, mobile dark/reduced-motion results, mobile light Privacy, and mobile dark Terms states.
- Each checked page had `lang="en"`, one `h1`, one `main`, no unlabeled buttons, no horizontal overflow, and no browser console/page errors.
- At 200% root text size on 390 px, the reconciled page retained zero horizontal document overflow.
- Keyboard order begins with the skip link and reaches the brand, both first-screen actions, case name, import, clear, all three source inputs, templates, date window, sample action, legal links, and unlock. Checked controls had a visible 3 px blue outline and no trap.
- Reduced-motion mode changed transitions to `0.01ms` and smooth scrolling to `auto`.
- The manifest parsed with standalone display, a versioned start URL, 192/512 icons, and a maskable icon.
- A fresh service-worker install cached the fingerprinted JS and CSS. After clearing only the browser HTTP cache and going offline, reload retained one `h1`, the saved sample workspace, and the **Offline** state. [Offline evidence](offline-mobile.png).
- Registering a changed worker URL created a waiting worker and displayed **Update ready. Reload**. Activating it changed the controller and retained the saved workspace.

Fresh Lighthouse 12.8.2 mobile result:

| Category/metric | Result |
| --- | ---: |
| Performance | 99 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1.0 s |
| LCP | 1.1 s |
| TBT | 0 ms |
| CLS | 0 |

Production budgets pass:

| Asset | Raw | Gzip | Budget |
| --- | ---: | ---: | ---: |
| Initial JS | 34.29 KB | 12.04 KB | ≤200 KB raw |
| Main CSS | 18.46 KB | 4.65 KB | ≤50 KB raw |
| Hero WebP | 62.66 KB | — | ≤300 KB |
| Fonts | 0 KB | — | ≤120 KB |

Total `dist/` size is 223,566 bytes.

## Required disposition

Do not promote this candidate. At minimum:

1. Prevent exact references from bypassing defensible amount/date rules, and add regression tests for large amount mismatches plus same-reference records outside the selected window.
2. Add `.factory/claims.json` and exactly one demo-entry-point test for every user-facing claim.
3. Name the intended ecommerce operator/accountant on the first screen.
4. Implement the documented, isolated `/demo` or `?demo=1` storage namespace, banner, reset, and exit behavior; add `.factory/demo.md`.
5. Repair the remaining desktop hit areas and the missing site metadata/404/copy-audit requirements.

Then rerun independent verification against the newly deployed commit.
