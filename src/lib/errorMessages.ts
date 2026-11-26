import type { ApiFailure, RateLimitError } from '@/api/errors';

export const RATE_LIMIT_TITLE = 'Rate limit reached';

export interface ErrorDescription {
  title: string;
  message: string;
}

export function describeRequestError(
  error: Exclude<ApiFailure, RateLimitError>,
): ErrorDescription {
  switch (error.kind) {
    case 'network':
      return {
        title: 'Connection problem',
        message: "Couldn't reach GitHub. Check your connection and try again.",
      };
    case 'http':
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
