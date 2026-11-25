import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';

describe('routes', () => {
  it('renders the home page inside the layout', async () => {
    renderWithProviders();

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Explore GitHub repositories',
    });

    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'repo-explorer',
      }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByRole('main')).toContainElement(heading);
  });

  it('replaces a non-canonical search URL with the canonical one', async () => {
    const { router } = renderWithProviders({ route: '/?q=%20react%20&foo=1' });

    await screen.findByRole('heading', { level: 1 });

    expect(router.state.location.search).toBe('?q=react');
  });

  it('canonicalizes with a replace navigation', async () => {
    const { router } = renderWithProviders({ route: '/?q=%20react' });

    await screen.findByRole('heading', { level: 1 });

    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('goes back past a canonicalized entry', async () => {
    const { router } = renderWithProviders({
      initialEntries: ['/?q=first', '/?foo=1'],
    });
    await screen.findByRole('heading', { level: 1 });

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.search).toBe('?q=first');
  });

  it('renders the layout before the search loader finishes', async () => {
    renderWithProviders({ route: '/?q=react' });

    expect(screen.getByRole('banner')).toBeInTheDocument();

    await screen.findByRole('heading', { level: 1 });
  });

  it('renders the placeholder with a link home for an unknown path', () => {
    renderWithProviders({ route: '/no/such/page' });

    const main = screen.getByRole('main');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(
      within(main).getByRole('link', { name: 'Go to the home page' }),
    ).toHaveAttribute('href', '/');
  });
});
