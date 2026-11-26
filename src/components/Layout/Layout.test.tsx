import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { repository } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/utils';

function heading(name: string) {
  return screen.getByRole('heading', { level: 1, name });
}

async function followHomeLink() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('link', { name: 'Go to the home page' }));
  await waitFor(() =>
    expect(heading('Explore GitHub repositories')).toHaveFocus(),
  );
}

describe('Layout focus', () => {
  it('moves focus to the heading after navigation, not on first open', async () => {
    renderWithProviders({ route: '/no/such/page' });

    expect(document.body).toHaveFocus();

    await followHomeLink();
  });

  it('keeps focus in the search field while searching', async () => {
    server.use(
      http.get('https://api.github.com/search/repositories', ({ request }) => {
        const query = new URL(request.url).searchParams.get('q') ?? '';
        return HttpResponse.json({
          total_count: 1,
          incomplete_results: false,
          items: [repository(query)],
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders({ route: '/?q=%20react' });
    await screen.findByRole('article', { name: 'owner/react' });

    expect(document.body).toHaveFocus();

    const field = screen.getByRole('searchbox');
    await user.clear(field);
    await user.type(field, 'vue{Enter}');
    await screen.findByRole('article', { name: 'owner/vue' });

    expect(field).toHaveFocus();
  });

  it('does not scroll to the heading on Back', async () => {
    const { router } = renderWithProviders({ route: '/no/such/page' });
    await followHomeLink();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    onTestFinished(() => {
      focus.mockRestore();
    });

    await act(() => router.navigate(-1));

    await waitFor(() => expect(heading('Page not found')).toHaveFocus());
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });
});
