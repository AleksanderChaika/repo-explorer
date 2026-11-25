import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { describe, expect, it, vi } from 'vitest';
import { repository } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderWithProviders, setupFakeTimerUser } from '@/test/utils';

const ENDPOINT = 'https://api.github.com/search/repositories';

type Responder = (url: URL, count: number) => Response | Promise<Response>;

function page(url: URL, total = 45) {
  const name = `${url.searchParams.get('q')}-${url.searchParams.get('page')}`;
  return HttpResponse.json({
    total_count: total,
    incomplete_results: false,
    items: total === 0 ? [] : [repository(name)],
  });
}

function handleSearch(respond: Responder = (url) => page(url)) {
  const requests: URL[] = [];
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      return respond(url, requests.length);
    }),
  );
  return requests;
}

async function never(): Promise<Response> {
  await delay('infinite');
  return HttpResponse.error();
}

function card(name: string) {
  return screen.findByRole('article', { name: `owner/${name}` });
}

function heading(name: string) {
  return screen.findByRole('heading', { level: 2, name });
}

function results() {
  return screen.getByRole('region', { name: 'Results' });
}

function skeleton() {
  return results().querySelector('ul[aria-hidden="true"]');
}

async function submit(query: string) {
  const user = userEvent.setup();
  const field = screen.getByRole('searchbox');
  await user.clear(field);
  await user.type(field, `${query}{Enter}`);
}

async function renderLoading() {
  handleSearch(never);
  renderWithProviders({ route: '/?q=react' });
  await screen.findByRole('searchbox');
}

async function renderResults() {
  handleSearch();
  renderWithProviders({ route: '/?q=react' });
  await card('react-1');
}

async function renderPendingNextPage() {
  const requests = handleSearch((url) =>
    url.searchParams.get('page') === '1' ? page(url) : never(),
  );
  renderWithProviders({ route: '/?q=react' });
  await card('react-1');
  await userEvent.click(screen.getByRole('link', { name: 'Next' }));
  await waitFor(() => expect(requests).toHaveLength(2));
}

