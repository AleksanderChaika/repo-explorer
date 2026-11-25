import { useId } from 'react';
import EmptyState from '@/features/search/EmptyState';
import Pagination from '@/features/search/Pagination';
import RateLimitBlocked from '@/features/search/RateLimitBlocked';
import ResultsList from '@/features/search/ResultsList';
import ResultsSkeleton from '@/features/search/ResultsSkeleton';
import ResultsSummary from '@/features/search/ResultsSummary';
import SearchError from '@/features/search/SearchError';
import SearchForm from '@/features/search/SearchForm';
import type { SearchState } from '@/features/search/searchParams';
import { useRepositorySearch } from '@/features/search/useRepositorySearch';
import type { RepositorySearch } from '@/features/search/useRepositorySearch';
import { useSearchState } from '@/features/search/useSearchState';
import styles from './HomePage.module.scss';

interface ResultsProps {
  search: RepositorySearch;
  state: SearchState;
}

function Results({ search, state }: ResultsProps) {
  const headingId = useId();

  switch (search.kind) {
    case 'idle':
      return <EmptyState reason={search.reason} />;
    case 'blocked':
      return <RateLimitBlocked blockedUntil={search.blockedUntil} />;
    case 'loading':
      return <ResultsSkeleton />;
    case 'error':
      return <SearchError error={search.error} onRetry={search.refetch} />;
    case 'success': {
      const { total_count, incomplete_results, items } = search.data;
      if (search.isPlaceholderData && items.length === 0) {
        return <ResultsSkeleton />;
      }
      if (total_count === 0) {
        return <EmptyState reason="no-results" query={state.q} />;
      }
      return (
        <>
          <h2 id={headingId} className={styles.heading}>
            Search results
          </h2>
          <ResultsSummary
            totalCount={total_count}
            incompleteResults={incomplete_results}
          />
          <div className={styles.list}>
            <ResultsList repositories={items} labelledBy={headingId} />
          </div>
          <Pagination state={state} totalCount={total_count} />
        </>
      );
    }
  }
}

function HomePage() {
  const { state, setQuery, setSort, setOrder } = useSearchState();
  const search = useRepositorySearch(state);
  const isLoading =
    search.kind === 'loading' ||
    (search.kind === 'success' && search.isPlaceholderData);

  return (
    <>
      <h1>Explore GitHub repositories</h1>
      <p>
        Search public repositories, filter the results and keep your favorites.
      </p>
      <SearchForm
        state={state}
        setQuery={setQuery}
        setSort={setSort}
        setOrder={setOrder}
      />
      <section aria-label="Results" aria-busy={isLoading}>
        {isLoading && <p className={styles.loading}>Loading…</p>}
        <Results search={search} state={state} />
      </section>
    </>
  );
}

export default HomePage;
