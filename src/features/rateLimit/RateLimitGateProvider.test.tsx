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
import type { RateLimitResource } from './rateLimitGateContext';

const NOW = Date.UTC(2026, 10, 24, 10, 0, 0);

const RESOURCES: RateLimitResource[] = ['search', 'core'];

function wrapperFor(gate: RateLimitGate) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RateLimitGateProvider gates={{ search: gate }}>
        {children}
      </RateLimitGateProvider>
    );
  };
}

function BlockedUntil({ testId }: { testId: string }) {
  return (
    <span data-testid={testId}>
      {String(useRateLimitBlockedUntil('search'))}
    </span>
  );
}

function GateCollector({
  seen,
  resource = 'search',
}: {
  seen: RateLimitGate[];
  resource?: RateLimitResource;
}) {
  const gate = useRateLimitGate(resource);
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

  it.each(RESOURCES)('exposes the %s gate it is given', (resource) => {
    const gate = createRateLimitGate();

    const { result } = renderHook(() => useRateLimitGate(resource), {
      wrapper: ({ children }) => (
        <RateLimitGateProvider gates={{ [resource]: gate }}>
          {children}
        </RateLimitGateProvider>
      ),
    });

    expect(result.current).toBe(gate);
  });

  it.each(RESOURCES)(
    'keeps the same own %s gate across re-renders',
    (resource) => {
      const seen: RateLimitGate[] = [];
      const renderUi = () => (
        <RateLimitGateProvider>
          <GateCollector seen={seen} resource={resource} />
        </RateLimitGateProvider>
      );
      const { rerender } = render(renderUi());

      rerender(renderUi());
      rerender(renderUi());

      expect(seen.length).toBeGreaterThan(2);
      expect(new Set(seen).size).toBe(1);
    },
  );

  it('uses its own core gate when only a search gate is given', () => {
    const injected = createRateLimitGate();

    const { result } = renderHook(
      () => ({
        search: useRateLimitGate('search'),
        core: useRateLimitGate('core'),
      }),
      {
        wrapper: ({ children }) => (
          <RateLimitGateProvider gates={{ search: injected }}>
            {children}
          </RateLimitGateProvider>
        ),
      },
    );

    expect(result.current.search).toBe(injected);
    expect(result.current.core).not.toBe(injected);
  });

  it.each([
    ['search', 'core'],
    ['core', 'search'],
  ] as const)('blocks only %s, not %s', (blocked, other) => {
    const { result } = renderHook(
      () => ({
        gate: useRateLimitGate(blocked),
        blocked: useRateLimitBlockedUntil(blocked),
        other: useRateLimitBlockedUntil(other),
      }),
      { wrapper: RateLimitGateProvider },
    );

    act(() => {
      result.current.gate.report(new Date(NOW + 5000));
    });

    expect(result.current.blocked).toBe(NOW + 5000);
    expect(result.current.other).toBeNull();
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

    expect(() => renderHook(() => useRateLimitGate('search'))).toThrow(
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

    const { result } = renderHook(() => useRateLimitBlockedUntil('search'), {
      wrapper: wrapperFor(gate),
    });

    expect(result.current).toBeNull();
  });

  it('follows the gate when it blocks and when the block expires', () => {
    const gate = createRateLimitGate();
    const { result } = renderHook(() => useRateLimitBlockedUntil('search'), {
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
