import { describe, expect, it } from 'vitest';
import type { SearchState } from './searchParams';
import {
  buildSearchParams,
  lastPage,
  MAX_PAGE,
  MAX_QUERY_LENGTH,
  parseSearchState,
  PER_PAGE,
} from './searchParams';

function parse(query: string) {
  return parseSearchState(new URLSearchParams(query));
}

describe('parseSearchState', () => {
  it('returns defaults for empty params', () => {
    expect(parse('')).toEqual({
      state: { q: '', sort: undefined, order: 'desc', page: 1 },
      needsCanonicalization: false,
    });
  });

  it('reads every valid param', () => {
    expect(parse('q=react&sort=stars&order=asc&page=3')).toEqual({
      state: { q: 'react', sort: 'stars', order: 'asc', page: 3 },
      needsCanonicalization: false,
    });
  });

  it('does not depend on the order of params', () => {
    expect(parse('page=2&sort=forks&q=react').needsCanonicalization).toBe(
      false,
    );
  });

  describe('q', () => {
    it('trims and collapses whitespace', () => {
      expect(parse('q=%20%20react%20%20%20hooks%20')).toEqual({
        state: { q: 'react hooks', sort: undefined, order: 'desc', page: 1 },
        needsCanonicalization: true,
      });
    });

    it('treats a blank q as empty and asks to drop it', () => {
      expect(parse('q=%20%20')).toEqual({
        state: { q: '', sort: undefined, order: 'desc', page: 1 },
        needsCanonicalization: true,
      });
    });

    it('truncates q to the maximum length', () => {
      const { state } = parse(`q=${'a'.repeat(MAX_QUERY_LENGTH + 50)}`);

      expect(state.q).toBe('a'.repeat(MAX_QUERY_LENGTH));
    });

    it('does not leave trailing whitespace after truncation', () => {
      const raw = `${'a'.repeat(MAX_QUERY_LENGTH - 1)} b`;
      const { state } = parse(`q=${encodeURIComponent(raw)}`);

      expect(state.q).toBe('a'.repeat(MAX_QUERY_LENGTH - 1));
    });

    it('counts characters, not UTF-16 units, when truncating', () => {
      const { state } = parse(
        `q=${encodeURIComponent('😀'.repeat(MAX_QUERY_LENGTH + 10))}`,
      );

      expect(Array.from(state.q)).toHaveLength(MAX_QUERY_LENGTH);
    });

    it('keeps a short q so the input can still show it', () => {
      expect(parse('q=a').state.q).toBe('a');
    });

    it('uses the first value of a duplicated q and asks to drop the rest', () => {
      expect(parse('q=react&q=vue')).toEqual({
        state: { q: 'react', sort: undefined, order: 'desc', page: 1 },
        needsCanonicalization: true,
      });
    });
  });

  describe('sort', () => {
    it.each(['stars', 'forks', 'help-wanted-issues', 'updated'])(
      'accepts %s',
      (sort) => {
        expect(parse(`q=x&sort=${sort}`)).toMatchObject({
          state: { sort },
          needsCanonicalization: false,
        });
      },
    );

    it.each(['abc', 'STARS', '', 'best-match'])(
      'drops invalid sort %j and asks to canonicalize',
      (sort) => {
        expect(parse(`q=react&sort=${sort}`)).toEqual({
          state: { q: 'react', sort: undefined, order: 'desc', page: 1 },
          needsCanonicalization: true,
        });
      },
    );
  });

  describe('order', () => {
    it('accepts asc with a sort', () => {
      expect(parse('q=x&sort=stars&order=asc').state.order).toBe('asc');
    });

    it('falls back to desc for an invalid order', () => {
      expect(parse('q=x&sort=stars&order=up')).toEqual({
        state: { q: 'x', sort: 'stars', order: 'desc', page: 1 },
        needsCanonicalization: true,
      });
    });

    it('ignores order when there is no sort', () => {
      expect(parse('q=x&order=asc')).toEqual({
        state: { q: 'x', sort: undefined, order: 'desc', page: 1 },
        needsCanonicalization: true,
      });
    });

    it('asks to drop an explicit default order', () => {
      expect(parse('q=x&sort=stars&order=desc').needsCanonicalization).toBe(
        true,
      );
    });
  });

  describe('page', () => {
    it.each(['abc', '0', '-1', '1.5', '', '2e1', '+2', '%202'])(
      'falls back to page 1 for invalid value %j',
      (page) => {
        expect(parse(`q=x&page=${page}`)).toMatchObject({
          state: { page: 1 },
          needsCanonicalization: true,
        });
      },
    );

    it('clamps a page above the maximum', () => {
      expect(parse('q=x&page=999')).toMatchObject({
        state: { page: MAX_PAGE },
        needsCanonicalization: true,
      });
    });

    it('clamps a page that overflows a safe integer', () => {
      expect(parse(`q=x&page=${'9'.repeat(400)}`).state.page).toBe(MAX_PAGE);
    });

    it('accepts the last allowed page', () => {
      expect(parse(`q=x&page=${MAX_PAGE}`)).toMatchObject({
        state: { page: MAX_PAGE },
        needsCanonicalization: false,
      });
    });

    it('asks to drop an explicit first page', () => {
      expect(parse('q=x&page=1')).toMatchObject({
        state: { page: 1 },
        needsCanonicalization: true,
      });
    });

    it('normalizes leading zeros', () => {
      expect(parse('q=x&page=007')).toMatchObject({
        state: { page: 7 },
        needsCanonicalization: true,
      });
    });
  });

  it('resets the page when q is empty and keeps sort', () => {
    expect(parse('sort=forks&page=5')).toEqual({
      state: { q: '', sort: 'forks', order: 'desc', page: 1 },
      needsCanonicalization: true,
    });
  });

  it('asks to drop unknown params', () => {
    expect(parse('q=x&utm_source=mail')).toEqual({
      state: { q: 'x', sort: undefined, order: 'desc', page: 1 },
      needsCanonicalization: true,
    });
  });
});

