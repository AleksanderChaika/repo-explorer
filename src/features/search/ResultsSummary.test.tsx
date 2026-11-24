import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResultsSummary from './ResultsSummary';

const variants = [
  { name: 'a plain count', totalCount: 42, incompleteResults: false },
  { name: 'a limited count', totalCount: 4321987, incompleteResults: false },
  { name: 'incomplete results', totalCount: 42, incompleteResults: true },
];

describe('ResultsSummary', () => {
  it('uses the singular for one repository', () => {
    render(<ResultsSummary totalCount={1} incompleteResults={false} />);

    expect(screen.getByText('1 repository')).toBeInTheDocument();
  });

  it('uses the plural for zero repositories', () => {
    render(<ResultsSummary totalCount={0} incompleteResults={false} />);

    expect(screen.getByText('0 repositories')).toBeInTheDocument();
  });

  it('groups thousands in the count', () => {
    render(<ResultsSummary totalCount={1000} incompleteResults={false} />);

    expect(screen.getByText('1,000 repositories')).toBeInTheDocument();
  });

  it('does not mention the limit below the maximum', () => {
    render(<ResultsSummary totalCount={999} incompleteResults={false} />);

    expect(screen.queryByText(/Showing the first/)).not.toBeInTheDocument();
  });

  it('does not mention the limit at exactly the maximum', () => {
    render(<ResultsSummary totalCount={1000} incompleteResults={false} />);

    expect(screen.queryByText(/Showing the first/)).not.toBeInTheDocument();
  });

  it('mentions the limit just above the maximum', () => {
    render(<ResultsSummary totalCount={1001} incompleteResults={false} />);

    expect(
      screen.getByText('Showing the first 1,000 of 1,001 repositories.'),
    ).toBeInTheDocument();
  });

  it('formats the total in the limit message', () => {
    render(<ResultsSummary totalCount={4321987} incompleteResults={false} />);

    expect(
      screen.getByText('Showing the first 1,000 of 4,321,987 repositories.'),
    ).toBeInTheDocument();
  });

  it('shows the total only once when the results are limited', () => {
    render(<ResultsSummary totalCount={4321987} incompleteResults={false} />);

    expect(
      screen.queryByText('4,321,987 repositories'),
    ).not.toBeInTheDocument();
  });

  it('warns when the results are incomplete', () => {
    render(<ResultsSummary totalCount={42} incompleteResults />);

    expect(
      screen.getByText(
        'Some results may be missing because the search timed out.',
      ),
    ).toBeInTheDocument();
  });

  it('does not warn when the results are complete', () => {
    render(<ResultsSummary totalCount={42} incompleteResults={false} />);

    expect(screen.queryByText(/may be missing/)).not.toBeInTheDocument();
  });

  it.each(variants)(
    'has no status role for $name',
    ({ totalCount, incompleteResults }) => {
      render(
        <ResultsSummary
          totalCount={totalCount}
          incompleteResults={incompleteResults}
        />,
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it.each(variants)(
    'has no alert role for $name',
    ({ totalCount, incompleteResults }) => {
      render(
        <ResultsSummary
          totalCount={totalCount}
          incompleteResults={incompleteResults}
        />,
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it.each(variants)(
    'has no aria-live attribute for $name',
    ({ totalCount, incompleteResults }) => {
      const { container } = render(
        <ResultsSummary
          totalCount={totalCount}
          incompleteResults={incompleteResults}
        />,
      );

      expect(container.querySelector('[aria-live]')).toBeNull();
    },
  );
});
