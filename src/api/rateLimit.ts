export interface RateLimitInfo {
  resetAt: Date;
  resource: string | null;
}

const FALLBACK_WAIT_MS = 60_000;

function parseSeconds(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value.trim())) {
    return null;
  }
  return Number(value);
}

function futureOrFallback(resetAtMs: number, now: number): Date {
  return new Date(resetAtMs > now ? resetAtMs : now + FALLBACK_WAIT_MS);
}

export function parseRateLimit(
  response: Pick<Response, 'status' | 'headers'>,
  now: number = Date.now(),
): RateLimitInfo | null {
  const { status, headers } = response;

  if (status !== 403 && status !== 429) {
    return null;
  }

  const resource = headers.get('x-ratelimit-resource');
  const retryAfter = parseSeconds(headers.get('retry-after'));

  if (retryAfter !== null) {
    return {
      resetAt: futureOrFallback(now + retryAfter * 1000, now),
      resource,
    };
  }

  if (headers.get('x-ratelimit-remaining') === '0') {
    const reset = parseSeconds(headers.get('x-ratelimit-reset'));
    const resetAt =
      reset !== null
        ? futureOrFallback(reset * 1000, now)
        : new Date(now + FALLBACK_WAIT_MS);
    return { resetAt, resource };
  }

  if (status === 429) {
    return { resetAt: new Date(now + FALLBACK_WAIT_MS), resource };
  }

  return null;
}
