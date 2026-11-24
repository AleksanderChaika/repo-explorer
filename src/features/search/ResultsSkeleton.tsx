import styles from './ResultsSkeleton.module.scss';

const DEFAULT_COUNT = 6;

interface ResultsSkeletonProps {
  count?: number;
}

function ResultsSkeleton({ count = DEFAULT_COUNT }: ResultsSkeletonProps) {
  return (
    <ul className={styles.list} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.card}>
          <span className={`${styles.line} ${styles.title}`} />
          <span className={`${styles.line} ${styles.text}`} />
          <span className={`${styles.line} ${styles.meta}`} />
        </li>
      ))}
    </ul>
  );
}

export default ResultsSkeleton;
