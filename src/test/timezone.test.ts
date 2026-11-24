import { describe, expect, it } from 'vitest';

describe('test timezone', () => {
  it('runs in America/Los_Angeles', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      'America/Los_Angeles',
    );
  });

  it('uses the Los Angeles UTC offset in January', () => {
    expect(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()).toBe(480);
  });
});
