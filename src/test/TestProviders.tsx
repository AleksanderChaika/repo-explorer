import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import RateLimitGateProvider from '@/features/rateLimit/RateLimitGateProvider';
import type { RateLimitGate } from '@/features/rateLimit/rateLimitGate';

interface TestProvidersProps {
  queryClient: QueryClient;
  gate: RateLimitGate;
  coreGate: RateLimitGate;
  children: ReactNode;
}

function TestProviders({
  queryClient,
  gate,
  coreGate,
  children,
}: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RateLimitGateProvider gates={{ search: gate, core: coreGate }}>
        {children}
      </RateLimitGateProvider>
    </QueryClientProvider>
  );
}

export default TestProviders;