describe('buildSearchParams', () => {
  const base: SearchState = {
    q: '',
    sort: undefined,
    order: 'desc',
    page: 1,
  };

  it('returns no params for the default state', () => {
    expect(buildSearchParams(base).toString()).toBe('');
  });

  it('writes q', () => {
    expect(buildSearchParams({ ...base, q: 'react' }).toString()).toBe(
      'q=react',
    );
  });

  it('writes sort without the default order', () => {
    expect(
      buildSearchParams({ ...base, q: 'react', sort: 'stars' }).toString(),
    ).toBe('q=react&sort=stars');
  });

  it('writes a non-default order next to the sort', () => {
    expect(
      buildSearchParams({
        ...base,
        q: 'react',
        sort: 'stars',
        order: 'asc',
      }).toString(),
    ).toBe('q=react&sort=stars&order=asc');
  });

  it('omits order when there is no sort', () => {
    expect(
      buildSearchParams({ ...base, q: 'react', order: 'asc' }).toString(),
    ).toBe('q=react');
  });

  it('omits the first page and writes later ones', () => {
    expect(buildSearchParams({ ...base, q: 'x', page: 1 }).toString()).toBe(
      'q=x',
    );
    expect(buildSearchParams({ ...base, q: 'x', page: 4 }).toString()).toBe(
      'q=x&page=4',
    );
  });

  it('omits the page when q is empty', () => {
    expect(
      buildSearchParams({ ...base, sort: 'forks', page: 3 }).toString(),
    ).toBe('sort=forks');
  });

  it('omits an empty q', () => {
    expect(buildSearchParams({ ...base, sort: 'forks' }).toString()).toBe(
      'sort=forks',
    );
  });

  it.each<SearchState>([
    { q: 'react hooks', sort: undefined, order: 'desc', page: 1 },
    { q: 'c++ & "quotes" #1', sort: 'forks', order: 'asc', page: 7 },
    { q: 'язык', sort: 'updated', order: 'desc', page: MAX_PAGE },
    { q: '', sort: 'help-wanted-issues', order: 'asc', page: 1 },
  ])('round-trips through parseSearchState: %j', (state) => {
    expect(parseSearchState(buildSearchParams(state))).toEqual({
      state,
      needsCanonicalization: false,
    });
  });
});

describe('lastPage', () => {
  it.each([
    [0, 1],
    [-5, 1],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
    [1, 1],
    [PER_PAGE, 1],
    [PER_PAGE + 1, 2],
    [35, 2],
    [999, MAX_PAGE],
    [1000, MAX_PAGE],
    [1001, MAX_PAGE],
    [7_410_546, MAX_PAGE],
  ])('returns for total %d the last page %d', (total, expected) => {
    expect(lastPage(total)).toBe(expected);
  });
});
