import { createContext, useContext, useSyncExternalStore } from 'react';
import type { RateLimitGate } from './rateLimitGate';

export const RateLimitGateContext = createContext<RateLimitGate | null>(null);

export function useRateLimitGate(): RateLimitGate {
  const gate = useContext(RateLimitGateContext);
  if (gate === null) {
    throw new Error(
      'useRateLimitGate must be used within a RateLimitGateProvider',
    );
  }
  return gate;
}

export function useRateLimitBlockedUntil(): number | null {
  const gate = useRateLimitGate();
  return useSyncExternalStore(gate.subscribe, gate.getSnapshot);
}
