import { describe, expect, it } from 'vitest';
import { formatCount, formatDate } from './format';

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
