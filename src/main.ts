import './styles.css';
import { canonicalize, reconcile } from './reconcile';
import { guessMapping, parseCsv } from './csv';
import { demoWorkspace, templates } from './demo';
import { csvReport, downloadText, markdownReport } from './report';
import { acceptReturnedLicense, cachedUnlocked, checkoutUrl, clearToken, getToken, storeToken, verifyLicense } from './license';
import { archiveWorkspace, clearWorkspace, loadArchives, loadWorkspace, saveWorkspace, type ArchiveItem } from './storage';
import type { ColumnMap, FindingStatus, SourceKind, WorkspaceState } from './types';

const kinds: SourceKind[] = ['orders', 'processor', 'ledger'];
const labels: Record<SourceKind, { step: string; name: string; hint: string }> = {
  orders: { step: '01', name: 'Orders', hint: 'Gross sales and refunds' },
  processor: { step: '02', name: 'Processor', hint: 'Settlements, net and fees' },
  ledger: { step: '03', name: 'Ledger', hint: 'Deposits or clearing entries' }
};
const mappingLabels: { key: keyof ColumnMap; label: string; required?: boolean }[] = [
  { key: 'reference', label: 'Reference', required: true }, { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount / net', required: true }, { key: 'fee', label: 'Fee' },
  { key: 'refund', label: 'Refund' }, { key: 'customer', label: 'Customer' },
  { key: 'memo', label: 'Memo / type' }, { key: 'currency', label: 'Currency' }
];

let state: WorkspaceState = { name: 'August payout review', tables: {}, mappings: {}, windowDays: 7, updatedAt: new Date().toISOString() };
let busy = false;
let errorMessage = '';
let notice = '';
let filter: FindingStatus | 'all' = 'all';
let redacted = true;
let unlocked = cachedUnlocked();
let archives: ArchiveItem[] = [];

const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
const money = (value: number, currency = 'USD'): string => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
const statusLabel: Record<FindingStatus, string> = { explained: 'Explained', review: 'Bounded review', unmatched: 'Unmatched' };

function sourceCard(kind: SourceKind): string {
  const table = state.tables[kind];
  return `<article class="source-card ${table ? 'is-loaded' : ''}" data-kind="${kind}">
    <div class="source-number" aria-hidden="true">${labels[kind].step}</div>
    <div class="source-copy"><h3>${labels[kind].name}</h3><p>${labels[kind].hint}</p></div>
    ${table ? `<div class="file-proof"><strong>${esc(table.fileName)}</strong><span>${table.rows.length.toLocaleString()} rows · ${table.headers.length} columns</span></div>
      <label class="replace-file"><span>Replace CSV</span><input class="file-input" id="file-${kind}" data-kind="${kind}" type="file" accept=".csv,text/csv" /></label>` : `<label class="file-trigger"><span>Choose ${labels[kind].name.toLowerCase()} CSV</span><input class="file-input" id="file-${kind}" data-kind="${kind}" type="file" accept=".csv,text/csv" /></label>`}
    <a class="template-link" href="#" data-template="${kind}">Download template</a>
  </article>`;
}

function mappingPanel(kind: SourceKind): string {
  const table = state.tables[kind]; const mapping = state.mappings[kind];
  if (!table || !mapping) return '';
  return `<details class="mapping-panel" ${Object.values(mapping).filter(Boolean).length < 3 ? 'open' : ''}>
    <summary><span>${labels[kind].name} column map</span><span class="map-state">${mapping.reference && mapping.date && mapping.amount ? 'Required fields mapped' : 'Needs attention'}</span></summary>
    <div class="mapping-grid">${mappingLabels.map((field) => `<label>${field.label}${field.required ? ' *' : ''}<select data-map-kind="${kind}" data-map-field="${field.key}">
      <option value="">${field.required ? 'Choose column' : 'Not present'}</option>${table.headers.map((header) => `<option value="${esc(header)}" ${mapping[field.key] === header ? 'selected' : ''}>${esc(header)}</option>`).join('')}
    </select></label>`).join('')}</div>
    <p class="mapping-note">* Required. Amount should be gross for orders and settled net for processor/ledger.</p>
  </details>`;
}

function emptyResults(): string {
  const count = kinds.filter((kind) => state.tables[kind]).length;
  return `<section class="results-empty" aria-labelledby="results-title">
    <div class="empty-stamp" aria-hidden="true">${count}/3</div>
    <div><p class="eyebrow">Evidence output</p><h2 id="results-title">${count ? 'Complete the source set' : 'No casefile yet'}</h2>
    <p>${count ? 'Add the remaining CSV exports, confirm the detected columns, then reconcile.' : 'Load the three sample files to see how fees, refunds, timing shifts, and orphans become an auditable explanation.'}</p>
    ${count === 0 ? '<button class="button button-secondary" id="load-demo">Load a sample casefile</button>' : ''}</div>
  </section>`;
}

function resultsView(): string {
  const result = state.result;
  if (!result) return emptyResults();
  const shown = result.findings.filter((item) => filter === 'all' || item.status === filter);
  const counts = (status: FindingStatus) => result.findings.filter((item) => item.status === status).length;
  return `<section class="results" aria-labelledby="results-title">
    <div class="result-heading"><div><p class="eyebrow">Casefile evidence</p><h2 id="results-title">${result.coverage}% bounded</h2><p>Explained or isolated into a reviewable group—not silently dropped.</p></div>
      <div class="coverage-seal" aria-label="${result.coverage} percent coverage"><strong>${result.coverage}%</strong><span>coverage</span></div></div>
    <div class="totals-strip" aria-label="Source totals">
      <div><span>Orders</span><strong>${money(result.totals.orders, result.currency)}</strong></div><div><span>Processor</span><strong>${money(result.totals.processor, result.currency)}</strong></div><div><span>Ledger</span><strong>${money(result.totals.ledger, result.currency)}</strong></div><div class="variance"><span>Variance</span><strong>${money(result.totals.variance, result.currency)}</strong></div>
    </div>
    <div class="filter-bar" role="group" aria-label="Filter findings">
      ${(['all', 'explained', 'review', 'unmatched'] as const).map((item) => `<button class="filter-button ${filter === item ? 'is-active' : ''}" data-filter="${item}" aria-pressed="${filter === item}">${item === 'all' ? 'All findings' : statusLabel[item]} <span>${item === 'all' ? result.findings.length : counts(item)}</span></button>`).join('')}
    </div>
    <div class="findings" aria-live="polite">${shown.length ? shown.map((item) => `<details class="finding finding-${item.status}">
      <summary><span class="status-mark" aria-hidden="true">${item.status === 'explained' ? '✓' : item.status === 'review' ? '!' : '×'}</span><span class="finding-title"><strong>${esc(item.title)}</strong><small>${statusLabel[item.status]} · ${esc(item.reason.replaceAll('_', ' '))}</small></span><span class="finding-amount">${money(item.amount, result.currency)}</span></summary>
      <div class="finding-body"><p>${esc(item.explanation)}</p><ul>${item.evidence.map((line) => `<li>${esc(line)}</li>`).join('')}</ul><p class="source-rows">Source rows: ${[item.order && `orders ${item.order.rowNumber}`, item.processor && `processor ${item.processor.rowNumber}`, item.ledger && `ledger ${item.ledger.rowNumber}`].filter(Boolean).join(' · ')}</p></div>
    </details>`).join('') : '<p class="no-findings">No findings in this filter.</p>'}</div>
    <div class="export-desk"><div><p class="eyebrow">Shareable evidence</p><h3>Export this casefile</h3><label class="check-label"><input id="redact" type="checkbox" ${redacted ? 'checked' : ''}/><span>Redact order references in exports</span></label><p>Customer names and emails are never included. Redaction is on by default.</p></div>
      <div class="export-actions"><button class="button button-primary" id="export-md">Export Markdown</button><button class="button button-secondary" id="export-csv">Export findings CSV</button><button class="button button-quiet" id="export-json">Back up workspace JSON</button>${unlocked ? '<button class="button button-quiet" id="archive-case">Save to archive</button>' : ''}</div></div>
  </section>`;
}

function licenseSection(): string {
  return `<section class="license-section" id="license" aria-labelledby="license-title">
    <div><p class="eyebrow">One-time analyst unlock</p><h2 id="license-title">${unlocked ? 'Analyst tools unlocked' : 'Keep a local casefile archive'}</h2>
    <p>${unlocked ? 'Reusable mapping presets and local casefile archiving are available on this device.' : 'The free workspace includes reconciliation, redaction, and every export. A $29 one-time license adds reusable mapping presets, a local archive, and matching windows up to 60 days.'}</p>
    <p class="legal-note">Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the license. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></div>
    <div class="license-actions">${unlocked ? `<span class="license-stamp">LICENSE ACTIVE</span><button id="remove-license" class="text-button">Remove from this device</button>` : `<a class="button button-primary" href="${checkoutUrl}">Buy once — $29</a><form id="restore-form"><label for="license-token">Have a license? Paste it</label><div><input id="license-token" name="license" autocomplete="off" spellcheck="false" required /><button class="button button-secondary" type="submit">Verify license</button></div></form>`}</div>
  </section>`;
}

function archivesView(): string {
  if (!unlocked) return '';
  return `<section class="archive-section" aria-labelledby="archive-title"><div><p class="eyebrow">Device-only archive</p><h2 id="archive-title">Saved casefiles</h2></div>${archives.length ? `<ul>${archives.slice(0, 8).map((item) => `<li><span><strong>${esc(item.name)}</strong><small>${new Date(item.savedAt).toLocaleString()} · ${item.state.result?.findings.length ?? 0} findings</small></span><button class="text-button" data-open-archive="${item.id}">Open</button></li>`).join('')}</ul>` : '<p>No saved snapshots yet. Reconcile a casefile, then save it to the archive.</p>'}</section>`;
}

function render(): void {
  const ready = kinds.every((kind) => state.tables[kind] && state.mappings[kind]?.reference && state.mappings[kind]?.date && state.mappings[kind]?.amount);
  app.innerHTML = `<header class="site-header"><a class="brand" href="/" aria-label="Payout Reconciliation Casefile home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>CASE/FILE</span></a><nav aria-label="Primary"><a href="#workspace">Workspace</a><a href="#how">Method</a><a href="#license">Unlock</a></nav><span class="offline-pill" id="network-state"><i></i>${navigator.onLine ? 'Local-ready' : 'Offline'}</span></header>
  <main id="main">
    <section class="hero"><div class="hero-copy"><p class="eyebrow">Three exports. One defensible explanation.</p><h1>Find the money<br/><em>between the lines.</em></h1><p class="hero-lede">Match orders, processor payouts, and ledger entries without connecting an account. Every discrepancy gets a reason or a bounded review group.</p><div class="hero-actions"><a class="button button-primary" href="#workspace">Build a casefile</a><button class="button button-secondary" id="hero-demo">Try sample data</button></div><ul class="trust-list"><li>Runs locally</li><li>Works offline</li><li>Redacts by default</li></ul></div>
      <figure class="hero-art"><img src="/assets/hero-casefile.webp" width="1152" height="768" alt="Three anonymous stacks of transaction sheets align into one clipped reconciliation casefile" fetchpriority="high" decoding="async"/><figcaption><span>Exhibit A</span> Three paper trails → one evidence file</figcaption></figure>
    </section>
    <section class="workspace" id="workspace" aria-labelledby="workspace-title"><div class="section-heading"><div><p class="eyebrow">Local workspace</p><h2 id="workspace-title">Assemble the source record</h2><p>Nothing uploads. Files stay in this browser’s private storage.</p></div><div class="workspace-tools"><label for="case-name">Casefile name<input id="case-name" value="${esc(state.name)}" maxlength="80" /></label><label class="text-button import-label"><span>Import backup</span><input class="file-input" id="import-json" type="file" accept="application/json,.json"/></label><button id="new-case" class="text-button">Clear workspace</button></div></div>
      <div class="source-grid">${kinds.map(sourceCard).join('')}</div>
      ${kinds.map(mappingPanel).join('')}
      <div class="run-bar"><label for="window-days">Match within<select id="window-days">${[1, 3, 7, 14, 30, 60].map((days) => `<option value="${days}" ${state.windowDays === days ? 'selected' : ''} ${!unlocked && days > 14 ? 'disabled' : ''}>±${days} days${!unlocked && days > 14 ? ' — Analyst' : ''}</option>`).join('')}</select></label><p>Reference wins first, then amount and date. Tolerance: 2¢.</p><button class="button button-primary run-button" id="reconcile" ${!ready || busy ? 'disabled' : ''}>${busy ? 'Reconciling…' : 'Reconcile 3 sources'}</button></div>
      ${errorMessage ? `<div class="alert alert-error" role="alert"><strong>Couldn’t reconcile</strong><span>${esc(errorMessage)}</span></div>` : ''}
      <div id="live-status" class="visually-hidden" aria-live="polite">${esc(notice)}</div>
    </section>
    ${resultsView()}
    <section class="method" id="how" aria-labelledby="method-title"><div><p class="eyebrow">Transparent method</p><h2 id="method-title">A reason, not a black box</h2></div><ol><li><strong>Normalize</strong><span>Dates, signs, references, refunds, and fees become comparable without changing source rows.</span></li><li><strong>Link</strong><span>Exact references lead; amount and your date window recover renamed transactions.</span></li><li><strong>Explain</strong><span>Fees, refunds, timing shifts, missing rows, and orphans become inspectable evidence groups.</span></li></ol><p class="advice-note"><strong>Boundary:</strong> This tool explains source-file differences. It does not post entries, calculate tax, or provide accounting advice.</p></section>
    ${licenseSection()}${archivesView()}
  </main>
  <footer><div><span class="brand brand-footer"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>CASE/FILE</span></span><p>A local-first reconciliation utility from Sociobot.</p></div><div><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><span>Hero artwork generated with AI; source retained.</span></div></footer>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;
  bindEvents();
}

async function persist(): Promise<void> { state.updatedAt = new Date().toISOString(); await saveWorkspace(state); }
function showNotice(message: string): void { notice = message; const live = document.querySelector('#live-status'); if (live) live.textContent = message; const toast = document.querySelector<HTMLDivElement>('#toast'); if (toast) { toast.textContent = message; toast.hidden = false; setTimeout(() => { toast.hidden = true; }, 3500); } }

async function loadFile(kind: SourceKind, file: File): Promise<void> {
  errorMessage = '';
  if (file.size > 15 * 1024 * 1024) { errorMessage = 'That file is over 15 MB. Split the export by month and reconcile each period separately.'; render(); return; }
  try {
    const table = parseCsv(await file.text(), kind, file.name);
    state.tables[kind] = table; state.mappings[kind] = guessMapping(table); state.result = undefined;
    await persist(); render(); showNotice(`${labels[kind].name} loaded: ${table.rows.length} rows.`);
  } catch (error) { errorMessage = (error as Error).message; render(); }
}

async function loadDemo(): Promise<void> {
  const demo = demoWorkspace();
  state = { name: 'Sample — August payout review', tables: demo.tables, mappings: demo.mappings, windowDays: 7, updatedAt: new Date().toISOString() };
  await persist(); render(); showNotice('Three sample sources loaded. Review the maps, then reconcile.');
  document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' });
}

async function runReconciliation(): Promise<void> {
  busy = true; errorMessage = ''; render();
  await new Promise((resolve) => setTimeout(resolve, 30));
  try {
    const rows = Object.fromEntries(kinds.map((kind) => [kind, canonicalize(state.tables[kind]!, state.mappings[kind]!)])) as Record<SourceKind, ReturnType<typeof canonicalize>>;
    state.result = reconcile(rows.orders, rows.processor, rows.ledger, state.windowDays);
    await persist(); busy = false; render(); showNotice(`Casefile ready: ${state.result.findings.length} findings, ${state.result.coverage}% bounded.`);
    document.querySelector('#results-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { busy = false; errorMessage = (error as Error).message; render(); }
}

function bindEvents(): void {
  document.querySelectorAll<HTMLInputElement>('.file-input').forEach((input) => input.addEventListener('change', () => { const file = input.files?.[0]; if (file) void loadFile(input.dataset.kind as SourceKind, file); }));
  document.querySelectorAll<HTMLElement>('.source-card').forEach((card) => {
    card.addEventListener('dragover', (event) => { event.preventDefault(); card.classList.add('is-dragging'); });
    card.addEventListener('dragleave', () => card.classList.remove('is-dragging'));
    card.addEventListener('drop', (event) => { event.preventDefault(); card.classList.remove('is-dragging'); const file = event.dataTransfer?.files[0]; if (file) void loadFile(card.dataset.kind as SourceKind, file); });
  });
  document.querySelectorAll<HTMLSelectElement>('[data-map-kind]').forEach((select) => select.addEventListener('change', () => {
    const kind = select.dataset.mapKind as SourceKind; const field = select.dataset.mapField as keyof ColumnMap;
    state.mappings[kind]![field] = select.value; state.result = undefined; void persist(); render();
  }));
  document.querySelectorAll<HTMLElement>('[data-template]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); const kind = link.dataset.template as SourceKind; downloadText(`${kind}-template.csv`, templates[kind], 'text/csv'); }));
  document.querySelector('#hero-demo')?.addEventListener('click', () => void loadDemo());
  document.querySelector('#load-demo')?.addEventListener('click', () => void loadDemo());
  document.querySelector('#reconcile')?.addEventListener('click', () => void runReconciliation());
  document.querySelector<HTMLInputElement>('#case-name')?.addEventListener('change', (event) => { state.name = (event.target as HTMLInputElement).value.trim() || 'Untitled payout review'; void persist(); });
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { version?: number; state?: WorkspaceState };
      if (parsed.version !== 1 || !parsed.state?.tables || !parsed.state.mappings) throw new Error('This is not a Casefile v1 workspace backup.');
      state = parsed.state; await persist(); render(); showNotice(`Imported ${state.name}.`);
    } catch (error) { errorMessage = (error as Error).message || 'The backup could not be read.'; render(); }
  });
  document.querySelector<HTMLSelectElement>('#window-days')?.addEventListener('change', (event) => { state.windowDays = Number((event.target as HTMLSelectElement).value); state.result = undefined; void persist(); render(); });
  document.querySelector('#new-case')?.addEventListener('click', async () => { if (!confirm('Clear all three source files and the current result from this browser? Export a backup first if needed.')) return; await clearWorkspace(); state = { name: 'Untitled payout review', tables: {}, mappings: {}, windowDays: 7, updatedAt: new Date().toISOString() }; errorMessage = ''; render(); showNotice('Workspace cleared.'); });
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => button.addEventListener('click', () => { filter = button.dataset.filter as typeof filter; render(); document.querySelector<HTMLButtonElement>(`[data-filter="${filter}"]`)?.focus(); }));
  document.querySelector<HTMLInputElement>('#redact')?.addEventListener('change', (event) => { redacted = (event.target as HTMLInputElement).checked; });
  document.querySelector('#export-md')?.addEventListener('click', () => { if (state.result) downloadText(`${slugName()}.md`, markdownReport(state.result, state.name, redacted), 'text/markdown'); });
  document.querySelector('#export-csv')?.addEventListener('click', () => { if (state.result) downloadText(`${slugName()}-findings.csv`, csvReport(state.result, redacted), 'text/csv'); });
  document.querySelector('#export-json')?.addEventListener('click', () => downloadText(`${slugName()}-workspace.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state }, null, 2), 'application/json'));
  document.querySelector('#archive-case')?.addEventListener('click', async () => { const item = await archiveWorkspace(state); archives.unshift(item); render(); showNotice('Casefile snapshot saved to this device.'); });
  document.querySelectorAll<HTMLButtonElement>('[data-open-archive]').forEach((button) => button.addEventListener('click', () => { const item = archives.find((archive) => archive.id === button.dataset.openArchive); if (item) { state = structuredClone(item.state); void persist(); render(); showNotice(`Opened ${item.name}.`); window.scrollTo({ top: 0, behavior: 'smooth' }); } }));
  document.querySelector<HTMLFormElement>('#restore-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const token = new FormData(event.currentTarget as HTMLFormElement).get('license')?.toString().trim(); if (!token) return; storeToken(token); showNotice('Checking license…'); const verdict = await verifyLicense(); unlocked = verdict.unlocked; if (!unlocked) clearToken(); render(); showNotice(unlocked ? 'Analyst tools unlocked on this device.' : 'That license is not active. Check the token and try again.'); });
  document.querySelector('#remove-license')?.addEventListener('click', () => { clearToken(); unlocked = false; render(); showNotice('License removed from this device.'); });
}

