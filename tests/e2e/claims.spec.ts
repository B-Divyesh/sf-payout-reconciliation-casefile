import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const sampleOrders = `Order ID,Created at,Gross amount,Refund amount,Customer email,Currency
ORD-1001,2026-08-01,120.00,0,mina@example.test,USD
ORD-1002,2026-08-01,85.00,0,jo@example.test,USD
ORD-1003,2026-08-02,62.50,12.50,alex@example.test,USD
ORD-1004,2026-08-03,200.00,0,sam@example.test,USD
ORD-1005,2026-08-04,45.00,0,lee@example.test,USD
ORD-1006,2026-08-05,24.00,0,river@example.test,USD`;

async function downloadText(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) throw new Error('Download did not produce a local file.');
  return readFile(path, 'utf8');
}

async function replaceCsv(page: Page, kind: 'orders' | 'processor' | 'ledger', body: string): Promise<void> {
  await page.locator(`#file-${kind}`).setInputFiles({ name: `${kind}.csv`, mimeType: 'text/csv', buffer: Buffer.from(body) });
}

test('@claim:demo-sandbox sample mode is complete and does not change the real workspace', async ({ page }) => {
  await page.goto('/demo/');
  await expect(page).toHaveTitle('Demo — Payout Reconciliation Casefile');
  await expect(page.getByText('Demo — sample data, nothing is saved to your real workspace.')).toBeVisible();
  await expect(page.getByText('sample-orders.csv')).toBeVisible();
  await expect(page.getByRole('heading', { name: '95.8% bounded' })).toBeVisible();
  await expect(page.locator('.finding')).toHaveCount(8);

  await page.getByRole('link', { name: 'Start for real' }).click();
  const caseName = page.getByLabel('Casefile name');
  await caseName.fill('Real September close');
  await caseName.press('Tab');
  await expect.poll(() => page.evaluate(() => new Promise<string | undefined>((resolve, reject) => {
    const open = indexedDB.open('casefile-local-v1', 1);
    open.onsuccess = () => {
      const request = open.result.transaction('workspace', 'readonly').objectStore('workspace').get('current');
      request.onsuccess = () => resolve(request.result?.name as string | undefined);
      request.onerror = () => reject(request.error);
    };
    open.onerror = () => reject(open.error);
  }))).toBe('Real September close');
  await page.goto('/demo/');
  await page.getByLabel('Casefile name').fill('Changed sample name');
  await page.getByLabel('Casefile name').press('Tab');
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.getByLabel('Casefile name')).toHaveValue('Sample — August payout review');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page.getByLabel('Casefile name')).toHaveValue('Real September close');
});

test('@claim:local-processing reconciliation sends no financial data off origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo/');
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await expect(page.getByRole('heading', { name: '95.8% bounded' })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  await pending;
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:offline-reload demo reloads offline after the first visit', async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/demo/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    const shellAssets = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await caches.open(key)).keys()))).flat().map((request) => new URL(request.url).pathname));
    expect(shellAssets.some((url) => /^\/assets\/main-.*\.js$/.test(url))).toBe(true);
    expect(shellAssets.some((url) => /^\/assets\/main-.*\.css$/.test(url))).toBe(true);
    const session = await context.newCDPSession(page);
    await session.send('Network.clearBrowserCache');
    await session.detach();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByText('sample-orders.csv')).toBeVisible();
    await expect(page.getByRole('heading', { name: '95.8% bounded' })).toBeVisible();
  } finally {
    await context.setOffline(false);
    await context.close();
  }
});

test('@claim:redacted-reports Markdown and CSV exports hide identifiers and preserve every finding', async ({ page }) => {
  await page.goto('/demo/');
  const markdownPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  const markdown = await downloadText(await markdownPending);
  expect(markdown).not.toContain('ORD-1001');
  expect(markdown).not.toContain('mina@example.test');
  expect(markdown).toContain('ORD…01');

  const csvPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export findings CSV' }).click();
  const csv = await downloadText(await csvPending);
  expect(csv).not.toContain('ORD-1001');
  expect(csv).not.toContain('mina@example.test');
  expect(csv.trim().split('\n')).toHaveLength(9);
});

