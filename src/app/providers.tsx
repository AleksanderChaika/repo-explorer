import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/api/queryClient';
import RateLimitGateProvider from '@/features/rateLimit/RateLimitGateProvider';

const queryClient = createQueryClient();

interface ProvidersProps {
  children: ReactNode;
}

function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RateLimitGateProvider>{children}</RateLimitGateProvider>
    </QueryClientProvider>
  );
}

export default Providers;
