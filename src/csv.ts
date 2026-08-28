import type { ColumnMap, CsvTable, SourceKind } from './types';

const aliases: Record<keyof ColumnMap, string[]> = {
  reference: ['order id', 'order_id', 'order number', 'reference', 'transaction id', 'transaction_id', 'invoice', 'id'],
  date: ['payout date', 'processed date', 'transaction date', 'created at', 'created_at', 'date', 'timestamp'],
  amount: ['net amount', 'net_amount', 'net', 'payout amount', 'gross amount', 'gross_amount', 'total', 'amount'],
  fee: ['processing fee', 'processor fee', 'fee amount', 'fee_amount', 'fees', 'fee'],
  refund: ['refund amount', 'refunded amount', 'refund_amount', 'refunds', 'refund'],
  customer: ['customer email', 'email', 'customer name', 'customer', 'buyer'],
  memo: ['description', 'memo', 'note', 'type'],
  currency: ['currency code', 'currency_code', 'currency']
};

export function parseCsv(text: string, kind: SourceKind, fileName = `${kind}.csv`): CsvTable {
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '"') {
      if (quoted && normalized[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && normalized[i + 1] === '\n') i += 1;
      row.push(field.trim()); field = '';
      if (row.some((cell) => cell !== '')) matrix.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(Boolean)) matrix.push(row); }
  if (quoted) throw new Error('The CSV has an unclosed quoted field. Export it again and retry.');
  const headers = (matrix.shift() ?? []).map((header, index) => header || `Column ${index + 1}`);
  if (headers.length < 2 || matrix.length === 0) throw new Error('This file needs a header row and at least one data row.');
  const rows = matrix.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  return { kind, fileName, headers, rows };
}

export function guessMapping(table: CsvTable): ColumnMap {
  const used = new Set<string>();
  const pick = (field: keyof ColumnMap): string => {
    const ranked = aliases[field];
    for (const alias of ranked) {
      const found = table.headers.find((header) => header.trim().toLowerCase() === alias && !used.has(header));
      if (found) { used.add(found); return found; }
    }
    const partial = table.headers.find((header) => ranked.some((alias) => header.toLowerCase().includes(alias)) && !used.has(header));
    if (partial) { used.add(partial); return partial; }
    return '';
  };
  return {
    reference: pick('reference'),
    date: pick('date'),
    amount: pick('amount'),
    fee: pick('fee'),
    refund: pick('refund'),
    customer: pick('customer'),
    memo: pick('memo'),
    currency: pick('currency')
  };
}

export function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
