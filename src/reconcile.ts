import type { CanonicalRow, ColumnMap, CsvTable, Finding, FindingReason, ReconciliationResult, SourceKind } from './types';

const DAY = 86_400_000;
const cents = (value: number) => Math.round(value * 100) / 100;
const close = (a: number, b: number, tolerance = 0.02) => Math.abs(a - b) <= tolerance;
const normalizeRef = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^(order|ord|txn|tx|inv)/, '');

export function parseMoney(input: string): number {
  if (!input) return 0;
  let value = input.trim();
  const negative = /^\(.*\)$/.test(value) || value.endsWith('-');
  value = value.replace(/[()\s$£€¥,]/g, '').replace(/-$/, '');
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`“${input}” is not a valid amount.`);
  return cents(negative ? -parsed : parsed);
}

export function canonicalize(table: CsvTable, mapping: ColumnMap): CanonicalRow[] {
  if (!mapping.reference || !mapping.date || !mapping.amount) throw new Error(`${table.kind}: map Reference, Date, and Amount before reconciling.`);
  return table.rows.map((raw, index) => {
    const reference = raw[mapping.reference]?.trim() ?? '';
    const rawDate = raw[mapping.date]?.trim() ?? '';
    const timestamp = Date.parse(rawDate);
    if (!reference) throw new Error(`${table.fileName}, row ${index + 2}: Reference is empty.`);
    if (!Number.isFinite(timestamp)) throw new Error(`${table.fileName}, row ${index + 2}: “${rawDate}” is not a recognized date.`);
    try {
      return {
        key: `${table.kind}-${index + 2}`,
        source: table.kind,
        rowNumber: index + 2,
        reference,
        normalizedReference: normalizeRef(reference),
        date: new Date(timestamp).toISOString().slice(0, 10),
        timestamp,
        amount: parseMoney(raw[mapping.amount] ?? ''),
        fee: mapping.fee ? Math.abs(parseMoney(raw[mapping.fee] ?? '')) : 0,
        refund: mapping.refund ? Math.abs(parseMoney(raw[mapping.refund] ?? '')) : 0,
        customer: mapping.customer ? raw[mapping.customer]?.trim() ?? '' : '',
        memo: mapping.memo ? raw[mapping.memo]?.trim() ?? '' : '',
        currency: mapping.currency ? raw[mapping.currency]?.trim().toUpperCase() || 'USD' : 'USD'
      };
    } catch (error) {
      throw new Error(`${table.fileName}, row ${index + 2}: ${(error as Error).message}`);
    }
  });
}

function bestMatch(target: CanonicalRow, candidates: CanonicalRow[], used: Set<string>, windowDays: number, expectedAmount: number): CanonicalRow | undefined {
  return candidates
    .filter((candidate) => !used.has(candidate.key))
    .map((candidate) => {
      const days = Math.abs(candidate.timestamp - target.timestamp) / DAY;
      const exactRef = target.normalizedReference && candidate.normalizedReference === target.normalizedReference;
      const amountFits = close(Math.abs(candidate.amount) + candidate.fee, Math.abs(expectedAmount)) || close(Math.abs(candidate.amount), Math.abs(expectedAmount));
      const score = (exactRef ? 100 : 0) + (amountFits ? 40 : 0) + Math.max(0, windowDays - days);
      return { candidate, days, exactRef, amountFits, score };
    })
    .filter(({ days, exactRef, amountFits }) => exactRef || (days <= windowDays && amountFits))
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}

function finding(reason: FindingReason, status: Finding['status'], amount: number, title: string, explanation: string, rows: Partial<Pick<Finding, 'order' | 'processor' | 'ledger'>>, evidence: string[]): Finding {
  const seed = rows.order?.key ?? rows.processor?.key ?? rows.ledger?.key ?? title;
  return { id: `${reason}-${seed}`, reason, status, amount: cents(amount), title, explanation, ...rows, evidence };
}

