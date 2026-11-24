import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import RateLimitGateProvider from '@/features/search/RateLimitGateProvider';
import type { RateLimitGate } from '@/features/search/rateLimitGate';

interface TestProvidersProps {
  queryClient: QueryClient;
  gate: RateLimitGate;
  children: ReactNode;
}

function TestProviders({ queryClient, gate, children }: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RateLimitGateProvider gate={gate}>{children}</RateLimitGateProvider>
    </QueryClientProvider>
  );
}

export default TestProviders;
