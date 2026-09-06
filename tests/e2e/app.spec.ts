import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing page states the job, audience, and first actions', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Payout Reconciliation Casefile — Explain mismatches');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explain payout mismatches from three exports');
  await expect(page.getByText(/small ecommerce operators and accountants/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Choose your CSV files' })).toBeVisible();
});

test('dark demo results have no serious accessibility failures', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/demo/');
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});

test('mobile demo fits the viewport and begins with the skip link', async ({ page }) => {
  await page.goto('/demo/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to sample casefile' })).toBeFocused();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('file and backup inputs show focus on their visible controls', async ({ page }) => {
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

test('legal pages use route titles and the shared navigation skeleton', async ({ page }) => {
  for (const route of [
    { path: '/privacy/', title: 'Privacy — Payout Reconciliation Casefile', heading: 'Privacy for your payout files' },
    { path: '/terms/', title: 'Terms — Payout Reconciliation Casefile', heading: 'Terms for payout reconciliation' }
  ]) {
    await page.goto(route.path);
    await expect(page).toHaveTitle(route.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByText('Built by Param Factory')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${route.path.replaceAll('/', '\\/')}$`));
  }
});

test('all visible links meet the 44px target at phone and desktop widths', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const path of ['/', '/demo/', '/privacy/', '/terms/', '/404.html']) {
      await page.goto(path);
      const links = page.locator('a:visible');
      for (let index = 0; index < await links.count(); index += 1) {
        const link = links.nth(index);
        const box = await link.boundingBox();
        const label = (await link.innerText()).trim() || (await link.getAttribute('aria-label')) || `link ${index + 1}`;
        expect(box, `${width}px ${path} ${label}`).not.toBeNull();
        expect(box!.width, `${width}px ${path} ${label} width`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `${width}px ${path} ${label} height`).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test('unknown pages use the designed 404 document in deployment configuration', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Payout Reconciliation Casefile');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Return to the payout workspace');
  await expect(page.getByRole('link', { name: 'Open the workspace' })).toBeVisible();
});

test('every public document has complete route metadata and one main heading', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['/', '/demo/', '/privacy/', '/terms/', '/404.html', '/offline.html']) {
    await page.goto(path);
    expect((await page.title()).length, `${path} title length`).toBeLessThanOrEqual(60);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/payout-reconciliation-casefile\.sociobot\.in\//);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /sf-payout-reconciliation-casefile-social\.jpg$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
  expect(errors).toEqual([]);
});

test('a rejected returned license can be removed from the locked screen', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"valid":false,"reason":"invalid"}' }));
  await page.goto('/?license=qa-invalid-browser-token');
  await expect(page).not.toHaveURL(/license=/);
  await expect(page.getByRole('button', { name: 'Remove stored license' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove stored license' }).click();
  await expect(page.locator('#toast')).toHaveText('License removed from this device.');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:payout-reconciliation-casefile'))).toBeNull();
});
