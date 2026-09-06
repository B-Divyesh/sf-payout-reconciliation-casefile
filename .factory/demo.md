# Demo sandbox

- URL: `https://payout-reconciliation-casefile.sociobot.in/demo/`
- Local URL: `http://127.0.0.1:4173/demo/`
- Entry: select **Try it with sample data** on the first screen.

The demo opens six sample orders, six processor rows, six ledger rows, and a completed eight-finding casefile. The result includes fees, a refund, a missing processor row, a processor-only row, and a ledger-only row.

Demo state stays in memory. Demo mode does not open or write the `casefile-local-v1` IndexedDB database or the license keys in localStorage. **Reset demo** recreates the original sample. **Start for real** leaves the demo and loads the real browser workspace. No demo edits are copied across that boundary.

The demo route and sample are part of the offline app shell. They remain available after the first successful visit.
