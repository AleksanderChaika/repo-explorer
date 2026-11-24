import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { server } from '@/test/server';
import { isApiError } from './errors';
import { searchRepositories, type SearchRepositoriesParams } from './search';
import type { SearchRepositoriesResponse } from './types';

const ENDPOINT = 'https://api.github.com/search/repositories';

const RESPONSE: SearchRepositoriesResponse = {
  total_count: 2,
  incomplete_results: false,
  items: [
    {
      id: 10270250,
      name: 'react',
      full_name: 'facebook/react',
      owner: {
        login: 'facebook',
        avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
      },
      html_url: 'https://github.com/facebook/react',
      description: 'The library for web and native user interfaces.',
      stargazers_count: 250000,
      language: 'JavaScript',
      forks_count: 51000,
      updated_at: '2026-11-23T20:05:43Z',
    },
    {
      id: 1,
      name: 'empty',
      full_name: 'someone/empty',
      owner: null,
      html_url: 'https://github.com/someone/empty',
      description: null,
      stargazers_count: 0,
      language: null,
      forks_count: 0,
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
};

function captureUrl() {
  const captured: { url?: URL } = {};
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      captured.url = new URL(request.url);
      return HttpResponse.json(RESPONSE);
    }),
  );
  return captured;
}

describe('searchRepositories', () => {
  it('sends every given parameter in the query string', async () => {
    const captured = captureUrl();

    await searchRepositories({
      q: 'react language:typescript',
      sort: 'stars',
      order: 'desc',
      per_page: 10,
      page: 3,
    });

    expect(Object.fromEntries(captured.url?.searchParams ?? [])).toEqual({
      q: 'react language:typescript',
      sort: 'stars',
      order: 'desc',
      per_page: '10',
      page: '3',
    });
  });

  it('leaves out parameters that are undefined', async () => {
    const captured = captureUrl();

    await searchRepositories({ q: 'react', sort: undefined, page: undefined });

    expect([...(captured.url?.searchParams.keys() ?? [])]).toEqual(['q']);
  });

  it('returns the parsed response', async () => {
    captureUrl();

    const result = await searchRepositories({ q: 'react' });

    expect(result).toEqual(RESPONSE);
  });

  it('passes the signal on, so that aborting rejects with an AbortError', async () => {
    server.use(
      http.get(ENDPOINT, async () => {
        await delay('infinite');
        return HttpResponse.json(RESPONSE);
      }),
    );
    const controller = new AbortController();

    const pending = searchRepositories({ q: 'react' }, controller.signal).then(
      () => null,
      (error: unknown) => error,
    );
    controller.abort();
    const error = await pending;

    expect(isApiError(error)).toBe(false);
    expect(error).toMatchObject({ name: 'AbortError' });
  });

  it('accepts only the sort and order values GitHub documents', () => {
    expectTypeOf<SearchRepositoriesParams['sort']>().toEqualTypeOf<
      'stars' | 'forks' | 'help-wanted-issues' | 'updated' | undefined
    >();
    expectTypeOf<SearchRepositoriesParams['order']>().toEqualTypeOf<
      'desc' | 'asc' | undefined
    >();
  });
});
