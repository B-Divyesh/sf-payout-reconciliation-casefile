import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('sample workflow produces and exports an explainable casefile', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle(/Payout Reconciliation Casefile/);
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.getByText('sample-orders.csv')).toBeVisible();
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await expect(page.getByRole('heading', { name: /% bounded/ })).toBeVisible();
  await expect(page.getByText(/Expected fee on ORD-1001/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('dark results at a narrow viewport have no serious contrast failures', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});

test('mobile workspace fits the viewport and keyboard reaches source actions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to reconciliation workspace' })).toBeFocused();
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('file and backup inputs show a visible focus treatment', async ({ page }) => {
  await page.goto('/');
  for (const id of ['file-orders', 'file-processor', 'file-ledger', 'import-json']) {
    const input = page.locator(`#${id}`);
    await input.focus();
    await expect(input).toBeFocused();
    const label = input.locator('xpath=..');
    await expect(label).toHaveCSS('outline-style', 'solid');
    const box = await input.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test('app shell and saved state reload while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const shellAssets = await page.evaluate(async () => {
    const entries = await caches.keys();
    const urls = await Promise.all(entries.map(async (key) => (await caches.open(key)).keys().then((requests) => requests.map((request) => new URL(request.url).pathname))));
    return urls.flat();
  });
  expect(shellAssets.some((url) => /^\/assets\/main-.*\.js$/.test(url))).toBe(true);
  expect(shellAssets.some((url) => /^\/assets\/main-.*\.css$/.test(url))).toBe(true);
  const session = await context.newCDPSession(page);
  await session.send('Network.clearBrowserCache');
  await session.detach();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await expect(page.getByText('sample-orders.csv')).toBeVisible();
  await context.setOffline(false);
});

test('the configured hosted checkout is available', async ({ request }) => {
  const response = await request.get('https://api.sociobot.in/api/v1/products/payout-reconciliation-casefile/checkout', { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers().location).toMatch(/^https:\/\/checkout\.dodopayments\.com\//);
});

test('legal pages are available', async ({ page }) => {
  await page.goto('/privacy/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy, in plain terms.');
  await page.goto('/terms/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of use.');
});

test('all visible links meet the 44px touch-target minimum at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ['/', '/privacy/', '/terms/']) {
    await page.goto(path);
    const links = page.locator('a:visible');
    const count = await links.count();

    for (let index = 0; index < count; index += 1) {
      const link = links.nth(index);
      const box = await link.boundingBox();
      const label = (await link.innerText()).trim() || (await link.getAttribute('aria-label')) || `link ${index + 1}`;
      expect(box, `${path} ${label} has a measurable hit area`).not.toBeNull();
      expect(box!.width, `${path} ${label} width`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${path} ${label} height`).toBeGreaterThanOrEqual(44);
    }
  }
});
