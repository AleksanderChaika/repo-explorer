import { MIN_QUERY_LENGTH } from './searchParams';
import styles from './EmptyState.module.scss';

export type EmptyStateProps =
  { reason: 'empty' | 'short' } | { reason: 'no-results'; query: string };

interface EmptyStateContent {
  title: string;
  message: string;
}

function getContent(props: EmptyStateProps): EmptyStateContent {
  switch (props.reason) {
    case 'empty':
      return {
        title: 'Search GitHub repositories',
        message: 'Type a name or keyword to find public repositories.',
      };
    case 'short':
      return {
        title: 'Keep typing',
        message: `Enter at least ${MIN_QUERY_LENGTH} characters to search.`,
      };
    case 'no-results':
      return {
        title: 'No repositories found',
        message: `Nothing matches “${props.query}”. Try a different keyword.`,
      };
  }
}

function EmptyState(props: EmptyStateProps) {
  const { title, message } = getContent(props);

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}

export default EmptyState;
