import type { ApiFailure } from '@/api/errors';
import { describeRequestError, RATE_LIMIT_TITLE } from '@/lib/errorMessages';
import { formatTime } from '@/lib/format';
import type { RepositoryState } from './useRepository';
import type { LanguagesState } from './useRepositoryLanguages';

export const NOT_FOUND_TITLE = 'Repository not found';

export const NOT_FOUND_MESSAGE =
  'There is no public repository at this address. Check the owner and name.';

export const LANGUAGES_UNAVAILABLE_TITLE = 'Languages unavailable';

export function describeRepositoryStatus(state: RepositoryState): string {
  switch (state.kind) {
    case 'paused':
      return `Repository paused. It will load at ${formatTime(new Date(state.blockedUntil))}.`;
    case 'success':
      return 'Repository loaded';
    case 'loading':
    case 'not-found':
    case 'error':
      return '';
  }
}

function describeFailure(
  error: ApiFailure,
  blockedUntil: number | null,
  title?: string,
): string {
  if (error.kind === 'rate-limit') {
    const until = blockedUntil ?? error.resetAt.getTime();
    const limit = `${RATE_LIMIT_TITLE}. You can try again at ${formatTime(new Date(until))}.`;
    return title === undefined ? limit : `${title}. ${limit}`;
  }
  const description = describeRequestError(error);
  return `${title ?? description.title}. ${description.message}`;
}

export function describeRepositoryAlert(
  state: RepositoryState,
  languages: LanguagesState,
  blockedUntil: number | null,
): string {
  switch (state.kind) {
    case 'not-found':
      return `${NOT_FOUND_TITLE}. ${NOT_FOUND_MESSAGE}`;
    case 'error':
      return describeFailure(state.error, blockedUntil);
    case 'success':
      return languages.kind === 'error'
        ? describeFailure(
            languages.error,
            blockedUntil,
            LANGUAGES_UNAVAILABLE_TITLE,
          )
        : '';
    case 'loading':
    case 'paused':
      return '';
  }
}
