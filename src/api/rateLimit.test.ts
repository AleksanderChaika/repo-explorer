import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRateLimit } from './rateLimit';

const NOW = Date.UTC(2026, 10, 24, 10, 0, 0);
const RESET_EPOCH_SECONDS = Math.floor(NOW / 1000) + 300;

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers });
}

describe('parseRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('responses that are not a rate limit', () => {
    it('returns null for a successful response, even with exhausted headers', () => {
      const result = parseRateLimit(
        response(200, { 'x-ratelimit-remaining': '0' }),
        NOW,
      );

      expect(result).toBeNull();
    });

    it('returns null for other client errors', () => {
      const result = parseRateLimit(
        response(404, { 'x-ratelimit-remaining': '0' }),
        NOW,
      );

      expect(result).toBeNull();
    });

    it('returns null for 403 without any rate limit signs', () => {
      expect(parseRateLimit(response(403), NOW)).toBeNull();
    });

    it('returns null for 403 when the quota is not exhausted', () => {
      const result = parseRateLimit(
        response(403, {
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': String(RESET_EPOCH_SECONDS),
        }),
        NOW,
      );

      expect(result).toBeNull();
    });
  });

  describe('retry-after', () => {
    it('uses retry-after seconds on 429', () => {
      const result = parseRateLimit(
        response(429, { 'retry-after': '30' }),
        NOW,
      );

      expect(result).toEqual({
        resetAt: new Date(NOW + 30_000),
        resource: null,
      });
    });

    it('uses retry-after seconds on 403 (secondary limit)', () => {
      const result = parseRateLimit(
        response(403, { 'retry-after': '120', 'x-ratelimit-resource': 'core' }),
        NOW,
      );

      expect(result).toEqual({
        resetAt: new Date(NOW + 120_000),
        resource: 'core',
      });
    });

    it('prefers retry-after over x-ratelimit-reset', () => {
      const result = parseRateLimit(
        response(403, {
          'retry-after': '10',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(RESET_EPOCH_SECONDS),
        }),
        NOW,
      );

      expect(result?.resetAt).toEqual(new Date(NOW + 10_000));
    });

    it('ignores a retry-after value that is not a number of seconds', () => {
      const result = parseRateLimit(
        response(429, { 'retry-after': 'soon' }),
        NOW,
      );

      expect(result?.resetAt).toEqual(new Date(NOW + 60_000));
    });
  });

  describe('x-ratelimit-reset', () => {
    it('converts epoch seconds when remaining is 0 on 403', () => {
      const result = parseRateLimit(
        response(403, {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(RESET_EPOCH_SECONDS),
          'x-ratelimit-resource': 'search',
        }),
        NOW,
      );

      expect(result).toEqual({
        resetAt: new Date(RESET_EPOCH_SECONDS * 1000),
        resource: 'search',
      });
    });

    it('converts epoch seconds when remaining is 0 on 429', () => {
      const result = parseRateLimit(
        response(429, {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(RESET_EPOCH_SECONDS),
        }),
        NOW,
      );

      expect(result?.resetAt).toEqual(new Date(RESET_EPOCH_SECONDS * 1000));
    });

    it('falls back to one minute when remaining is 0 but reset is missing', () => {
      const result = parseRateLimit(
        response(403, { 'x-ratelimit-remaining': '0' }),
        NOW,
      );

      expect(result?.resetAt).toEqual(new Date(NOW + 60_000));
    });
  });

  describe('fallback', () => {
    it('waits one minute on 429 without any headers', () => {
      const result = parseRateLimit(response(429), NOW);

      expect(result).toEqual({
        resetAt: new Date(NOW + 60_000),
        resource: null,
      });
    });
  });

  it('uses the current time when now is not passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const result = parseRateLimit(response(429, { 'retry-after': '5' }));

    expect(result?.resetAt).toEqual(new Date(NOW + 5_000));
  });
});
