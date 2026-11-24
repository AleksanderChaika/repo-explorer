import { QueryClient } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '@/app/routes';
import type { RateLimitGate } from '@/features/search/rateLimitGate';
import { createRateLimitGate } from '@/features/search/rateLimitGate';
import TestProviders from './TestProviders';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

interface RenderWithProvidersOptions {
  route?: string;
  gate?: RateLimitGate;
}

export function renderWithProviders({
  route = '/',
  gate = createRateLimitGate(),
}: RenderWithProvidersOptions = {}) {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [route] });

  const view = render(
    <TestProviders queryClient={queryClient} gate={gate}>
      <RouterProvider router={router} />
    </TestProviders>,
  );

  return { ...view, router, queryClient, gate };
}

interface RenderHookWithProvidersOptions<Props> {
  gate?: RateLimitGate;
  initialProps?: Props;
}

export function renderHookWithProviders<Result, Props = undefined>(
  callback: (props: Props) => Result,
  {
    gate = createRateLimitGate(),
    initialProps,
  }: RenderHookWithProvidersOptions<Props> = {},
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders queryClient={queryClient} gate={gate}>
        {children}
      </TestProviders>
    );
  }

  const view = renderHook(callback, { initialProps, wrapper: Wrapper });

  return { ...view, queryClient, gate };
}
