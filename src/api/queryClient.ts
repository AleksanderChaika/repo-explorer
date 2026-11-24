import { QueryClient } from '@tanstack/react-query';
import { HttpError, NetworkError } from './errors';

export const MAX_RETRIES = 2;
export const STALE_TIME_MS = 5 * 60 * 1000;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }
  if (error instanceof NetworkError) {
    return true;
  }
  return error instanceof HttpError && error.status >= 500;
}

interface CreateQueryClientOptions {
  retryDelay?: number;
}

export function createQueryClient({
  retryDelay,
}: CreateQueryClientOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  });
}
