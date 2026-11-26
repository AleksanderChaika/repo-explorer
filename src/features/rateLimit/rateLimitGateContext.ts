import { createContext, useContext, useSyncExternalStore } from 'react';
import type { RateLimitGate } from './rateLimitGate';

export type RateLimitResource = 'search' | 'core';

export type RateLimitGates = Record<RateLimitResource, RateLimitGate>;

export const RateLimitGateContext = createContext<RateLimitGates | null>(null);

export function useRateLimitGate(resource: RateLimitResource): RateLimitGate {
  const gates = useContext(RateLimitGateContext);
  if (gates === null) {
    throw new Error(
      'useRateLimitGate must be used within a RateLimitGateProvider',
    );
  }
  return gates[resource];
}

export function useRateLimitBlockedUntil(
  resource: RateLimitResource,
): number | null {
  const gate = useRateLimitGate(resource);
  return useSyncExternalStore(gate.subscribe, gate.getSnapshot);
}
