import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/api/errors';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import TestProviders from '@/test/TestProviders';
import LanguagesSection from './LanguagesSection';

describe('LanguagesSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables Retry in its own notice while core is blocked', () => {
    const coreGate = createRateLimitGate();
    coreGate.report(new Date(Date.now() + 60_000));

    render(
      <TestProviders
        queryClient={new QueryClient()}
        gate={createRateLimitGate()}
        coreGate={coreGate}
      >
        <LanguagesSection
          state={{
            kind: 'error',
            error: new HttpError(500, 'Server Error'),
            refetch: vi.fn(),
          }}
          onRetry={vi.fn()}
        />
      </TestProviders>,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Languages unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });
});
