import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { shouldRetry } from '@/api/queryClient';
import type { RateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { useRateLimitGate } from '@/features/rateLimit/rateLimitGateContext';
import Providers from './providers';

function Probe() {
  const queries = useQueryClient().getDefaultOptions().queries;

  return (
    <dl>
      <dt>retry</dt>
      <dd data-testid="retry">{String(queries?.retry === shouldRetry)}</dd>
      <dt>focus</dt>
      <dd data-testid="focus">{String(queries?.refetchOnWindowFocus)}</dd>
    </dl>
  );
}

function GateProbe({ onGate }: { onGate: (gate: RateLimitGate) => void }) {
  const gate = useRateLimitGate('search');
  useEffect(() => {
    onGate(gate);
  });
  return null;
}

describe('Providers', () => {
  it('provides the QueryClient with the API retry and focus policy', () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );

    expect(screen.getByTestId('retry')).toHaveTextContent('true');
    expect(screen.getByTestId('focus')).toHaveTextContent('false');
  });

  it('provides one rate limit gate that survives re-renders', () => {
    const seen: RateLimitGate[] = [];
    const renderUi = () => (
      <Providers>
        <GateProbe onGate={(gate) => seen.push(gate)} />
      </Providers>
    );

    const { rerender } = render(renderUi());
    rerender(renderUi());

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });
});
