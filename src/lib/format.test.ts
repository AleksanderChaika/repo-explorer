import { describe, expect, it } from 'vitest';
import { formatCount, formatDate, formatRemaining, formatTime } from './format';

describe('formatCount', () => {
  it('groups thousands with commas', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('does not abbreviate large numbers', () => {
    expect(formatCount(1500)).toBe('1,500');
  });

  it('keeps small numbers as they are', () => {
    expect(formatCount(0)).toBe('0');
  });
});

describe('formatDate', () => {
  it('formats a date in the medium US style', () => {
    expect(formatDate('2026-03-15T12:00:00Z')).toBe('Mar 15, 2026');
  });

  it('uses UTC for a time just after midnight', () => {
    expect(formatDate('2026-01-01T00:30:00Z')).toBe('Jan 1, 2026');
  });

  it('uses only regular spaces', () => {
    expect(formatDate('2026-01-01T00:30:00Z')).toMatch(/^[\x20-\x7e]+$/);
  });

  it('returns null for an invalid date', () => {
    expect(formatDate('not a date')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(formatDate('')).toBeNull();
  });
});

describe('formatTime', () => {
  it.each([
    ['2026-01-15T14:05:00Z', '06:05'],
    ['2026-01-15T08:05:00Z', '00:05'],
    ['2026-01-15T20:09:00Z', '12:09'],
    ['2026-01-15T07:30:00Z', '23:30'],
    ['2026-07-15T14:05:00Z', '07:05'],
  ])('formats %s as %s', (iso, expected) => {
    expect(formatTime(new Date(iso))).toBe(expected);
  });
});

describe('formatRemaining', () => {
  it.each([
    [0, '0:00'],
    [-5000, '0:00'],
    [1, '0:01'],
    [59001, '1:00'],
    [60000, '1:00'],
    [65000, '1:05'],
    [3600000, '60:00'],
  ])('formats %s ms as %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });
});
