import type { MouseEvent } from 'react';
import { Link } from 'react-router';
import { buildSearchParams, lastPage } from './searchParams';
import type { SearchState } from './searchParams';
import styles from './Pagination.module.scss';

interface PaginationProps {
  state: SearchState;
  totalCount: number;
  onNavigate?: () => void;
}

function Pagination({ state, totalCount, onNavigate }: PaginationProps) {
  const last = lastPage(totalCount);
  if (last <= 1) {
    return null;
  }

  const current = Math.min(state.page, last);
  const pageLink = (page: number) => ({
    search: buildSearchParams({ ...state, page }).toString(),
  });

  const handleClick = (event: MouseEvent) => {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      onNavigate?.();
    }
  };

  return (
    <nav className={styles.nav} aria-label="Pagination">
      {current > 1 && (
        <Link
          className={styles.previous}
          to={pageLink(current - 1)}
          onClick={handleClick}
        >
          Previous
        </Link>
      )}
      <span className={styles.status}>{`Page ${current} of ${last}`}</span>
      {current < last && (
        <Link
          className={styles.next}
          to={pageLink(current + 1)}
          onClick={handleClick}
        >
          Next
        </Link>
      )}
    </nav>
  );
}

export default Pagination;
