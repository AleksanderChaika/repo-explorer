import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { API_VERSION, getJson, isAbortError } from './client';
import {
  HttpError,
  NetworkError,
  ParseError,
  RateLimitError,
  isApiError,
} from './errors';

const ENDPOINT = 'https://api.github.com/search/repositories';

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('Expected the promise to reject');
    },
    (error: unknown) => error,
  );
}

describe('getJson', () => {
  describe('request', () => {
    it('sends GitHub headers, no credentials, and returns the parsed body', async () => {
      let captured: Request | undefined;
      server.use(
        http.get(ENDPOINT, ({ request }) => {
          captured = request;
          return HttpResponse.json({ total_count: 1 });
        }),
      );

      const result = await getJson<{ total_count: number }>(
        '/search/repositories',
      );

      expect(result).toEqual({ total_count: 1 });
      expect(captured?.method).toBe('GET');
      expect(captured?.headers.get('accept')).toBe(
        'application/vnd.github+json',
      );
      expect(captured?.headers.get('x-github-api-version')).toBe(API_VERSION);
      expect(captured?.headers.get('authorization')).toBeNull();
    });

    it('builds the query string and skips undefined params', async () => {
      let captured: URL | undefined;
      server.use(
        http.get(ENDPOINT, ({ request }) => {
          captured = new URL(request.url);
          return HttpResponse.json({});
        }),
      );

      await getJson('/search/repositories', {
        params: {
          q: 'language:ts stars:>100',
          page: 2,
          sort: undefined,
          per_page: 0,
        },
      });

      expect(captured?.searchParams.get('q')).toBe('language:ts stars:>100');
      expect(captured?.searchParams.get('page')).toBe('2');
      expect(captured?.searchParams.get('per_page')).toBe('0');
      expect(captured?.searchParams.has('sort')).toBe(false);
    });
  });

  describe('HTTP errors', () => {
    it('uses the message from a JSON error body', async () => {
      server.use(
        http.get(ENDPOINT, () =>
          HttpResponse.json({ message: 'Validation Failed' }, { status: 422 }),
        ),
      );

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({
        status: 422,
        message: 'Validation Failed',
      });
    });

    it('falls back to status and statusText when a JSON body has no message', async () => {
      server.use(
        http.get(ENDPOINT, () =>
          HttpResponse.json(
            { error: 'nope', message: 42 },
            { status: 404, statusText: 'Not Found' },
          ),
        ),
      );

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 404, message: '404 Not Found' });
    });

    it('turns a 502 with an HTML body into an HttpError', async () => {
      server.use(
        http.get(
          ENDPOINT,
          () =>
            new HttpResponse('<html><body>Bad Gateway</body></html>', {
              status: 502,
              statusText: 'Bad Gateway',
              headers: { 'content-type': 'text/html' },
            }),
        ),
      );

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(HttpError);
      expect(error).not.toBeInstanceOf(ParseError);
      expect(error).toMatchObject({ status: 502, message: '502 Bad Gateway' });
    });

    it('keeps a 403 without rate limit signs as an HttpError', async () => {
      server.use(
        http.get(ENDPOINT, () =>
          HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
        ),
      );

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 403, message: 'Forbidden' });
    });
  });

  describe('rate limit', () => {
    it('recognizes the primary limit and its reset time', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 45;
      server.use(
        http.get(ENDPOINT, () =>
          HttpResponse.json(
            { message: 'API rate limit exceeded' },
            {
              status: 403,
              headers: {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': String(resetEpoch),
                'x-ratelimit-resource': 'search',
              },
            },
          ),
        ),
      );

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error).toMatchObject({ status: 403, resource: 'search' });
      expect((error as RateLimitError).resetAt).toEqual(
        new Date(resetEpoch * 1000),
      );
    });

    it('recognizes a 429 with retry-after', async () => {
      server.use(
        http.get(
          ENDPOINT,
          () =>
            new HttpResponse(null, {
              status: 429,
              headers: { 'retry-after': '30' },
            }),
        ),
      );

      const before = Date.now();
      const error = await rejection(getJson('/search/repositories'));
      const after = Date.now();

      expect(error).toBeInstanceOf(RateLimitError);
      const resetAt = (error as RateLimitError).resetAt.getTime();
      expect(resetAt).toBeGreaterThanOrEqual(before + 30_000);
      expect(resetAt).toBeLessThanOrEqual(after + 30_000);
    });
  });

  describe('response parsing', () => {
    it('throws ParseError when a successful body is not JSON', async () => {
      server.use(http.get(ENDPOINT, () => HttpResponse.text('not json')));

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(ParseError);
      expect(error).toMatchObject({ status: 200 });
      expect((error as ParseError).cause).toBeInstanceOf(SyntaxError);
    });
  });

  describe('network failures', () => {
    it('throws NetworkError when the request cannot be completed', async () => {
      server.use(http.get(ENDPOINT, () => HttpResponse.error()));

      const error = await rejection(getJson('/search/repositories'));

      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).cause).toBeInstanceOf(Error);
    });
  });

  describe('cancellation', () => {
    it('rejects with the original AbortError when the signal is already aborted', async () => {
      server.use(http.get(ENDPOINT, () => HttpResponse.json({})));
      const controller = new AbortController();
      controller.abort();

      const error = await rejection(
        getJson('/search/repositories', { signal: controller.signal }),
      );

      expect(isApiError(error)).toBe(false);
      expect(error).toMatchObject({ name: 'AbortError' });
    });

    it('rejects with the original AbortError when aborted while in flight', async () => {
      server.use(
        http.get(ENDPOINT, async () => {
          await delay('infinite');
          return HttpResponse.json({});
        }),
      );
      const controller = new AbortController();

      const pending = rejection(
        getJson('/search/repositories', { signal: controller.signal }),
      );
      controller.abort();
      const error = await pending;

      expect(isApiError(error)).toBe(false);
      expect(error).toMatchObject({ name: 'AbortError' });
    });
  });
});

describe('isAbortError', () => {
  it('is true when the signal is aborted, whatever the error is', () => {
    const controller = new AbortController();
    controller.abort();

    expect(isAbortError(new TypeError('fetch failed'), controller.signal)).toBe(
      true,
    );
  });

  it('is true for an error named AbortError without a signal', () => {
    const error = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });

    expect(isAbortError(error)).toBe(true);
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
  });

  it('is false for other errors and for a signal that is not aborted', () => {
    const controller = new AbortController();

    expect(isAbortError(new TypeError('fetch failed'), controller.signal)).toBe(
      false,
    );
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
  });
});
