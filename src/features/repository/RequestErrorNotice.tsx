import type { ApiFailure } from '@/api/errors';
import ErrorNotice from '@/components/ErrorNotice/ErrorNotice';
import type { NoticeHeadingLevel } from '@/components/ErrorNotice/ErrorNotice';
import RateLimitNotice from '@/components/ErrorNotice/RateLimitNotice';
import { useRateLimitBlockedUntil } from '@/features/rateLimit/rateLimitGateContext';
import { describeRequestError, RATE_LIMIT_TITLE } from '@/lib/errorMessages';
import { formatTime } from '@/lib/format';

interface RequestErrorNoticeProps {
  error: ApiFailure;
  onRetry: () => void;
  title?: string;
  headingLevel?: NoticeHeadingLevel;
}

function RequestErrorNotice({
  error,
  onRetry,
  title,
  headingLevel,
}: RequestErrorNoticeProps) {
  const blockedUntil = useRateLimitBlockedUntil('core');

  if (error.kind === 'rate-limit') {
    return (
      <RateLimitNotice
        title={RATE_LIMIT_TITLE}
        headingLevel={headingLevel}
        until={blockedUntil ?? error.resetAt.getTime()}
        waitingMessage={(time, remaining) =>
          `GitHub is limiting requests. You can try again at ${time} (in ${remaining}).`
        }
        readyMessage="GitHub is limiting requests. You can try again now."
        onRetry={onRetry}
      />
    );
  }

  const description = describeRequestError(error);
  const message =
    blockedUntil === null
      ? description.message
      : `${description.message} Retry will be available at ${formatTime(new Date(blockedUntil))}.`;

  return (
    <ErrorNotice
      title={title ?? description.title}
      headingLevel={headingLevel}
      message={message}
      onRetry={onRetry}
      retryDisabled={blockedUntil !== null}
    />
  );
}

export default RequestErrorNotice;
