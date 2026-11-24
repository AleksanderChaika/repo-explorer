import { QueryClient } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import { createContext, useContext } from 'react';
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
  initialEntries?: string[];
  gate?: RateLimitGate;
}

export function renderWithProviders({
  route = '/',
  initialEntries = [route],
  gate = createRateLimitGate(),
}: RenderWithProvidersOptions = {}) {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries });

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

interface RenderHookWithRouterOptions<
  Props,
> extends RenderHookWithProvidersOptions<Props> {
  initialEntries?: string[];
  initialIndex?: number;
}

export function renderHookWithRouter<Result, Props = undefined>(
  callback: (props: Props) => Result,
  {
    gate = createRateLimitGate(),
    initialProps,
    initialEntries = ['/'],
    initialIndex,
  }: RenderHookWithRouterOptions<Props> = {},
) {
  const queryClient = createTestQueryClient();
  const HookChildrenContext = createContext<ReactNode>(null);

  function HookRoute() {
    return useContext(HookChildrenContext);
  }

  const router = createMemoryRouter([{ path: '*', Component: HookRoute }], {
    initialEntries,
    initialIndex,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders queryClient={queryClient} gate={gate}>
        <HookChildrenContext.Provider value={children}>
          <RouterProvider router={router} />
        </HookChildrenContext.Provider>
      </TestProviders>
    );
  }

  const view = renderHook(callback, { initialProps, wrapper: Wrapper });

  return { ...view, queryClient, gate, router };
}
