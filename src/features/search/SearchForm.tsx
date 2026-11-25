import { useEffect, useId, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import type { SearchOrder, SearchSort } from '@/api/types';
import {
  DEFAULT_ORDER,
  MAX_QUERY_LENGTH,
  normalizeQuery,
  SEARCH_ORDERS,
  SEARCH_SORTS,
} from './searchParams';
import type { SearchState } from './searchParams';
import styles from './SearchForm.module.scss';

const DEBOUNCE_MS = 500;

const SORT_LABELS: Record<SearchSort, string> = {
  stars: 'Stars',
  forks: 'Forks',
  'help-wanted-issues': 'Help wanted issues',
  updated: 'Recently updated',
};

const ORDER_LABELS: Record<SearchOrder, string> = {
  desc: 'Descending',
  asc: 'Ascending',
};

interface SearchFormProps {
  state: SearchState;
  setQuery: (q: string) => void;
  setSort: (sort: SearchSort | undefined) => void;
  setOrder: (order: SearchOrder) => void;
}

function SearchForm({ state, setQuery, setSort, setOrder }: SearchFormProps) {
  const queryId = useId();
  const sortId = useId();
  const orderId = useId();
  const [field, setField] = useState({
    draft: state.q,
    urlQuery: state.q,
    written: state.q,
    externalChanges: 0,
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (state.q !== field.urlQuery) {
    const isOwn = state.q === field.written;
    setField({
      draft: isOwn ? field.draft : state.q,
      urlQuery: state.q,
      written: state.q,
      externalChanges: field.externalChanges + (isOwn ? 0 : 1),
    });
  }

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [field.externalChanges],
  );

  function write(text: string) {
    setField((previous) => ({ ...previous, written: normalizeQuery(text) }));
    setQuery(text);
  }

  function handleChange(draft: string) {
    setField((previous) => ({ ...previous, draft }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      write(draft);
    }, DEBOUNCE_MS);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    clearTimeout(timer.current);
    write(field.draft);
  }

  return (
    <form className={styles.form} role="search" onSubmit={handleSubmit}>
      <div className={styles.query}>
        <label className={styles.label} htmlFor={queryId}>
          Search repositories
        </label>
        <input
          className={styles.control}
          id={queryId}
          type="search"
          maxLength={MAX_QUERY_LENGTH}
          value={field.draft}
          onChange={(event) => {
            handleChange(event.target.value);
          }}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={sortId}>
          Sort by
        </label>
        <select
          className={styles.control}
          id={sortId}
          value={state.sort ?? ''}
          onChange={(event) => {
            setSort(SEARCH_SORTS.find((sort) => sort === event.target.value));
          }}
        >
          <option value="">Best match</option>
          {SEARCH_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={orderId}>
          Order
        </label>
        <select
          className={styles.control}
          id={orderId}
          value={state.order}
          disabled={state.sort === undefined}
          onChange={(event) => {
            setOrder(
              SEARCH_ORDERS.find((order) => order === event.target.value) ??
                DEFAULT_ORDER,
            );
          }}
        >
          {SEARCH_ORDERS.map((order) => (
            <option key={order} value={order}>
              {ORDER_LABELS[order]}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

export default SearchForm;
