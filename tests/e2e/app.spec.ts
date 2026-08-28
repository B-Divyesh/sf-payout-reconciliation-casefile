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

test('mobile workspace fits the viewport and keyboard reaches source actions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to reconciliation workspace' })).toBeFocused();
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('app shell and saved state reload while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await page.getByRole('button', { name: 'Reconcile 3 sources' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await expect(page.getByText('sample-orders.csv')).toBeVisible();
  await context.setOffline(false);
});

test('legal pages are available', async ({ page }) => {
  await page.goto('/privacy/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy, in plain terms.');
  await page.goto('/terms/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of use.');
});
