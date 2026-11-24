import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithRouter } from '@/test/utils';
import { useSearchState } from './useSearchState';

function setup(entry: string) {
  return renderHookWithRouter(useSearchState, { initialEntries: [entry] });
}

function change(action: () => void) {
  act(() => {
    action();
  });
}

describe('useSearchState', () => {
  it('returns the state parsed from the URL', () => {
    const { result } = setup('/?q=react&sort=stars&order=asc&page=3');

    expect(result.current.state).toEqual({
      q: 'react',
      sort: 'stars',
      order: 'asc',
      page: 3,
    });
  });

  it('writes a normalized query', () => {
    const { result, router } = setup('/');

    change(() => {
      result.current.setQuery('  react   js ');
    });

    expect(router.state.location.search).toBe('?q=react+js');
  });

  it('removes the query when it is set to an empty string', () => {
    const { result, router } = setup('/?q=react&page=2');

    change(() => {
      result.current.setQuery('');
    });

    expect(router.state.location.search).toBe('');
  });

  it('resets the page when the query changes', () => {
    const { result, router } = setup('/?q=react&page=3');

    change(() => {
      result.current.setQuery('vue');
    });

    expect(router.state.location.search).toBe('?q=vue');
  });

  it('resets the page when the sort changes', () => {
    const { result, router } = setup('/?q=react&page=3');

    change(() => {
      result.current.setSort('stars');
    });

    expect(router.state.location.search).toBe('?q=react&sort=stars');
  });

  it('resets the page when the order changes', () => {
    const { result, router } = setup('/?q=react&sort=stars&page=3');

    change(() => {
      result.current.setOrder('asc');
    });

    expect(router.state.location.search).toBe('?q=react&sort=stars&order=asc');
  });

  it('keeps the sort and the order when the query changes', () => {
    const { result, router } = setup('/?q=react&sort=stars&order=asc');

    change(() => {
      result.current.setQuery('vue');
    });

    expect(router.state.location.search).toBe('?q=vue&sort=stars&order=asc');
  });

  it('keeps the query and the sort when the order changes', () => {
    const { result, router } = setup('/?q=react&sort=forks');

    change(() => {
      result.current.setOrder('asc');
    });

    expect(router.state.location.search).toBe('?q=react&sort=forks&order=asc');
  });

  it('resets the order when the sort is cleared', () => {
    const { result, router } = setup('/?q=react&sort=stars&order=asc');

    change(() => {
      result.current.setSort(undefined);
    });

    expect(router.state.location.search).toBe('?q=react');
  });

  it('does not navigate when the canonical URL is unchanged', () => {
    const { result, router } = setup('/?q=react');

    change(() => {
      result.current.setQuery('react  ');
    });

    expect(router.state.historyAction).toBe('POP');
  });

  it('pushes a history entry for a user change', () => {
    const { result, router } = setup('/');

    change(() => {
      result.current.setQuery('react');
    });

    expect(router.state.historyAction).toBe('PUSH');
  });

  it('restores the previous state on back', async () => {
    const { result, router } = setup('/?q=first');

    change(() => {
      result.current.setQuery('second');
    });
    await act(async () => {
      await router.navigate(-1);
    });

    expect(result.current.state.q).toBe('first');
  });

  it('keeps the setters identical across navigations', () => {
    const { result } = setup('/');
    const { setQuery, setSort, setOrder } = result.current;

    change(() => {
      result.current.setQuery('react');
    });

    expect(result.current.setQuery).toBe(setQuery);
    expect(result.current.setSort).toBe(setSort);
    expect(result.current.setOrder).toBe(setOrder);
  });

  it('compares with the latest URL after going back', async () => {
    const { result, router } = setup('/?q=first');

    change(() => {
      result.current.setQuery('second');
    });
    await act(async () => {
      await router.navigate(-1);
    });
    change(() => {
      result.current.setQuery('second');
    });

    expect(router.state.location.search).toBe('?q=second');
  });

  it('compares with the written URL for calls in the same tick', () => {
    const { result, router } = setup('/');

    change(() => {
      result.current.setQuery('react');
      result.current.setQuery('');
    });

    expect(router.state.location.search).toBe('');
  });
});
