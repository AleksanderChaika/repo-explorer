import ErrorNotice from '@/components/ErrorNotice/ErrorNotice';
import RateLimitNotice from '@/components/ErrorNotice/RateLimitNotice';
import { NOT_FOUND_MESSAGE, NOT_FOUND_TITLE } from './messages';
import RequestErrorNotice from './RequestErrorNotice';
import type { RepositoryState } from './useRepository';

interface RepositoryProblemProps {
  state: Extract<RepositoryState, { kind: 'not-found' | 'paused' | 'error' }>;
  onRetry: () => void;
}

function RepositoryProblem({ state, onRetry }: RepositoryProblemProps) {
  switch (state.kind) {
    case 'not-found':
      return (
        <ErrorNotice
          title={NOT_FOUND_TITLE}
          message={NOT_FOUND_MESSAGE}
          tone="neutral"
        />
      );
    case 'paused':
      return (
        <RateLimitNotice
          title="Repository paused"
          tone="neutral"
          until={state.blockedUntil}
          waitingMessage={(time, remaining) =>
            `GitHub is limiting requests. The repository will load at ${time} (in ${remaining}).`
          }
          readyMessage="GitHub is limiting requests. The repository will load now."
        />
      );
    case 'error':
      return <RequestErrorNotice error={state.error} onRetry={onRetry} />;
  }
}

export default RepositoryProblem;
