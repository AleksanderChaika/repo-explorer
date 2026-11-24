import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { RateLimitError } from '@/api/errors';
import type { ApiFailure } from '@/api/errors';
import { searchRepositories } from '@/api/search';
import type { SearchRepositoriesResponse } from '@/api/types';
import {
  useRateLimitBlockedUntil,
  useRateLimitGate,
} from './rateLimitGateContext';
import { MIN_QUERY_LENGTH, PER_PAGE } from './searchParams';
import type { SearchState } from './searchParams';

export type RepositorySearch =
  | { kind: 'idle'; reason: 'empty' | 'short' }
  | { kind: 'blocked'; blockedUntil: number }
  | { kind: 'loading' }
  | { kind: 'error'; error: ApiFailure; refetch: () => void }
  | {
      kind: 'success';
      data: SearchRepositoriesResponse;
      isPlaceholderData: boolean;
      isFetching: boolean;
    };

export function useRepositorySearch({
  q,
  sort,
  order,
  page,
}: SearchState): RepositorySearch {
  const gate = useRateLimitGate();
  const blockedUntil = useRateLimitBlockedUntil();
  const isLongEnough = q.length >= MIN_QUERY_LENGTH;

  const query = useQuery<SearchRepositoriesResponse, ApiFailure>({
    queryKey: ['search', 'repositories', { q, sort, order, page }],
    queryFn: async ({ signal }) => {
      try {
        return await searchRepositories(
          { q, sort, order, page, per_page: PER_PAGE },
          signal,
        );
      } catch (error) {
        if (error instanceof RateLimitError) {
          gate.report(error.resetAt);
        }
        throw error;
      }
    },
    enabled: isLongEnough && blockedUntil === null,
    placeholderData: keepPreviousData,
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

  if (!isLongEnough) {
    return { kind: 'idle', reason: q === '' ? 'empty' : 'short' };
  }
  if (query.isError) {
    return { kind: 'error', error: query.error, refetch: safeRefetch };
  }
  if (
    blockedUntil !== null &&
    (query.data === undefined || query.isPlaceholderData)
  ) {
    return { kind: 'blocked', blockedUntil };
  }
  if (query.data !== undefined) {
    return {
      kind: 'success',
      data: query.data,
      isPlaceholderData: query.isPlaceholderData,
      isFetching: query.isFetching,
    };
  }
  return { kind: 'loading' };
}
