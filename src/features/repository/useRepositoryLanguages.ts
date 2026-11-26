import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { RateLimitError } from '@/api/errors';
import type { ApiFailure } from '@/api/errors';
import { getRepositoryLanguages } from '@/api/repository';
import type { RepositoryLanguages } from '@/api/types';
import {
  useRateLimitBlockedUntil,
  useRateLimitGate,
} from '@/features/rateLimit/rateLimitGateContext';

export type LanguagesState =
  | { kind: 'loading' }
  | { kind: 'success'; languages: RepositoryLanguages }
  | { kind: 'paused'; blockedUntil: number }
  | { kind: 'error'; error: ApiFailure; refetch: () => void };

export function useRepositoryLanguages(
  fullName: string | null,
): LanguagesState {
  const gate = useRateLimitGate('core');
  const blockedUntil = useRateLimitBlockedUntil('core');
  const [owner = '', name = ''] = fullName?.split('/') ?? [];

  const query = useQuery<RepositoryLanguages, ApiFailure>({
    queryKey: ['repo', owner, name, 'languages'],
    queryFn: async ({ signal }) => {
      try {
        return await getRepositoryLanguages(owner, name, signal);
      } catch (error) {
        if (error instanceof RateLimitError) {
          gate.report(error.resetAt);
        }
        throw error;
      }
    },
    enabled: fullName !== null && blockedUntil === null,
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

  if (query.data !== undefined) {
    return { kind: 'success', languages: query.data };
  }
  if (query.isError) {
    return { kind: 'error', error: query.error, refetch: safeRefetch };
  }
  if (blockedUntil !== null) {
    return { kind: 'paused', blockedUntil };
  }
  return { kind: 'loading' };
}
