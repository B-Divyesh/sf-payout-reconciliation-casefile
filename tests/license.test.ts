import { describe, expect, it } from 'vitest';
import { LICENSE_VERIFY_INTERVAL_MS, verificationIsDue } from '../src/license';

describe('license verification request policy', () => {
  it('permits an initial check then suppresses repeats until the daily interval has elapsed', () => {
    const now = 1_800_000_000_000;
    expect(verificationIsDue(undefined, now)).toBe(true);
    expect(verificationIsDue({ valid: false, checkedAt: now, reason: 'invalid' }, now + 60_000)).toBe(false);
    expect(verificationIsDue({ valid: true, checkedAt: now }, now + LICENSE_VERIFY_INTERVAL_MS - 1)).toBe(false);
    expect(verificationIsDue({ valid: true, checkedAt: now }, now + LICENSE_VERIFY_INTERVAL_MS)).toBe(true);
  });
});
