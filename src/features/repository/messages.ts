import { describeRequestError, RATE_LIMIT_TITLE } from '@/lib/errorMessages';
import { formatTime } from '@/lib/format';
import type { RepositoryState } from './useRepository';

export const NOT_FOUND_TITLE = 'Repository not found';

export const NOT_FOUND_MESSAGE =
  'There is no public repository at this address. Check the owner and name.';

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

export function describeRepositoryAlert(
  state: RepositoryState,
  blockedUntil: number | null,
): string {
  if (state.kind === 'not-found') {
    return `${NOT_FOUND_TITLE}. ${NOT_FOUND_MESSAGE}`;
  }
  if (state.kind !== 'error') {
    return '';
  }
  const { error } = state;
  if (error.kind === 'rate-limit') {
    const until = blockedUntil ?? error.resetAt.getTime();
    return `${RATE_LIMIT_TITLE}. You can try again at ${formatTime(new Date(until))}.`;
  }
  const { title, message } = describeRequestError(error);
  return `${title}. ${message}`;
}
