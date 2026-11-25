import type { ApiFailure, RateLimitError } from '@/api/errors';
import { formatCount } from './format';
import { MAX_RESULTS } from './searchParams';

export const INCOMPLETE_RESULTS_MESSAGE =
  'Some results may be missing because the search timed out.';

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
