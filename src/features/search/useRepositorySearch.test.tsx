import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '@/api/errors';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { searchResponse } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderHookWithProviders } from '@/test/utils';
import type { SearchState } from './searchParams';
import { useRepositorySearch } from './useRepositorySearch';
import type { RepositorySearch } from './useRepositorySearch';

const ENDPOINT = 'https://api.github.com/search/repositories';
const NOW = Date.UTC(2026, 10, 24, 10, 0, 0);

function searchState(overrides: Partial<SearchState> = {}): SearchState {
  return { q: 'react', sort: undefined, order: 'desc', page: 1, ...overrides };
}

type Responder = (
  request: Request,
  count: number,
) => Response | Promise<Response>;

function handleSearch(respond?: Responder) {
  const counter = { count: 0 };
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      counter.count += 1;
      return (
        respond?.(request, counter.count) ??
        HttpResponse.json(searchResponse('react'))
      );
    }),
  );
  return counter;
}

function rateLimited(resetSeconds: number) {
  return HttpResponse.json(
    { message: 'rate limit exceeded' },
    {
      status: 403,
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetSeconds),
        'x-ratelimit-resource': 'search',
      },
    },
  );
}

function renderSearch(initial: SearchState = searchState()) {
  return renderHookWithProviders(useRepositorySearch, {
    initialProps: initial,
  });
}

function kindOf(search: RepositorySearch): RepositorySearch['kind'] {
  return search.kind;
}

function expectError(search: RepositorySearch) {
  if (search.kind !== 'error') {
    throw new Error(`expected error, got ${search.kind}`);
  }
  return search;
}

