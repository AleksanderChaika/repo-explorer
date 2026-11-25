import type { ApiFailure, RateLimitError } from '@/api/errors';
import type { SearchRepositoriesResponse } from '@/api/types';
import { formatCount, formatTime } from './format';
import { lastPage, MAX_RESULTS, MIN_QUERY_LENGTH } from './searchParams';
import type { RepositorySearch } from './useRepositorySearch';

export const INCOMPLETE_RESULTS_MESSAGE =
  'Some results may be missing because the search timed out.';

export const SHORT_QUERY_MESSAGE = `Enter at least ${MIN_QUERY_LENGTH} characters to search.`;

export const RATE_LIMIT_TITLE = 'Rate limit reached';

export interface ErrorDescription {
  title: string;
  message: string;
}

export function formatSummary(totalCount: number): string {
  const noun = totalCount === 1 ? 'repository' : 'repositories';
  const total = `${formatCount(totalCount)} ${noun}`;
  return totalCount > MAX_RESULTS
    ? `Showing the first ${formatCount(MAX_RESULTS)} of ${total}.`
    : total;
}

export function describeError(
  error: Exclude<ApiFailure, RateLimitError>,
): ErrorDescription {
  switch (error.kind) {
    case 'network':
      return {
        title: 'Connection problem',
        message: "Couldn't reach GitHub. Check your connection and try again.",
      };
    case 'http':
      if (error.status === 422) {
        return {
          title: 'Search query not accepted',
          message:
            "GitHub couldn't process this search. Try a different query.",
        };
      }
      return {
        title: 'Something went wrong',
        message: `GitHub returned an error (status ${error.status}). Try again in a moment.`,
      };
    case 'parse':
      return {
        title: 'Unexpected response',
        message: "GitHub sent a response we couldn't read. Try again.",
      };
    default: {
      const unexpected: never = error;
      void unexpected;
      return { title: 'Something went wrong', message: 'Please try again.' };
    }
  }
}

function describeResults(
  { total_count, incomplete_results }: SearchRepositoriesResponse,
  page: number,
): string {
  if (total_count === 0) {
    return 'No repositories found.';
  }
  const summary = formatSummary(total_count);
  const sentences = [summary.endsWith('.') ? summary : `${summary}.`];
  const last = lastPage(total_count);
  if (last > 1) {
    sentences.push(`Page ${page} of ${last}.`);
  }
  if (incomplete_results) {
    sentences.push(INCOMPLETE_RESULTS_MESSAGE);
  }
  return sentences.join(' ');
}

export function describeStatus(search: RepositorySearch, page: number): string {
  switch (search.kind) {
    case 'idle':
      return search.reason === 'short' ? SHORT_QUERY_MESSAGE : '';
    case 'blocked':
      return `Search paused. Your search will start at ${formatTime(new Date(search.blockedUntil))}.`;
    case 'success':
      return search.isPlaceholderData ? '' : describeResults(search.data, page);
    case 'loading':
    case 'error':
      return '';
  }
}

export function describeAlert(search: RepositorySearch): string {
  if (search.kind !== 'error') {
    return '';
  }
  const { error } = search;
  if (error.kind === 'rate-limit') {
    return `${RATE_LIMIT_TITLE}. You can search again at ${formatTime(error.resetAt)}.`;
  }
  const { title, message } = describeError(error);
  return `${title}. ${message}`;
}
