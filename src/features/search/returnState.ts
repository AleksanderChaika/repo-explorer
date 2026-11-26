import { buildSearchParams, parseSearchState } from './searchParams';

export interface ReturnState {
  search: string;
  repository: string;
}

export interface FocusState {
  focusRepository: string;
}

export function parseFocusRepository(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }
  const { focusRepository } = state as Partial<
    Record<keyof FocusState, unknown>
  >;
  return typeof focusRepository === 'string' ? focusRepository : null;
}

export function parseReturnState(state: unknown): ReturnState | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }
  const { search, repository } = state as Partial<
    Record<keyof ReturnState, unknown>
  >;
  if (typeof search !== 'string' || typeof repository !== 'string') {
    return null;
  }
  const parsed = parseSearchState(new URLSearchParams(search)).state;
  return { search: buildSearchParams(parsed).toString(), repository };
}