describe('useRepositorySearch', () => {
  describe('requests', () => {
    it.each([
      ['', 'empty'],
      ['a', 'short'],
    ] as const)('does not request for q=%j', async (q, reason) => {
      const requests = handleSearch();

      const { result } = renderSearch(searchState({ q }));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.current).toEqual({ kind: 'idle', reason });
      expect(requests.count).toBe(0);
    });

    it('sends one request with the search state and the page size', async () => {
      let url: URL | undefined;
      const requests = handleSearch((request) => {
        url = new URL(request.url);
        return HttpResponse.json(searchResponse('react'));
      });

      const { result } = renderSearch(
        searchState({ q: 'react hooks', sort: 'stars', order: 'asc', page: 3 }),
      );

      expect(kindOf(result.current)).toBe('loading');
      await waitFor(() => expect(kindOf(result.current)).toBe('success'));

      expect(requests.count).toBe(1);
      expect(url?.searchParams.get('q')).toBe('react hooks');
      expect(url?.searchParams.get('sort')).toBe('stars');
      expect(url?.searchParams.get('order')).toBe('asc');
      expect(url?.searchParams.get('page')).toBe('3');
      expect(url?.searchParams.get('per_page')).toBe('20');
    });

    it('keeps the previous page on screen while the next page loads', async () => {
      handleSearch(async (request) => {
        const page = new URL(request.url).searchParams.get('page');
        if (page === '2') {
          await delay(100);
        }
        return HttpResponse.json(searchResponse(`page-${page}`));
      });

      const { result, rerender } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('success'));

      rerender(searchState({ page: 2 }));

      expect(result.current).toMatchObject({
        kind: 'success',
        isPlaceholderData: true,
        data: { items: [{ name: 'page-1' }] },
      });

      await waitFor(() =>
        expect(result.current).toMatchObject({
          kind: 'success',
          isPlaceholderData: false,
          data: { items: [{ name: 'page-2' }] },
        }),
      );
    });

    it('aborts the request of the previous key when the key changes', async () => {
      const signals: AbortSignal[] = [];
      handleSearch(async (request) => {
        signals.push(request.signal);
        await delay(300);
        return HttpResponse.json(searchResponse('react'));
      });

      const { result, rerender } = renderSearch();
      await waitFor(() => expect(signals).toHaveLength(1));

      rerender(searchState({ page: 2 }));

      await waitFor(() => expect(signals[0]?.aborted).toBe(true));
      await waitFor(() => expect(kindOf(result.current)).toBe('success'));
    });
  });

  describe('rate limit', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const pause = () =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

    const resetSeconds = () => Math.floor(Date.now() / 1000) + 60;

    it('reports a rate limit error to the gate and does not request again', async () => {
      const reset = resetSeconds();
      const requests = handleSearch(() => rateLimited(reset));

      const { result, gate } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('error'));
      await pause();

      expect(requests.count).toBe(1);
      const { error } = expectError(result.current);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(gate.getSnapshot()).toBe(reset * 1000);
    });

    it('does not touch the gate for other errors', async () => {
      handleSearch(() => new HttpResponse(null, { status: 500 }));

      const { result, gate } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('error'));

      expect(gate.getSnapshot()).toBeNull();
    });

    it('blocks a key that has no data while the gate is blocked', async () => {
      const requests = handleSearch((request) => {
        const q = new URL(request.url).searchParams.get('q');
        return q === 'react'
          ? rateLimited(resetSeconds())
          : HttpResponse.json(searchResponse('vue'));
      });

      const { result, rerender, gate } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('error'));

      rerender(searchState({ q: 'vue' }));
      await pause();

      expect(result.current).toEqual({
        kind: 'blocked',
        blockedUntil: gate.getSnapshot(),
      });
      expect(requests.count).toBe(1);
    });

    it('requests the failed key again once the block is over', async () => {
      const reset = resetSeconds();
      const requests = handleSearch((_request, count) =>
        count === 1
          ? rateLimited(reset)
          : HttpResponse.json(searchResponse('react')),
      );

      const { result, gate } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('error'));
      expect(requests.count).toBe(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000);
      });

      await waitFor(() => expect(kindOf(result.current)).toBe('success'));
      await pause();
      expect(requests.count).toBe(2);
      expect(gate.getSnapshot()).toBeNull();
    });

    it('requests a blocked key on its own once the block is over', async () => {
      const reset = resetSeconds();
      const requests = handleSearch((_request, count) =>
        count === 1
          ? rateLimited(reset)
          : HttpResponse.json(searchResponse('vue')),
      );

      const { result, rerender } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('error'));
      rerender(searchState({ q: 'vue' }));
      await pause();
      expect(requests.count).toBe(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000);
      });

      await waitFor(() =>
        expect(result.current).toMatchObject({
          kind: 'success',
          data: { items: [{ name: 'vue' }] },
        }),
      );
    });

    it('shows cached data of the current key while the gate is blocked', async () => {
      const requests = handleSearch();

      const { result, gate } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('success'));

      act(() => {
        gate.report(new Date(Date.now() + 60_000));
      });
      await pause();

      expect(result.current).toMatchObject({
        kind: 'success',
        isPlaceholderData: false,
        data: { items: [{ name: 'react' }] },
      });
      expect(requests.count).toBe(1);
    });

    it('does not leak data of another key while the gate is blocked', async () => {
      const requests = handleSearch((request) => {
        const q = new URL(request.url).searchParams.get('q');
        return HttpResponse.json(searchResponse(q ?? ''));
      });

      const { result, rerender, gate } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('success'));
      act(() => {
        gate.report(new Date(Date.now() + 60_000));
      });

      rerender(searchState({ q: 'vue' }));
      await pause();

      expect(result.current).toEqual({
        kind: 'blocked',
        blockedUntil: gate.getSnapshot(),
      });
      expect(requests.count).toBe(1);
    });

    it('is not blocked by the core rate limit', async () => {
      handleSearch();
      const coreGate = createRateLimitGate();
      coreGate.report(new Date(Date.now() + 60_000));

      const { result } = renderHookWithProviders(useRepositorySearch, {
        initialProps: searchState(),
        coreGate,
      });

      await waitFor(() => expect(kindOf(result.current)).toBe('success'));
    });

    it('ignores refetch while the gate is blocked', async () => {
      const requests = handleSearch(() => rateLimited(resetSeconds()));

      const { result } = renderSearch();
      await waitFor(() => expect(kindOf(result.current)).toBe('error'));

      act(() => {
        expectError(result.current).refetch();
      });
      await pause();

      expect(requests.count).toBe(1);
    });
  });

  it('requests again on refetch when the gate is not blocked', async () => {
    const requests = handleSearch((_request, count) =>
      count === 1
        ? new HttpResponse(null, { status: 500 })
        : HttpResponse.json(searchResponse('react')),
    );

    const { result } = renderSearch();
    await waitFor(() => expect(kindOf(result.current)).toBe('error'));

    act(() => {
      expectError(result.current).refetch();
    });

    await waitFor(() => expect(kindOf(result.current)).toBe('success'));
    expect(requests.count).toBe(2);
  });
});
