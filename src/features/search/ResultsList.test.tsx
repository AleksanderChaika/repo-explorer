import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { repository } from '@/test/fixtures';
import ResultsList from './ResultsList';

const repositories = ['react', 'redux', 'vue'].map((name) => repository(name));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResultsList', () => {
  it('names the list "Search results"', () => {
    render(<ResultsList repositories={repositories} />);

    expect(
      screen.getByRole('list', { name: 'Search results' }),
    ).toBeInTheDocument();
  });

  it('sets the list role explicitly', () => {
    render(<ResultsList repositories={repositories} />);

    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
  });

  it('renders one list item per repository', () => {
    render(<ResultsList repositories={repositories} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders a card inside every list item', () => {
    render(<ResultsList repositories={repositories} />);

    const parents = screen
      .getAllByRole('article')
      .map((article) => article.parentElement?.tagName);

    expect(parents).toEqual(['LI', 'LI', 'LI']);
  });

  it('keeps the order of the repositories', () => {
    render(<ResultsList repositories={repositories} />);

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual([
      'https://github.com/owner/react',
      'https://github.com/owner/redux',
      'https://github.com/owner/vue',
    ]);
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<ResultsList repositories={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('does not warn about duplicate keys for names of equal length', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ResultsList repositories={repositories} />);

    expect(spy).not.toHaveBeenCalled();
  });
});
