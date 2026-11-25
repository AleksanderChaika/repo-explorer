import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import type { SearchOrder, SearchSort } from '@/api/types';
import { setupFakeTimerUser } from '@/test/utils';
import SearchForm from './SearchForm';
import type { SearchState } from './searchParams';

function renderForm(initial: Partial<SearchState> = {}) {
  const handlers = {
    setQuery: vi.fn<(q: string) => void>(),
    setSort: vi.fn<(sort: SearchSort | undefined) => void>(),
    setOrder: vi.fn<(order: SearchOrder) => void>(),
  };
  const form = (patch: Partial<SearchState>) => (
    <SearchForm
      state={{ q: '', sort: undefined, order: 'desc', page: 1, ...patch }}
      {...handlers}
    />
  );
  const view = render(form(initial));
  const change = (next: Partial<SearchState>) => {
    view.rerender(form(next));
  };
  return { ...view, ...handlers, change };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function queryField() {
  return screen.getByRole('searchbox', { name: 'Search repositories' });
}

function sortField() {
  return screen.getByRole('combobox', { name: 'Sort by' });
}

function orderField() {
  return screen.getByRole('combobox', { name: 'Order' });
}

function optionNames(select: HTMLElement) {
  return Array.from(select.querySelectorAll('option'), (o) => o.textContent);
}

describe('SearchForm', () => {
  describe('fields', () => {
    it('exposes a search landmark', () => {
      renderForm();

      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('labels the query field', () => {
      renderForm();

      expect(screen.getByRole('searchbox')).toHaveAccessibleName(
        'Search repositories',
      );
    });

    it('labels the sort field', () => {
      renderForm();

      expect(screen.getAllByRole('combobox')[0]).toHaveAccessibleName(
        'Sort by',
      );
    });

    it('labels the order field', () => {
      renderForm();

      expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleName('Order');
    });

    it('shows the query from the state', () => {
      renderForm({ q: 'react' });

      expect(queryField()).toHaveValue('react');
    });

    it('limits the query to the maximum length', () => {
      renderForm();

      expect(queryField()).toHaveAttribute('maxlength', '256');
    });

    it('offers best match and every sort', () => {
      renderForm();

      expect(optionNames(sortField())).toEqual([
        'Best match',
        'Stars',
        'Forks',
        'Help wanted issues',
        'Recently updated',
      ]);
    });

    it('offers both orders', () => {
      renderForm();

      expect(optionNames(orderField())).toEqual(['Descending', 'Ascending']);
    });

    it('shows the sort from the state', () => {
      renderForm({ sort: 'forks' });

      expect(sortField()).toHaveValue('forks');
    });

    it('shows best match after the sort is cleared', () => {
      const { change } = renderForm({ sort: 'forks' });

      change({});

      expect(sortField()).toHaveValue('');
    });

    it('shows the order from the state', () => {
      renderForm({ sort: 'stars', order: 'asc' });

      expect(orderField()).toHaveValue('asc');
    });

    it('disables the order without a sort', () => {
      renderForm();

      expect(orderField()).toBeDisabled();
    });

    it('enables the order with a sort', () => {
      renderForm({ sort: 'stars' });

      expect(orderField()).toBeEnabled();
    });
  });

  describe('typing', () => {
    it('does not write the query on mount', () => {
      vi.useFakeTimers();
      onTestFinished(() => {
        vi.useRealTimers();
      });
      const { setQuery } = renderForm({ q: 'react' });

      advance(1000);

      expect(setQuery).not.toHaveBeenCalled();
    });

    it('does not write before the delay', async () => {
      const user = setupFakeTimerUser();
      const { setQuery } = renderForm();

      await user.type(queryField(), 'react');
      advance(499);

      expect(setQuery).not.toHaveBeenCalled();
    });

    it('writes the typed text after the delay', async () => {
      const user = setupFakeTimerUser();
      const { setQuery } = renderForm();

      await user.type(queryField(), 'react');
      advance(500);

      expect(setQuery).toHaveBeenCalledWith('react');
    });

    it('restarts the delay on every change', async () => {
      const user = setupFakeTimerUser();
      const { setQuery } = renderForm();

      await user.type(queryField(), 're');
      advance(300);
      await user.type(queryField(), 'act');
      advance(300);

      expect(setQuery).not.toHaveBeenCalled();
    });

    it('does not write after unmount', async () => {
      const user = setupFakeTimerUser();
      const { setQuery, unmount } = renderForm();

      await user.type(queryField(), 'react');
      unmount();
      advance(500);

      expect(setQuery).not.toHaveBeenCalled();
    });
  });

  describe('submitting', () => {
    it('writes at once on Enter', async () => {
      const user = setupFakeTimerUser();
      const { setQuery } = renderForm();

      await user.type(queryField(), 'react{Enter}');

      expect(setQuery).toHaveBeenCalledWith('react');
    });

    it('does not write again after Enter', async () => {
      const user = setupFakeTimerUser();
      const { setQuery } = renderForm();

      await user.type(queryField(), 'react{Enter}');
      advance(500);

      expect(setQuery).toHaveBeenCalledTimes(1);
    });

    it('prevents the native submission', () => {
      renderForm();

      const notPrevented = fireEvent.submit(screen.getByRole('search'));

      expect(notPrevented).toBe(false);
    });
  });

  describe('keeping the text in step with the state', () => {
    it('keeps a trailing space after its own write', async () => {
      const user = setupFakeTimerUser();
      const { change } = renderForm();

      await user.type(queryField(), 'react ');
      advance(500);
      change({ q: 'react' });

      expect(queryField()).toHaveValue('react ');
    });

    it('keeps a trailing space after Enter', async () => {
      const user = setupFakeTimerUser();
      const { change } = renderForm();

      await user.type(queryField(), 'react {Enter}');
      change({ q: 'react' });

      expect(queryField()).toHaveValue('react ');
    });

    it('follows a query changed from outside', () => {
      const { change } = renderForm({ q: 'first' });

      change({ q: 'second' });

      expect(queryField()).toHaveValue('second');
    });

    it('follows an outside change to a query it wrote earlier', async () => {
      const user = setupFakeTimerUser();
      const { change } = renderForm();

      await user.type(queryField(), 'mine');
      advance(500);
      change({ q: 'mine' });
      change({ q: 'other' });
      change({ q: 'mine' });

      expect(queryField()).toHaveValue('mine');
    });

    it('drops pending text on an outside change', async () => {
      const user = setupFakeTimerUser();
      const { setQuery, change } = renderForm();

      await user.type(queryField(), 'react');
      change({ q: 'vue' });
      advance(500);

      expect(setQuery).not.toHaveBeenCalled();
    });

    it('drops pending text on a second outside change', async () => {
      const user = setupFakeTimerUser();
      const { setQuery, change } = renderForm();

      change({ q: 'first' });
      await user.type(queryField(), ' more');
      change({ q: 'second' });
      advance(500);

      expect(setQuery).not.toHaveBeenCalled();
    });

    it('keeps pending text when its own write arrives', async () => {
      const user = setupFakeTimerUser();
      const { setQuery, change } = renderForm();

      await user.type(queryField(), 'vu');
      advance(500);
      await user.type(queryField(), 'e');
      change({ q: 'vu' });
      advance(500);

      expect(setQuery).toHaveBeenLastCalledWith('vue');
    });

    it('still writes pending text when only the sort changes', async () => {
      const user = setupFakeTimerUser();
      const { setQuery, change } = renderForm();

      await user.type(queryField(), 'react');
      change({ sort: 'stars' });
      advance(500);

      expect(setQuery).toHaveBeenCalledWith('react');
    });
  });

  describe('sorting', () => {
    it('writes a chosen sort', async () => {
      const user = userEvent.setup();
      const { setSort } = renderForm();

      await user.selectOptions(sortField(), 'stars');

      expect(setSort).toHaveBeenCalledWith('stars');
    });

    it('clears the sort for best match', async () => {
      const user = userEvent.setup();
      const { setSort } = renderForm({ sort: 'stars' });

      await user.selectOptions(sortField(), '');

      expect(setSort).toHaveBeenCalledWith(undefined);
    });

    it('writes a chosen order', async () => {
      const user = userEvent.setup();
      const { setOrder } = renderForm({ sort: 'stars' });

      await user.selectOptions(orderField(), 'asc');

      expect(setOrder).toHaveBeenCalledWith('asc');
    });
  });
});
