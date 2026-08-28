import { escapeCsv } from './csv';
import type { Finding, ReconciliationResult } from './types';

const money = (value: number) => value.toFixed(2);
const redactRef = (value: string) => value.length <= 4 ? '••••' : `${value.slice(0, 3)}…${value.slice(-2)}`;
const displayRef = (finding: Finding, redacted: boolean): string => {
  const ref = finding.order?.reference ?? finding.processor?.reference ?? finding.ledger?.reference ?? 'unknown';
  return redacted ? redactRef(ref) : ref;
};

function redactFindingText(value: string, finding: Finding): string {
  const references = [finding.order?.reference, finding.processor?.reference, finding.ledger?.reference]
    .filter((reference): reference is string => Boolean(reference))
    .sort((a, b) => b.length - a.length);
  return references.reduce((text, reference) => text.replaceAll(reference, redactRef(reference)), value);
}

export function markdownReport(result: ReconciliationResult, name: string, redacted: boolean): string {
  const groups = ['explained', 'review', 'unmatched'] as const;
  const lines = [
    `# ${name || 'Payout reconciliation casefile'}`,
    '', `Generated ${new Date(result.createdAt).toISOString()} · matching window ±${result.windowDays} days`,
    '', '> Evidence summary only. This is not tax or accounting advice.',
    '', '## Source totals', '',
    '| Source | Rows | Total |', '| --- | ---: | ---: |',
    `| Orders | ${result.sourceCounts.orders} | ${result.currency} ${money(result.totals.orders)} |`,
    `| Processor | ${result.sourceCounts.processor} | ${result.currency} ${money(result.totals.processor)} |`,
    `| Ledger | ${result.sourceCounts.ledger} | ${result.currency} ${money(result.totals.ledger)} |`,
    `| Order → ledger variance |  | ${result.currency} ${money(result.totals.variance)} |`,
    '', `**Coverage:** ${result.coverage}% of exception value is explained or placed in a bounded review group.`,
    '', `**Identifiers:** ${redacted ? 'Redacted by default.' : 'Included at the exporter’s direction.'}`
  ];
  for (const status of groups) {
    const items = result.findings.filter((item) => item.status === status);
    lines.push('', `## ${status.charAt(0).toUpperCase()}${status.slice(1)} (${items.length})`, '');
    if (!items.length) lines.push('_None._');
    for (const item of items) {
      const title = redacted ? redactFindingText(item.title, item) : item.title;
      const explanation = redacted ? redactFindingText(item.explanation, item) : item.explanation;
      const evidence = redacted ? item.evidence.map((line) => redactFindingText(line, item)) : item.evidence;
      lines.push(`### ${displayRef(item, redacted)} — ${title}`, '', explanation, '', ...evidence.map((line) => `- ${line}`), '');
    }
  }
  lines.push('---', 'Created locally with Payout Reconciliation Casefile. Customer fields are never transmitted.');
  return lines.join('\n');
}

export function csvReport(result: ReconciliationResult, redacted: boolean): string {
  const header = ['status', 'reason', 'reference', 'amount', 'order_date', 'processor_date', 'ledger_date', 'explanation'];
  const rows = result.findings.map((item) => [item.status, item.reason, displayRef(item, redacted), money(item.amount), item.order?.date ?? '', item.processor?.date ?? '', item.ledger?.date ?? '', item.explanation]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
