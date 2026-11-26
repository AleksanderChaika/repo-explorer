import styles from './RepositorySkeleton.module.scss';

function RepositorySkeleton() {
  return (
    <div className={styles.root} aria-hidden="true">
      <span className={`${styles.line} ${styles.owner}`} />
      <span className={`${styles.line} ${styles.description}`} />
      <span className={`${styles.line} ${styles.links}`} />
      <span className={styles.stats} />
    </div>
  );
}

export default RepositorySkeleton;