test('@claim:matching-boundaries amount and date mismatches are never called explained', async ({ page }) => {
  await page.goto('/demo/');
  await replaceCsv(page, 'orders', 'Order ID,Created at,Gross amount,Currency\nORD-BAD,2026-08-01,100,USD');
  await replaceCsv(page, 'processor', 'Order ID,Payout Date,Net Amount,Currency\nORD-BAD,2026-08-02,1,USD');
  await replaceCsv(page, 'ledger', 'Reference,Date,Amount,Currency\nORD-BAD,2026-08-02,1,USD');
  await page.getByLabel('Match within').selectOption('1');
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  const amountFinding = page.locator('.finding').filter({ hasText: 'Bounded variance for ORD-BAD' });
  await expect(amountFinding).toContainText('Bounded review');
  await expect(amountFinding).toContainText('$99.00');
  await expect(page.getByText(/amounts agree/i)).toHaveCount(0);

  await replaceCsv(page, 'orders', 'Order ID,Created at,Gross amount,Currency\nORD-FAR,2026-01-01,100,USD');
  await replaceCsv(page, 'processor', 'Order ID,Payout Date,Net Amount,Currency\nORD-FAR,2026-05-01,100,USD');
  await replaceCsv(page, 'ledger', 'Reference,Date,Amount,Currency\nORD-FAR,2026-05-01,100,USD');
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await expect(page.getByText('No processor row for ORD-FAR')).toBeVisible();
  await expect(page.getByText(/timing shift for ORD-FAR/i)).toHaveCount(0);
});

test('@claim:workspace-persistence an explicitly imported real workspace survives reload', async ({ page }) => {
  await page.goto('/demo/');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up workspace JSON' }).click();
  const backup = await pending;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error('Workspace backup was not created.');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.locator('#import-json').setInputFiles(backupPath);
  await expect(page.getByText('sample-orders.csv')).toBeVisible();
  await page.reload();
  await expect(page.getByText('sample-orders.csv')).toBeVisible();
  await expect(page.getByRole('heading', { name: '95.8% bounded' })).toBeVisible();
});

test('@claim:csv-intake blank required amounts are rejected and replacement recovers', async ({ page }) => {
  await page.goto('/demo/');
  await replaceCsv(page, 'orders', 'Order ID,Created at,Gross amount,Currency\nORD-1,2026-08-01,,USD');
  await replaceCsv(page, 'processor', 'Order ID,Payout Date,Net Amount,Currency\nORD-1,2026-08-01,100,USD');
  await replaceCsv(page, 'ledger', 'Reference,Date,Amount,Currency\nORD-1,2026-08-01,100,USD');
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await expect(page.getByRole('alert')).toContainText('Amount is empty');
  await replaceCsv(page, 'orders', 'Order ID,Created at,Gross amount,Currency\nORD-1,2026-08-01,100,USD');
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await expect(page.getByText('ORD-1 balances')).toBeVisible();
});

test('@claim:paid-analyst-tools the one-time offer enables every advertised local tool', async ({ page, request }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:payout-reconciliation-casefile', 'recorded-valid-fixture');
    localStorage.setItem('sb_license:payout-reconciliation-casefile:verdict', JSON.stringify({ valid: true, checkedAt: Date.now() }));
  });
  await page.goto('/demo/');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up workspace JSON' }).click();
  const backup = await pending;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error('Workspace backup was not created.');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.locator('#import-json').setInputFiles(backupPath);
  await expect(page.getByLabel('Match within').locator('option[value="60"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Save to archive' }).click();
  await expect(page.getByRole('heading', { name: 'Saved casefiles' })).toBeVisible();
  await expect(page.locator('.archive-section')).toContainText('Sample — August payout review');

  const ordersMap = page.locator('details').filter({ hasText: 'Orders column map' });
  await ordersMap.locator('summary').click();
  await ordersMap.getByLabel('Reference *').selectOption('Customer email');
  await ordersMap.locator('summary').click();
  await ordersMap.getByRole('button', { name: 'Save orders mapping' }).click();
  await replaceCsv(page, 'orders', sampleOrders);
  await expect(page.locator('#toast')).toContainText('Saved mapping applied.');
  await expect(page.locator('details').filter({ hasText: 'Orders column map' }).getByLabel('Reference *')).toHaveValue('Customer email');

  const buyLink = page.getByRole('link', { name: 'Buy once — $29' });
  await expect(buyLink).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove from this device' }).click();
  await expect(page.getByRole('link', { name: 'Buy once — $29' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/payout-reconciliation-casefile/checkout');
  const response = await request.get('https://api.sociobot.in/api/v1/products/payout-reconciliation-casefile/checkout', { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers().location).toMatch(/^https:\/\/checkout\.dodopayments\.com\//);
});

test('@claim:accessible-interface keyboard, touch, contrast, and reduced motion checks pass', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/demo/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to sample casefile' })).toBeFocused();
  const interactive = page.locator('a:visible, button:visible, input:visible, select:visible, summary:visible');
  for (let index = 0; index < await interactive.count(); index += 1) {
    const box = await interactive.nth(index).boundingBox();
    expect(box, `interactive target ${index + 1}`).not.toBeNull();
    expect(box!.width, `interactive target ${index + 1} width`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `interactive target ${index + 1} height`).toBeGreaterThanOrEqual(44);
  }
  const transition = await page.locator('.button').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(parseFloat(transition)).toBeLessThanOrEqual(0.001);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});
