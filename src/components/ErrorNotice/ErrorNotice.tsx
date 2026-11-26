import styles from './ErrorNotice.module.scss';

export type NoticeTone = 'danger' | 'neutral';

interface ErrorNoticeProps {
  title: string;
  message: string;
  tone?: NoticeTone;
  onRetry?: () => void;
  retryDisabled?: boolean;
}

function ErrorNotice({
  title,
  message,
  tone = 'danger',
  onRetry,
  retryDisabled = false,
}: ErrorNoticeProps) {
  return (
    <div className={styles[tone]}>
      <h2 className={styles.title}>{title}</h2>
      <p
        className={
          onRetry ? `${styles.message} ${styles.withAction}` : styles.message
        }
      >
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          className={styles.retry}
          disabled={retryDisabled}
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorNotice;
