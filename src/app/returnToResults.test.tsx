import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { repository, repositoryDetails, searchResponse } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/utils';

describe('return to the results', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.github.com/search/repositories', () =>
        HttpResponse.json({
          total_count: 1,
          incomplete_results: false,
          items: [repository('React', { full_name: 'Owner/React' })],
        }),
      ),
      http.get('https://api.github.com/repos/:owner/:name', () =>
        HttpResponse.json(repositoryDetails()),
      ),
      http.get('https://api.github.com/repos/:owner/:name/languages', () =>
        HttpResponse.json({}),
      ),
    );
  });

  it('returns to the same card after the canonical replace', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders({ route: '/?q=react&sort=stars' });
    await user.click(await screen.findByRole('link', { name: 'Owner/React' }));
    await screen.findByRole('heading', { level: 1, name: 'owner/react' });

    expect(
      screen.getByRole('link', { name: 'Back to results' }),
    ).toHaveAttribute('href', '/?q=react&sort=stars');

    await user.click(screen.getByRole('link', { name: 'Back to results' }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Owner/React' })).toHaveFocus(),
    );
    expect(router.state.location.search).toBe('?q=react&sort=stars');
  });

  it('focuses the card left from on browser Back', async () => {
    server.use(
      http.get('https://api.github.com/search/repositories', () =>
        HttpResponse.json(searchResponse('one', 'two')),
      ),
      http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
        HttpResponse.json(
          repositoryDetails({
            full_name: `${String(params.owner)}/${String(params.name)}`,
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderWithProviders({ route: '/?q=react' });
    await user.click(await screen.findByRole('link', { name: 'owner/two' }));
    await screen.findByRole('heading', { level: 1, name: 'owner/two' });

    await act(() => router.navigate(-1));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'owner/two' })).toHaveFocus(),
    );
  });

  it('links to the home page when opened directly', () => {
    renderWithProviders({ route: '/repo/owner/react' });

    expect(
      screen.getByRole('link', { name: 'Search repositories' }),
    ).toHaveAttribute('href', '/');
  });
});
