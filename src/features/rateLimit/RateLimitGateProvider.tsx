import { useState } from 'react';
import type { ReactNode } from 'react';
import type { RateLimitGate } from './rateLimitGate';
import { createRateLimitGate } from './rateLimitGate';
import { RateLimitGateContext } from './rateLimitGateContext';

interface RateLimitGateProviderProps {
  gate?: RateLimitGate;
  children: ReactNode;
}

function RateLimitGateProvider({ gate, children }: RateLimitGateProviderProps) {
  const [ownGate] = useState(createRateLimitGate);

  return (
    <RateLimitGateContext.Provider value={gate ?? ownGate}>
      {children}
    </RateLimitGateContext.Provider>
  );
}

export default RateLimitGateProvider;
