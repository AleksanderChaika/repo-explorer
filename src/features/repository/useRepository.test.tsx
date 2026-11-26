import { useQueryClient } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import type { RateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { repositoryDetails } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderHookWithProviders } from '@/test/utils';
import { useRepository } from './useRepository';
import type { RepositoryState } from './useRepository';

const KEY = ['repo', 'owner', 'react'];

type Responder = (count: number) => Response | Promise<Response>;

function found() {
  return HttpResponse.json(repositoryDetails());
}

function status(code: number) {
  return new HttpResponse(null, { status: code });
}

function handle(respond: Responder = found) {
  const counter = { count: 0 };
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', () => {
      counter.count += 1;
      return respond(counter.count);
    }),
  );
  return counter;
}

function renderRepository(
  { owner = 'owner', name = 'react' }: { owner?: string; name?: string } = {},
  gates: { gate?: RateLimitGate; coreGate?: RateLimitGate } = {},
) {
  return renderHookWithProviders(
    (props: { owner: string; name: string }) =>
      useRepository(props.owner, props.name),
    { initialProps: { owner, name }, ...gates },
  );
}

function blockedGate() {
  const gate = createRateLimitGate();
  gate.report(new Date(Date.now() + 60_000));
  return gate;
}

function kindOf(state: RepositoryState) {
  return state.kind;
}

function refetchOf(state: RepositoryState) {
  if (state.kind !== 'error') {
    throw new Error(`expected error, got ${state.kind}`);
  }
  return state.refetch;
}

function pause() {
  return act(() => new Promise((resolve) => setTimeout(resolve, 50)));
}

async function renderLoaded(respond?: Responder) {
  const requests = handle(respond);
  const view = renderRepository();
  await waitFor(() => expect(kindOf(view.result.current)).toBe('success'));
  return { ...view, requests };
}

