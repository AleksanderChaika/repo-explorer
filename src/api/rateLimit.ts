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
    return { resetAt: new Date(now + retryAfter * 1000), resource };
  }

  if (headers.get('x-ratelimit-remaining') === '0') {
    const reset = parseSeconds(headers.get('x-ratelimit-reset'));
    const resetAt =
      reset !== null
        ? new Date(reset * 1000)
        : new Date(now + FALLBACK_WAIT_MS);
    return { resetAt, resource };
  }

  if (status === 429) {
    return { resetAt: new Date(now + FALLBACK_WAIT_MS), resource };
  }

  return null;
}
