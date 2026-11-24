import { replace } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { buildSearchParams, parseSearchState } from './searchParams';

export function searchLoader({
  request,
}: Pick<LoaderFunctionArgs, 'request'>): Response | null {
  const url = new URL(request.url);
  const { state, needsCanonicalization } = parseSearchState(url.searchParams);
  if (!needsCanonicalization) {
    return null;
  }
  const search = buildSearchParams(state).toString();
  return replace(search === '' ? url.pathname : `${url.pathname}?${search}`);
}
