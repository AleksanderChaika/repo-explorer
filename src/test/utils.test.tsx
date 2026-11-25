import { useQueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createRateLimitGate } from '@/features/search/rateLimitGate';
import { useRateLimitGate } from '@/features/search/rateLimitGateContext';
import { renderHookWithProviders, renderHookWithRouter } from './utils';

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

describe('renderHookWithRouter', () => {
  it('renders the hook inside a data router at the root by default', () => {
    const { result } = renderHookWithRouter(useLocation);

    expect(result.current.pathname).toBe('/');
  });

  it('starts at the given entry', () => {
    const { result } = renderHookWithRouter(useLocation, {
      initialEntries: ['/a'],
    });

    expect(result.current.pathname).toBe('/a');
  });

  it('keeps the search string of the given entry', () => {
    const { result } = renderHookWithRouter(useLocation, {
      initialEntries: ['/?q=react'],
    });

    expect(result.current.search).toBe('?q=react');
  });

  it('starts at the entry chosen by initialIndex', () => {
    const { result } = renderHookWithRouter(useLocation, {
      initialEntries: ['/first', '/second'],
      initialIndex: 0,
    });

    expect(result.current.pathname).toBe('/first');
  });

  it('returns the router that renders the hook', async () => {
    const { result, router } = renderHookWithRouter(useNavigate);

    await act(async () => {
      await result.current('/next');
    });

    expect(router.state.location.pathname).toBe('/next');
  });

  it('renders the hook right away when a loader is given', () => {
    const { result } = renderHookWithRouter(useLocation, {
      loader: () => null,
    });

    expect(result.current.pathname).toBe('/');
  });

  it('runs the given loader on navigation', async () => {
    const loader = vi.fn(() => null);
    const { router } = renderHookWithRouter(useLocation, { loader });

    await act(async () => {
      await router.navigate('/next');
    });

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('gives the hook the query client that it returns', () => {
    const { result, queryClient } = renderHookWithRouter(useProviders);

    expect(result.current.queryClient).toBe(queryClient);
  });

  it('gives the hook the gate that it returns', () => {
    const { result, gate } = renderHookWithRouter(useProviders);

    expect(result.current.gate).toBe(gate);
  });

  it('uses the gate passed in options', () => {
    const gate = createRateLimitGate();

    const { result } = renderHookWithRouter(useProviders, { gate });

    expect(result.current.gate).toBe(gate);
  });

  it('passes initial props to the hook', () => {
    const { result } = renderHookWithRouter(
      ({ value }: { value: number }) => value * 2,
      { initialProps: { value: 3 } },
    );

    expect(result.current).toBe(6);
  });

  it('passes new props to the hook on rerender', () => {
    const { result, rerender } = renderHookWithRouter(
      ({ value }: { value: number }) => value * 2,
      { initialProps: { value: 1 } },
    );

    rerender({ value: 5 });

    expect(result.current).toBe(10);
  });
});
