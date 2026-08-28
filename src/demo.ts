import { guessMapping, parseCsv } from './csv';
import type { ColumnMap, CsvTable, SourceKind } from './types';

const orders = `Order ID,Created at,Gross amount,Refund amount,Customer email,Currency
ORD-1001,2026-08-01,120.00,0,mina@example.test,USD
ORD-1002,2026-08-01,85.00,0,jo@example.test,USD
ORD-1003,2026-08-02,62.50,12.50,alex@example.test,USD
ORD-1004,2026-08-03,200.00,0,sam@example.test,USD
ORD-1005,2026-08-04,45.00,0,lee@example.test,USD
ORD-1006,2026-08-05,24.00,0,river@example.test,USD`;

const processor = `Transaction ID,Processed date,Net amount,Processing fee,Description,Currency
ORD-1001,2026-08-01,116.20,3.80,sale,USD
ORD-1002,2026-08-03,82.20,2.80,sale,USD
ORD-1003,2026-08-02,48.00,2.00,partial refund,USD
ORD-1004,2026-08-03,193.80,6.20,sale,USD
ORD-1005,2026-08-05,43.40,1.60,sale,USD
PAY-ORPHAN,2026-08-07,19.00,1.00,sale,USD`;

const ledger = `Reference,Date,Amount,Memo,Currency
ORD-1001,2026-08-02,116.20,processor deposit,USD
ORD-1002,2026-08-03,82.20,processor deposit,USD
ORD-1003,2026-08-03,48.00,refund net,USD
ORD-1004,2026-08-04,193.80,processor deposit,USD
ORD-1005,2026-08-06,43.40,processor deposit,USD
LEDGER-ONLY,2026-08-08,25.00,manual deposit,USD`;

export function demoWorkspace(): { tables: Record<SourceKind, CsvTable>; mappings: Record<SourceKind, ColumnMap> } {
  const tables = {
    orders: parseCsv(orders, 'orders', 'sample-orders.csv'),
    processor: parseCsv(processor, 'processor', 'sample-processor.csv'),
    ledger: parseCsv(ledger, 'ledger', 'sample-ledger.csv')
  };
  return { tables, mappings: {
    orders: guessMapping(tables.orders), processor: guessMapping(tables.processor), ledger: guessMapping(tables.ledger)
  }};
}

export const templates: Record<SourceKind, string> = {
  orders: 'order_id,date,amount,refund,customer,currency\nORD-001,2026-08-01,100.00,0,customer@example.test,USD\n',
  processor: 'order_id,date,net,fee,memo,currency\nORD-001,2026-08-02,96.80,3.20,sale,USD\n',
  ledger: 'reference,date,amount,memo,currency\nORD-001,2026-08-03,96.80,processor deposit,USD\n'
};
