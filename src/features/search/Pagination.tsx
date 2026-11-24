import { Link } from 'react-router';
import { buildSearchParams, lastPage } from './searchParams';
import type { SearchState } from './searchParams';
import styles from './Pagination.module.scss';

interface PaginationProps {
  state: SearchState;
  totalCount: number;
}

function Pagination({ state, totalCount }: PaginationProps) {
  const last = lastPage(totalCount);
  if (last <= 1) {
    return null;
  }

  const current = Math.min(state.page, last);
  const pageLink = (page: number) => ({
    search: buildSearchParams({ ...state, page }).toString(),
  });

  return (
    <nav className={styles.nav} aria-label="Pagination">
      {current > 1 && (
        <Link className={styles.previous} to={pageLink(current - 1)}>
          Previous
        </Link>
      )}
      <span className={styles.status}>{`Page ${current} of ${last}`}</span>
      {current < last && (
        <Link className={styles.next} to={pageLink(current + 1)}>
          Next
        </Link>
      )}
    </nav>
  );
}

export default Pagination;
