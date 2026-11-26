import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { repository, repositoryDetails } from '@/test/fixtures';
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

  it('links back to the search after the canonical replace', async () => {
    const user = userEvent.setup();
    renderWithProviders({ route: '/?q=react&sort=stars' });
    await user.click(await screen.findByRole('link', { name: 'Owner/React' }));
    await screen.findByRole('heading', { level: 1, name: 'owner/react' });

    expect(
      screen.getByRole('link', { name: 'Back to results' }),
    ).toHaveAttribute('href', '/?q=react&sort=stars');
  });

  it('links to the home page when opened directly', () => {
    renderWithProviders({ route: '/repo/owner/react' });

    expect(
      screen.getByRole('link', { name: 'Search repositories' }),
    ).toHaveAttribute('href', '/');
  });
});
