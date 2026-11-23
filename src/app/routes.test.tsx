import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';

describe('routes', () => {
  it('renders the home page inside the layout', () => {
    renderWithProviders();

    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');

    expect(
      within(header).getByRole('link', { name: 'repo-explorer' }),
    ).toHaveAttribute('href', '/');
    expect(
      within(main).getByRole('heading', {
        level: 1,
        name: 'Explore GitHub repositories',
      }),
    ).toBeInTheDocument();
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