function slugName(): string { return state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'payout-casefile'; }

function updateNetwork(): void { const el = document.querySelector('#network-state'); if (el) el.innerHTML = `<i></i>${navigator.onLine ? 'Local-ready' : 'Offline'}`; }

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    if (registration.waiting) showUpdate(registration);
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration); }));
  } catch { /* app remains functional without installation support */ }
}
function showUpdate(registration: ServiceWorkerRegistration): void {
  const toast = document.querySelector<HTMLDivElement>('#toast'); if (!toast) return;
  toast.innerHTML = 'Update ready. <button id="apply-update" class="text-button">Reload</button>'; toast.hidden = false;
  toast.querySelector('button')?.addEventListener('click', () => { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); location.reload(); });
}

async function init(): Promise<void> {
  acceptReturnedLicense(); unlocked = cachedUnlocked();
  try { const saved = await loadWorkspace(); if (saved) state = saved; archives = await loadArchives(); } catch { notice = 'Private storage is unavailable; this session will not survive a refresh.'; }
  render();
  window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork);
  void registerServiceWorker();
  if (getToken()) { const verdict = await verifyLicense(); if (verdict.unlocked !== unlocked) { unlocked = verdict.unlocked; render(); if (!unlocked) showNotice('License no longer active. The free workspace remains available.'); } }
}

void init();