describe('useRepository', () => {
  it('starts as loading', () => {
    handle();

    const { result } = renderRepository();

    expect(result.current).toEqual({ kind: 'loading' });
  });

  it('returns the repository', async () => {
    handle();

    const { result } = renderRepository();

    await waitFor(() =>
      expect(result.current).toEqual({
        kind: 'success',
        repository: repositoryDetails(),
      }),
    );
  });

  it('caches the repository under its owner and name', async () => {
    const { queryClient } = await renderLoaded();

    expect(queryClient.getQueryData(KEY)).toEqual(repositoryDetails());
  });

  it('reports a 404 as not found', async () => {
    handle(() => status(404));

    const { result } = renderRepository();

    await waitFor(() => expect(kindOf(result.current)).toBe('not-found'));
  });

  it.each<[string, () => Response]>([
    ['a server error', () => status(500)],
    ['a network failure', () => HttpResponse.error()],
  ])('reports %s as an error', async (_label, respond) => {
    handle(respond);

    const { result } = renderRepository();

    await waitFor(() => expect(kindOf(result.current)).toBe('error'));
  });

  it('requests again on refetch', async () => {
    handle((count) => (count === 1 ? status(500) : found()));
    const { result } = renderRepository();
    await waitFor(() => expect(kindOf(result.current)).toBe('error'));

    act(() => {
      refetchOf(result.current)();
    });

    await waitFor(() => expect(kindOf(result.current)).toBe('success'));
  });

  it('ignores refetch while core is blocked', async () => {
    const requests = handle(() => status(500));
    const { result, coreGate } = renderRepository();
    await waitFor(() => expect(kindOf(result.current)).toBe('error'));
    act(() => {
      coreGate.report(new Date(Date.now() + 60_000));
    });

    act(() => {
      refetchOf(result.current)();
    });
    await pause();

    expect(requests.count).toBe(1);
  });

  it.each([
    ['owner', { owner: '..' }],
    ['name', { name: '..' }],
  ])('is not found at once for an invalid %s', (_label, params) => {
    const { result } = renderRepository(params);

    expect(result.current).toEqual({ kind: 'not-found' });
  });

  it('is not found for an invalid name even while core is blocked', () => {
    const { result } = renderRepository(
      { name: '..' },
      { coreGate: blockedGate() },
    );

    expect(result.current).toEqual({ kind: 'not-found' });
  });

  it('reports a rate limit to the core gate only', async () => {
    const reset = Math.floor(Date.now() / 1000) + 60;
    handle(
      () =>
        new HttpResponse(null, {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(reset),
          },
        }),
    );

    const { result, gate, coreGate } = renderRepository();
    await waitFor(() => expect(kindOf(result.current)).toBe('error'));

    expect(coreGate.getSnapshot()).toBe(reset * 1000);
    expect(gate.getSnapshot()).toBeNull();
  });

  it('is paused without a request while core is blocked', async () => {
    const requests = handle();
    const coreGate = blockedGate();

    const { result } = renderRepository({}, { coreGate });
    await pause();

    expect(result.current).toEqual({
      kind: 'paused',
      blockedUntil: coreGate.getSnapshot(),
    });
    expect(requests.count).toBe(0);
  });

  it('is not paused by the search rate limit', async () => {
    handle();

    const { result } = renderRepository({}, { gate: blockedGate() });

    await waitFor(() => expect(kindOf(result.current)).toBe('success'));
  });

  describe('when the block ends', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('requests on its own', async () => {
      handle();
      const { result } = renderRepository({}, { coreGate: blockedGate() });

      await act(() => vi.advanceTimersByTimeAsync(61_000));

      await waitFor(() => expect(kindOf(result.current)).toBe('success'));
    });
  });

  it('keeps the repository when core becomes blocked', async () => {
    const { result, coreGate } = await renderLoaded();

    act(() => {
      coreGate.report(new Date(Date.now() + 60_000));
    });

    expect(kindOf(result.current)).toBe('success');
  });

  it('keeps the repository when a refetch fails', async () => {
    const { result, queryClient } = await renderLoaded((count) =>
      count === 1 ? found() : status(500),
    );

    await act(() => queryClient.refetchQueries({ queryKey: KEY }));
    await pause();

    expect(kindOf(result.current)).toBe('success');
  });

  it('is not found when a refetch finds the repository gone', async () => {
    const { result, queryClient } = await renderLoaded((count) =>
      count === 1 ? found() : status(404),
    );

    await act(() => queryClient.refetchQueries({ queryKey: KEY }));

    await waitFor(() => expect(kindOf(result.current)).toBe('not-found'));
  });

  it.each([
    ['a renamed repository', 'new-owner', 'new-name'],
    ['a difference in case only', 'Owner', 'React'],
  ])('also caches %s under its canonical name', async (_label, owner, name) => {
    const canonical = repositoryDetails({ full_name: `${owner}/${name}` });

    const { queryClient } = await renderLoaded(() =>
      HttpResponse.json(canonical),
    );

    expect(queryClient.getQueryData(['repo', owner, name])).toEqual(canonical);
  });

  it('has the canonical entry by the first successful render', async () => {
    const canonical = repositoryDetails({ full_name: 'new-owner/new-name' });
    handle(() => HttpResponse.json(canonical));
    const seen: unknown[] = [];

    const { result } = renderHookWithProviders(() => {
      const state = useRepository('owner', 'react');
      const client = useQueryClient();
      if (state.kind === 'success') {
        seen.push(client.getQueryData(['repo', 'new-owner', 'new-name']));
      }
      return state;
    });
    await waitFor(() => expect(kindOf(result.current)).toBe('success'));

    expect(seen[0]).toEqual(canonical);
  });

  it('does not show the previous repository after the name changes', async () => {
    const { result, rerender } = await renderLoaded(async (count) => {
      if (count > 1) {
        await delay(100);
      }
      return found();
    });

    rerender({ owner: 'owner', name: 'vue' });

    expect(result.current).toEqual({ kind: 'loading' });
  });
});
