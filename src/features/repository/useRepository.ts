import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { RateLimitError } from '@/api/errors';
import type { ApiFailure } from '@/api/errors';
import { getRepository, isValidRepositorySegment } from '@/api/repository';
import type { RepositoryDetails } from '@/api/types';
import {
  useRateLimitBlockedUntil,
  useRateLimitGate,
} from '@/features/rateLimit/rateLimitGateContext';

export type RepositoryState =
  | { kind: 'loading' }
  | { kind: 'success'; repository: RepositoryDetails }
  | { kind: 'not-found' }
  | { kind: 'paused'; blockedUntil: number }
  | { kind: 'error'; error: ApiFailure; refetch: () => void };

export function useRepository(owner: string, name: string): RepositoryState {
  const queryClient = useQueryClient();
  const gate = useRateLimitGate('core');
  const blockedUntil = useRateLimitBlockedUntil('core');
  const isValid =
    isValidRepositorySegment(owner) && isValidRepositorySegment(name);

  const query = useQuery<RepositoryDetails, ApiFailure>({
    queryKey: ['repo', owner, name],
    queryFn: async ({ signal }) => {
      try {
        const repository = await getRepository(owner, name, signal);
        if (repository.full_name !== `${owner}/${name}`) {
          queryClient.setQueryData(
            ['repo', ...repository.full_name.split('/')],
            repository,
          );
        }
        return repository;
      } catch (error) {
        if (error instanceof RateLimitError) {
          gate.report(error.resetAt);
        }
        throw error;
      }
    },
    enabled: isValid && blockedUntil === null,
    retryOnMount: false,
    refetchOnReconnect: false,
  });

  const { refetch } = query;
  const isBlocked = blockedUntil !== null;
  const safeRefetch = useCallback(() => {
    if (!isBlocked) {
      void refetch();
    }
  }, [isBlocked, refetch]);

  if (!isValid) {
    return { kind: 'not-found' };
  }
  if (query.error?.kind === 'http' && query.error.status === 404) {
    return { kind: 'not-found' };
  }
  if (query.data !== undefined) {
    return { kind: 'success', repository: query.data };
  }
  if (query.isError) {
    return { kind: 'error', error: query.error, refetch: safeRefetch };
  }
  if (blockedUntil !== null) {
    return { kind: 'paused', blockedUntil };
  }
  return { kind: 'loading' };
}
