import { QueryClient } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { createMemoryRouter } from 'react-router';
import type { LoaderFunction } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { onTestFinished, vi } from 'vitest';
import { routes } from '@/app/routes';
import type { RateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import TestProviders from './TestProviders';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export function setupFakeTimerUser() {
  const advanceTimersByTime = (ms: number) => {
    vi.advanceTimersByTime(ms);
  };
  vi.useFakeTimers();
  vi.stubGlobal('jest', { advanceTimersByTime });
  onTestFinished(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  return userEvent.setup({ advanceTimers: advanceTimersByTime });
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
  const coreGate = createRateLimitGate();
  const router = createMemoryRouter(routes, { initialEntries });

  const view = render(
    <TestProviders queryClient={queryClient} gate={gate} coreGate={coreGate}>
      <RouterProvider router={router} />
    </TestProviders>,
  );

  return { ...view, router, queryClient, gate };
}

interface RenderHookWithProvidersOptions<Props> {
  gate?: RateLimitGate;
  coreGate?: RateLimitGate;
  initialProps?: Props;
}

export function renderHookWithProviders<Result, Props = undefined>(
  callback: (props: Props) => Result,
  {
    gate = createRateLimitGate(),
    coreGate = createRateLimitGate(),
    initialProps,
  }: RenderHookWithProvidersOptions<Props> = {},
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders queryClient={queryClient} gate={gate} coreGate={coreGate}>
        {children}
      </TestProviders>
    );
  }

  const view = renderHook(callback, { initialProps, wrapper: Wrapper });

  return { ...view, queryClient, gate, coreGate };
}

interface RenderHookWithRouterOptions<
  Props,
> extends RenderHookWithProvidersOptions<Props> {
  initialEntries?: string[];
  initialIndex?: number;
  loader?: LoaderFunction;
}

export function renderHookWithRouter<Result, Props = undefined>(
  callback: (props: Props) => Result,
  {
    gate = createRateLimitGate(),
    coreGate = createRateLimitGate(),
    initialProps,
    initialEntries = ['/'],
    initialIndex,
    loader,
  }: RenderHookWithRouterOptions<Props> = {},
) {
  const queryClient = createTestQueryClient();
  const HookChildrenContext = createContext<ReactNode>(null);

  function HookRoute() {
    return useContext(HookChildrenContext);
  }

  const router = createMemoryRouter(
    [{ id: 'hook', path: '*', Component: HookRoute, loader }],
    {
      initialEntries,
      initialIndex,
      hydrationData: { loaderData: { hook: null } },
    },
  );

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders queryClient={queryClient} gate={gate} coreGate={coreGate}>
        <HookChildrenContext.Provider value={children}>
          <RouterProvider router={router} />
        </HookChildrenContext.Provider>
      </TestProviders>
    );
  }

  const view = renderHook(callback, { initialProps, wrapper: Wrapper });

  return { ...view, queryClient, gate, coreGate, router };
}
