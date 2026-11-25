import { describe, expect, it } from 'vitest';
import { HttpError, NetworkError, ParseError } from '@/api/errors';
import { describeError, formatSummary } from './messages';

describe('formatSummary', () => {
  it.each([
    ['zero repositories', 0, '0 repositories'],
    ['one repository', 1, '1 repository'],
    ['a count at the limit', 1000, '1,000 repositories'],
    [
      'a count above the limit',
      1001,
      'Showing the first 1,000 of 1,001 repositories.',
    ],
  ])('formats %s', (_name, totalCount, expected) => {
    expect(formatSummary(totalCount)).toBe(expected);
  });
});

describe('describeError', () => {
  it.each([
    [
      'a network error',
      new NetworkError(),
      'Connection problem',
      "Couldn't reach GitHub. Check your connection and try again.",
    ],
    [
      'an http 500 error',
      new HttpError(500, 'Server error'),
      'Something went wrong',
      'GitHub returned an error (status 500). Try again in a moment.',
    ],
    [
      'an http 422 error',
      new HttpError(422, 'Validation failed'),
      'Search query not accepted',
      "GitHub couldn't process this search. Try a different query.",
    ],
    [
      'a parse error',
      new ParseError(200),
      'Unexpected response',
      "GitHub sent a response we couldn't read. Try again.",
    ],
    [
      'an unknown error',
      { kind: 'unknown' } as never,
      'Something went wrong',
      'Please try again.',
    ],
  ])('describes %s', (_name, error, title, message) => {
    expect(describeError(error)).toEqual({ title, message });
  });
});
