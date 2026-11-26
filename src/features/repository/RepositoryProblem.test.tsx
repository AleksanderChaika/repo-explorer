import { QueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/api/errors';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { formatTime } from '@/lib/format';
import TestProviders from '@/test/TestProviders';
import RepositoryProblem from './RepositoryProblem';

describe('RepositoryProblem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables Retry only while core is blocked', () => {
    const coreGate = createRateLimitGate();
    const resetAt = new Date(Date.now() + 60_000);
    coreGate.report(resetAt);
    render(
      <TestProviders
        queryClient={new QueryClient()}
        gate={createRateLimitGate()}
        coreGate={coreGate}
      >
        <RepositoryProblem
          state={{
            kind: 'error',
            error: new HttpError(500, 'Server Error'),
            refetch: vi.fn(),
          }}
          onRetry={vi.fn()}
        />
      </TestProviders>,
    );
    const retry = screen.getByRole('button', { name: 'Retry' });
    const notice = `Retry will be available at ${formatTime(resetAt)}.`;

    expect(retry).toBeDisabled();
    expect(screen.getByText(notice, { exact: false })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(retry).toBeEnabled();
    expect(
      screen.queryByText(/Retry will be available/),
    ).not.toBeInTheDocument();
  });
});
