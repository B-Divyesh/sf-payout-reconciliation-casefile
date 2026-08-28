export type SourceKind = 'orders' | 'processor' | 'ledger';

export interface CsvTable {
  kind: SourceKind;
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface ColumnMap {
  reference: string;
  date: string;
  amount: string;
  fee: string;
  refund: string;
  customer: string;
  memo: string;
  currency: string;
}

export interface CanonicalRow {
  key: string;
  source: SourceKind;
  rowNumber: number;
  reference: string;
  normalizedReference: string;
  date: string;
  timestamp: number;
  amount: number;
  fee: number;
  refund: number;
  customer: string;
  memo: string;
  currency: string;
}

export type FindingReason = 'balanced' | 'processor_fee' | 'refund' | 'timing' | 'missing_processor' | 'missing_ledger' | 'unlinked_source' | 'duplicate';
export type FindingStatus = 'explained' | 'review' | 'unmatched';

export interface Finding {
  id: string;
  status: FindingStatus;
  reason: FindingReason;
  title: string;
  explanation: string;
  amount: number;
  order?: CanonicalRow;
  processor?: CanonicalRow;
  ledger?: CanonicalRow;
  evidence: string[];
}

export interface ReconciliationResult {
  createdAt: string;
  currency: string;
  findings: Finding[];
  sourceCounts: Record<SourceKind, number>;
  totals: { orders: number; processor: number; ledger: number; variance: number };
  explainedAmount: number;
  reviewedAmount: number;
  unresolvedAmount: number;
  coverage: number;
  windowDays: number;
}

export interface WorkspaceState {
  name: string;
  tables: Partial<Record<SourceKind, CsvTable>>;
  mappings: Partial<Record<SourceKind, ColumnMap>>;
  windowDays: number;
  result?: ReconciliationResult;
  updatedAt: string;
}
