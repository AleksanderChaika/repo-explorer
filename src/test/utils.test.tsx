import { useQueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createRateLimitGate } from '@/features/search/rateLimitGate';
import { useRateLimitGate } from '@/features/search/rateLimitGateContext';
import { renderHookWithProviders } from './utils';

function useProviders() {
  return { queryClient: useQueryClient(), gate: useRateLimitGate() };
}

describe('renderHookWithProviders', () => {
  it('gives the hook the query client and gate that it returns', () => {
    const { result, queryClient, gate } = renderHookWithProviders(useProviders);

    expect(result.current.queryClient).toBe(queryClient);
    expect(result.current.gate).toBe(gate);
  });

  it('uses the gate passed in options', () => {
    const gate = createRateLimitGate();

    const { result, gate: returned } = renderHookWithProviders(useProviders, {
      gate,
    });

    expect(returned).toBe(gate);
    expect(result.current.gate).toBe(gate);
  });

  it('creates a separate query client and gate for every call', () => {
    const first = renderHookWithProviders(useProviders);
    const second = renderHookWithProviders(useProviders);

    expect(second.queryClient).not.toBe(first.queryClient);
    expect(second.gate).not.toBe(first.gate);
  });

  it('turns query retries off', () => {
    const { queryClient } = renderHookWithProviders(useProviders);

    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });

  it('passes initial props and new props on rerender', () => {
    const { result, rerender } = renderHookWithProviders(
      ({ value }: { value: number }) => value * 2,
      { initialProps: { value: 1 } },
    );

    expect(result.current).toBe(2);

    rerender({ value: 5 });

    expect(result.current).toBe(10);
  });
});
