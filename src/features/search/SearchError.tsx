import type { ApiFailure } from '@/api/errors';
import { formatRemaining, formatTime } from '@/lib/format';
import { useCountdown } from '@/lib/useCountdown';
import { describeError, RATE_LIMIT_TITLE } from './messages';
import styles from './SearchError.module.scss';

interface SearchErrorProps {
  error: ApiFailure;
  onRetry: () => void;
}

interface ErrorViewProps {
  title: string;
  message: string;
  onRetry: () => void;
  retryDisabled?: boolean;
}

function ErrorView({
  title,
  message,
  onRetry,
  retryDisabled = false,
}: ErrorViewProps) {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <button
        type="button"
        className={styles.retry}
        disabled={retryDisabled}
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}

interface RateLimitViewProps {
  resetAt: Date;
  onRetry: () => void;
}

function RateLimitView({ resetAt, onRetry }: RateLimitViewProps) {
  const remaining = useCountdown(resetAt.getTime());
  const waiting = remaining > 0;

  const message = waiting
    ? `GitHub is limiting requests. You can search again at ${formatTime(resetAt)} (in ${formatRemaining(remaining)}).`
    : 'GitHub is limiting requests. You can search again now.';

  return (
    <ErrorView
      title={RATE_LIMIT_TITLE}
      message={message}
      onRetry={onRetry}
      retryDisabled={waiting}
    />
  );
}

function SearchError({ error, onRetry }: SearchErrorProps) {
  if (error.kind === 'rate-limit') {
    return (
      <RateLimitView
        key={error.resetAt.getTime()}
        resetAt={error.resetAt}
        onRetry={onRetry}
      />
    );
  }

  const { title, message } = describeError(error);
  return <ErrorView title={title} message={message} onRetry={onRetry} />;
}

export default SearchError;