export function reconcile(orders: CanonicalRow[], processor: CanonicalRow[], ledger: CanonicalRow[], windowDays: number): ReconciliationResult {
  const currencies = new Set([...orders, ...processor, ...ledger].map((row) => row.currency || 'USD'));
  if (currencies.size > 1) throw new Error(`This casefile contains multiple currencies (${[...currencies].join(', ')}). Split the exports by currency so totals remain defensible.`);
  const currency = [...currencies][0] ?? 'USD';
  const findings: Finding[] = [];
  const usedProcessor = new Set<string>();
  const usedLedger = new Set<string>();
  const duplicateRefs = new Set<string>();
  const refs = new Set<string>();
  for (const row of orders) {
    if (refs.has(row.normalizedReference)) duplicateRefs.add(row.normalizedReference);
    refs.add(row.normalizedReference);
  }

  for (const order of orders) {
    const expected = cents(order.amount - order.refund);
    if (duplicateRefs.has(order.normalizedReference)) {
      findings.push(finding('duplicate', 'review', expected, `Duplicate order reference ${order.reference}`, 'More than one order row uses this normalized reference. Review this bounded group before relying on an automatic match.', { order }, [`Order row ${order.rowNumber}`, `Normalized reference: ${order.normalizedReference}`]));
      continue;
    }
    const payout = bestMatch(order, processor, usedProcessor, windowDays, expected);
    if (!payout) {
      findings.push(finding('missing_processor', 'unmatched', expected, `No processor row for ${order.reference}`, `No payout row with the same reference or a matching amount was found within ±${windowDays} days.`, { order }, [`Order ${order.date}: ${expected.toFixed(2)}`, `Searched ±${windowDays} days`]));
      continue;
    }
    usedProcessor.add(payout.key);
    const ledgerRow = bestMatch(payout, ledger, usedLedger, windowDays, payout.amount);
    if (ledgerRow) usedLedger.add(ledgerRow.key);
    const dateGap = Math.round(Math.abs(payout.timestamp - order.timestamp) / DAY);
    const feeFits = payout.fee > 0 && close(expected, payout.amount + payout.fee);
    const refundLike = order.refund > 0 || payout.amount < 0 || /refund/i.test(payout.memo);
    const ledgerFits = ledgerRow && close(ledgerRow.amount, payout.amount);

    if (!ledgerRow) {
      findings.push(finding('missing_ledger', 'unmatched', payout.amount, `Payout not found in ledger: ${payout.reference}`, `The processor row matched the order, but no ledger amount was found within ±${windowDays} days.`, { order, processor: payout }, [`Order ${expected.toFixed(2)}`, `Processor ${payout.amount.toFixed(2)}`, `Processor row ${payout.rowNumber}`]));
    } else if (refundLike) {
      findings.push(finding('refund', 'explained', Math.abs(order.refund || payout.amount), `Refund carried through for ${order.reference}`, 'A refund or negative settlement is present and the processor amount is represented in the ledger.', { order, processor: payout, ledger: ledgerRow }, [`Order refund ${order.refund.toFixed(2)}`, `Processor ${payout.amount.toFixed(2)}`, `Ledger ${ledgerRow.amount.toFixed(2)}`]));
    } else if (feeFits && ledgerFits) {
      findings.push(finding('processor_fee', 'explained', payout.fee, `Expected fee on ${order.reference}`, 'Order less the disclosed processor fee equals the payout, and that net amount appears in the ledger.', { order, processor: payout, ledger: ledgerRow }, [`Order ${expected.toFixed(2)}`, `Fee ${payout.fee.toFixed(2)}`, `Processor and ledger ${payout.amount.toFixed(2)}`]));
    } else if (dateGap > 0 && ledgerFits) {
      findings.push(finding('timing', 'explained', payout.amount, `${dateGap}-day timing shift for ${order.reference}`, `The amounts agree but the processor settled on a later date inside the configured window.`, { order, processor: payout, ledger: ledgerRow }, [`Order date ${order.date}`, `Processor date ${payout.date}`, `Ledger date ${ledgerRow.date}`]));
    } else if (close(expected, payout.amount) && ledgerFits) {
      findings.push(finding('balanced', 'explained', payout.amount, `${order.reference} balances`, 'Order, processor, and ledger amounts agree within two cents.', { order, processor: payout, ledger: ledgerRow }, [`Order ${expected.toFixed(2)}`, `Processor ${payout.amount.toFixed(2)}`, `Ledger ${ledgerRow.amount.toFixed(2)}`]));
    } else {
      findings.push(finding('unlinked_source', 'review', Math.abs(expected - payout.amount), `Bounded variance for ${order.reference}`, 'The rows are linked by reference or timing, but the amounts do not form an expected fee/refund pattern. Review these three rows together.', { order, processor: payout, ledger: ledgerRow }, [`Order ${expected.toFixed(2)}`, `Processor ${payout.amount.toFixed(2)}`, `Ledger ${ledgerRow.amount.toFixed(2)}`]));
    }
  }

  for (const row of processor.filter((item) => !usedProcessor.has(item.key))) {
    findings.push(finding('unlinked_source', 'review', row.amount, `Processor-only row ${row.reference}`, 'This payout row was not linked to an order. It is isolated here rather than silently dropped.', { processor: row }, [`Processor row ${row.rowNumber}`, `${row.date}: ${row.amount.toFixed(2)}`]));
  }
  for (const row of ledger.filter((item) => !usedLedger.has(item.key))) {
    findings.push(finding('unlinked_source', 'review', row.amount, `Ledger-only row ${row.reference}`, 'This ledger row was not linked to a processor payout. It is isolated here rather than silently dropped.', { ledger: row }, [`Ledger row ${row.rowNumber}`, `${row.date}: ${row.amount.toFixed(2)}`]));
  }

  const totalOrders = cents(orders.reduce((sum, row) => sum + row.amount - row.refund, 0));
  const totalProcessor = cents(processor.reduce((sum, row) => sum + row.amount, 0));
  const totalLedger = cents(ledger.reduce((sum, row) => sum + row.amount, 0));
  const exposure = (item: Finding) => Math.abs(item.order ? item.order.amount - item.order.refund : item.processor?.amount ?? item.ledger?.amount ?? item.amount);
  const absolute = (status: Finding['status']) => findings.filter((item) => item.status === status).reduce((sum, item) => sum + exposure(item), 0);
  const explainedAmount = cents(absolute('explained'));
  const reviewedAmount = cents(absolute('review'));
  const unresolvedAmount = cents(absolute('unmatched'));
  const denominator = explainedAmount + reviewedAmount + unresolvedAmount;
  return {
    createdAt: new Date().toISOString(), currency, findings,
    sourceCounts: { orders: orders.length, processor: processor.length, ledger: ledger.length },
    totals: { orders: totalOrders, processor: totalProcessor, ledger: totalLedger, variance: cents(totalOrders - totalLedger) },
    explainedAmount, reviewedAmount, unresolvedAmount,
    coverage: denominator ? Math.round(((explainedAmount + reviewedAmount) / denominator) * 1000) / 10 : 100,
    windowDays
  };
}
