import styles from './ErrorNotice.module.scss';

export type NoticeTone = 'danger' | 'neutral';

export type NoticeHeadingLevel = 2 | 3;

interface ErrorNoticeProps {
  title: string;
  message: string;
  tone?: NoticeTone;
  onRetry?: () => void;
  retryDisabled?: boolean;
  headingLevel?: NoticeHeadingLevel;
}

function ErrorNotice({
  title,
  message,
  tone = 'danger',
  onRetry,
  retryDisabled = false,
  headingLevel = 2,
}: ErrorNoticeProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={styles[tone]}>
      <Heading className={styles.title}>{title}</Heading>
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
