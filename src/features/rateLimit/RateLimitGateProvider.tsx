import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createRateLimitGate } from './rateLimitGate';
import { RateLimitGateContext } from './rateLimitGateContext';
import type { RateLimitGates } from './rateLimitGateContext';

interface RateLimitGateProviderProps {
  gates?: Partial<RateLimitGates>;
  children: ReactNode;
}

function createGates(): RateLimitGates {
  return { search: createRateLimitGate(), core: createRateLimitGate() };
}

function RateLimitGateProvider({
  gates,
  children,
}: RateLimitGateProviderProps) {
  const [ownGates] = useState(createGates);
  const search = gates?.search ?? ownGates.search;
  const core = gates?.core ?? ownGates.core;
  const value = useMemo(() => ({ search, core }), [search, core]);

  return (
    <RateLimitGateContext.Provider value={value}>
      {children}
    </RateLimitGateContext.Provider>
  );
}

export default RateLimitGateProvider;
