import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimitGate, MAX_TIMER_DELAY_MS } from './rateLimitGate';

const NOW = Date.UTC(2026, 10, 24, 10, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

function at(offsetMs: number) {
  return new Date(NOW + offsetMs);
}

function setup() {
  const gate = createRateLimitGate();
  const listener = vi.fn();
  gate.subscribe(listener);
  return { gate, listener };
}

describe('createRateLimitGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts unblocked', () => {
    const { gate, listener } = setup();

    expect(gate.getSnapshot()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('blocks until a future reset time and notifies once', () => {
    const { gate, listener } = setup();

    gate.report(at(60_000));

    expect(gate.getSnapshot()).toBe(NOW + 60_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it.each([
    ['in the past', -1000],
    ['now', 0],
    ['invalid', Number.NaN],
  ])('ignores a reset time that is %s', (_label, offset) => {
    const { gate, listener } = setup();

    gate.report(at(offset));

    expect(gate.getSnapshot()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not shorten an existing block', () => {
    const { gate, listener } = setup();

    gate.report(at(60_000));
    gate.report(at(10_000));

    expect(gate.getSnapshot()).toBe(NOW + 60_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(59_999);
    expect(gate.getSnapshot()).toBe(NOW + 60_000);

    vi.advanceTimersByTime(1);
    expect(gate.getSnapshot()).toBeNull();
  });

  it('extends a block with a later reset time and keeps a single timer', () => {
    const { gate, listener } = setup();

    gate.report(at(10_000));
    gate.report(at(60_000));

    expect(gate.getSnapshot()).toBe(NOW + 60_000);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(10_000);
    expect(gate.getSnapshot()).toBe(NOW + 60_000);

    vi.advanceTimersByTime(50_000);
    expect(gate.getSnapshot()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores a report with the same reset time', () => {
    const { gate, listener } = setup();

    gate.report(at(60_000));
    gate.report(at(60_000));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('unblocks and notifies when the reset time arrives', () => {
    const { gate, listener } = setup();

    gate.report(at(60_000));
    vi.advanceTimersByTime(59_999);
    expect(gate.getSnapshot()).toBe(NOW + 60_000);
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);

    expect(gate.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stays blocked past the maximum timer delay', () => {
    const { gate, listener } = setup();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const resetOffset = 40 * DAY_MS;

    gate.report(at(resetOffset));

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(
      expect.any(Function),
      MAX_TIMER_DELAY_MS,
    );

    vi.advanceTimersByTime(MAX_TIMER_DELAY_MS);

    expect(gate.getSnapshot()).toBe(NOW + resetOffset);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(resetOffset - MAX_TIMER_DELAY_MS);

    expect(gate.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const gate = createRateLimitGate();
    const listener = vi.fn();
    const unsubscribe = gate.subscribe(listener);

    unsubscribe();
    gate.report(at(60_000));

    expect(listener).not.toHaveBeenCalled();
  });

  it('can block again after it has unblocked', () => {
    const { gate, listener } = setup();

    gate.report(at(1000));
    vi.advanceTimersByTime(1000);
    gate.report(at(5000));

    expect(gate.getSnapshot()).toBe(NOW + 5000);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(1);
  });
});
