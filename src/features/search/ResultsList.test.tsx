import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { repository } from '@/test/fixtures';
import ResultsList from './ResultsList';

const repositories = ['react', 'redux', 'vue'].map((name) => repository(name));
const inRouter = { wrapper: MemoryRouter };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResultsList', () => {
  it('takes the list name from the labelling element', () => {
    render(
      <>
        <h2 id="heading">Matching repositories</h2>
        <ResultsList repositories={repositories} labelledBy="heading" />
      </>,
      inRouter,
    );

    expect(
      screen.getByRole('list', { name: 'Matching repositories' }),
    ).toBeInTheDocument();
  });

  it('sets the list role explicitly', () => {
    render(
      <ResultsList repositories={repositories} labelledBy="heading" />,
      inRouter,
    );

    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
  });

  it('renders one list item per repository', () => {
    render(
      <ResultsList repositories={repositories} labelledBy="heading" />,
      inRouter,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders a card inside every list item', () => {
    render(
      <ResultsList repositories={repositories} labelledBy="heading" />,
      inRouter,
    );

    const parents = screen
      .getAllByRole('article')
      .map((article) => article.parentElement?.tagName);

    expect(parents).toEqual(['LI', 'LI', 'LI']);
  });

  it('keeps the order of the repositories', () => {
    render(
      <ResultsList repositories={repositories} labelledBy="heading" />,
      inRouter,
    );

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual([
      '/repo/owner/react',
      '/repo/owner/redux',
      '/repo/owner/vue',
    ]);
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(
      <ResultsList repositories={[]} labelledBy="heading" />,
      inRouter,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not warn about duplicate keys for names of equal length', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ResultsList repositories={repositories} labelledBy="heading" />,
      inRouter,
    );

    expect(spy).not.toHaveBeenCalled();
  });
});