describe('HomePage', () => {
  describe('without a search', () => {
    it('shows the prompt for an empty query', async () => {
      renderWithProviders();

      expect(await heading('Search GitHub repositories')).toBeInTheDocument();
    });

    it('asks for more characters for a short query', async () => {
      renderWithProviders({ route: '/?q=a' });

      expect(await heading('Keep typing')).toBeInTheDocument();
    });

    it('does not request a short query', async () => {
      const requests = handleSearch();
      renderWithProviders({ route: '/?q=a' });
      await screen.findByRole('searchbox');

      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

      expect(requests).toHaveLength(0);
    });
  });

  describe('while the first page loads', () => {
    it('shows the skeleton', async () => {
      await renderLoading();

      expect(skeleton()).toBeInTheDocument();
    });

    it('shows a loading line', async () => {
      await renderLoading();

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('marks the results as busy', async () => {
      await renderLoading();

      expect(results()).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('with results', () => {
    it('shows the summary', async () => {
      await renderResults();

      expect(screen.getByText('45 repositories')).toBeInTheDocument();
    });

    it('names the results list after its heading', async () => {
      await renderResults();

      expect(
        screen.getByRole('list', { name: 'Search results' }),
      ).toBeInTheDocument();
    });

    it('shows the pagination', async () => {
      await renderResults();

      expect(
        screen.getByRole('navigation', { name: 'Pagination' }),
      ).toBeInTheDocument();
    });

    it('is not busy', async () => {
      await renderResults();

      expect(results()).toHaveAttribute('aria-busy', 'false');
    });

    it('hides the loading line', async () => {
      await renderResults();

      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });

    it('says that nothing matches the query', async () => {
      handleSearch((url) => page(url, 0));
      renderWithProviders({ route: '/?q=zzz' });

      expect(await screen.findByText(/Nothing matches “zzz”/)).toBeVisible();
    });
  });

  describe('errors', () => {
    it.each<[string, () => Response, string]>([
      ['a network failure', () => HttpResponse.error(), 'Connection problem'],
      [
        'a server error',
        () => new HttpResponse(null, { status: 500 }),
        'Something went wrong',
      ],
      [
        'a rejected query',
        () => new HttpResponse(null, { status: 422 }),
        'Search query not accepted',
      ],
      [
        'a rate limit',
        () =>
          new HttpResponse(null, {
            status: 403,
            headers: {
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
            },
          }),
        'Rate limit reached',
      ],
    ])('explains %s', async (_name, respond, title) => {
      handleSearch(respond);
      renderWithProviders({ route: '/?q=react' });

      expect(await heading(title)).toBeInTheDocument();
    });

    it('requests again after Retry', async () => {
      handleSearch((url, count) =>
        count === 1 ? HttpResponse.error() : page(url),
      );
      renderWithProviders({ route: '/?q=react' });
      await heading('Connection problem');

      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await card('react-1')).toBeInTheDocument();
    });

    it('shows that a new search is paused during a rate limit', async () => {
      handleSearch(
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { 'retry-after': '60' },
          }),
      );
      renderWithProviders({ route: '/?q=react' });
      await heading('Rate limit reached');

      await submit('vue');

      expect(await heading('Search paused')).toBeInTheDocument();
    });
  });

  describe('form', () => {
    it('requests what the user typed after 500 ms', async () => {
      const user = setupFakeTimerUser();
      const requests = handleSearch();
      renderWithProviders();
      await user.type(await screen.findByRole('searchbox'), 'react');

      await act(() => vi.advanceTimersByTimeAsync(499));

      expect(requests).toHaveLength(0);

      await act(() => vi.advanceTimersByTimeAsync(1));

      expect(requests).toHaveLength(1);
    });

    it('requests the chosen sort', async () => {
      const requests = handleSearch();
      renderWithProviders({ route: '/?q=react' });
      await card('react-1');

      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'Sort by' }),
        'Stars',
      );

      await waitFor(() =>
        expect(requests.at(-1)?.searchParams.get('sort')).toBe('stars'),
      );
    });

    it('requests the chosen order', async () => {
      const requests = handleSearch();
      renderWithProviders({ route: '/?q=react&sort=stars' });
      await card('react-1');

      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'Order' }),
        'Ascending',
      );

      await waitFor(() =>
        expect(requests.at(-1)?.searchParams.get('order')).toBe('asc'),
      );
    });
  });

  describe('pages', () => {
    it('keeps the old results while the next page loads', async () => {
      await renderPendingNextPage();

      expect(
        screen.getByRole('article', { name: 'owner/react-1' }),
      ).toBeInTheDocument();
    });

    it('shows a loading line over the old results', async () => {
      await renderPendingNextPage();

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('marks the old results as busy', async () => {
      await renderPendingNextPage();

      expect(results()).toHaveAttribute('aria-busy', 'true');
    });

    it('shows the skeleton instead of an old empty result', async () => {
      const requests = handleSearch((url) =>
        url.searchParams.get('q') === 'zzz' ? page(url, 0) : never(),
      );
      renderWithProviders({ route: '/?q=zzz' });
      await screen.findByText(/Nothing matches/);

      await submit('react');
      await waitFor(() => expect(requests).toHaveLength(2));

      expect(skeleton()).toBeInTheDocument();
    });

    it('goes to the next page', async () => {
      await renderResults();

      await userEvent.click(screen.getByRole('link', { name: 'Next' }));

      expect(await card('react-2')).toBeInTheDocument();
    });

    it('shows the previous page again on Back', async () => {
      handleSearch();
      const { router } = renderWithProviders({ route: '/?q=react' });
      await card('react-1');
      await userEvent.click(screen.getByRole('link', { name: 'Next' }));
      await card('react-2');

      await act(() => router.navigate(-1));

      expect(await card('react-1')).toBeInTheDocument();
    });
  });
});
