import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResultsSkeleton from './ResultsSkeleton';

describe('ResultsSkeleton', () => {
  it('renders six placeholders by default', () => {
    render(<ResultsSkeleton />);

    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(6);
  });

  it('renders the requested number of placeholders', () => {
    render(<ResultsSkeleton count={3} />);

    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(3);
  });

  it('is hidden from assistive technology', () => {
    render(<ResultsSkeleton />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('has no text for screen readers', () => {
    const { container } = render(<ResultsSkeleton />);

    expect(container.textContent).toBe('');
  });

  it('has no status role', () => {
    render(<ResultsSkeleton />);

    expect(
      screen.queryByRole('status', { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it('has no alert role', () => {
    render(<ResultsSkeleton />);

    expect(
      screen.queryByRole('alert', { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it('has no aria-live attribute', () => {
    const { container } = render(<ResultsSkeleton />);

    expect(container.querySelector('[aria-live]')).toBeNull();
  });
});
