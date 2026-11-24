import { act, render, renderHook, screen } from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RateLimitGateProvider from './RateLimitGateProvider';
import type { RateLimitGate } from './rateLimitGate';
import { createRateLimitGate } from './rateLimitGate';
import {
  useRateLimitBlockedUntil,
  useRateLimitGate,
} from './rateLimitGateContext';

const NOW = Date.UTC(2026, 10, 24, 10, 0, 0);

function wrapperFor(gate: RateLimitGate) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RateLimitGateProvider gate={gate}>{children}</RateLimitGateProvider>
    );
  };
}

function BlockedUntil({ testId }: { testId: string }) {
  return <span data-testid={testId}>{String(useRateLimitBlockedUntil())}</span>;
}

function GateCollector({ seen }: { seen: RateLimitGate[] }) {
  const gate = useRateLimitGate();
  useEffect(() => {
    seen.push(gate);
  });
  return null;
}

describe('RateLimitGateProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exposes the gate it is given', () => {
    const gate = createRateLimitGate();

    const { result } = renderHook(() => useRateLimitGate(), {
      wrapper: wrapperFor(gate),
    });

    expect(result.current).toBe(gate);
  });

  it('keeps the same own gate across re-renders', () => {
    const seen: RateLimitGate[] = [];
    const { rerender } = render(
      <RateLimitGateProvider>
        <GateCollector seen={seen} />
      </RateLimitGateProvider>,
    );

    rerender(
      <RateLimitGateProvider>
        <GateCollector seen={seen} />
      </RateLimitGateProvider>,
    );

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });

  it('gives separate providers separate gates', () => {
    const seen: RateLimitGate[] = [];

    render(
      <>
        <RateLimitGateProvider>
          <GateCollector seen={seen} />
        </RateLimitGateProvider>
        <RateLimitGateProvider>
          <GateCollector seen={seen} />
        </RateLimitGateProvider>
      </>,
    );

    expect(new Set(seen).size).toBe(2);
  });

  it('throws a clear error when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useRateLimitGate())).toThrow(
      'useRateLimitGate must be used within a RateLimitGateProvider',
    );
  });
});

describe('useRateLimitBlockedUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is null while nothing is blocked', () => {
    const gate = createRateLimitGate();

    const { result } = renderHook(() => useRateLimitBlockedUntil(), {
      wrapper: wrapperFor(gate),
    });

    expect(result.current).toBeNull();
  });

  it('follows the gate when it blocks and when the block expires', () => {
    const gate = createRateLimitGate();
    const { result } = renderHook(() => useRateLimitBlockedUntil(), {
      wrapper: wrapperFor(gate),
    });

    act(() => {
      gate.report(new Date(NOW + 60_000));
    });
    expect(result.current).toBe(NOW + 60_000);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBeNull();
  });

  it('shows the same value to every consumer of one gate', () => {
    const gate = createRateLimitGate();
    const Wrapper = wrapperFor(gate);

    render(
      <Wrapper>
        <BlockedUntil testId="first" />
        <BlockedUntil testId="second" />
      </Wrapper>,
    );

    act(() => {
      gate.report(new Date(NOW + 5000));
    });

    expect(screen.getByTestId('first')).toHaveTextContent(String(NOW + 5000));
    expect(screen.getByTestId('second')).toHaveTextContent(String(NOW + 5000));
  });

  it('keeps the gates of different providers independent', () => {
    const blocked = createRateLimitGate();
    const idle = createRateLimitGate();
    const BlockedWrapper = wrapperFor(blocked);
    const IdleWrapper = wrapperFor(idle);

    render(
      <>
        <BlockedWrapper>
          <BlockedUntil testId="blocked" />
        </BlockedWrapper>
        <IdleWrapper>
          <BlockedUntil testId="idle" />
        </IdleWrapper>
      </>,
    );

    act(() => {
      blocked.report(new Date(NOW + 5000));
    });

    expect(screen.getByTestId('blocked')).toHaveTextContent(String(NOW + 5000));
    expect(screen.getByTestId('idle')).toHaveTextContent('null');
  });
});
