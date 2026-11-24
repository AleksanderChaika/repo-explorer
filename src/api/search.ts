import { getJson } from './client';
import type {
  SearchOrder,
  SearchRepositoriesResponse,
  SearchSort,
} from './types';

export interface SearchRepositoriesParams {
  q: string;
  sort?: SearchSort;
  order?: SearchOrder;
  per_page?: number;
  page?: number;
}

export function searchRepositories(
  { q, sort, order, per_page, page }: SearchRepositoriesParams,
  signal?: AbortSignal,
): Promise<SearchRepositoriesResponse> {
  return getJson<SearchRepositoriesResponse>('/search/repositories', {
    params: { q, sort, order, per_page, page },
    signal,
  });
}
