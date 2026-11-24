import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { shouldRetry } from '@/api/queryClient';
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
});
