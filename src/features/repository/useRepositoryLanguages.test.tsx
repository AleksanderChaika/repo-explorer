import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import type { RateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { languages } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderHookWithProviders } from '@/test/utils';
import { useRepositoryLanguages } from './useRepositoryLanguages';
import type { LanguagesState } from './useRepositoryLanguages';

const ENDPOINT = 'https://api.github.com/repos/:owner/:name/languages';
const KEY = ['repo', 'owner', 'react', 'languages'];

type Responder = (count: number) => Response | Promise<Response>;

function found() {
  return HttpResponse.json(languages());
}

function serverError() {
  return new HttpResponse(null, { status: 500 });
}

function rateLimited(reset = Math.floor(Date.now() / 1000) + 60) {
  return new HttpResponse(null, {
    status: 403,
    headers: {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(reset),
    },
  });
}

function handle(respond: Responder = found) {
  const paths: string[] = [];
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      paths.push(new URL(request.url).pathname);
      return respond(paths.length);
    }),
  );
  return paths;
}

function renderLanguages(
  fullName = 'owner/react',
  gates: { coreGate?: RateLimitGate } = {},
) {
  return renderHookWithProviders(() => useRepositoryLanguages(fullName), gates);
}

function kindOf(state: LanguagesState) {
  return state.kind;
}

function refetchOf(state: LanguagesState) {
  if (state.kind !== 'error') {
    throw new Error(`expected error, got ${state.kind}`);
  }
  return state.refetch;
}

function pause() {
  return act(() => new Promise((resolve) => setTimeout(resolve, 50)));
}

describe('useRepositoryLanguages', () => {
  it('requests the languages of the full name', async () => {
    const paths = handle();

    const { result } = renderLanguages('new-owner/new-name');
    await waitFor(() => expect(kindOf(result.current)).toBe('success'));

    expect(paths).toEqual(['/repos/new-owner/new-name/languages']);
  });

  it('ignores refetch while core is blocked', async () => {
    const paths = handle(serverError);
    const { result, coreGate } = renderLanguages();
    await waitFor(() => expect(kindOf(result.current)).toBe('error'));
    act(() => {
      coreGate.report(new Date(Date.now() + 60_000));
    });

    act(() => {
      refetchOf(result.current)();
    });
    await pause();

    expect(paths).toHaveLength(1);
  });

  it('reports a rate limit to the core gate only', async () => {
    const reset = Math.floor(Date.now() / 1000) + 60;
    handle(() => rateLimited(reset));

    const { result, gate, coreGate } = renderLanguages();
    await waitFor(() => expect(kindOf(result.current)).toBe('error'));

    expect(coreGate.getSnapshot()).toBe(reset * 1000);
    expect(gate.getSnapshot()).toBeNull();
  });

  it('is paused without a request while core is blocked', async () => {
    const paths = handle();
    const coreGate = createRateLimitGate();
    coreGate.report(new Date(Date.now() + 60_000));

    const { result } = renderLanguages('owner/react', { coreGate });
    await pause();

    expect(result.current).toEqual({
      kind: 'paused',
      blockedUntil: coreGate.getSnapshot(),
    });
    expect(paths).toHaveLength(0);
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
      const coreGate = createRateLimitGate();
      coreGate.report(new Date(Date.now() + 60_000));
      const { result } = renderLanguages('owner/react', { coreGate });

      await act(() => vi.advanceTimersByTimeAsync(61_000));

      await waitFor(() => expect(kindOf(result.current)).toBe('success'));
    });
  });

  it('keeps the languages when a refetch hits the rate limit', async () => {
    handle((count) => (count === 1 ? found() : rateLimited()));
    const { result, queryClient, coreGate } = renderLanguages();
    await waitFor(() => expect(kindOf(result.current)).toBe('success'));

    await act(() => queryClient.refetchQueries({ queryKey: KEY }));
    await waitFor(() => expect(coreGate.getSnapshot()).not.toBeNull());
    await pause();

    expect(kindOf(result.current)).toBe('success');
  });
});
