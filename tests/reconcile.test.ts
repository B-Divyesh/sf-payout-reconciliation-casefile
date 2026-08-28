import { describe, expect, it } from 'vitest';
import { canonicalize, parseMoney, reconcile } from '../src/reconcile';
import { guessMapping, parseCsv } from '../src/csv';
import type { CanonicalRow, SourceKind } from '../src/types';

function row(source: SourceKind, index: number, amount: number, dateOffset = 0, fee = 0): CanonicalRow {
  const reference = `ORD-${String(index).padStart(4, '0')}`;
  const timestamp = Date.UTC(2026, 7, 1 + dateOffset);
  return { key: `${source}-${index}`, source, rowNumber: index + 2, reference, normalizedReference: String(index).padStart(4, '0'), date: new Date(timestamp).toISOString().slice(0, 10), timestamp, amount, fee, refund: 0, customer: `customer-${index}@example.test`, memo: '', currency: 'USD' };
}

describe('CSV intake', () => {
  it('parses quoted values and guesses common columns', () => {
    const table = parseCsv('Order ID,Created at,Gross amount,Customer email\n"ORD, 1",2026-08-01,"1,200.50",a@example.test', 'orders', 'orders.csv');
    const mapping = guessMapping(table);
    expect(table.rows[0]?.['Order ID']).toBe('ORD, 1');
    expect(mapping).toMatchObject({ reference: 'Order ID', date: 'Created at', amount: 'Gross amount', customer: 'Customer email' });
    expect(canonicalize(table, mapping)[0]?.amount).toBe(1200.5);
  });

  it('handles accounting negatives and rejects malformed values', () => {
    expect(parseMoney('($1,204.50)')).toBe(-1204.5);
    expect(parseMoney('42.10-')).toBe(-42.1);
    expect(() => parseMoney('not money')).toThrow(/valid amount/);
  });
});

describe('reconciliation evidence', () => {
  it('explains fees and date shifts, then isolates missing source rows', () => {
    const orders = [row('orders', 1, 100), row('orders', 2, 50), row('orders', 3, 25)];
    const processor = [row('processor', 1, 96.8, 1, 3.2), row('processor', 2, 50, 3), row('processor', 9, 12, 2)];
    const ledger = [row('ledger', 1, 96.8, 2), row('ledger', 2, 50, 3), row('ledger', 8, 8, 2)];
    const result = reconcile(orders, processor, ledger, 7);
    expect(result.findings.some((item) => item.reason === 'processor_fee')).toBe(true);
    expect(result.findings.some((item) => item.reason === 'timing')).toBe(true);
    expect(result.findings.some((item) => item.reason === 'missing_processor')).toBe(true);
    expect(result.findings.filter((item) => item.reason === 'unlinked_source')).toHaveLength(2);
  });

  it('bounds at least 90% of exception exposure in a seeded 1,000-order close', () => {
    const orders: CanonicalRow[] = [];
    const processor: CanonicalRow[] = [];
    const ledger: CanonicalRow[] = [];
    for (let index = 1; index <= 1000; index += 1) {
      const amount = 40 + (index % 160);
      orders.push(row('orders', index, amount));
      if (index > 950) continue;
      const fee = index <= 700 ? 3 : 0;
      const dateOffset = index > 700 && index <= 850 ? 3 : 1;
      const payout = row('processor', index, amount - fee, dateOffset, fee);
      if (index > 850) payout.amount -= 1;
      processor.push(payout);
      ledger.push(row('ledger', index, payout.amount, dateOffset + 1));
    }
    const result = reconcile(orders, processor, ledger, 7);
    expect(result.sourceCounts.orders).toBe(1000);
    expect(result.coverage).toBeGreaterThanOrEqual(90);
    expect(result.findings).toHaveLength(1000);
    expect(result.findings.every((item) => item.reason && item.explanation && item.evidence.length)).toBe(true);
  });
});
