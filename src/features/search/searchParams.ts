import type { SearchOrder, SearchSort } from '@/api/types';

export const PER_PAGE = 20;
export const MAX_RESULTS = 1000;
export const MAX_PAGE = MAX_RESULTS / PER_PAGE;
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 256;
export const DEFAULT_ORDER: SearchOrder = 'desc';

export const SEARCH_SORTS: readonly SearchSort[] = [
  'stars',
  'forks',
  'help-wanted-issues',
  'updated',
];

export const SEARCH_ORDERS: readonly SearchOrder[] = ['desc', 'asc'];

export interface SearchState {
  q: string;
  sort: SearchSort | undefined;
  order: SearchOrder;
  page: number;
}

export interface ParsedSearchState {
  state: SearchState;
  needsCanonicalization: boolean;
}

function normalizeQuery(raw: string | null): string {
  const collapsed = (raw ?? '').replace(/\s+/g, ' ').trim();
  return Array.from(collapsed).slice(0, MAX_QUERY_LENGTH).join('').trimEnd();
}

function parseSort(raw: string | null): SearchSort | undefined {
  return SEARCH_SORTS.find((sort) => sort === raw);
}

function parseOrder(raw: string | null): SearchOrder {
  return SEARCH_ORDERS.find((order) => order === raw) ?? DEFAULT_ORDER;
}

function parsePage(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw)) {
    return 1;
  }
  return Math.min(Math.max(Number(raw), 1), MAX_PAGE);
}

function signature(params: URLSearchParams): string {
  return JSON.stringify(
    Array.from(params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort(),
  );
}

export function buildSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q !== '') {
    params.set('q', state.q);
  }
  if (state.sort !== undefined) {
    params.set('sort', state.sort);
    if (state.order !== DEFAULT_ORDER) {
      params.set('order', state.order);
    }
  }
  if (state.q !== '' && state.page > 1) {
    params.set('page', String(state.page));
  }
  return params;
}

export function parseSearchState(params: URLSearchParams): ParsedSearchState {
  const q = normalizeQuery(params.get('q'));
  const sort = parseSort(params.get('sort'));
  const state: SearchState = {
    q,
    sort,
    order: sort === undefined ? DEFAULT_ORDER : parseOrder(params.get('order')),
    page: q === '' ? 1 : parsePage(params.get('page')),
  };
  return {
    state,
    needsCanonicalization:
      signature(buildSearchParams(state)) !== signature(params),
  };
}

export function lastPage(totalCount: number): number {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return 1;
  }
  return Math.min(Math.ceil(totalCount / PER_PAGE), MAX_PAGE);
}
