import { formatCount } from './format';
import { MAX_RESULTS } from './searchParams';
import styles from './ResultsSummary.module.scss';

interface ResultsSummaryProps {
  totalCount: number;
  incompleteResults: boolean;
}

function ResultsSummary({
  totalCount,
  incompleteResults,
}: ResultsSummaryProps) {
  const noun = totalCount === 1 ? 'repository' : 'repositories';
  const total = `${formatCount(totalCount)} ${noun}`;
  const isLimited = totalCount > MAX_RESULTS;

  return (
    <div className={styles.root}>
      <p className={styles.line}>
        {isLimited
          ? `Showing the first ${formatCount(MAX_RESULTS)} of ${total}.`
          : total}
      </p>
      {incompleteResults && (
        <p className={styles.line}>
          Some results may be missing because the search timed out.
        </p>
      )}
    </div>
  );
}

export default ResultsSummary;
