import { CancelledError, type QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { getJson } from './client';
import { HttpError, NetworkError, ParseError, RateLimitError } from './errors';
import {
  MAX_RETRIES,
  STALE_TIME_MS,
  createQueryClient,
  shouldRetry,
} from './queryClient';

const ENDPOINT = 'https://api.github.com/search/repositories';

let client: QueryClient | undefined;

function newClient(): QueryClient {
  client = createQueryClient({ retryDelay: 0 });
  return client;
}

function fetchSearch(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: ['search'],
    queryFn: ({ signal }) => getJson('/search/repositories', { signal }),
  });
}

function countHits(response: () => Response | Promise<Response>) {
  const state = { hits: 0 };
  server.use(
    http.get(ENDPOINT, () => {
      state.hits += 1;
      return response();
    }),
  );
  return state;
}

afterEach(() => {
  client?.clear();
  client = undefined;
});

describe('shouldRetry', () => {
  it('retries network errors until the limit', () => {
    const error = new NetworkError();

    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(MAX_RETRIES - 1, error)).toBe(true);
    expect(shouldRetry(MAX_RETRIES, error)).toBe(false);
  });

  it.each([500, 502, 503, 504])('retries HTTP %i', (status) => {
    expect(shouldRetry(0, new HttpError(status, 'Server Error'))).toBe(true);
  });

  it.each([400, 401, 403, 404, 422])('does not retry HTTP %i', (status) => {
    expect(shouldRetry(0, new HttpError(status, 'Client Error'))).toBe(false);
  });

  it('does not retry a rate limit', () => {
    expect(shouldRetry(0, new RateLimitError(429, new Date(0), null))).toBe(
      false,
    );
  });

  it('does not retry a parse error', () => {
    expect(shouldRetry(0, new ParseError(200))).toBe(false);
  });

  it('does not retry an aborted request', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });

    expect(shouldRetry(0, abort)).toBe(false);
  });

  it('does not retry unknown errors', () => {
    expect(shouldRetry(0, new TypeError('boom'))).toBe(false);
    expect(shouldRetry(0, 'boom')).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('configures retry, staleTime and refetchOnWindowFocus', () => {
    const queries = newClient().getDefaultOptions().queries;

    expect(queries?.retry).toBe(shouldRetry);
    expect(queries?.staleTime).toBe(STALE_TIME_MS);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });

  it('keeps the library retryDelay when none is given', () => {
    const queries = createQueryClient().getDefaultOptions().queries;

    expect(queries?.retryDelay).toBeUndefined();
  });
});

describe('retry policy through QueryClient', () => {
  it('retries a 5xx and gives up after the retry limit', async () => {
    const state = countHits(() =>
      HttpResponse.json({ message: 'Unavailable' }, { status: 503 }),
    );

    const error = await fetchSearch(newClient()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503 });
    expect(state.hits).toBe(1 + MAX_RETRIES);
  });

  it('succeeds when a retry gets a good response', async () => {
    let calls = 0;
    server.use(
      http.get(ENDPOINT, () => {
        calls += 1;
        return calls < 3
          ? HttpResponse.json({ message: 'Bad Gateway' }, { status: 502 })
          : HttpResponse.json({ total_count: 0 });
      }),
    );

    const data = await fetchSearch(newClient());

    expect(data).toEqual({ total_count: 0 });
    expect(calls).toBe(3);
  });

  it('retries a network error and gives up after the retry limit', async () => {
    const state = countHits(() => HttpResponse.error());

    const error = await fetchSearch(newClient()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect(state.hits).toBe(1 + MAX_RETRIES);
  });

  it('does not retry a 4xx', async () => {
    const state = countHits(() =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    );

    const error = await fetchSearch(newClient()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404 });
    expect(state.hits).toBe(1);
  });

  it('does not retry a rate limit', async () => {
    const state = countHits(
      () =>
        new HttpResponse(null, {
          status: 429,
          headers: { 'retry-after': '1' },
        }),
    );

    const error = await fetchSearch(newClient()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(state.hits).toBe(1);
  });

  it('does not retry an invalid JSON body', async () => {
    const state = countHits(() => HttpResponse.text('not json'));

    const error = await fetchSearch(newClient()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ParseError);
    expect(state.hits).toBe(1);
  });
});

describe('cancellation through QueryClient', () => {
  it('does not retry when the query is cancelled by the client', async () => {
    const queryClient = newClient();
    const state = countHits(async () => {
      await delay('infinite');
      return HttpResponse.json({});
    });

    const pending = fetchSearch(queryClient).catch((e: unknown) => e);
    await expect.poll(() => state.hits).toBe(1);
    await queryClient.cancelQueries({ queryKey: ['search'] });
    const error = await pending;
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(error).toBeInstanceOf(CancelledError);
    expect(state.hits).toBe(1);
  });

  it('does not retry when the request fails with an AbortError of its own', async () => {
    const queryClient = newClient();
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const error = await queryClient
      .fetchQuery({
        queryKey: ['search'],
        queryFn: () => {
          calls += 1;
          return getJson('/search/repositories', { signal: controller.signal });
        },
      })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(1);
  });
});
