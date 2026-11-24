import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState';
import type { EmptyStateProps } from './EmptyState';
import { MIN_QUERY_LENGTH } from './searchParams';

const variants: { name: string; props: EmptyStateProps }[] = [
  { name: 'empty', props: { reason: 'empty' } },
  { name: 'short', props: { reason: 'short' } },
  { name: 'no-results', props: { reason: 'no-results', query: 'react' } },
];

describe('EmptyState', () => {
  it('invites the user to search when the query is empty', () => {
    render(<EmptyState reason="empty" />);

    expect(
      screen.getByRole('heading', { name: 'Search GitHub repositories' }),
    ).toBeInTheDocument();
  });

  it('explains how to start a search when the query is empty', () => {
    render(<EmptyState reason="empty" />);

    expect(
      screen.getByText('Type a name or keyword to find public repositories.'),
    ).toBeInTheDocument();
  });

  it('asks the user to keep typing when the query is short', () => {
    render(<EmptyState reason="short" />);

    expect(
      screen.getByRole('heading', { name: 'Keep typing' }),
    ).toBeInTheDocument();
  });

  it('states the minimum query length when the query is short', () => {
    render(<EmptyState reason="short" />);

    expect(
      screen.getByText(
        `Enter at least ${MIN_QUERY_LENGTH} characters to search.`,
      ),
    ).toBeInTheDocument();
  });

  it('reports that nothing was found', () => {
    render(<EmptyState reason="no-results" query="react" />);

    expect(
      screen.getByRole('heading', { name: 'No repositories found' }),
    ).toBeInTheDocument();
  });

  it('names the query that matched nothing', () => {
    render(<EmptyState reason="no-results" query="react" />);

    expect(
      screen.getByText('Nothing matches “react”. Try a different keyword.'),
    ).toBeInTheDocument();
  });

  it('renders the query as text, not as markup', () => {
    render(<EmptyState reason="no-results" query="<b>react</b>" />);

    expect(
      screen.getByText(
        'Nothing matches “<b>react</b>”. Try a different keyword.',
      ),
    ).toBeInTheDocument();
  });

  it.each(variants)('uses a level 2 heading for $name', ({ props }) => {
    render(<EmptyState {...props} />);

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it.each(variants)('has no status role for $name', ({ props }) => {
    render(<EmptyState {...props} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each(variants)('has no alert role for $name', ({ props }) => {
    render(<EmptyState {...props} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(variants)('has no aria-live attribute for $name', ({ props }) => {
    const { container } = render(<EmptyState {...props} />);

    expect(container.querySelector('[aria-live]')).toBeNull();
  });
});
