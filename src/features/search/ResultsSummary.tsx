import { formatSummary, INCOMPLETE_RESULTS_MESSAGE } from './messages';
import styles from './ResultsSummary.module.scss';

interface ResultsSummaryProps {
  totalCount: number;
  incompleteResults: boolean;
}

function ResultsSummary({
  totalCount,
  incompleteResults,
}: ResultsSummaryProps) {
  return (
    <div className={styles.root}>
      <p className={styles.line}>{formatSummary(totalCount)}</p>
      {incompleteResults && (
        <p className={styles.line}>{INCOMPLETE_RESULTS_MESSAGE}</p>
      )}
    </div>
  );
}

export default ResultsSummary;
