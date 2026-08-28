const SLUG = 'payout-reconciliation-casefile';
const KEY = `sb_license:${SLUG}`;
const CACHE_KEY = `${KEY}:verdict`;
export const LICENSE_VERIFY_INTERVAL_MS = 86_400_000;

export interface LicenseVerdict { valid: boolean; checkedAt: number; reason?: string }

export function verificationIsDue(cached: LicenseVerdict | undefined, now = Date.now()): boolean {
  return !cached?.checkedAt || now - cached.checkedAt >= LICENSE_VERIFY_INTERVAL_MS;
}

export function acceptReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(KEY, token);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies LicenseVerdict));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getToken(): string { return localStorage.getItem(KEY) ?? ''; }
export function storeToken(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies LicenseVerdict));
}
export function clearToken(): void { localStorage.removeItem(KEY); localStorage.removeItem(CACHE_KEY); }
export function cachedUnlocked(): boolean {
  try { return Boolean(getToken() && (JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as LicenseVerdict).valid); } catch { return false; }
}

export async function verifyLicense(): Promise<{ unlocked: boolean; checked: boolean; reason?: string }> {
  const token = getToken();
  if (!token) return { unlocked: false, checked: false };
  let cached: LicenseVerdict | undefined;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as LicenseVerdict; } catch { /* ignore invalid cache */ }
  // A restore can initiate the first check, but neither repeated button presses
  // nor background refreshes should turn this static app into a request burst.
  if (!verificationIsDue(cached)) return { unlocked: cached!.valid, checked: false, reason: cached!.reason };
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('Verification service unavailable');
    const data = await response.json() as { valid: boolean; reason?: string };
    const verdict = { valid: data.valid, reason: data.reason, checkedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(verdict));
    return { unlocked: data.valid, checked: true, reason: data.reason };
  } catch {
    return { unlocked: cached?.valid ?? true, checked: false, reason: 'offline' };
  }
}

export const checkoutUrl = `https://api.sociobot.in/api/v1/products/${SLUG}/checkout`;
