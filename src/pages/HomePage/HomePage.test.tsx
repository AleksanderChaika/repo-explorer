import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
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

function threePages(url: URL) {
  return Number(url.searchParams.get('page')) > 3
    ? HttpResponse.json({
        total_count: 45,
        incomplete_results: false,
        items: [],
      })
    : page(url);
}

function recordAddedText() {
  const added: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        added.push(record.oldValue ?? '', record.target.textContent ?? '');
      }
      for (const node of record.addedNodes) {
        added.push(node.textContent ?? '');
      }
    }
  });
  observer.observe(document.body, {
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true,
  });
  onTestFinished(() => {
    observer.disconnect();
  });
  return added;
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

  describe('a page past the last one', () => {
    async function renderClamped() {
      handleSearch(threePages);
      const view = renderWithProviders({ route: '/?q=react&page=9' });
      await card('react-3');
      return view;
    }

    it('is replaced with the last page', async () => {
      const { router } = await renderClamped();

      expect(router.state.location.search).toBe('?q=react&page=3');
    });

    it('is left out of the history', async () => {
      handleSearch(threePages);
      const { router } = renderWithProviders({ route: '/?q=first' });
      await card('first-1');
      await act(() => router.navigate('/?q=react&page=9'));
      await card('react-3');

      await act(() => router.navigate(-1));

      expect(router.state.location.search).toBe('?q=first');
    });

    it('is replaced again when it is opened a second time', async () => {
      const { router } = await renderClamped();

      await act(() => router.navigate('/?q=react&page=9'));

      await waitFor(() =>
        expect(router.state.location.search).toBe('?q=react&page=3'),
      );
    });

    async function renderReplacing() {
      const requests = handleSearch((url) =>
        url.searchParams.get('page') === '9' ? threePages(url) : never(),
      );
      renderWithProviders({ route: '/?q=react&page=9' });
      await waitFor(() =>
        expect(requests.at(-1)?.searchParams.get('page')).toBe('3'),
      );
      return requests;
    }

    it('never shows the empty results of that page', async () => {
      const added = recordAddedText();

      const requests = await renderReplacing();

      expect(requests).toHaveLength(2);
      expect(added.join()).not.toContain('45 repositories');
      expect(added.join()).not.toContain('No repositories found');
    });

    it('shows the skeleton while the last page loads', async () => {
      await renderReplacing();

      expect(skeleton()).toBeInTheDocument();
    });

    it('shows a loading line while the last page loads', async () => {
      await renderReplacing();

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('shows no results heading while the last page loads', async () => {
      await renderReplacing();

      expect(
        screen.queryByRole('heading', { name: 'Search results' }),
      ).not.toBeInTheDocument();
    });

    it('is not decided by the results of another query', async () => {
      handleSearch((url) =>
        url.searchParams.get('q') === 'react' ? page(url) : never(),
      );
      const { router } = renderWithProviders({ route: '/?q=react' });
      await card('react-1');

      await act(() => router.navigate('/?q=vue&page=5'));
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

      expect(router.state.location.search).toBe('?q=vue&page=5');
    });
  });

  describe('announcements', () => {
    const status = () => screen.getByRole('status');
    const alert = () => screen.getByRole('alert');

    function respondWith(total: number, incomplete = false) {
      handleSearch((url) =>
        HttpResponse.json({
          total_count: total,
          incomplete_results: incomplete,
          items:
            total === 0 ? [] : [repository(url.searchParams.get('q') ?? '')],
        }),
      );
    }

    function rateLimited(resetMs: number) {
      return new HttpResponse(null, {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetMs / 1000),
        },
      });
    }

    async function renderRateLimited() {
      const user = setupFakeTimerUser();
      vi.setSystemTime(Date.UTC(2026, 0, 15, 20, 0, 0));
      handleSearch(() => rateLimited(Date.UTC(2026, 0, 15, 20, 1, 0)));
      renderWithProviders({ route: '/?q=react' });
      await heading('Rate limit reached');
      return user;
    }

    it.each(['status', 'alert'])(
      'keeps the same %s region across states',
      async (role) => {
        handleSearch();
        renderWithProviders();
        await screen.findByRole('searchbox');
        const region = screen.getByRole(role);

        await submit('react');
        await card('react-1');

        expect(screen.getByRole(role)).toBe(region);
      },
    );

    it.each(['status', 'alert'])(
      'keeps the %s region outside the busy results',
      async (role) => {
        await renderLoading();

        expect(results()).not.toContainElement(screen.getByRole(role));
      },
    );

    it.each([
      ['an empty query', '/', ''],
      ['a short query', '/?q=a', 'Enter at least 2 characters to search.'],
    ])('announces the status of %s', async (_name, route, text) => {
      renderWithProviders({ route });
      await screen.findByRole('searchbox');

      expect(status().textContent).toBe(text);
    });

    it('does not announce loading', async () => {
      await renderLoading();

      expect(status()).toBeEmptyDOMElement();
    });

    it('does not announce old results while loading', async () => {
      await renderPendingNextPage();

      expect(status()).toBeEmptyDOMElement();
    });

    it('announces the total and the page', async () => {
      await renderResults();

      expect(status().textContent).toBe('45 repositories. Page 1 of 3.');
    });

    it.each([
      ['a single page', 1, false, '1 repository.'],
      [
        'a limited total',
        4321,
        false,
        'Showing the first 1,000 of 4,321 repositories. Page 1 of 50.',
      ],
      [
        'incomplete results',
        2,
        true,
        '2 repositories. Some results may be missing because the search timed out.',
      ],
      ['no results', 0, false, 'No repositories found.'],
    ])('announces %s', async (_name, total, incomplete, text) => {
      respondWith(total, incomplete);
      renderWithProviders({ route: '/?q=react' });

      await waitFor(() => expect(status().textContent).toBe(text));
    });

    it('announces a paused search', async () => {
      const user = await renderRateLimited();

      await user.type(screen.getByRole('searchbox'), '-dom{Enter}');
      await heading('Search paused');

      expect(status().textContent).toBe(
        'Search paused. Your search will start at 12:01.',
      );
    });

    it('has no alert for results', async () => {
      await renderResults();

      expect(alert()).toBeEmptyDOMElement();
    });

    it('announces an error in the alert', async () => {
      handleSearch(() => HttpResponse.error());
      renderWithProviders({ route: '/?q=react' });
      await heading('Connection problem');

      expect(alert().textContent).toBe(
        "Connection problem. Couldn't reach GitHub. Check your connection and try again.",
      );
    });

    it('does not repeat an error in the status', async () => {
      handleSearch(() => HttpResponse.error());
      renderWithProviders({ route: '/?q=react' });
      await heading('Connection problem');

      expect(status()).toBeEmptyDOMElement();
    });

    it('announces the reset time without a countdown', async () => {
      await renderRateLimited();

      await act(() => vi.advanceTimersByTimeAsync(5000));

      expect(alert().textContent).toBe(
        'Rate limit reached. You can search again at 12:01.',
      );
    });
  });

  describe('focus', () => {
    const resultsHeading = () =>
      screen.getByRole('heading', { level: 2, name: 'Search results' });

    function holdSecondRequest(first: (url: URL) => Response) {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      onTestFinished(release);
      handleSearch(async (url, count) => {
        if (count === 1) {
          return first(url);
        }
        await held;
        return page(url);
      });
      return release;
    }

    it.each([
      ['Next', 1, 2],
      ['Previous', 2, 1],
    ])('stays on the results heading after %s', async (link, from, to) => {
      const release = holdSecondRequest(page);
      renderWithProviders({ route: `/?q=react&page=${from}` });
      await card(`react-${from}`);

      await userEvent.click(screen.getByRole('link', { name: link }));

      expect(resultsHeading()).toHaveFocus();

      release();
      await card(`react-${to}`);

      expect(resultsHeading()).toHaveFocus();
    });

    it('moves to the results after Retry', async () => {
      const release = holdSecondRequest(() => HttpResponse.error());
      renderWithProviders({ route: '/?q=react' });
      await heading('Connection problem');

      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(results()).toHaveFocus();

      release();
      await card('react-1');

      expect(results()).toHaveFocus();
    });

    it('is not moved when the page first loads', async () => {
      await renderResults();

      expect(document.body).toHaveFocus();
    });

    it('is not moved on Back', async () => {
      handleSearch();
      const { router } = renderWithProviders({ route: '/?q=react' });
      await card('react-1');
      await userEvent.click(screen.getByRole('link', { name: 'Next' }));
      await card('react-2');
      screen.getByRole('searchbox').focus();

      await act(() => router.navigate(-1));
      await card('react-1');

      expect(screen.getByRole('searchbox')).toHaveFocus();
    });
  });
});
