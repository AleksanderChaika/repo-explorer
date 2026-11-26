import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { NavigateOptions } from 'react-router';
import type { SearchOrder, SearchSort } from '@/api/types';
import { buildSearchParams, parseSearchState } from './searchParams';
import type { SearchState } from './searchParams';

function parseSearch(search: string): SearchState {
  return parseSearchState(new URLSearchParams(search)).state;
}

function canonicalSearch(state: SearchState): string {
  return buildSearchParams(
    parseSearchState(buildSearchParams(state)).state,
  ).toString();
}

export function useSearchState() {
  const location = useLocation();
  const { search } = location;
  const navigate = useNavigate();
  const state = useMemo(() => parseSearch(search), [search]);
  const latestSearch = useRef(search);

  useLayoutEffect(() => {
    latestSearch.current = location.search;
  }, [location]);

  const update = useCallback(
    (patch: Partial<SearchState>, options?: NavigateOptions) => {
      const current = parseSearch(latestSearch.current);
      const next = canonicalSearch({ ...current, ...patch });
      if (next === canonicalSearch(current)) {
        return;
      }
      latestSearch.current = next;
      void navigate({ search: next }, { ...options, preventScrollReset: true });
    },
    [navigate],
  );

  const setQuery = useCallback(
    (q: string) => {
      update({ q, page: 1 });
    },
    [update],
  );

  const setSort = useCallback(
    (sort: SearchSort | undefined) => {
      update({ sort, page: 1 });
    },
    [update],
  );

  const setOrder = useCallback(
    (order: SearchOrder) => {
      update({ order, page: 1 });
    },
    [update],
  );

  const clampPage = useCallback(
    (last: number) => {
      if (parseSearch(latestSearch.current).page > last) {
        update({ page: last }, { replace: true });
      }
    },
    [update],
  );

  return { state, setQuery, setSort, setOrder, clampPage };
}
