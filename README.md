# Payout Reconciliation Casefile

This offline browser utility is for small ecommerce operators and accountants. It explains differences between order, processor, and ledger CSV exports.

The app groups differences into processor fees, refunds, timing shifts, missing rows, duplicates, and source-only records. It does not connect financial accounts.

Live product: <https://payout-reconciliation-casefile.sociobot.in>

One-click sample: <https://payout-reconciliation-casefile.sociobot.in/demo/>

## What it includes

- Imports quoted CSV cells, accounting negatives, and common column names.
- Lets the user confirm every required column mapping.
- Keeps matches inside the selected date window.
- Uses a two-cent amount tolerance for amount agreement.
- Marks linked amount differences for review instead of calling them explained.
- Exports Markdown and findings CSV with references hidden by default.
- Omits mapped customer names and emails from those reports.
- Saves the real workspace in browser IndexedDB.
- Exports and imports a workspace JSON backup.
- Works offline after the first successful visit.
- Supports keyboard use, 44-pixel targets, dark mode, and reduced motion.

The free workspace includes reconciliation, redaction, and all exports. A $29 one-time Analyst license adds three local features:

- Saved column mappings for later files with the same headers.
- Local snapshots of completed casefiles.
- Matching windows up to 60 days.

The purchase uses the Sociobot billing API. Sociobot/Dodo is the merchant of record.

This tool does not post entries, calculate tax, or provide accounting advice. Check each casefile against the original exports.

## Demo isolation

Open `/demo/` or select **Try it with sample data**. The demo immediately shows a completed eight-finding payout casefile.

Demo changes stay in memory and never enter the real workspace database. **Reset demo** restores the sample. **Start for real** discards demo changes.

See [`.factory/demo.md`](.factory/demo.md) for the sample and storage boundary.

## CSV expectations

Each file needs a header row and three mapped fields.

| Export | Required fields | Useful optional fields |
| --- | --- | --- |
| Orders | reference, date, gross amount | refund, customer, currency |
| Processor | reference, settlement date, settled net amount | fee, memo, currency |
| Ledger | reference, posting date, amount | memo, currency |

Column names can differ because the mapping step is authoritative. Use the settled net amount for processor data.

One casefile must contain one currency. Split mixed-currency exports before reconciliation.

## Develop and verify

Install Node.js 20 or later and npm. Then run:

```bash
npm ci
npm run dev
```

Run every quality gate with:

```bash
npm test
npm run build
npm audit --audit-level=high
```

`npm test` runs Vitest and Playwright. The suite covers reconciliation, demo isolation, downloads, persistence, accessibility, and offline reload.

Public product claims and their exact commands are in [`.factory/claims.json`](.factory/claims.json). Each command starts from the isolated demo entry point.

Inspect the production build with:

```bash
npm run preview
```

## Architecture and privacy

The stack is Vite and vanilla TypeScript. Matching and report generation run in the browser.

Real workspace records use IndexedDB. The demo uses memory and never reads that database.

The optional license token and verification verdict use localStorage. License verification sends only the token to the Sociobot API.

The product has no analytics, tracking pixels, remote fonts, or CDN scripts.

The generated hero source and prompt are in `assets/src/`. Design decisions and provenance are in [`.factory/design.md`](.factory/design.md).

## Deployment

Deploy the contents of `dist/` as a static site. The build emits root, demo, privacy, terms, and 404 documents.

The service worker is rooted at `/sw.js`. HTTPS is required outside localhost.

`staticwebapp.config.json` defines the 404 rewrite, security headers, MIME types, and immutable asset caching. Product registration, DNS, and billing remain factory responsibilities.

## License

MIT. See [`LICENSE`](LICENSE).
