import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { repository, repositoryDetails } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/utils';

function card(name: string) {
  return screen.findByRole('link', { name });
}

describe('scroll position', () => {
  let scrollTo: MockInstance<typeof window.scrollTo>;

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo');
    server.use(
      http.get('https://api.github.com/search/repositories', ({ request }) => {
        const params = new URL(request.url).searchParams;
        const name = `${params.get('page')}-${params.get('sort') ?? 'best'}`;
        return HttpResponse.json({
          total_count: 45,
          incomplete_results: false,
          items: [repository(name, { full_name: `Owner/${name}` })],
        });
      }),
      http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
        HttpResponse.json(
          repositoryDetails({ full_name: `owner/${String(params.name)}` }),
        ),
      ),
      http.get('https://api.github.com/repos/:owner/:name/languages', () =>
        HttpResponse.json({}),
      ),
    );
  });

  afterEach(() => {
    scrollTo.mockRestore();
  });

  it('stays put when the page or the sort order changes', async () => {
    const user = userEvent.setup();
    renderWithProviders({ route: '/?q=react' });
    await card('Owner/1-best');
    scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Next' }));
    await card('Owner/2-best');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort by' }),
      'stars',
    );
    await card('Owner/1-stars');

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('goes to the top once when a repository is opened', async () => {
    const user = userEvent.setup();
    renderWithProviders({ route: '/?q=react' });
    const link = await card('Owner/1-best');
    scrollTo.mockClear();

    await user.click(link);
    await screen.findByRole('heading', { level: 1, name: 'owner/1-best' });

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith(0, 0);
  });
});
