import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '@/app/routes';
import RateLimitGateProvider from '@/features/search/RateLimitGateProvider';
import type { RateLimitGate } from '@/features/search/rateLimitGate';
import { createRateLimitGate } from '@/features/search/rateLimitGate';

interface RenderWithProvidersOptions {
  route?: string;
  gate?: RateLimitGate;
}

export function renderWithProviders({
  route = '/',
  gate = createRateLimitGate(),
}: RenderWithProvidersOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [route] });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RateLimitGateProvider gate={gate}>
        <RouterProvider router={router} />
      </RateLimitGateProvider>
    </QueryClientProvider>,
  );

  return { ...view, router, queryClient, gate };
}
