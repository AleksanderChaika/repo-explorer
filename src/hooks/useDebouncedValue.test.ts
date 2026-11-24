import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

const DELAY = 500;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function setup(initial: string, delayMs = DELAY) {
  return renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
    initialProps: { value: initial, delay: delayMs },
  });
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = setup('a');

    expect(result.current).toBe('a');
  });

  it('keeps the previous value until the delay has passed', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b', delay: DELAY });
    advance(DELAY - 1);
    expect(result.current).toBe('a');

    advance(1);
    expect(result.current).toBe('b');
  });

  it('restarts the wait on every change and exposes only the last value', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b', delay: DELAY });
    advance(300);
    rerender({ value: 'c', delay: DELAY });
    advance(300);
    expect(result.current).toBe('a');

    advance(199);
    expect(result.current).toBe('a');

    advance(1);
    expect(result.current).toBe('c');
  });

  it('keeps the current value when the change is reverted within the delay', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b', delay: DELAY });
    advance(200);
    rerender({ value: 'a', delay: DELAY });
    advance(400);
    expect(result.current).toBe('a');

    advance(DELAY);
    expect(result.current).toBe('a');
  });

  it('clears the pending timer on unmount', () => {
    const { rerender, unmount } = setup('a');

    rerender({ value: 'b', delay: DELAY });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts the pending wait with the new delay when delayMs changes', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b', delay: DELAY });
    advance(400);
    rerender({ value: 'b', delay: 1000 });
    advance(999);
    expect(result.current).toBe('a');

    advance(1);
    expect(result.current).toBe('b');
  });

  it('applies a shorter delay counted from the moment it changes', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b', delay: DELAY });
    advance(400);
    rerender({ value: 'b', delay: 100 });
    advance(99);
    expect(result.current).toBe('a');

    advance(1);
    expect(result.current).toBe('b');
  });
});
