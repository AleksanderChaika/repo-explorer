import { useEffect, useState } from 'react';
import type { ApiFailure } from '@/api/errors';
import { formatRemaining, formatTime } from './format';
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
  const resetAtMs = resetAt.getTime();
  const [now, setNow] = useState(() => Date.now());
  const remaining = resetAtMs - now;
  const waiting = remaining > 0;

  useEffect(() => {
    if (resetAtMs - Date.now() <= 0) {
      return;
    }
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (resetAtMs - current <= 0) {
        clearInterval(id);
      }
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [resetAtMs]);

  const message = waiting
    ? `GitHub is limiting requests. You can search again at ${formatTime(resetAt)} (in ${formatRemaining(remaining)}).`
    : 'GitHub is limiting requests. You can search again now.';

  return (
    <ErrorView
      title="Rate limit reached"
      message={message}
      onRetry={onRetry}
      retryDisabled={waiting}
    />
  );
}

function SearchError({ error, onRetry }: SearchErrorProps) {
  switch (error.kind) {
    case 'network':
      return (
        <ErrorView
          title="Connection problem"
          message="Couldn't reach GitHub. Check your connection and try again."
          onRetry={onRetry}
        />
      );
    case 'http':
      if (error.status === 422) {
        return (
          <ErrorView
            title="Search query not accepted"
            message="GitHub couldn't process this search. Try a different query."
            onRetry={onRetry}
          />
        );
      }
      return (
        <ErrorView
          title="Something went wrong"
          message={`GitHub returned an error (status ${error.status}). Try again in a moment.`}
          onRetry={onRetry}
        />
      );
    case 'rate-limit':
      return (
        <RateLimitView
          key={error.resetAt.getTime()}
          resetAt={error.resetAt}
          onRetry={onRetry}
        />
      );
    case 'parse':
      return (
        <ErrorView
          title="Unexpected response"
          message="GitHub sent a response we couldn't read. Try again."
          onRetry={onRetry}
        />
      );
    default: {
      const unexpected: never = error;
      void unexpected;
      return (
        <ErrorView
          title="Something went wrong"
          message="Please try again."
          onRetry={onRetry}
        />
      );
    }
  }
}

export default SearchError;
