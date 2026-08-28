const SLUG = 'payout-reconciliation-casefile';
const KEY = `sb_license:${SLUG}`;
const CACHE_KEY = `${KEY}:verdict`;
const DAY = 86_400_000;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export function acceptReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(KEY, token);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies Verdict));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getToken(): string { return localStorage.getItem(KEY) ?? ''; }
export function storeToken(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies Verdict));
}
export function clearToken(): void { localStorage.removeItem(KEY); localStorage.removeItem(CACHE_KEY); }
export function cachedUnlocked(): boolean {
  try { return Boolean(getToken() && (JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Verdict).valid); } catch { return false; }
}

export async function verifyLicense(force = false): Promise<{ unlocked: boolean; checked: boolean; reason?: string }> {
  const token = getToken();
  if (!token) return { unlocked: false, checked: false };
  let cached: Verdict | undefined;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Verdict; } catch { /* ignore invalid cache */ }
  if (!force && cached?.checkedAt && Date.now() - cached.checkedAt < DAY) return { unlocked: cached.valid, checked: false, reason: cached.reason };
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
