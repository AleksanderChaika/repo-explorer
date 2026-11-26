import type { ApiFailure } from '@/api/errors';
import ErrorNotice from '@/components/ErrorNotice/ErrorNotice';
import RateLimitNotice from '@/components/ErrorNotice/RateLimitNotice';
import { RATE_LIMIT_TITLE } from '@/lib/errorMessages';
import { describeError } from './messages';

interface SearchErrorProps {
  error: ApiFailure;
  onRetry: () => void;
}

function SearchError({ error, onRetry }: SearchErrorProps) {
  if (error.kind === 'rate-limit') {
    return (
      <RateLimitNotice
        title={RATE_LIMIT_TITLE}
        until={error.resetAt.getTime()}
        waitingMessage={(time, remaining) =>
          `GitHub is limiting requests. You can search again at ${time} (in ${remaining}).`
        }
        readyMessage="GitHub is limiting requests. You can search again now."
        onRetry={onRetry}
      />
    );
  }

  const { title, message } = describeError(error);
  return <ErrorNotice title={title} message={message} onRetry={onRetry} />;
}

export default SearchError;
