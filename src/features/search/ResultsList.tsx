import type { Repository } from '@/api/types';
import RepositoryCard from './RepositoryCard';
import styles from './ResultsList.module.scss';

interface ResultsListProps {
  repositories: readonly Repository[];
}

function ResultsList({ repositories }: ResultsListProps) {
  if (repositories.length === 0) {
    return null;
  }

  return (
    <ul role="list" aria-label="Search results" className={styles.list}>
      {repositories.map((repository) => (
        <li key={repository.id}>
          <RepositoryCard repository={repository} />
        </li>
      ))}
    </ul>
  );
}

export default ResultsList;
