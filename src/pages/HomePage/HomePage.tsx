import { useCallback, useEffect, useId, useRef } from 'react';
import EmptyState from '@/features/search/EmptyState';
import { describeAlert, describeStatus } from '@/features/search/messages';
import Pagination from '@/features/search/Pagination';
import RateLimitBlocked from '@/features/search/RateLimitBlocked';
import ResultsList from '@/features/search/ResultsList';
import ResultsSkeleton from '@/features/search/ResultsSkeleton';
import ResultsSummary from '@/features/search/ResultsSummary';
import SearchError from '@/features/search/SearchError';
import SearchForm from '@/features/search/SearchForm';
import { lastPage } from '@/features/search/searchParams';
import type { SearchState } from '@/features/search/searchParams';
import { useRepositorySearch } from '@/features/search/useRepositorySearch';
import type { RepositorySearch } from '@/features/search/useRepositorySearch';
import { useSearchState } from '@/features/search/useSearchState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import styles from './HomePage.module.scss';

interface ResultsProps {
  search: RepositorySearch;
  state: SearchState;
  focusResults: () => void;
}

function Results({ search, state, focusResults }: ResultsProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const attachHeading = useCallback(
    (node: HTMLHeadingElement | null) => {
      headingRef.current = node;
      return () => {
        headingRef.current = null;
        if (document.activeElement === node) {
          focusResults();
        }
      };
    },
    [focusResults],
  );

  switch (search.kind) {
    case 'idle':
      return <EmptyState reason={search.reason} />;
    case 'blocked':
      return <RateLimitBlocked blockedUntil={search.blockedUntil} />;
    case 'loading':
      return <ResultsSkeleton />;
    case 'error':
      return (
        <SearchError
          error={search.error}
          onRetry={() => {
            focusResults();
            search.refetch();
          }}
        />
      );
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
          <h2
            ref={attachHeading}
            id={headingId}
            className={styles.heading}
            tabIndex={-1}
          >
            Search results
          </h2>
          <ResultsSummary
            totalCount={total_count}
            incompleteResults={incomplete_results}
          />
          <div className={styles.list}>
            <ResultsList repositories={items} labelledBy={headingId} />
          </div>
          <Pagination
            state={state}
            totalCount={total_count}
            onNavigate={() => headingRef.current?.focus()}
          />
        </>
      );
    }
  }
}

function pageToClamp(search: RepositorySearch, page: number): number | null {
  if (search.kind !== 'success' || search.isPlaceholderData) {
    return null;
  }
  const last = lastPage(search.data.total_count);
  return page > last ? last : null;
}

function HomePage() {
  const { state, setQuery, setSort, setOrder, clampPage } = useSearchState();
  const search = useRepositorySearch(state);
  useDocumentTitle(state.q === '' ? null : `Search: ${state.q}`);
  const resultsRef = useRef<HTMLElement>(null);
  const focusResults = useCallback(() => {
    resultsRef.current?.focus();
  }, []);
  const overflow = pageToClamp(search, state.page);
  const view: RepositorySearch =
    overflow === null ? search : { kind: 'loading' };
  const isLoading =
    view.kind === 'loading' ||
    (view.kind === 'success' && view.isPlaceholderData);

  useEffect(() => {
    if (overflow !== null) {
      clampPage(overflow);
    }
  }, [overflow, clampPage]);

  return (
    <>
      <h1 tabIndex={-1}>Explore GitHub repositories</h1>
      <p>
        Search public GitHub repositories and see the details and languages of
        each one.
      </p>
      <SearchForm
        state={state}
        setQuery={setQuery}
        setSort={setSort}
        setOrder={setOrder}
      />
      <p role="status" className={styles.announcement}>
        {describeStatus(view, state.page)}
      </p>
      <p role="alert" className={styles.announcement}>
        {describeAlert(view)}
      </p>
      <section
        ref={resultsRef}
        aria-label="Results"
        aria-busy={isLoading}
        tabIndex={-1}
      >
        {isLoading && <p className={styles.loading}>Loading…</p>}
        <Results search={view} state={state} focusResults={focusResults} />
      </section>
    </>
  );
}

export default HomePage;
