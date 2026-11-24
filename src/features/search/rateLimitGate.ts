export const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

export interface RateLimitGate {
  report: (resetAt: Date) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number | null;
}

export function createRateLimitGate(): RateLimitGate {
  let blockedUntil: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of Array.from(listeners)) {
      listener();
    }
  }

  function arm(until: number) {
    clearTimeout(timer);
    timer = setTimeout(
      onTimer,
      Math.min(until - Date.now(), MAX_TIMER_DELAY_MS),
    );
  }

  function onTimer() {
    timer = undefined;
    if (blockedUntil !== null && Date.now() < blockedUntil) {
      arm(blockedUntil);
      return;
    }
    blockedUntil = null;
    notify();
  }

  function report(resetAt: Date) {
    const until = resetAt.getTime();
    if (!Number.isFinite(until) || until <= Date.now()) {
      return;
    }
    if (blockedUntil !== null && until <= blockedUntil) {
      return;
    }
    blockedUntil = until;
    arm(until);
    notify();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot() {
    return blockedUntil;
  }

  return { report, subscribe, getSnapshot };
}
